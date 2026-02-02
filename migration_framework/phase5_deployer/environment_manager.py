"""環境マネージャー - 端末別の環境設定・認証情報・パスの適用"""
from __future__ import annotations

import logging
from typing import Any

from migration_framework.common.config import Config
from migration_framework.common.models import MachineInfo

logger = logging.getLogger(__name__)


class EnvironmentManager:
    """デプロイ先の端末ごとに異なる環境設定を管理・適用する

    管理対象:
    - 認証情報 (Credential Asset)
    - ファイルパス (端末ごとのローカルパス)
    - 接続先URL (環境ごとのAPI/DBエンドポイント)
    - タイムゾーン・ロケール設定
    """

    def __init__(self, config: Config):
        self.config = config
        self.env_profiles: dict[str, dict[str, Any]] = config.get(
            "deployer.env_profiles", {}
        )

    def apply_config(
        self,
        machine: MachineInfo,
        process_name: str,
        overrides: dict[str, Any],
    ) -> None:
        """端末にプロセス固有の環境設定を適用する"""
        logger.info(
            "環境設定適用: %s → %s (env=%s)",
            process_name, machine.name, machine.environment,
        )

        # 環境プロファイルの取得
        profile = self.env_profiles.get(machine.environment, {})

        # オーバーライドをマージ
        merged = {**profile, **overrides}

        # Orchestrator の Asset として設定
        for key, value in merged.items():
            self._set_asset(machine, process_name, key, value)

        logger.info("環境設定完了: %s → %s (%d 項目)", process_name, machine.name, len(merged))

    def _set_asset(
        self,
        machine: MachineInfo,
        process_name: str,
        key: str,
        value: Any,
    ) -> None:
        """Orchestrator の Asset API で設定値を登録する

        実運用では OrchestratorClient.set_asset() を呼ぶ。
        ここではログ出力のみ。
        """
        is_credential = any(
            kw in key.lower() for kw in ("password", "secret", "token", "credential")
        )
        display_value = "****" if is_credential else str(value)
        logger.debug("  Asset設定: %s.%s = %s (machine=%s)", process_name, key, display_value, machine.name)

    def get_machine_config(self, machine: MachineInfo) -> dict[str, Any]:
        """端末の現在の環境設定を取得する"""
        profile = self.env_profiles.get(machine.environment, {})
        return {
            "machine": machine.name,
            "environment": machine.environment,
            "ip_address": machine.ip_address,
            "config": profile,
        }

    def validate_config(self, machine: MachineInfo) -> list[str]:
        """環境設定の整合性チェック"""
        issues = []
        profile = self.env_profiles.get(machine.environment, {})

        required_keys = self.config.get("deployer.required_assets", [])
        for key in required_keys:
            if key not in profile:
                issues.append(f"必須Asset '{key}' が未設定: {machine.name} ({machine.environment})")

        return issues
