"""重複検出・統合 - コード類似度分析・共通処理抽出・統合候補提示"""
# Copyright (c) 2025-2026 HarmonicInsight / FPT Consulting Japan. All rights reserved.
from __future__ import annotations

import logging
from dataclasses import dataclass

from migration_framework.common.models import AkaBotActivity, ConversionResult

logger = logging.getLogger(__name__)


@dataclass
class DuplicateCandidate:
    """重複候補"""
    robot_a: str
    robot_b: str
    activity_type: str
    display_name_a: str
    display_name_b: str
    similarity: float
    suggestion: str


class DuplicateDetector:
    """複数ロボット間の重複処理を検出する"""

    def __init__(self, similarity_threshold: float = 0.7):
        self.threshold = similarity_threshold

    def detect(
        self, results: list[ConversionResult]
    ) -> list[DuplicateCandidate]:
        """変換結果一覧から重複候補を検出する"""
        candidates: list[DuplicateCandidate] = []

        # 全ロボットのアクティビティシグネチャを収集
        signatures: dict[str, list[tuple[str, AkaBotActivity]]] = {}
        for result in results:
            for activity in result.activities:
                sig = self._compute_signature(activity)
                if sig not in signatures:
                    signatures[sig] = []
                signatures[sig].append((result.source_robot, activity))

        # 2つ以上のロボットで同じシグネチャがあれば重複候補
        for sig, occurrences in signatures.items():
            if len(occurrences) < 2:
                continue

            robot_names = list({name for name, _ in occurrences})
            if len(robot_names) < 2:
                continue

            for i in range(len(robot_names)):
                for j in range(i + 1, len(robot_names)):
                    act_a = next(a for r, a in occurrences if r == robot_names[i])
                    act_b = next(a for r, a in occurrences if r == robot_names[j])

                    candidates.append(DuplicateCandidate(
                        robot_a=robot_names[i],
                        robot_b=robot_names[j],
                        activity_type=act_a.activity_type,
                        display_name_a=act_a.display_name,
                        display_name_b=act_b.display_name,
                        similarity=1.0,
                        suggestion=f"共通コンポーネント化を推奨: {act_a.activity_type}",
                    ))

        logger.info("重複検出完了: %d 件の候補", len(candidates))
        return candidates

    def _compute_signature(self, activity: AkaBotActivity) -> str:
        """アクティビティの構造シグネチャを算出する"""
        parts = [activity.activity_type]
        parts.extend(sorted(activity.properties.keys()))
        for child in activity.children:
            parts.append(self._compute_signature(child))
        return "|".join(parts)

    def estimate_reduction(
        self, candidates: list[DuplicateCandidate]
    ) -> dict[str, int]:
        """共通化による削減見込みを算出する"""
        unique_types: set[str] = set()
        for c in candidates:
            unique_types.add(c.activity_type)

        return {
            "duplicate_patterns": len(unique_types),
            "total_candidates": len(candidates),
            "estimated_reduction": len(candidates),  # 共通化で削減可能な数
        }
