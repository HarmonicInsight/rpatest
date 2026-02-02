"""レポーター - HTML/JSON形式でのテスト結果レポート生成"""
# Copyright (c) 2025-2026 HarmonicInsight / FPT Consulting Japan. All rights reserved.
from __future__ import annotations

import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Any

from migration_framework.common.models import TestExecution, TestResult

logger = logging.getLogger(__name__)


class Reporter:
    """テスト結果のレポートを生成する"""

    def generate_json_report(
        self, executions: list[TestExecution], output_path: Path
    ) -> None:
        """JSONレポートを生成する"""
        report = self._build_report_data(executions)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2, ensure_ascii=False, default=str)
        logger.info("JSONレポート生成: %s", output_path)

    def generate_html_report(
        self, executions: list[TestExecution], output_path: Path
    ) -> None:
        """HTMLダッシュボードレポートを生成する"""
        report = self._build_report_data(executions)
        html = self._render_html(report)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(html)
        logger.info("HTMLレポート生成: %s", output_path)

    def _build_report_data(
        self, executions: list[TestExecution]
    ) -> dict[str, Any]:
        total = len(executions)
        passed = sum(1 for e in executions if e.result == TestResult.PASSED)
        failed = sum(1 for e in executions if e.result == TestResult.FAILED)
        errors = sum(1 for e in executions if e.result == TestResult.ERROR)
        skipped = sum(1 for e in executions if e.result == TestResult.SKIPPED)

        return {
            "generated_at": datetime.now().isoformat(),
            "summary": {
                "total": total,
                "passed": passed,
                "failed": failed,
                "errors": errors,
                "skipped": skipped,
                "pass_rate": (passed / total * 100) if total > 0 else 0,
            },
            "results": [
                {
                    "name": e.test_case.name,
                    "robot": e.test_case.robot_name,
                    "type": e.test_case.test_type.value,
                    "result": e.result.value,
                    "duration": e.duration_seconds,
                    "differences": e.differences,
                    "error": e.error_message,
                    "executed_at": e.executed_at.isoformat(),
                }
                for e in executions
            ],
        }

    def _render_html(self, report: dict[str, Any]) -> str:
        summary = report["summary"]
        results_html = ""
        for r in report["results"]:
            status_class = {
                "passed": "success",
                "failed": "danger",
                "error": "warning",
                "skipped": "secondary",
            }.get(r["result"], "secondary")

            diffs = ""
            if r["differences"]:
                diffs = "<ul>" + "".join(
                    f"<li>{d}</li>" for d in r["differences"]
                ) + "</ul>"
            if r["error"]:
                diffs += f"<p class='text-danger'>{r['error']}</p>"

            results_html += f"""
            <tr>
                <td>{r['name']}</td>
                <td>{r['robot']}</td>
                <td>{r['type']}</td>
                <td><span class="badge bg-{status_class}">{r['result']}</span></td>
                <td>{r['duration']:.1f}s</td>
                <td>{diffs}</td>
            </tr>"""

        return f"""<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <title>BizRobo → aKaBot 移行テストレポート</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body {{ font-family: 'Segoe UI', sans-serif; padding: 20px; }}
        .summary-card {{ padding: 20px; border-radius: 8px; color: white; text-align: center; }}
        .bg-pass {{ background: #28a745; }}
        .bg-fail {{ background: #dc3545; }}
        .bg-total {{ background: #007bff; }}
        .bg-rate {{ background: #6f42c1; }}
    </style>
</head>
<body>
    <div class="container-fluid">
        <h1>BizRobo → aKaBot 移行テストレポート</h1>
        <p>生成日時: {report['generated_at']}</p>

        <div class="row mb-4">
            <div class="col-md-3">
                <div class="summary-card bg-total">
                    <h2>{summary['total']}</h2>
                    <p>テスト総数</p>
                </div>
            </div>
            <div class="col-md-3">
                <div class="summary-card bg-pass">
                    <h2>{summary['passed']}</h2>
                    <p>成功</p>
                </div>
            </div>
            <div class="col-md-3">
                <div class="summary-card bg-fail">
                    <h2>{summary['failed'] + summary['errors']}</h2>
                    <p>失敗/エラー</p>
                </div>
            </div>
            <div class="col-md-3">
                <div class="summary-card bg-rate">
                    <h2>{summary['pass_rate']:.1f}%</h2>
                    <p>合格率</p>
                </div>
            </div>
        </div>

        <h2>テスト結果詳細</h2>
        <table class="table table-striped">
            <thead>
                <tr>
                    <th>テスト名</th>
                    <th>ロボット</th>
                    <th>種別</th>
                    <th>結果</th>
                    <th>実行時間</th>
                    <th>詳細</th>
                </tr>
            </thead>
            <tbody>
                {results_html}
            </tbody>
        </table>
    </div>
</body>
</html>"""
