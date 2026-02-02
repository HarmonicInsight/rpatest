"""Phase 1 統合 Analyzer - 全サブコンポーネントを統合した解析エンジン"""
# Copyright (c) 2025-2026 HarmonicInsight / FPT Consulting Japan. All rights reserved.
from __future__ import annotations

import logging
from pathlib import Path

from migration_framework.common.config import Config
from migration_framework.common.models import AssessmentReport

from .classifier import DifficultyClassifier
from .complexity import ComplexityAnalyzer
from .dependency import DependencyMapper
from .parser import BizRoboParser

logger = logging.getLogger(__name__)


class Analyzer:
    """Phase 1: BizRobo解析エンジン

    パイプライン:
    1. BizRoboParser: XML/Robot パース → 構造化
    2. DependencyMapper: 外部依存の検出
    3. ComplexityAnalyzer: 複雑度スコアリング
    4. DifficultyClassifier: ランク判定 + レポート生成
    """

    def __init__(self, config: Config):
        self.config = config
        thresholds = config.get("analyzer.complexity_thresholds", {})
        self.parser = BizRoboParser()
        self.dependency_mapper = DependencyMapper()
        self.complexity_analyzer = ComplexityAnalyzer(thresholds=thresholds)
        self.classifier = DifficultyClassifier()

    def analyze_file(self, file_path: Path) -> AssessmentReport:
        """1つのロボットファイルを解析する"""
        logger.info("=== Phase 1 解析開始: %s ===", file_path.name)

        # 1. パース
        robot = self.parser.parse(file_path)

        # 2. 依存関係マッピング
        robot = self.dependency_mapper.analyze(robot)

        # 3. 複雑度分析
        complexity = self.complexity_analyzer.analyze(robot)

        # 4. 難易度分類・レポート生成
        report = self.classifier.classify(robot, complexity)

        logger.info("=== Phase 1 解析完了: %s (rank=%s) ===", robot.name, complexity.rank.value)
        return report

    def analyze_directory(self, directory: Path) -> list[AssessmentReport]:
        """ディレクトリ内の全ロボットを解析して優先順位付きリストを返す"""
        reports: list[AssessmentReport] = []

        robot_files = list(directory.glob("**/*.robot")) + list(directory.glob("**/*.xml"))

        if not robot_files:
            logger.warning("ロボットファイルが見つかりません: %s", directory)
            return reports

        logger.info("解析対象: %d ファイル", len(robot_files))

        for file_path in robot_files:
            try:
                report = self.analyze_file(file_path)
                reports.append(report)
            except Exception as e:
                logger.error("解析失敗: %s - %s", file_path, e)

        # 優先順位付与
        reports = self.classifier.prioritize(reports)

        logger.info(
            "全体解析完了: %d/%d 成功", len(reports), len(robot_files)
        )
        return reports
