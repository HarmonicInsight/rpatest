"""Phase 2 統合 Converter - AST変換 → マッピング → XAML生成"""
# Copyright (c) 2025-2026 HarmonicInsight / FPT Consulting Japan. All rights reserved.
from __future__ import annotations

import logging
from pathlib import Path

from migration_framework.common.config import Config
from migration_framework.common.models import (
    AssessmentReport,
    ConversionResult,
)

from .ast_builder import ASTBuilder
from .mapping_engine import MappingEngine
from .xaml_generator import XamlGenerator

logger = logging.getLogger(__name__)


class Converter:
    """Phase 2: コード変換エンジン

    パイプライン:
    1. ASTBuilder: BizRoboアクション → 中間AST表現
    2. MappingEngine: AST → aKaBotアクティビティ (アクション対応表適用)
    3. XamlGenerator: aKaBotアクティビティ → XAML/project.json 生成
    """

    def __init__(self, config: Config):
        self.config = config
        self.ast_builder = ASTBuilder()
        self.mapping_engine = MappingEngine(config.action_mapping)
        self.xaml_generator = XamlGenerator()

    def convert(self, report: AssessmentReport) -> ConversionResult:
        """解析レポートをもとに変換を実行する"""
        robot = report.robot
        logger.info("=== Phase 2 変換開始: %s ===", robot.name)

        # 1. AST構築
        ast_nodes = self.ast_builder.build(robot)

        # 2. マッピング (AST → aKaBotアクティビティ)
        activities = []
        for node in ast_nodes:
            activity = self.mapping_engine.map_node(node)
            if activity:
                activities.append(activity)

        # 変数マッピング
        variables = [
            self.mapping_engine.map_variable(var)
            for var in robot.variables
        ]

        # 3. XAML生成
        xaml_content = self.xaml_generator.generate_xaml(
            activities, variables, workflow_name="Main"
        )
        project_json = self.xaml_generator.generate_project_json(
            project_name=f"PRJ_{robot.name}",
            description=f"BizRoboから移行: {robot.name}",
        )

        # TODO項目の集約
        todo_items = list(report.manual_items)
        for action_type in self.mapping_engine.unmapped_actions:
            todo_items.append(f"未対応アクション '{action_type}' の手動変換")

        # 変換率計算
        total_actions = len(ast_nodes)
        unmapped_count = len(self.mapping_engine.unmapped_actions)
        conversion_rate = (
            (total_actions - unmapped_count) / total_actions
            if total_actions > 0
            else 0.0
        )

        result = ConversionResult(
            source_robot=robot.name,
            activities=activities,
            variables=variables,
            xaml_content=xaml_content,
            project_json=project_json,
            todo_items=todo_items,
            conversion_rate=conversion_rate,
        )

        logger.info(
            "=== Phase 2 変換完了: %s (変換率=%.0f%%) ===",
            robot.name, conversion_rate * 100,
        )
        return result

    def save_output(self, result: ConversionResult, output_dir: Path) -> None:
        """変換結果をファイルに出力する"""
        project_dir = output_dir / f"PRJ_{result.source_robot}"
        project_dir.mkdir(parents=True, exist_ok=True)

        # Main.xaml
        (project_dir / "Main.xaml").write_text(
            result.xaml_content, encoding="utf-8"
        )

        # project.json
        (project_dir / "project.json").write_text(
            result.project_json, encoding="utf-8"
        )

        # TODO.md
        if result.todo_items:
            todo_md = self.xaml_generator.generate_todo_md(result.todo_items)
            (project_dir / "TODO.md").write_text(todo_md, encoding="utf-8")

        logger.info("出力保存完了: %s", project_dir)
