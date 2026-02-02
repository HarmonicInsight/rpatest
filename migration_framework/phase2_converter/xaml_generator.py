"""XAML生成 - aKaBotプロジェクトファイル生成"""
# Copyright (c) 2025-2026 HarmonicInsight / FPT Consulting Japan. All rights reserved.
from __future__ import annotations

import json
import logging
from typing import Any

from lxml import etree

from migration_framework.common.models import AkaBotActivity

logger = logging.getLogger(__name__)

# aKaBot XAML名前空間
NAMESPACES = {
    "": "http://schemas.microsoft.com/netfx/2009/xaml/activities",
    "akabot": "clr-namespace:AkaBot.Core.Activities;assembly=AkaBot.Core.Activities",
    "x": "http://schemas.microsoft.com/winfx/2006/xaml",
    "sap": "http://schemas.microsoft.com/netfx/2009/xaml/activities/presentation",
    "sap2010": "http://schemas.microsoft.com/netfx/2010/xaml/activities/presentation",
}


class XamlGenerator:
    """aKaBotのXAMLプロジェクトファイルを生成する"""

    def generate_xaml(
        self,
        activities: list[AkaBotActivity],
        variables: list[dict[str, str]],
        workflow_name: str = "Main",
    ) -> str:
        """XAMLワークフローファイルを生成する"""
        root = etree.Element(
            "Activity",
            nsmap={
                None: NAMESPACES[""],
                "x": NAMESPACES["x"],
                "sap": NAMESPACES["sap"],
                "sap2010": NAMESPACES["sap2010"],
            },
        )
        root.set("{%s}Class" % NAMESPACES["x"], workflow_name)

        # 変数宣言
        if variables:
            members = etree.SubElement(root, "x.Members")
            for var in variables:
                prop = etree.SubElement(members, "{%s}Property" % NAMESPACES["x"])
                prop.set("Name", var.get("Name", ""))
                prop.set("Type", f"InArgument({var.get('Type', 'System.String')})")

        # メインSequence
        sequence = etree.SubElement(root, "Sequence")
        sequence.set("DisplayName", workflow_name)

        # 変数ノード
        for var in variables:
            var_elem = etree.SubElement(sequence, "Variable")
            var_elem.set("{%s}TypeArguments" % NAMESPACES["x"], var.get("Type", "System.String"))
            var_elem.set("Name", var.get("Name", ""))
            if var.get("DefaultValue"):
                var_elem.set("Default", var["DefaultValue"])

        # アクティビティ配置
        for activity in activities:
            self._add_activity(sequence, activity)

        # XML文字列化
        xaml_str = etree.tostring(
            root,
            pretty_print=True,
            xml_declaration=True,
            encoding="utf-8",
        ).decode("utf-8")

        logger.info("XAML生成完了: %d アクティビティ", len(activities))
        return xaml_str

    def _add_activity(
        self, parent: etree._Element, activity: AkaBotActivity
    ) -> None:
        """アクティビティ要素をXMLに追加する"""
        # アクティビティタイプからタグ名を生成
        tag_name = activity.activity_type.split(".")[-1]
        elem = etree.SubElement(parent, tag_name)
        elem.set("DisplayName", activity.display_name)

        # プロパティ設定
        for key, value in activity.properties.items():
            if "." in key:
                # ネストプロパティ (e.g., Target.Selector)
                parts = key.split(".")
                sub = elem
                for part in parts[:-1]:
                    sub_elem = sub.find(part)
                    if sub_elem is None:
                        sub_elem = etree.SubElement(sub, f"{tag_name}.{part}")
                    sub = sub_elem
                sub.set(parts[-1], value)
            else:
                elem.set(key, value)

        # 子アクティビティ
        if activity.children:
            for child in activity.children:
                self._add_activity(elem, child)

    def generate_project_json(
        self,
        project_name: str,
        description: str = "",
        main_file: str = "Main.xaml",
    ) -> str:
        """aKaBot project.json を生成する"""
        project = {
            "name": project_name,
            "description": description,
            "main": main_file,
            "dependencies": {
                "AkaBot.Core.Activities": "1.0.0",
                "AkaBot.Excel.Activities": "1.0.0",
                "AkaBot.Mail.Activities": "1.0.0",
                "AkaBot.System.Activities": "1.0.0",
            },
            "schemaVersion": "1.0",
            "studioVersion": "1.0.0",
            "projectVersion": "1.0.0",
            "expressionLanguage": "CSharp",
        }
        return json.dumps(project, indent=2, ensure_ascii=False)

    def generate_todo_md(self, todo_items: list[str]) -> str:
        """手動対応項目のTODO.mdを生成する"""
        lines = ["# 手動対応項目 (TODO)", ""]
        for i, item in enumerate(todo_items, start=1):
            lines.append(f"- [ ] {i}. {item}")
        lines.append("")
        return "\n".join(lines)
