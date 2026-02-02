"""差分検出 - BizRoboソースとaKaBot変換結果の差分レポート生成"""
from __future__ import annotations

import logging

from migration_framework.common.models import (
    AssessmentReport,
    ConversionResult,
    ValidationIssue,
)

logger = logging.getLogger(__name__)


class DiffDetector:
    """変換前後の差分を検出する"""

    def detect(
        self,
        assessment: AssessmentReport,
        conversion: ConversionResult,
    ) -> list[ValidationIssue]:
        """元のBizRoboロボットとaKaBot変換結果の差分をチェックする"""
        issues: list[ValidationIssue] = []

        # アクション数の差分
        source_count = len(assessment.robot.actions)
        target_count = len(conversion.activities)

        if source_count > 0 and target_count == 0:
            issues.append(ValidationIssue(
                severity="error",
                category="missing",
                message="変換結果にアクティビティがありません",
                suggestion="変換処理を確認してください",
            ))
        elif source_count > target_count:
            diff = source_count - target_count
            issues.append(ValidationIssue(
                severity="warning",
                category="missing",
                message=f"変換漏れの可能性: 元={source_count}, 変換後={target_count} (差分={diff})",
                suggestion="変換されなかったアクションを確認してください",
            ))

        # 変数の差分
        source_vars = {v.name for v in assessment.robot.variables}
        target_vars = {v.get("Name", "") for v in conversion.variables}
        missing_vars = source_vars - target_vars
        if missing_vars:
            issues.append(ValidationIssue(
                severity="warning",
                category="missing",
                message=f"変換されていない変数: {', '.join(missing_vars)}",
                suggestion="変数定義を確認してください",
            ))

        # サブロボット参照チェック
        for sub in assessment.robot.sub_robots:
            issues.append(ValidationIssue(
                severity="info",
                category="missing",
                message=f"サブロボット参照 '{sub}' の移行確認が必要です",
                suggestion="参照先ロボットも移行してください",
            ))

        # TODO項目 (未対応アクション)
        for todo in conversion.todo_items:
            if "未対応" in todo or "手動" in todo:
                issues.append(ValidationIssue(
                    severity="warning",
                    category="missing",
                    message=f"手動対応項目: {todo}",
                ))

        logger.info("差分検出完了: %d 件", len(issues))
        return issues
