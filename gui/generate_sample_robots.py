"""100本のサンプルBizRoboファイルを生成するスクリプト"""
from __future__ import annotations

import random
from pathlib import Path

BUSINESS_NAMES = [
    "請求書処理", "注文管理", "在庫確認", "出荷通知", "入金消込",
    "経費精算", "勤怠集計", "給与計算", "社員登録", "退職処理",
    "契約更新", "見積作成", "受注登録", "発注処理", "検品確認",
    "売上集計", "仕入管理", "債権管理", "債務管理", "決算処理",
    "顧客登録", "問合せ対応", "クレーム管理", "返品処理", "交換対応",
    "メール配信", "レポート生成", "データ同期", "バックアップ", "監視通知",
    "PDF変換", "CSV取込", "Excel集計", "帳票出力", "ラベル印刷",
    "承認ワーク", "稟議処理", "旅費精算", "交通費計算", "名刺登録",
    "採用管理", "面接調整", "研修登録", "評価入力", "異動処理",
    "資産管理", "棚卸処理", "設備点検", "保守管理", "廃棄処理",
]

ACTION_TEMPLATES = {
    "simple": {
        "actions": ["OpenBrowser", "Click", "TypeInto", "GetText", "CloseBrowser"],
        "vars": [("url", "String"), ("result", "String")],
        "complexity": "low",
    },
    "excel": {
        "actions": ["ExcelOpen", "ExcelReadRange", "ForEach", "If", "ExcelWriteCell", "Log"],
        "vars": [("filePath", "String"), ("dataTable", "DataTable"), ("rowCount", "Integer")],
        "complexity": "medium",
    },
    "web_form": {
        "actions": ["OpenBrowser", "Navigate", "WaitElement", "TypeInto", "Click",
                     "GetText", "If", "Log", "CloseBrowser"],
        "vars": [("url", "String"), ("userId", "String"), ("password", "String"),
                 ("result", "String"), ("isSuccess", "Boolean")],
        "complexity": "medium",
    },
    "data_processing": {
        "actions": ["ExcelOpen", "ExcelReadRange", "ForEach", "If", "Switch",
                     "Assign", "ExcelWriteRange", "SendMail", "Log"],
        "vars": [("inputPath", "String"), ("outputPath", "String"),
                 ("dataTable", "DataTable"), ("count", "Integer"), ("status", "String")],
        "complexity": "high",
    },
    "complex_integration": {
        "actions": ["OpenBrowser", "Navigate", "WaitElement", "TypeInto", "Click",
                     "ExtractData", "ExcelOpen", "ExcelReadRange", "ForEach",
                     "If", "Switch", "TryCatch", "Assign", "SendMail", "Log",
                     "CopyFile", "Delay"],
        "vars": [("url", "String"), ("filePath", "String"), ("outputPath", "String"),
                 ("dataTable", "DataTable"), ("rowCount", "Integer"),
                 ("isSuccess", "Boolean"), ("errorMsg", "String")],
        "complexity": "very_high",
    },
    "ocr_image": {
        "actions": ["OpenBrowser", "Navigate", "OCRRead", "ImageRecognition",
                     "If", "Assign", "ExcelWriteCell", "Log"],
        "vars": [("imagePath", "String"), ("ocrResult", "String"),
                 ("confidence", "Double"), ("isValid", "Boolean")],
        "complexity": "very_high",
    },
}


def _generate_action_xml(action_type: str, depth: int = 0) -> str:
    indent = "    " * (depth + 2)
    props = _random_properties(action_type)
    if props:
        prop_str = " ".join(f'{k}="{v}"' for k, v in props.items())
        return f'{indent}<{action_type} {prop_str}/>'
    return f'{indent}<{action_type}/>'


def _random_properties(action_type: str) -> dict[str, str]:
    prop_map = {
        "OpenBrowser": {"url": "https://example.com", "browserType": "Chrome"},
        "Navigate": {"url": "https://erp.example.com"},
        "Click": {"selector": f"#{random.choice(['btn', 'submit', 'next', 'login'])}"},
        "TypeInto": {"selector": f"#input_{random.randint(1,10)}", "text": "${variable}"},
        "GetText": {"selector": f"#output_{random.randint(1,5)}"},
        "WaitElement": {"selector": "#loading", "timeout": str(random.randint(10, 30))},
        "ExcelOpen": {"filePath": f"C:\\Data\\{random.choice(['input', 'output', 'data'])}.xlsx"},
        "ExcelReadRange": {"sheet": "Sheet1", "range": "A1:Z100"},
        "ExcelWriteCell": {"sheet": "Sheet1", "cell": f"A{random.randint(1,100)}"},
        "ExcelWriteRange": {"sheet": "結果", "range": "A1"},
        "Assign": {"variable": "result", "value": "processed"},
        "Log": {"message": "処理完了", "level": "Info"},
        "SendMail": {"to": "admin@example.com", "subject": "処理結果通知"},
        "Delay": {"duration": str(random.randint(1000, 5000))},
        "CopyFile": {"source": "C:\\temp\\in.txt", "destination": "C:\\temp\\out.txt"},
    }
    return prop_map.get(action_type, {})


def generate_robot_xml(name: str, template_key: str, seq: int) -> str:
    template = ACTION_TEMPLATES[template_key]
    actions = template["actions"]
    variables = template["vars"]

    # アクション数をランダムに増減
    repeat = random.randint(1, 3)
    all_actions = actions * repeat
    random.shuffle(all_actions)

    # ForEachやIfはネスト構造にせず、フラットに前後で開閉する
    action_lines = []
    regular_actions = [a for a in all_actions if a not in ("ForEach", "If")]
    has_foreach = "ForEach" in all_actions
    has_if = "If" in all_actions

    if has_foreach:
        action_lines.append('        <ForEach collection="dataTable" itemVariable="row">')
    if has_if:
        indent = "            " if has_foreach else "        "
        action_lines.append(f'{indent}<If condition="row != null">')

    for act in regular_actions:
        depth = 0
        if has_foreach:
            depth += 1
        if has_if:
            depth += 1
        action_lines.append(_generate_action_xml(act, depth))

    if has_if:
        indent = "            " if has_foreach else "        "
        action_lines.append(f"{indent}</If>")
    if has_foreach:
        action_lines.append("        </ForEach>")

    var_lines = []
    for vname, vtype in variables:
        default = {
            "String": f"C:\\Data\\{name}.xlsx",
            "Integer": "0",
            "Boolean": "false",
            "Double": "0.0",
            "DataTable": "",
        }.get(vtype, "")
        var_lines.append(
            f'        <Variable name="{vname}" type="{vtype}" default="{default}"/>'
        )

    xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<BizRoboRobot name="{name}" version="10.7">
    <Settings>
        <DesktopAutomation enabled="{'true' if template_key in ('complex_integration', 'ocr_image') else 'false'}"/>
        <Timeout value="{random.randint(30, 120)}"/>
    </Settings>
    <Variables>
{chr(10).join(var_lines)}
    </Variables>
    <Actions>
        <TryCatch>
{chr(10).join(action_lines)}
        </TryCatch>
    </Actions>
    <SubRobots>
{f'        <SubRobot ref="共通_ログイン処理"/>' if random.random() > 0.5 else ''}
{f'        <SubRobot ref="共通_メール送信"/>' if random.random() > 0.7 else ''}
    </SubRobots>
</BizRoboRobot>"""
    return xml


def main() -> None:
    output_dir = Path(__file__).parent.parent / "samples" / "bizrobo_input"
    output_dir.mkdir(parents=True, exist_ok=True)

    # 既存のサンプルを保持しつつ、100本生成
    template_distribution = {
        "simple": 30,
        "excel": 25,
        "web_form": 20,
        "data_processing": 15,
        "complex_integration": 7,
        "ocr_image": 3,
    }

    seq = 1
    all_files = []

    for template_key, count in template_distribution.items():
        for i in range(count):
            biz_idx = (seq - 1) % len(BUSINESS_NAMES)
            name = BUSINESS_NAMES[biz_idx]
            robot_name = f"{name}_{seq:03d}"
            filename = f"robot_{seq:03d}_{name}.xml"

            xml_content = generate_robot_xml(robot_name, template_key, seq)
            filepath = output_dir / filename
            filepath.write_text(xml_content, encoding="utf-8")

            all_files.append(filename)
            seq += 1

    print(f"生成完了: {len(all_files)} ファイル → {output_dir}")


if __name__ == "__main__":
    main()
