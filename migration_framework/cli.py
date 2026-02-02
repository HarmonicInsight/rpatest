"""CLI エントリーポイント - コマンドラインインターフェース"""
# Copyright (c) 2025-2026 HarmonicInsight / FPT Consulting Japan. All rights reserved.
from __future__ import annotations

import logging
import sys
from pathlib import Path

import click
from rich.console import Console
from rich.table import Table

from migration_framework.common.config import Config
from migration_framework.db.migration_db import MigrationDB
from migration_framework.pipeline import MigrationPipeline

console = Console()


def setup_logging(verbose: bool = False) -> None:
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )


@click.group()
@click.option("--config-dir", default="config", help="設定ディレクトリのパス")
@click.option("--verbose", "-v", is_flag=True, help="詳細ログ出力")
@click.pass_context
def main(ctx: click.Context, config_dir: str, verbose: bool) -> None:
    """BizRobo → aKaBot 移行自動化フレームワーク"""
    setup_logging(verbose)
    config = Config(config_dir)
    config.load()
    ctx.ensure_object(dict)
    ctx.obj["config"] = config


@main.command()
@click.argument("source", type=click.Path(exists=True))
@click.option("--output", "-o", default="output", help="出力ディレクトリ")
@click.pass_context
def analyze(ctx: click.Context, source: str, output: str) -> None:
    """Phase 1: BizRoboロボットを解析する"""
    config = ctx.obj["config"]
    from migration_framework.phase1_analyzer import Analyzer

    analyzer = Analyzer(config)
    source_path = Path(source)

    if source_path.is_file():
        report = analyzer.analyze_file(source_path)
        _print_assessment(report)
    else:
        reports = analyzer.analyze_directory(source_path)
        for report in reports:
            _print_assessment(report)


@main.command()
@click.argument("source", type=click.Path(exists=True))
@click.option("--output", "-o", default="output", help="出力ディレクトリ")
@click.option("--no-template", is_flag=True, help="テンプレート適用をスキップ")
@click.pass_context
def migrate(ctx: click.Context, source: str, output: str, no_template: bool) -> None:
    """全フェーズ実行: 解析 → 変換 → 検証"""
    config = ctx.obj["config"]
    db_path = config.get("migration.db_path", "migration.db")
    db = MigrationDB(db_path)
    db.connect()

    pipeline = MigrationPipeline(config, db)
    source_path = Path(source)
    output_path = Path(output)

    try:
        if source_path.is_file():
            record = pipeline.run_single(
                source_path, output_path, apply_template=not no_template
            )
            _print_record(record)
        else:
            records = pipeline.run_batch(
                source_path, output_path, apply_template=not no_template
            )
            _print_records_table(records)
    finally:
        db.close()


@main.command()
@click.option("--db-path", default="migration.db", help="DBファイルパス")
def status(db_path: str) -> None:
    """移行状況のサマリーを表示する"""
    db = MigrationDB(db_path)
    db.connect()

    try:
        summary = db.get_summary()
        records = db.get_all_records()

        console.print(f"\n[bold]移行状況サマリー[/bold]")
        console.print(f"総数: {summary['total']}")
        console.print(f"ステータス別: {summary['by_status']}")
        console.print(f"ランク別: {summary['by_rank']}")
        console.print(f"平均変換率: {summary['avg_conversion_rate']:.1f}%\n")

        if records:
            _print_records_table(records)
    finally:
        db.close()


@main.command()
@click.argument("test-file", type=click.Path(exists=True))
@click.option("--output", "-o", default="output/reports", help="レポート出力先")
@click.pass_context
def test(ctx: click.Context, test_file: str, output: str) -> None:
    """Phase 4: テストケースを実行する"""
    config = ctx.obj["config"]
    from migration_framework.phase4_tester import Tester

    tester = Tester(config)
    test_cases = tester.load_test_cases(Path(test_file))

    if not test_cases:
        console.print("[yellow]テストケースが見つかりません[/yellow]")
        return

    executions = tester.run_tests(test_cases)
    tester.generate_reports(executions, Path(output))
    console.print(f"[green]テスト完了: レポート出力先 → {output}[/green]")


def _print_assessment(report) -> None:
    """解析レポートを表示する"""
    r = report
    console.print(f"\n[bold]{r.robot.name}[/bold]")
    console.print(f"  ランク: {r.complexity.rank.value}")
    console.print(f"  複雑度: {r.complexity.total_score:.1f}")
    console.print(f"  ステップ数: {r.complexity.step_count}")
    console.print(f"  自動変換見込み: {r.auto_convertible_rate:.0%}")
    console.print(f"  見積もり工数: {r.estimated_hours:.1f}h")
    if r.complexity.risk_flags:
        console.print(f"  リスク: {', '.join(r.complexity.risk_flags)}")


def _print_record(record) -> None:
    console.print(f"\n[bold]{record.robot_name}[/bold]")
    console.print(f"  ステータス: {record.status.value}")
    console.print(f"  ランク: {record.difficulty_rank.value}")
    console.print(f"  変換率: {record.conversion_rate:.0%}")
    console.print(f"  検証スコア: {record.validation_score:.1f}")


def _print_records_table(records) -> None:
    table = Table(title="移行状況一覧")
    table.add_column("ロボット名", style="cyan")
    table.add_column("ステータス")
    table.add_column("ランク")
    table.add_column("変換率")
    table.add_column("検証スコア")

    status_colors = {
        "completed": "green",
        "failed": "red",
        "manual_required": "yellow",
        "pending": "dim",
    }

    for r in records:
        color = status_colors.get(r.status.value, "white")
        table.add_row(
            r.robot_name,
            f"[{color}]{r.status.value}[/{color}]",
            r.difficulty_rank.value,
            f"{r.conversion_rate:.0%}",
            f"{r.validation_score:.1f}",
        )

    console.print(table)


if __name__ == "__main__":
    main()
