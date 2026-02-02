"""命名規則チェッカー - プロジェクト名・ワークフロー名・変数名の規則準拠チェック"""
# Copyright (c) 2025-2026 HarmonicInsight / FPT Consulting Japan. All rights reserved.
from __future__ import annotations

import logging
import re
from typing import Any

from migration_framework.common.models import ConversionResult, ValidationIssue

logger = logging.getLogger(__name__)


class NamingChecker:
    """命名規則への準拠をチェックする

    規則:
    - プロジェクト名: PRJ_{業務名}_{連番}
    - ワークフロー名: Main / Sub_{機能名}
    - 変数名: {型接頭辞}_{用途}_{スコープ}
    """

    def __init__(self, naming_rules: dict[str, Any] | None = None):
        self.rules = naming_rules or {}
        self.type_prefixes: dict[str, str] = self.rules.get("type_prefixes", {
            "string": "str",
            "int": "int",
            "bool": "bln",
            "datatable": "dt",
            "datetime": "dtm",
            "list": "lst",
        })

    def check(self, result: ConversionResult) -> list[ValidationIssue]:
        """命名規則チェックを実行する"""
        issues: list[ValidationIssue] = []

        # プロジェクト名チェック
        issues.extend(self._check_project_name(result.source_robot))

        # 変数名チェック
        for var in result.variables:
            issues.extend(self._check_variable_name(var))

        # アクティビティ DisplayName チェック
        for activity in result.activities:
            issues.extend(self._check_activity_names(activity))

        logger.info("命名規則チェック完了: %d 件の問題", len(issues))
        return issues

    def _check_project_name(self, name: str) -> list[ValidationIssue]:
        issues: list[ValidationIssue] = []
        pattern = r"^PRJ_[A-Za-z0-9\u3040-\u9fff]+_\d{3}$"
        if not re.match(pattern, f"PRJ_{name}_001"):
            # 自動変換時は PRJ_ prefix を付与するので名前部分のみチェック
            if re.search(r"[^\w\u3040-\u9fff]", name):
                issues.append(ValidationIssue(
                    severity="warning",
                    category="naming",
                    message=f"プロジェクト名に不正な文字が含まれています: {name}",
                    suggestion="PRJ_{{業務名}}_{{連番}} の形式を推奨",
                ))
        return issues

    def _check_variable_name(self, var: dict[str, str]) -> list[ValidationIssue]:
        issues: list[ValidationIssue] = []
        name = var.get("Name", "")
        var_type = var.get("Type", "").lower()

        if not name:
            return issues

        # 型プレフィックスのチェック
        expected_prefix = None
        for type_key, prefix in self.type_prefixes.items():
            if type_key in var_type:
                expected_prefix = prefix
                break

        if expected_prefix and not name.startswith(f"{expected_prefix}_"):
            issues.append(ValidationIssue(
                severity="info",
                category="naming",
                message=f"変数 '{name}' に型プレフィックスがありません",
                location=name,
                suggestion=f"推奨: {expected_prefix}_{name}",
            ))

        return issues

    def _check_activity_names(self, activity: Any) -> list[ValidationIssue]:
        issues: list[ValidationIssue] = []
        if not activity.display_name or activity.display_name == activity.activity_type:
            issues.append(ValidationIssue(
                severity="info",
                category="naming",
                message=f"アクティビティに説明的な名前がありません: {activity.activity_type}",
                suggestion="業務内容がわかる名前を設定してください",
            ))
        for child in activity.children:
            issues.extend(self._check_activity_names(child))
        return issues
