"""Phase 3 統合 Validator - 構文チェック・命名規則・ベストプラクティス・差分検出"""
from __future__ import annotations

import logging

from migration_framework.common.config import Config
from migration_framework.common.models import (
    AssessmentReport,
    ConversionResult,
    ValidationReport,
)

from .best_practice_checker import BestPracticeChecker
from .diff_detector import DiffDetector
from .naming_checker import NamingChecker
from .syntax_checker import SyntaxChecker

logger = logging.getLogger(__name__)


class Validator:
    """Phase 3: 検証エンジン

    チェック項目:
    1. SyntaxChecker: XAML構文整合性
    2. NamingChecker: 命名規則準拠
    3. BestPracticeChecker: ベストプラクティス準拠
    4. DiffDetector: 変換前後の差分検出
    """

    def __init__(self, config: Config):
        self.config = config
        naming_rules = config.get("validator.naming_rules", {})
        self.syntax_checker = SyntaxChecker()
        self.naming_checker = NamingChecker(naming_rules=naming_rules)
        self.best_practice_checker = BestPracticeChecker()
        self.diff_detector = DiffDetector()

    def validate(
        self,
        assessment: AssessmentReport,
        conversion: ConversionResult,
    ) -> ValidationReport:
        """変換結果を検証する"""
        robot_name = conversion.source_robot
        logger.info("=== Phase 3 検証開始: %s ===", robot_name)

        all_issues = []

        # 1. 構文チェック
        if conversion.xaml_content:
            all_issues.extend(self.syntax_checker.check(conversion.xaml_content))

        # 2. 命名規則チェック
        all_issues.extend(self.naming_checker.check(conversion))

        # 3. ベストプラクティスチェック
        all_issues.extend(self.best_practice_checker.check(conversion))

        # 4. 差分検出
        all_issues.extend(self.diff_detector.detect(assessment, conversion))

        # スコア計算
        error_count = sum(1 for i in all_issues if i.severity == "error")
        warning_count = sum(1 for i in all_issues if i.severity == "warning")
        score = max(0.0, 100.0 - error_count * 20.0 - warning_count * 5.0)
        passed = error_count == 0

        report = ValidationReport(
            robot_name=robot_name,
            issues=all_issues,
            passed=passed,
            score=score,
        )

        logger.info(
            "=== Phase 3 検証完了: %s (score=%.1f, passed=%s, errors=%d, warnings=%d) ===",
            robot_name, score, passed, error_count, warning_count,
        )
        return report
