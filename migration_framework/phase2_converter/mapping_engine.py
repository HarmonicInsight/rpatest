"""マッピングエンジン - BizRoboアクション→aKaBotアクティビティ対応変換"""
from __future__ import annotations

import logging
from typing import Any

from migration_framework.common.models import AkaBotActivity, ASTNode, BizRoboVariable

logger = logging.getLogger(__name__)


class MappingEngine:
    """アクション対応表を適用してASTをaKaBotアクティビティに変換する"""

    def __init__(self, action_mapping: dict[str, Any]):
        self.mappings: dict[str, Any] = action_mapping.get("mappings", {})
        self.type_mapping: dict[str, str] = action_mapping.get(
            "variable_type_mapping", {}
        )
        self._unmapped: list[str] = []

    def map_node(self, node: ASTNode) -> AkaBotActivity | None:
        """ASTNodeをaKaBotアクティビティに変換する"""
        original_type = node.metadata.get("original_type", node.name)
        mapping = self.mappings.get(original_type)

        if mapping is None:
            # 大文字小文字違いでリトライ
            for key, val in self.mappings.items():
                if key.lower() == original_type.lower():
                    mapping = val
                    break

        if mapping is None:
            logger.warning("マッピング未定義: %s", original_type)
            self._unmapped.append(original_type)
            return AkaBotActivity(
                activity_type="AkaBot.Core.Activities.Comment",
                display_name=f"TODO: {original_type} (未対応)",
                properties={"Text": f"要手動変換: {original_type}"},
            )

        akabot_type = mapping.get("akabot")
        if akabot_type is None:
            logger.warning("aKaBot対応なし (手動対応必要): %s", original_type)
            self._unmapped.append(original_type)
            note = mapping.get("note", "手動変換が必要")
            return AkaBotActivity(
                activity_type="AkaBot.Core.Activities.Comment",
                display_name=f"TODO: {original_type}",
                properties={"Text": note},
            )

        # プロパティマッピング
        mapped_props = self._map_properties(
            node.properties, mapping.get("properties", {})
        )

        # 子ノードの変換
        children = [
            mapped
            for child in node.children
            if (mapped := self.map_node(child)) is not None
        ]

        activity = AkaBotActivity(
            activity_type=akabot_type,
            display_name=node.metadata.get("original_name", original_type),
            properties=mapped_props,
            children=children,
        )
        return activity

    def map_variable(self, var: BizRoboVariable) -> dict[str, str]:
        """BizRobo変数をaKaBot変数定義に変換する"""
        akabot_type = self.type_mapping.get(var.var_type, "System.String")
        return {
            "Name": var.name,
            "Type": akabot_type,
            "DefaultValue": var.default_value or "",
            "Scope": var.scope,
        }

    def _map_properties(
        self,
        source_props: dict[str, Any],
        prop_mapping: dict[str, str],
    ) -> dict[str, str]:
        """ソースのプロパティをaKaBotプロパティにマッピングする"""
        result: dict[str, str] = {}
        for source_key, target_key in prop_mapping.items():
            if source_key in source_props:
                result[target_key] = str(source_props[source_key])
        return result

    @property
    def unmapped_actions(self) -> list[str]:
        return list(set(self._unmapped))
