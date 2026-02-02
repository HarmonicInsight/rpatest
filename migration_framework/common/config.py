"""設定ファイル読み込み"""
from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml


class Config:
    """YAMLベースの設定管理"""

    def __init__(self, config_dir: Path | str = "config"):
        self.config_dir = Path(config_dir)
        self._settings: dict[str, Any] = {}
        self._action_mapping: dict[str, Any] = {}

    def load(self) -> None:
        settings_path = self.config_dir / "settings.yaml"
        if settings_path.exists():
            with open(settings_path, encoding="utf-8") as f:
                self._settings = yaml.safe_load(f) or {}

        mapping_path = self.config_dir / "action_mapping.yaml"
        if mapping_path.exists():
            with open(mapping_path, encoding="utf-8") as f:
                self._action_mapping = yaml.safe_load(f) or {}

    @property
    def settings(self) -> dict[str, Any]:
        return self._settings

    @property
    def action_mapping(self) -> dict[str, Any]:
        return self._action_mapping

    def get(self, dotted_key: str, default: Any = None) -> Any:
        keys = dotted_key.split(".")
        value: Any = self._settings
        for k in keys:
            if isinstance(value, dict):
                value = value.get(k)
            else:
                return default
            if value is None:
                return default
        return value
