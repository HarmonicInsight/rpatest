"""共通部品ライブラリ - ログイン・Excel・メール・エラーハンドラ等の再利用可能コンポーネント"""
# Copyright (c) 2025-2026 HarmonicInsight / FPT Consulting Japan. All rights reserved.
from __future__ import annotations

import logging
from typing import Any

from migration_framework.common.models import AkaBotActivity

logger = logging.getLogger(__name__)


class ComponentLibrary:
    """aKaBot共通コンポーネントライブラリ

    共通部品:
    - ログイン/認証処理
    - Excel読み書き
    - メール送信/通知処理
    - エラーハンドラ/例外処理
    """

    def __init__(self):
        self._components: dict[str, callable] = {
            "login": self._create_login_component,
            "excel_read": self._create_excel_read_component,
            "excel_write": self._create_excel_write_component,
            "send_mail": self._create_send_mail_component,
            "error_handler": self._create_error_handler_component,
            "log_start": self._create_log_start_component,
            "log_end": self._create_log_end_component,
            "config_read": self._create_config_read_component,
        }

    def get_component(
        self, name: str, params: dict[str, str] | None = None
    ) -> AkaBotActivity | None:
        """名前で共通コンポーネントを取得する"""
        factory = self._components.get(name)
        if factory is None:
            logger.warning("コンポーネント未定義: %s", name)
            return None
        return factory(params or {})

    def list_components(self) -> list[str]:
        return list(self._components.keys())

    def _create_login_component(self, params: dict[str, str]) -> AkaBotActivity:
        return AkaBotActivity(
            activity_type="AkaBot.Core.Activities.Sequence",
            display_name="共通_ログイン処理",
            children=[
                AkaBotActivity(
                    activity_type="AkaBot.Core.Activities.OpenBrowser",
                    display_name="ブラウザ起動",
                    properties={
                        "Url": params.get("url", ""),
                        "BrowserType": params.get("browser", "Chrome"),
                    },
                ),
                AkaBotActivity(
                    activity_type="AkaBot.Core.Activities.TypeInto",
                    display_name="ユーザーID入力",
                    properties={"Text": params.get("user_variable", "str_UserId")},
                ),
                AkaBotActivity(
                    activity_type="AkaBot.Core.Activities.TypeInto",
                    display_name="パスワード入力",
                    properties={"Text": params.get("pass_variable", "str_Password")},
                ),
                AkaBotActivity(
                    activity_type="AkaBot.Core.Activities.Click",
                    display_name="ログインボタン",
                    properties={},
                ),
            ],
        )

    def _create_excel_read_component(self, params: dict[str, str]) -> AkaBotActivity:
        return AkaBotActivity(
            activity_type="AkaBot.Excel.Activities.ExcelApplicationScope",
            display_name="共通_Excel読込",
            properties={"WorkbookPath": params.get("file_path", "")},
            children=[
                AkaBotActivity(
                    activity_type="AkaBot.Excel.Activities.ReadRange",
                    display_name="データ読込",
                    properties={
                        "SheetName": params.get("sheet", "Sheet1"),
                        "Range": params.get("range", ""),
                        "DataTable": params.get("output_var", "dt_Data"),
                    },
                ),
            ],
        )

    def _create_excel_write_component(self, params: dict[str, str]) -> AkaBotActivity:
        return AkaBotActivity(
            activity_type="AkaBot.Excel.Activities.ExcelApplicationScope",
            display_name="共通_Excel書込",
            properties={"WorkbookPath": params.get("file_path", "")},
            children=[
                AkaBotActivity(
                    activity_type="AkaBot.Excel.Activities.WriteRange",
                    display_name="データ書込",
                    properties={
                        "SheetName": params.get("sheet", "Sheet1"),
                        "StartingCell": params.get("cell", "A1"),
                        "DataTable": params.get("input_var", "dt_Data"),
                    },
                ),
            ],
        )

    def _create_send_mail_component(self, params: dict[str, str]) -> AkaBotActivity:
        return AkaBotActivity(
            activity_type="AkaBot.Mail.Activities.SendSmtpMail",
            display_name="共通_メール送信",
            properties={
                "To": params.get("to", ""),
                "Subject": params.get("subject", ""),
                "Body": params.get("body", ""),
            },
        )

    def _create_error_handler_component(self, params: dict[str, str]) -> AkaBotActivity:
        return AkaBotActivity(
            activity_type="AkaBot.Core.Activities.TryCatch",
            display_name="共通_エラーハンドリング",
            children=[
                AkaBotActivity(
                    activity_type="AkaBot.Core.Activities.LogMessage",
                    display_name="エラーログ出力",
                    properties={
                        "Message": "エラー発生: " + params.get("context", "処理"),
                        "Level": "Error",
                    },
                ),
            ],
        )

    def _create_log_start_component(self, params: dict[str, str]) -> AkaBotActivity:
        return AkaBotActivity(
            activity_type="AkaBot.Core.Activities.LogMessage",
            display_name="処理開始ログ",
            properties={
                "Message": f"[START] {params.get('process_name', 'Main')}",
                "Level": "Info",
            },
        )

    def _create_log_end_component(self, params: dict[str, str]) -> AkaBotActivity:
        return AkaBotActivity(
            activity_type="AkaBot.Core.Activities.LogMessage",
            display_name="処理終了ログ",
            properties={
                "Message": f"[END] {params.get('process_name', 'Main')}",
                "Level": "Info",
            },
        )

    def _create_config_read_component(self, params: dict[str, str]) -> AkaBotActivity:
        return AkaBotActivity(
            activity_type="AkaBot.Excel.Activities.ExcelApplicationScope",
            display_name="共通_Config読込",
            properties={"WorkbookPath": params.get("config_path", "Config.xlsx")},
            children=[
                AkaBotActivity(
                    activity_type="AkaBot.Excel.Activities.ReadRange",
                    display_name="設定値読込",
                    properties={
                        "SheetName": "Settings",
                        "Range": "",
                        "DataTable": "dt_Config",
                    },
                ),
            ],
        )
