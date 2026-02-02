"""構文チェック - XAMLの整合性検証"""
# Copyright (c) 2025-2026 HarmonicInsight / FPT Consulting Japan. All rights reserved.
from __future__ import annotations

import logging

from lxml import etree

from migration_framework.common.models import ValidationIssue

logger = logging.getLogger(__name__)


class SyntaxChecker:
    """生成されたXAMLの構文をチェックする"""

    def check(self, xaml_content: str) -> list[ValidationIssue]:
        """XAML構文チェックを実行する"""
        issues: list[ValidationIssue] = []

        # XML整形式チェック
        try:
            root = etree.fromstring(xaml_content.encode("utf-8"))
        except etree.XMLSyntaxError as e:
            issues.append(ValidationIssue(
                severity="error",
                category="syntax",
                message=f"XAML構文エラー: {e}",
            ))
            return issues

        # DisplayName必須チェック
        issues.extend(self._check_display_names(root))

        # 空Sequenceチェック
        issues.extend(self._check_empty_sequences(root))

        # TODO コメントチェック (未変換項目)
        issues.extend(self._check_todo_comments(root))

        # 変数参照チェック
        issues.extend(self._check_variable_references(root))

        logger.info("構文チェック完了: %d 件の問題", len(issues))
        return issues

    def _check_display_names(self, root: etree._Element) -> list[ValidationIssue]:
        issues: list[ValidationIssue] = []
        for elem in root.iter():
            display_name = elem.get("DisplayName")
            if display_name is not None and not display_name.strip():
                issues.append(ValidationIssue(
                    severity="warning",
                    category="syntax",
                    message=f"DisplayNameが空です: {elem.tag}",
                    location=elem.tag,
                    suggestion="わかりやすい表示名を設定してください",
                ))
        return issues

    def _check_empty_sequences(self, root: etree._Element) -> list[ValidationIssue]:
        issues: list[ValidationIssue] = []
        for elem in root.iter():
            tag = elem.tag.split("}")[-1] if "}" in elem.tag else elem.tag
            if tag == "Sequence" and len(elem) == 0:
                issues.append(ValidationIssue(
                    severity="warning",
                    category="syntax",
                    message="空のSequenceがあります",
                    location=elem.get("DisplayName", "unknown"),
                    suggestion="不要なSequenceは削除してください",
                ))
        return issues

    def _check_todo_comments(self, root: etree._Element) -> list[ValidationIssue]:
        issues: list[ValidationIssue] = []
        for elem in root.iter():
            tag = elem.tag.split("}")[-1] if "}" in elem.tag else elem.tag
            if tag == "Comment":
                text = elem.get("Text", "")
                if "TODO" in text or "未対応" in text or "手動" in text:
                    issues.append(ValidationIssue(
                        severity="warning",
                        category="missing",
                        message=f"未変換項目: {text}",
                        location=elem.get("DisplayName", ""),
                        suggestion="手動での変換作業が必要です",
                    ))
        return issues

    def _check_variable_references(self, root: etree._Element) -> list[ValidationIssue]:
        """変数の定義と参照の整合性をチェックする"""
        issues: list[ValidationIssue] = []
        declared_vars: set[str] = set()

        for elem in root.iter():
            tag = elem.tag.split("}")[-1] if "}" in elem.tag else elem.tag
            if tag == "Variable":
                name = elem.get("Name", "")
                if name:
                    declared_vars.add(name)

        # TODO: プロパティ内の変数参照を解析してundeclaredを検出
        return issues
