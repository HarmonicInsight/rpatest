"""BizRobo XML/Robot パーサー - 構造解析・アクション抽出・変数一覧化"""
# Copyright (c) 2025-2026 HarmonicInsight / FPT Consulting Japan. All rights reserved.
from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

from lxml import etree

from migration_framework.common.models import BizRoboAction, BizRoboRobot, BizRoboVariable

logger = logging.getLogger(__name__)


class BizRoboParser:
    """BizRoboの.robot/.xmlファイルをパースしてロボット構造を抽出する"""

    # BizRoboで使われる主要な名前空間
    NAMESPACES = {
        "robot": "http://www.kapowtech.com/robot",
        "config": "http://www.kapowtech.com/config",
    }

    def parse(self, file_path: Path) -> BizRoboRobot:
        """ロボットファイルをパースして構造化データを返す"""
        logger.info("パース開始: %s", file_path)

        suffix = file_path.suffix.lower()
        if suffix == ".xml":
            return self._parse_xml(file_path)
        elif suffix == ".robot":
            return self._parse_robot(file_path)
        else:
            raise ValueError(f"未対応のファイル形式: {suffix}")

    def _parse_xml(self, file_path: Path) -> BizRoboRobot:
        """XMLファイルをパースする"""
        tree = etree.parse(str(file_path))
        root = tree.getroot()

        robot = BizRoboRobot(
            file_path=file_path,
            name=file_path.stem,
        )

        # アクション抽出
        robot.actions = self._extract_actions(root)

        # 変数抽出
        robot.variables = self._extract_variables(root)

        # サブロボット参照抽出
        robot.sub_robots = self._extract_sub_robots(root)

        logger.info(
            "パース完了: %s (アクション=%d, 変数=%d)",
            robot.name,
            len(robot.actions),
            len(robot.variables),
        )
        return robot

    def _parse_robot(self, file_path: Path) -> BizRoboRobot:
        """BizRobo .robotファイルをパースする (.robotもXML形式)"""
        return self._parse_xml(file_path)

    def _extract_actions(self, root: etree._Element) -> list[BizRoboAction]:
        """XMLツリーからアクションを再帰的に抽出する"""
        actions: list[BizRoboAction] = []

        for elem in root.iter():
            tag = self._strip_namespace(elem.tag)

            if tag in self._known_action_tags():
                action = BizRoboAction(
                    action_type=tag,
                    name=elem.get("name", tag),
                    properties=self._extract_properties(elem),
                    children=self._extract_child_actions(elem),
                    line_number=elem.sourceline or 0,
                )
                actions.append(action)

        return actions

    def _extract_child_actions(self, parent: etree._Element) -> list[BizRoboAction]:
        """子アクションを抽出する"""
        children: list[BizRoboAction] = []
        for child in parent:
            tag = self._strip_namespace(child.tag)
            if tag in self._known_action_tags():
                action = BizRoboAction(
                    action_type=tag,
                    name=child.get("name", tag),
                    properties=self._extract_properties(child),
                    children=self._extract_child_actions(child),
                    line_number=child.sourceline or 0,
                )
                children.append(action)
        return children

    def _extract_variables(self, root: etree._Element) -> list[BizRoboVariable]:
        """変数定義を抽出する"""
        variables: list[BizRoboVariable] = []

        for elem in root.iter():
            tag = self._strip_namespace(elem.tag)
            if tag in ("variable", "Variable", "parameter", "Parameter"):
                var = BizRoboVariable(
                    name=elem.get("name", "unknown"),
                    var_type=elem.get("type", "String"),
                    default_value=elem.get("defaultValue", elem.text),
                    scope=elem.get("scope", "workflow"),
                )
                variables.append(var)

        return variables

    def _extract_sub_robots(self, root: etree._Element) -> list[str]:
        """参照しているサブロボットを抽出する"""
        sub_robots: list[str] = []
        for elem in root.iter():
            tag = self._strip_namespace(elem.tag)
            if tag in ("executeRobot", "ExecuteRobot", "callRobot", "CallRobot"):
                robot_ref = elem.get("robotUrl", elem.get("robot", ""))
                if robot_ref:
                    sub_robots.append(robot_ref)
        return sub_robots

    def _extract_properties(self, elem: etree._Element) -> dict[str, Any]:
        """要素の属性をプロパティとして抽出する"""
        props: dict[str, Any] = {}
        for key, value in elem.attrib.items():
            clean_key = self._strip_namespace(key)
            props[clean_key] = value

        # テキストコンテンツも取得
        if elem.text and elem.text.strip():
            props["_text"] = elem.text.strip()

        return props

    @staticmethod
    def _strip_namespace(tag: str) -> str:
        """名前空間を除去してタグ名のみ返す"""
        if "}" in tag:
            return tag.split("}", 1)[1]
        return tag

    @staticmethod
    def _known_action_tags() -> set[str]:
        """BizRoboの既知アクションタグ一覧"""
        return {
            # 基本
            "step", "Step", "action", "Action",
            # ブラウザ
            "openBrowser", "OpenBrowser", "navigate", "Navigate",
            "closeBrowser", "CloseBrowser",
            "click", "Click", "typeInto", "TypeInto",
            "getText", "GetText", "extractData", "ExtractData",
            "waitElement", "WaitElement",
            # 条件分岐
            "if", "If", "elseIf", "ElseIf", "else", "Else",
            "switch", "Switch", "case", "Case",
            "branch", "Branch",
            # ループ
            "forEach", "ForEach", "while", "While",
            "loop", "Loop", "repeat", "Repeat",
            # Excel
            "excelOpen", "ExcelOpen", "excelReadRange", "ExcelReadRange",
            "excelWriteRange", "ExcelWriteRange", "excelWriteCell", "ExcelWriteCell",
            # ファイル
            "copyFile", "CopyFile", "moveFile", "MoveFile",
            "deleteFile", "DeleteFile", "createDirectory", "CreateDirectory",
            # データ
            "assign", "Assign", "log", "Log",
            # エラーハンドリング
            "tryCatch", "TryCatch", "throw", "Throw",
            # メール
            "sendMail", "SendMail",
            # 待機
            "delay", "Delay", "wait", "Wait",
            # サブロボット
            "executeRobot", "ExecuteRobot", "callRobot", "CallRobot",
            # OCR/画像
            "ocrRead", "OCRRead", "imageRecognition", "ImageRecognition",
            # デスクトップ
            "desktopRecorder", "DesktopRecorder",
        }
