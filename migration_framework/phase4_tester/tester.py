"""Phase 4 統合 Tester - テスト実行・結果比較・レポート生成"""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

import yaml

from migration_framework.common.config import Config
from migration_framework.common.models import (
    TestCase,
    TestExecution,
    TestResult,
    TestType,
)

from .akabot_client import AkaBotClient
from .comparator import Comparator
from .reporter import Reporter
from .test_runner import TestRunner

logger = logging.getLogger(__name__)


class Tester:
    """Phase 4: 自動テストフレームワーク

    コンポーネント:
    1. TestRunner: pytest + 並列実行 + リトライ
    2. AkaBotClient: REST API経由のジョブ起動・監視
    3. Comparator: CSV/Excel/JSON 結果比較
    4. Reporter: HTML/JSONダッシュボード生成
    """

    def __init__(self, config: Config):
        self.config = config
        api_config = config.get("tester.akabot_api", {})

        self.client = AkaBotClient(
            base_url=api_config.get("base_url", "http://localhost:8080/api/v1"),
            timeout=api_config.get("timeout", 300),
        )
        self.runner = TestRunner(
            client=self.client,
            parallel_workers=config.get("tester.parallel_workers", 6),
            retry_count=config.get("tester.retry_count", 3),
        )
        self.comparator = Comparator()
        self.reporter = Reporter()

    def load_test_cases(self, test_file: Path) -> list[TestCase]:
        """YAMLからテストケースを読み込む"""
        with open(test_file, encoding="utf-8") as f:
            data = yaml.safe_load(f) or {}

        test_cases: list[TestCase] = []
        for tc_data in data.get("test_cases", []):
            tc = TestCase(
                name=tc_data["name"],
                robot_name=tc_data["robot_name"],
                test_type=TestType(tc_data.get("type", "functional")),
                input_data=tc_data.get("input", {}),
                expected_output=tc_data.get("expected", {}),
                timeout=tc_data.get("timeout", 300),
            )
            test_cases.append(tc)

        logger.info("テストケース読込: %d件 from %s", len(test_cases), test_file)
        return test_cases

    def run_tests(
        self, test_cases: list[TestCase]
    ) -> list[TestExecution]:
        """テストを実行して結果比較を行う"""
        logger.info("=== Phase 4 テスト実行開始: %d ケース ===", len(test_cases))

        executions = self.runner.run_batch(test_cases)

        # 結果比較
        for execution in executions:
            if execution.result == TestResult.PASSED:
                diffs = self.comparator.compare_dict(
                    execution.test_case.expected_output,
                    execution.actual_output,
                )
                if diffs:
                    execution.differences = diffs
                    execution.result = TestResult.FAILED

        passed = sum(1 for e in executions if e.result == TestResult.PASSED)
        logger.info(
            "=== Phase 4 テスト完了: %d/%d passed ===",
            passed, len(executions),
        )
        return executions

    def generate_reports(
        self,
        executions: list[TestExecution],
        output_dir: Path,
    ) -> None:
        """テスト結果レポートを生成する"""
        output_dir.mkdir(parents=True, exist_ok=True)

        formats = self.config.get("report.output_format", ["html", "json"])

        if "json" in formats:
            self.reporter.generate_json_report(
                executions, output_dir / "test_report.json"
            )
        if "html" in formats:
            self.reporter.generate_html_report(
                executions, output_dir / "test_report.html"
            )
