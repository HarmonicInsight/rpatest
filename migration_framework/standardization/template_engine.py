"""テンプレートエンジン - 基本テンプレート・業務テンプレートの適用"""
from __future__ import annotations

import logging
from typing import Any

from migration_framework.common.models import AkaBotActivity

from .component_library import ComponentLibrary

logger = logging.getLogger(__name__)


class TemplateEngine:
    """aKaBotプロジェクトテンプレートを生成する

    テンプレート:
    - 基本テンプレート: Main構造 + Config読込
    - 業務テンプレート: 請求書処理、データ連携 等
    """

    def __init__(self, component_library: ComponentLibrary | None = None):
        self.library = component_library or ComponentLibrary()

    def apply_main_template(
        self,
        activities: list[AkaBotActivity],
        process_name: str = "Main",
    ) -> list[AkaBotActivity]:
        """基本テンプレート(Main構造)を適用する

        構造:
        1. 処理開始ログ
        2. Config読込
        3. TryCatch (メイン処理)
        4. 処理終了ログ
        """
        template: list[AkaBotActivity] = []

        # 処理開始ログ
        log_start = self.library.get_component(
            "log_start", {"process_name": process_name}
        )
        if log_start:
            template.append(log_start)

        # Config読込
        config_read = self.library.get_component("config_read", {})
        if config_read:
            template.append(config_read)

        # TryCatch でメイン処理を囲む
        try_catch = AkaBotActivity(
            activity_type="AkaBot.Core.Activities.TryCatch",
            display_name="メイン処理",
            children=activities,
        )
        template.append(try_catch)

        # 処理終了ログ
        log_end = self.library.get_component(
            "log_end", {"process_name": process_name}
        )
        if log_end:
            template.append(log_end)

        logger.info("基本テンプレート適用: %s", process_name)
        return template

    def create_invoice_template(
        self, params: dict[str, Any] | None = None
    ) -> list[AkaBotActivity]:
        """請求書処理テンプレート"""
        p = params or {}
        activities = [
            self.library.get_component("excel_read", {
                "file_path": p.get("input_file", "請求書一覧.xlsx"),
                "output_var": "dt_Invoices",
            }),
            AkaBotActivity(
                activity_type="AkaBot.Core.Activities.ForEach",
                display_name="請求書ループ処理",
                properties={"Values": "dt_Invoices"},
                children=[
                    AkaBotActivity(
                        activity_type="AkaBot.Core.Activities.LogMessage",
                        display_name="処理中ログ",
                        properties={"Message": "請求書処理中: CurrentItem", "Level": "Info"},
                    ),
                ],
            ),
            self.library.get_component("excel_write", {
                "file_path": p.get("output_file", "処理結果.xlsx"),
                "input_var": "dt_Results",
            }),
        ]
        return [a for a in activities if a is not None]

    def create_data_integration_template(
        self, params: dict[str, Any] | None = None
    ) -> list[AkaBotActivity]:
        """データ連携テンプレート"""
        p = params or {}
        activities = [
            self.library.get_component("excel_read", {
                "file_path": p.get("source_file", "入力データ.xlsx"),
                "output_var": "dt_Source",
            }),
            AkaBotActivity(
                activity_type="AkaBot.Core.Activities.ForEach",
                display_name="データ連携ループ",
                properties={"Values": "dt_Source"},
                children=[
                    AkaBotActivity(
                        activity_type="AkaBot.Core.Activities.Assign",
                        display_name="データ変換",
                        properties={},
                    ),
                ],
            ),
            self.library.get_component("send_mail", {
                "to": p.get("notify_to", ""),
                "subject": "データ連携完了",
                "body": "データ連携処理が完了しました",
            }),
        ]
        return [a for a in activities if a is not None]
