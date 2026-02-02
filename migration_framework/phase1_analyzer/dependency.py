"""依存関係マッピング - 外部接続検出・ファイルパス抽出・API呼び出し一覧"""
from __future__ import annotations

import logging
import re

from migration_framework.common.models import BizRoboAction, BizRoboRobot

logger = logging.getLogger(__name__)

# 外部接続を示すキーワード
CONNECTION_KEYWORDS = {
    "jdbc", "odbc", "database", "db", "connection", "connectionString",
    "sqlServer", "oracle", "mysql", "postgresql",
    "ftp", "sftp", "ssh", "smtp", "imap", "pop3",
    "http", "https", "rest", "soap", "wsdl",
}

# ファイルパスパターン
FILE_PATH_PATTERN = re.compile(
    r'[A-Za-z]:\\[^\s"<>|*?]+|/[^\s"<>|*?]+\.\w{1,5}|\\\\[^\s"<>|*?]+'
)

# URL/APIパターン
API_URL_PATTERN = re.compile(
    r'https?://[^\s"<>]+|wsdl://[^\s"<>]+'
)


class DependencyMapper:
    """外部依存関係を検出・マッピングする"""

    def analyze(self, robot: BizRoboRobot) -> BizRoboRobot:
        """ロボットの依存関係を解析してrobotオブジェクトを更新する"""
        all_props = self._collect_all_properties(robot.actions)

        robot.external_connections = self._detect_connections(all_props)
        robot.file_paths = self._extract_file_paths(all_props)
        robot.api_calls = self._extract_api_calls(all_props)

        # サブロボット依存も含める
        robot.dependencies = (
            robot.external_connections
            + robot.file_paths
            + robot.api_calls
            + robot.sub_robots
        )

        logger.info(
            "依存関係分析完了: %s (外部接続=%d, ファイル=%d, API=%d, サブロボット=%d)",
            robot.name,
            len(robot.external_connections),
            len(robot.file_paths),
            len(robot.api_calls),
            len(robot.sub_robots),
        )
        return robot

    def _collect_all_properties(
        self, actions: list[BizRoboAction]
    ) -> dict[str, str]:
        """全アクションのプロパティを平坦化して収集する"""
        all_props: dict[str, str] = {}
        for action in actions:
            for key, value in action.properties.items():
                all_props[f"{action.name}.{key}"] = str(value)
            child_props = self._collect_all_properties(action.children)
            all_props.update(child_props)
        return all_props

    def _detect_connections(self, props: dict[str, str]) -> list[str]:
        """外部接続文字列を検出する"""
        connections: list[str] = []
        for key, value in props.items():
            value_lower = value.lower()
            for keyword in CONNECTION_KEYWORDS:
                if keyword in value_lower:
                    connections.append(f"{key}: {value[:200]}")
                    break
        return list(set(connections))

    def _extract_file_paths(self, props: dict[str, str]) -> list[str]:
        """ファイルパスを抽出する"""
        paths: list[str] = []
        for value in props.values():
            matches = FILE_PATH_PATTERN.findall(value)
            paths.extend(matches)
        return list(set(paths))

    def _extract_api_calls(self, props: dict[str, str]) -> list[str]:
        """API/URL呼び出しを抽出する"""
        apis: list[str] = []
        for value in props.values():
            matches = API_URL_PATTERN.findall(value)
            apis.extend(matches)
        return list(set(apis))
