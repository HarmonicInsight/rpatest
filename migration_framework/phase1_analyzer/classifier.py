"""難易度分類 - A/B/C/Dランク判定・リスクフラグ付与"""
from __future__ import annotations

import logging

from migration_framework.common.models import (
    AssessmentReport,
    BizRoboRobot,
    ComplexityScore,
    DifficultyRank,
)

logger = logging.getLogger(__name__)

# ランク別の自動変換見込み率
AUTO_RATE_BY_RANK = {
    DifficultyRank.A: 0.90,
    DifficultyRank.B: 0.70,
    DifficultyRank.C: 0.50,
    DifficultyRank.D: 0.30,
}

# ランク別の見積もり工数 (時間/ロボット)
ESTIMATED_HOURS_BY_RANK = {
    DifficultyRank.A: 1.0,
    DifficultyRank.B: 4.0,
    DifficultyRank.C: 8.0,
    DifficultyRank.D: 16.0,
}


class DifficultyClassifier:
    """移行難易度を総合判定してレポートを生成する"""

    def classify(
        self, robot: BizRoboRobot, complexity: ComplexityScore
    ) -> AssessmentReport:
        """総合的な難易度判定とレポート生成"""
        rank = complexity.rank
        auto_rate = AUTO_RATE_BY_RANK[rank]
        estimated_hours = ESTIMATED_HOURS_BY_RANK[rank]

        # リスクフラグによる補正
        if complexity.risk_flags:
            auto_rate = max(0.1, auto_rate - 0.1 * len(complexity.risk_flags))
            estimated_hours += 2.0 * len(complexity.risk_flags)

        # 外部依存による補正
        if complexity.external_deps > 3:
            auto_rate = max(0.1, auto_rate - 0.05)
            estimated_hours += 1.0

        manual_items = self._identify_manual_items(robot, complexity)

        report = AssessmentReport(
            robot=robot,
            complexity=complexity,
            estimated_hours=estimated_hours,
            auto_convertible_rate=auto_rate,
            manual_items=manual_items,
        )

        logger.info(
            "分類完了: %s (rank=%s, auto_rate=%.0f%%, hours=%.1f)",
            robot.name, rank.value, auto_rate * 100, estimated_hours,
        )
        return report

    def _identify_manual_items(
        self, robot: BizRoboRobot, complexity: ComplexityScore
    ) -> list[str]:
        """人手対応が必要な項目を特定する"""
        items: list[str] = []

        # リスクフラグの項目
        for flag in complexity.risk_flags:
            items.append(f"[手動対応] {flag} - 代替実装が必要")

        # 外部接続
        for conn in robot.external_connections:
            items.append(f"[確認] 外部接続: {conn}")

        # サブロボット
        for sub in robot.sub_robots:
            items.append(f"[確認] サブロボット参照: {sub}")

        # 共通項目
        items.append("[手動] セレクタ再設定が必要な可能性あり")
        items.append("[手動] 認証情報の再設定")
        items.append("[確認] 業務要件・目的の確認")

        return items

    def prioritize(
        self, reports: list[AssessmentReport]
    ) -> list[AssessmentReport]:
        """移行優先順位をソートして付番する"""
        # ランクA → 高自動化率 → 低工数 の順で優先
        rank_order = {DifficultyRank.A: 0, DifficultyRank.B: 1, DifficultyRank.C: 2, DifficultyRank.D: 3}
        sorted_reports = sorted(
            reports,
            key=lambda r: (
                rank_order[r.complexity.rank],
                -r.auto_convertible_rate,
                r.estimated_hours,
            ),
        )
        for i, report in enumerate(sorted_reports, start=1):
            report.migration_priority = i

        return sorted_reports
