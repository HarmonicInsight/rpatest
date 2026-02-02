"""AST構築 - BizRoboアクションツリーを中間AST表現に変換する"""
from __future__ import annotations

import logging

from migration_framework.common.models import ASTNode, BizRoboAction, BizRoboRobot

logger = logging.getLogger(__name__)

# 制御フロー系ノードタイプ
CONTROL_FLOW_MAP = {
    "if": "conditional",
    "If": "conditional",
    "elseIf": "conditional_branch",
    "ElseIf": "conditional_branch",
    "else": "conditional_else",
    "Else": "conditional_else",
    "switch": "switch",
    "Switch": "switch",
    "case": "switch_case",
    "Case": "switch_case",
    "forEach": "loop_foreach",
    "ForEach": "loop_foreach",
    "while": "loop_while",
    "While": "loop_while",
    "loop": "loop_generic",
    "Loop": "loop_generic",
    "tryCatch": "error_handling",
    "TryCatch": "error_handling",
}


class ASTBuilder:
    """BizRoboアクションツリーを中間AST表現に変換する"""

    def build(self, robot: BizRoboRobot) -> list[ASTNode]:
        """ロボットの全アクションをAST化する"""
        logger.info("AST構築開始: %s", robot.name)
        nodes = [self._action_to_node(action) for action in robot.actions]
        logger.info("AST構築完了: %d ノード", len(nodes))
        return nodes

    def _action_to_node(self, action: BizRoboAction) -> ASTNode:
        """BizRoboActionをASTNodeに変換する"""
        node_type = CONTROL_FLOW_MAP.get(action.action_type, "activity")

        node = ASTNode(
            node_type=node_type,
            name=action.action_type,
            properties=dict(action.properties),
            children=[self._action_to_node(child) for child in action.children],
            metadata={
                "original_type": action.action_type,
                "original_name": action.name,
                "line_number": action.line_number,
            },
        )
        return node
