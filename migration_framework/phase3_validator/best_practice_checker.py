"""ベストプラクティスチェック - aKaBotの推奨パターンへの準拠検証"""
# Copyright (c) 2025-2026 HarmonicInsight / FPT Consulting Japan. All rights reserved.
from __future__ import annotations

import logging

from migration_framework.common.models import ConversionResult, ValidationIssue

logger = logging.getLogger(__name__)


class BestPracticeChecker:
    """aKaBotのベストプラクティスへの準拠をチェックする"""

    def check(self, result: ConversionResult) -> list[ValidationIssue]:
        issues: list[ValidationIssue] = []

        issues.extend(self._check_error_handling(result))
        issues.extend(self._check_logging(result))
        issues.extend(self._check_hardcoded_values(result))
        issues.extend(self._check_deep_nesting(result))

        logger.info("ベストプラクティスチェック完了: %d 件の問題", len(issues))
        return issues

    def _check_error_handling(self, result: ConversionResult) -> list[ValidationIssue]:
        """TryCatchの存在チェック"""
        issues: list[ValidationIssue] = []
        has_try_catch = any(
            "TryCatch" in a.activity_type for a in result.activities
        )
        if not has_try_catch and len(result.activities) > 3:
            issues.append(ValidationIssue(
                severity="warning",
                category="best_practice",
                message="エラーハンドリング(TryCatch)がありません",
                suggestion="メイン処理をTryCatchで囲むことを推奨します",
            ))
        return issues

    def _check_logging(self, result: ConversionResult) -> list[ValidationIssue]:
        """ログ出力の存在チェック"""
        issues: list[ValidationIssue] = []
        has_log = any(
            "Log" in a.activity_type for a in result.activities
        )
        if not has_log:
            issues.append(ValidationIssue(
                severity="info",
                category="best_practice",
                message="ログ出力アクティビティがありません",
                suggestion="処理の開始/終了時にLogMessageを追加することを推奨します",
            ))
        return issues

    def _check_hardcoded_values(self, result: ConversionResult) -> list[ValidationIssue]:
        """ハードコード値のチェック"""
        issues: list[ValidationIssue] = []
        for activity in result.activities:
            for key, value in activity.properties.items():
                if self._looks_hardcoded(value):
                    issues.append(ValidationIssue(
                        severity="info",
                        category="best_practice",
                        message=f"ハードコード値の可能性: {key}={value[:50]}",
                        location=activity.display_name,
                        suggestion="Config/設定ファイルからの読み込みを検討してください",
                    ))
        return issues

    def _check_deep_nesting(
        self, result: ConversionResult, max_depth: int = 5
    ) -> list[ValidationIssue]:
        """ネスト深度チェック"""
        issues: list[ValidationIssue] = []
        for activity in result.activities:
            depth = self._measure_depth(activity)
            if depth > max_depth:
                issues.append(ValidationIssue(
                    severity="warning",
                    category="best_practice",
                    message=f"ネスト深度が深すぎます ({depth} > {max_depth})",
                    location=activity.display_name,
                    suggestion="処理をサブワークフローに分割することを推奨します",
                ))
        return issues

    @staticmethod
    def _looks_hardcoded(value: str) -> bool:
        if not value:
            return False
        # ファイルパスやURLがハードコードされている場合
        if value.startswith(("C:\\", "D:\\", "/home/", "http://", "https://")):
            return True
        return False

    @staticmethod
    def _measure_depth(activity, current: int = 0) -> int:
        if not activity.children:
            return current
        return max(
            BestPracticeChecker._measure_depth(child, current + 1)
            for child in activity.children
        )
