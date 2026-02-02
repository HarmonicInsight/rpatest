"""移行パイプライン オーケストレーター - 4フェーズを統合実行"""
# Copyright (c) 2025-2026 HarmonicInsight / FPT Consulting Japan. All rights reserved.
from __future__ import annotations

import logging
from pathlib import Path

from migration_framework.common.config import Config
from migration_framework.common.models import (
    MigrationRecord,
    MigrationStatus,
)
from migration_framework.db.migration_db import MigrationDB
from migration_framework.phase1_analyzer import Analyzer
from migration_framework.phase2_converter import Converter
from migration_framework.phase3_validator import Validator
from migration_framework.standardization.template_engine import TemplateEngine
from migration_framework.standardization.component_library import ComponentLibrary
from migration_framework.standardization.duplicate_detector import DuplicateDetector

logger = logging.getLogger(__name__)


class MigrationPipeline:
    """BizRobo → aKaBot 移行パイプライン

    Phase 1: 解析 (80%自動化)
    Phase 2: 変換 (55%自動化)
    Phase 3: 検証 (90%自動化)
    Phase 4: テスト (70%自動化) ※ aKaBot API接続時のみ

    標準化レイヤー: 共通部品・テンプレート・重複検出
    """

    def __init__(self, config: Config, db: MigrationDB):
        self.config = config
        self.db = db
        self.analyzer = Analyzer(config)
        self.converter = Converter(config)
        self.validator = Validator(config)
        self.template_engine = TemplateEngine(ComponentLibrary())
        self.duplicate_detector = DuplicateDetector()

    def run_single(
        self,
        file_path: Path,
        output_dir: Path,
        apply_template: bool = True,
    ) -> MigrationRecord:
        """1つのロボットに対して Phase 1-3 を実行する"""
        robot_name = file_path.stem
        logger.info("====== 移行パイプライン開始: %s ======", robot_name)

        record = MigrationRecord(
            robot_name=robot_name,
            source_path=str(file_path),
        )

        # --- Phase 1: 解析 ---
        record.status = MigrationStatus.ANALYZING
        self.db.upsert_record(record)
        self.db.add_log(robot_name, "phase1", "解析開始")

        try:
            assessment = self.analyzer.analyze_file(file_path)
            record.difficulty_rank = assessment.complexity.rank
            record.complexity_score = assessment.complexity.total_score
            self.db.add_log(
                robot_name, "phase1",
                f"解析完了: rank={assessment.complexity.rank.value}, score={assessment.complexity.total_score:.1f}",
            )
        except Exception as e:
            record.status = MigrationStatus.FAILED
            self.db.upsert_record(record)
            self.db.add_log(robot_name, "phase1", f"解析失敗: {e}", level="error")
            logger.error("Phase 1 失敗: %s - %s", robot_name, e)
            return record

        # --- Phase 2: 変換 ---
        record.status = MigrationStatus.CONVERTING
        self.db.upsert_record(record)
        self.db.add_log(robot_name, "phase2", "変換開始")

        try:
            conversion = self.converter.convert(assessment)

            # テンプレート適用
            if apply_template:
                conversion.activities = self.template_engine.apply_main_template(
                    conversion.activities, process_name=robot_name
                )

            record.conversion_rate = conversion.conversion_rate
            self.converter.save_output(conversion, output_dir)
            self.db.add_log(
                robot_name, "phase2",
                f"変換完了: rate={conversion.conversion_rate:.0%}",
            )
        except Exception as e:
            record.status = MigrationStatus.FAILED
            self.db.upsert_record(record)
            self.db.add_log(robot_name, "phase2", f"変換失敗: {e}", level="error")
            logger.error("Phase 2 失敗: %s - %s", robot_name, e)
            return record

        # --- Phase 3: 検証 ---
        record.status = MigrationStatus.VALIDATING
        self.db.upsert_record(record)
        self.db.add_log(robot_name, "phase3", "検証開始")

        try:
            validation = self.validator.validate(assessment, conversion)
            record.validation_score = validation.score
            record.manual_items = "\n".join(
                f"[{i.severity}] {i.message}" for i in validation.issues
            )

            if validation.passed:
                record.status = MigrationStatus.COMPLETED
            else:
                record.status = MigrationStatus.MANUAL_REQUIRED

            self.db.add_log(
                robot_name, "phase3",
                f"検証完了: score={validation.score:.1f}, passed={validation.passed}",
            )
        except Exception as e:
            record.status = MigrationStatus.FAILED
            self.db.upsert_record(record)
            self.db.add_log(robot_name, "phase3", f"検証失敗: {e}", level="error")
            logger.error("Phase 3 失敗: %s - %s", robot_name, e)
            return record

        self.db.upsert_record(record)
        logger.info(
            "====== 移行パイプライン完了: %s (status=%s) ======",
            robot_name, record.status.value,
        )
        return record

    def run_batch(
        self,
        source_dir: Path,
        output_dir: Path,
        apply_template: bool = True,
    ) -> list[MigrationRecord]:
        """ディレクトリ内の全ロボットを移行する"""
        robot_files = (
            list(source_dir.glob("**/*.robot"))
            + list(source_dir.glob("**/*.xml"))
        )

        if not robot_files:
            logger.warning("ロボットファイルが見つかりません: %s", source_dir)
            return []

        logger.info("バッチ移行開始: %d ファイル", len(robot_files))

        records: list[MigrationRecord] = []
        for file_path in robot_files:
            record = self.run_single(file_path, output_dir, apply_template)
            records.append(record)

        # 重複検出 (Phase 2の結果を使って)
        # Note: 実運用ではconversion結果を蓄積して分析
        summary = self.db.get_summary()
        logger.info(
            "バッチ移行完了: total=%d, summary=%s",
            len(records), summary,
        )
        return records
