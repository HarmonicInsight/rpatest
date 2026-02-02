"""Phase 5 統合 Deployer - パッケージング・配布・環境設定・ヘルスチェック"""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

from migration_framework.common.config import Config
from migration_framework.common.models import (
    DeploymentRecord,
    DeploymentStatus,
    MachineInfo,
)

from .environment_manager import EnvironmentManager
from .health_checker import HealthChecker
from .orchestrator_client import OrchestratorClient
from .package_builder import PackageBuilder

logger = logging.getLogger(__name__)


class Deployer:
    """Phase 5: デプロイマネージャー

    パイプライン:
    1. PackageBuilder: aKaBotプロジェクト → .nupkg パッケージ化
    2. OrchestratorClient: パッケージアップロード → プロセス作成 → マシン割当
    3. EnvironmentManager: 端末別の環境設定 (認証・パス・接続先)
    4. HealthChecker: デプロイ後のヘルスチェック・起動確認
    """

    def __init__(self, config: Config):
        self.config = config
        orch_config = config.get("deployer.orchestrator", {})

        self.package_builder = PackageBuilder()
        self.orchestrator = OrchestratorClient(
            base_url=orch_config.get("base_url", "http://localhost:8080"),
            tenant=orch_config.get("tenant", "default"),
        )
        self.env_manager = EnvironmentManager(config)
        self.health_checker = HealthChecker(self.orchestrator)

    def deploy_single(
        self,
        project_dir: Path,
        target_machines: list[MachineInfo],
        env_overrides: dict[str, Any] | None = None,
    ) -> DeploymentRecord:
        """1つのプロジェクトを指定端末群にデプロイする"""
        project_name = project_dir.name
        logger.info("=== Phase 5 デプロイ開始: %s → %d 台 ===",
                     project_name, len(target_machines))

        record = DeploymentRecord(
            project_name=project_name,
            target_machines=[m.name for m in target_machines],
            status=DeploymentStatus.PACKAGING,
        )

        try:
            # 1. パッケージング
            record.status = DeploymentStatus.PACKAGING
            package_path = self.package_builder.build(project_dir)
            record.package_path = str(package_path)
            logger.info("パッケージ作成完了: %s", package_path)

            # 2. Orchestratorへアップロード
            record.status = DeploymentStatus.UPLOADING
            package_id = self.orchestrator.upload_package(package_path)
            record.package_id = package_id
            logger.info("アップロード完了: package_id=%s", package_id)

            # 3. プロセス作成 + マシン割当
            record.status = DeploymentStatus.CONFIGURING
            process_id = self.orchestrator.create_process(
                package_id=package_id,
                process_name=project_name,
                environment_name=self.config.get("deployer.environment", "Production"),
            )
            record.process_id = process_id

            for machine in target_machines:
                self.orchestrator.assign_machine(process_id, machine.machine_id)
                logger.info("マシン割当完了: %s → %s", project_name, machine.name)

            # 4. 環境設定の適用
            if env_overrides:
                for machine in target_machines:
                    self.env_manager.apply_config(
                        machine=machine,
                        process_name=project_name,
                        overrides=env_overrides,
                    )

            # 5. ヘルスチェック
            record.status = DeploymentStatus.HEALTH_CHECK
            health_results = {}
            for machine in target_machines:
                ok = self.health_checker.check(
                    process_name=project_name,
                    machine=machine,
                )
                health_results[machine.name] = ok

            record.health_results = health_results
            all_healthy = all(health_results.values())
            record.status = (
                DeploymentStatus.DEPLOYED if all_healthy
                else DeploymentStatus.PARTIAL
            )

            logger.info(
                "=== Phase 5 デプロイ完了: %s (%d/%d 正常) ===",
                project_name,
                sum(health_results.values()),
                len(health_results),
            )

        except Exception as e:
            record.status = DeploymentStatus.FAILED
            record.error_message = str(e)
            logger.error("デプロイ失敗: %s - %s", project_name, e)

        return record

    def deploy_batch(
        self,
        output_dir: Path,
        target_machines: list[MachineInfo],
        env_overrides: dict[str, Any] | None = None,
    ) -> list[DeploymentRecord]:
        """出力ディレクトリ内の全プロジェクトを一括デプロイ"""
        projects = [d for d in output_dir.iterdir() if d.is_dir()]
        records = []

        for project_dir in projects:
            record = self.deploy_single(project_dir, target_machines, env_overrides)
            records.append(record)

        deployed = sum(1 for r in records if r.status == DeploymentStatus.DEPLOYED)
        logger.info("一括デプロイ完了: %d/%d 成功", deployed, len(records))
        return records

    def rollback(self, project_name: str) -> bool:
        """指定プロジェクトをロールバック（プロセス停止 + 削除）"""
        logger.info("ロールバック開始: %s", project_name)
        try:
            self.orchestrator.stop_process(project_name)
            self.orchestrator.delete_process(project_name)
            logger.info("ロールバック完了: %s", project_name)
            return True
        except Exception as e:
            logger.error("ロールバック失敗: %s - %s", project_name, e)
            return False
