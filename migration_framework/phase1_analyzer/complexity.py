"""複雑度分析 - ステップ数カウント・分岐/ループ深度・スコア算出"""
from __future__ import annotations

import logging

from migration_framework.common.models import (
    BizRoboAction,
    BizRoboRobot,
    ComplexityScore,
    DifficultyRank,
)

logger = logging.getLogger(__name__)

# 分岐系アクション
BRANCH_ACTIONS = {
    "if", "If", "elseIf", "ElseIf", "switch", "Switch",
    "branch", "Branch", "case", "Case",
}

# ループ系アクション
LOOP_ACTIONS = {
    "forEach", "ForEach", "while", "While",
    "loop", "Loop", "repeat", "Repeat",
}

# リスクの高いアクション
RISK_ACTIONS = {
    "ocrRead", "OCRRead", "imageRecognition", "ImageRecognition",
    "desktopRecorder", "DesktopRecorder",
}


class ComplexityAnalyzer:
    """ロボットの複雑度を数値化する"""

    def __init__(self, thresholds: dict[str, int] | None = None):
        self.thresholds = thresholds or {"A": 10, "B": 30, "C": 60, "D": 9999}

    def analyze(self, robot: BizRoboRobot) -> ComplexityScore:
        """複雑度スコアを算出する"""
        step_count = self._count_steps(robot.actions)
        branch_depth = self._max_nesting_depth(robot.actions, BRANCH_ACTIONS)
        loop_depth = self._max_nesting_depth(robot.actions, LOOP_ACTIONS)
        external_deps = len(robot.external_connections) + len(robot.api_calls)
        risk_flags = self._detect_risks(robot.actions)

        # 総合スコア算出 (重み付き)
        total_score = (
            step_count * 1.0
            + branch_depth * 5.0
            + loop_depth * 5.0
            + external_deps * 3.0
            + len(risk_flags) * 10.0
        )

        rank = self._classify_rank(total_score)

        score = ComplexityScore(
            step_count=step_count,
            branch_depth=branch_depth,
            loop_depth=loop_depth,
            external_deps=external_deps,
            total_score=total_score,
            rank=rank,
            risk_flags=risk_flags,
        )

        logger.info(
            "複雑度分析完了: %s (score=%.1f, rank=%s)",
            robot.name, total_score, rank.value,
        )
        return score

    def _count_steps(self, actions: list[BizRoboAction]) -> int:
        """アクション総数を再帰的にカウントする"""
        count = len(actions)
        for action in actions:
            count += self._count_steps(action.children)
        return count

    def _max_nesting_depth(
        self, actions: list[BizRoboAction], target_types: set[str]
    ) -> int:
        """特定タイプのアクションの最大ネスト深度を算出する"""
        return self._calc_depth(actions, target_types, 0)

    def _calc_depth(
        self, actions: list[BizRoboAction], target_types: set[str], current: int
    ) -> int:
        max_depth = current
        for action in actions:
            if action.action_type in target_types:
                child_depth = self._calc_depth(
                    action.children, target_types, current + 1
                )
                max_depth = max(max_depth, child_depth)
            else:
                child_depth = self._calc_depth(
                    action.children, target_types, current
                )
                max_depth = max(max_depth, child_depth)
        return max_depth

    def _detect_risks(self, actions: list[BizRoboAction]) -> list[str]:
        """リスクのあるアクションを検出する"""
        risks: list[str] = []
        for action in actions:
            if action.action_type in RISK_ACTIONS:
                risks.append(f"{action.action_type}: {action.name}")
            risks.extend(self._detect_risks(action.children))
        return risks

    def _classify_rank(self, score: float) -> DifficultyRank:
        """スコアからランクを判定する"""
        if score <= self.thresholds["A"]:
            return DifficultyRank.A
        elif score <= self.thresholds["B"]:
            return DifficultyRank.B
        elif score <= self.thresholds["C"]:
            return DifficultyRank.C
        else:
            return DifficultyRank.D
