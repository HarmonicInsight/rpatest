"""テストランナー - 並列実行・リトライ・タイムアウト管理"""
# Copyright (c) 2025-2026 HarmonicInsight / FPT Consulting Japan. All rights reserved.
from __future__ import annotations

import logging
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from typing import Any

from migration_framework.common.models import TestCase, TestExecution, TestResult

from .akabot_client import AkaBotClient

logger = logging.getLogger(__name__)


class TestRunner:
    """テストケースを実行するランナー"""

    def __init__(
        self,
        client: AkaBotClient,
        parallel_workers: int = 6,
        retry_count: int = 3,
    ):
        self.client = client
        self.parallel_workers = parallel_workers
        self.retry_count = retry_count

    def run_single(self, test_case: TestCase) -> TestExecution:
        """1つのテストケースを実行する"""
        logger.info("テスト実行: %s", test_case.name)
        start_time = time.time()

        for attempt in range(1, self.retry_count + 1):
            try:
                # ジョブ起動
                job_id = self.client.start_job(
                    test_case.robot_name,
                    test_case.input_data,
                )

                # 完了待ち
                job_result = self.client.wait_for_completion(job_id)
                status = job_result.get("status", "")

                if status == "Completed":
                    actual_output = self.client.get_job_output(job_id)
                    duration = time.time() - start_time

                    return TestExecution(
                        test_case=test_case,
                        result=TestResult.PASSED,
                        actual_output=actual_output,
                        duration_seconds=duration,
                    )
                elif status == "Faulted":
                    error_msg = job_result.get("error", "不明なエラー")
                    if attempt < self.retry_count:
                        logger.warning(
                            "テスト失敗(リトライ %d/%d): %s - %s",
                            attempt, self.retry_count, test_case.name, error_msg,
                        )
                        time.sleep(2 ** attempt)
                        continue

                    return TestExecution(
                        test_case=test_case,
                        result=TestResult.FAILED,
                        error_message=error_msg,
                        duration_seconds=time.time() - start_time,
                    )
                else:
                    return TestExecution(
                        test_case=test_case,
                        result=TestResult.ERROR,
                        error_message=f"予期しないステータス: {status}",
                        duration_seconds=time.time() - start_time,
                    )

            except Exception as e:
                if attempt < self.retry_count:
                    logger.warning(
                        "テスト例外(リトライ %d/%d): %s - %s",
                        attempt, self.retry_count, test_case.name, e,
                    )
                    time.sleep(2 ** attempt)
                    continue

                return TestExecution(
                    test_case=test_case,
                    result=TestResult.ERROR,
                    error_message=str(e),
                    duration_seconds=time.time() - start_time,
                )

        return TestExecution(
            test_case=test_case,
            result=TestResult.ERROR,
            error_message="リトライ上限超過",
            duration_seconds=time.time() - start_time,
        )

    def run_batch(self, test_cases: list[TestCase]) -> list[TestExecution]:
        """複数テストケースを並列実行する"""
        logger.info(
            "バッチテスト実行: %d ケース (並列=%d)",
            len(test_cases), self.parallel_workers,
        )
        results: list[TestExecution] = []

        with ThreadPoolExecutor(max_workers=self.parallel_workers) as executor:
            futures = {
                executor.submit(self.run_single, tc): tc
                for tc in test_cases
            }
            for future in as_completed(futures):
                tc = futures[future]
                try:
                    execution = future.result()
                    results.append(execution)
                    logger.info(
                        "テスト完了: %s → %s",
                        tc.name, execution.result.value,
                    )
                except Exception as e:
                    results.append(TestExecution(
                        test_case=tc,
                        result=TestResult.ERROR,
                        error_message=str(e),
                    ))

        passed = sum(1 for r in results if r.result == TestResult.PASSED)
        logger.info(
            "バッチテスト完了: %d/%d passed",
            passed, len(results),
        )
        return results
