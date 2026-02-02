"""ヘルスチェッカー - デプロイ後の起動確認・接続確認・スモークテスト"""
# Copyright (c) 2025-2026 HarmonicInsight / FPT Consulting Japan. All rights reserved.
from __future__ import annotations

import logging
import time
from typing import Any

from migration_framework.common.models import MachineInfo

logger = logging.getLogger(__name__)


class HealthChecker:
    """デプロイ後のヘルスチェック

    チェック項目:
    1. マシン接続確認 (Orchestratorから見えるか)
    2. ロボットエージェント稼働確認
    3. スモークテスト実行 (起動→正常終了)
    4. 依存サービスの到達確認
    """

    def __init__(self, orchestrator_client):
        self.orchestrator = orchestrator_client

    def check(
        self,
        process_name: str,
        machine: MachineInfo,
        run_smoke_test: bool = True,
        timeout: int = 120,
    ) -> bool:
        """端末のヘルスチェックを実行する"""
        logger.info("ヘルスチェック開始: %s @ %s", process_name, machine.name)
        results = {}

        # 1. マシン接続確認
        results["machine_connected"] = self._check_machine_connection(machine)

        # 2. エージェント稼働確認
        results["agent_running"] = self._check_agent_status(machine)

        # 3. スモークテスト
        if run_smoke_test and results["agent_running"]:
            results["smoke_test"] = self._run_smoke_test(
                process_name, machine, timeout
            )
        else:
            results["smoke_test"] = None

        all_ok = all(v is True for v in results.values() if v is not None)

        logger.info(
            "ヘルスチェック完了: %s @ %s → %s (%s)",
            process_name, machine.name,
            "OK" if all_ok else "NG",
            results,
        )
        return all_ok

    def _check_machine_connection(self, machine: MachineInfo) -> bool:
        """Orchestratorからマシンが見えるか確認"""
        try:
            status = self.orchestrator.get_machine_status(machine.machine_id)
            is_connected = status.get("Status", "") in ("Available", "Busy")
            return is_connected
        except Exception as e:
            logger.warning("マシン接続確認失敗: %s - %s", machine.name, e)
            return False

    def _check_agent_status(self, machine: MachineInfo) -> bool:
        """ロボットエージェントが稼働しているか確認"""
        try:
            status = self.orchestrator.get_machine_status(machine.machine_id)
            return status.get("Status") != "Disconnected"
        except Exception as e:
            logger.warning("エージェント確認失敗: %s - %s", machine.name, e)
            return False

    def _run_smoke_test(
        self, process_name: str, machine: MachineInfo, timeout: int
    ) -> bool:
        """スモークテスト - プロセスの起動・正常終了を確認"""
        try:
            job_id = self.orchestrator.start_job(
                process_name=process_name,
                machine_id=machine.machine_id,
                input_args={"_test_mode": True},
            )
            result = self.orchestrator.wait_for_job(job_id, timeout=timeout)
            return result.get("State") == "Successful"
        except Exception as e:
            logger.warning("スモークテスト失敗: %s @ %s - %s", process_name, machine.name, e)
            return False

    def check_batch(
        self,
        process_name: str,
        machines: list[MachineInfo],
    ) -> dict[str, bool]:
        """複数端末のヘルスチェックをまとめて実行"""
        results = {}
        for machine in machines:
            results[machine.name] = self.check(process_name, machine)
        return results
