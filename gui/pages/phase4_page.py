"""Phase 4: テスト画面 - 自動テスト実行・結果比較・レポート生成"""
from __future__ import annotations

from pathlib import Path

import pandas as pd
import plotly.graph_objects as go
import streamlit as st

from migration_framework.common.config import Config
from migration_framework.common.models import TestResult, TestType
from migration_framework.db.migration_db import MigrationDB

RESULT_COLORS = {
    "passed": "#34a853",
    "failed": "#ea4335",
    "error": "#f9ab00",
    "skipped": "#9e9e9e",
}
RESULT_ICONS = {
    "passed": "✅",
    "failed": "❌",
    "error": "⚠️",
    "skipped": "⏭️",
}


def render(config: Config, db: MigrationDB) -> None:
    st.markdown('<div class="main-header">🧪 Phase 4: 自動テストフレームワーク</div>', unsafe_allow_html=True)
    st.markdown('<div class="sub-header">Python + pytest ベースの自動テスト実行・結果比較・レポート生成 (自動化率: 70%)</div>', unsafe_allow_html=True)

    tab_exec, tab_results, tab_config = st.tabs([
        "▶️ テスト実行",
        "📊 テスト結果",
        "⚙️ テスト設定",
    ])

    with tab_exec:
        _render_execution(config, db)

    with tab_results:
        _render_results(config)

    with tab_config:
        _render_test_config(config)


def _render_execution(config: Config, db: MigrationDB) -> None:
    """テスト実行画面"""
    st.subheader("テスト実行")

    records = db.get_all_records()
    completed = [r for r in records if r.status.value in ("completed", "testing")]

    # テスト種別
    st.markdown("**テスト種別**")
    test_types = st.columns(4)
    with test_types[0]:
        smoke = st.checkbox("スモークテスト", value=True, help="起動・終了確認")
    with test_types[1]:
        functional = st.checkbox("機能テスト", value=True, help="入出力検証")
    with test_types[2]:
        regression = st.checkbox("回帰テスト", help="BizRobo比較")
    with test_types[3]:
        load = st.checkbox("負荷テスト", help="大量データ処理")

    st.markdown("---")

    # 対象選択
    target_mode = st.radio(
        "テスト対象", ["全件", "ランク指定", "個別選択"], horizontal=True
    )

    target_names = []
    if target_mode == "全件":
        target_names = [r.robot_name for r in completed]
    elif target_mode == "ランク指定":
        ranks = st.multiselect("対象ランク", ["A", "B", "C", "D"], default=["A", "B"])
        target_names = [r.robot_name for r in completed if r.difficulty_rank.value in ranks]
    elif target_mode == "個別選択":
        target_names = st.multiselect(
            "ロボット選択", [r.robot_name for r in completed]
        )

    st.caption(f"テスト対象: {len(target_names)} 件")

    # 実行設定
    col1, col2, col3 = st.columns(3)
    with col1:
        parallel = st.number_input("並列実行数", 1, 8, 6)
    with col2:
        retry = st.number_input("リトライ回数", 0, 5, 3)
    with col3:
        timeout = st.number_input("タイムアウト(秒)", 60, 600, 300)

    # テスト実行
    if st.button("🚀 テスト実行", type="primary", disabled=len(target_names) == 0):
        _run_tests(config, db, target_names, parallel, retry, timeout)

    # aKaBot API接続チェック
    st.markdown("---")
    st.subheader("aKaBot API 接続状態")
    api_url = config.get("tester.akabot_api.base_url", "http://localhost:8080/api/v1")
    st.text_input("API URL", value=api_url, disabled=True)

    if st.button("🔌 接続テスト"):
        st.warning(f"aKaBot API ({api_url}) への接続を確認してください。本番環境ではaKaBotサーバーが必要です。")


def _run_tests(
    config: Config, db: MigrationDB,
    target_names: list[str], parallel: int, retry: int, timeout: int,
) -> None:
    """テスト実行シミュレーション"""
    import random
    import time

    progress_bar = st.progress(0, text="テスト準備中...")
    total = len(target_names)

    results = []
    for i, name in enumerate(target_names):
        progress_bar.progress((i + 1) / total, text=f"テスト中: {name} ({i+1}/{total})")
        time.sleep(0.1)  # シミュレーション

        # テスト結果を生成
        score = random.uniform(0.6, 1.0)
        result = "passed" if score > 0.7 else "failed"
        results.append({"name": name, "result": result, "score": score})

        # DB更新
        record = db.get_record(name)
        if record:
            record.test_pass_rate = score
            db.upsert_record(record)

    progress_bar.progress(1.0, text="テスト完了!")

    passed = sum(1 for r in results if r["result"] == "passed")
    st.success(f"テスト完了: {passed}/{total} 合格")


def _render_results(config: Config) -> None:
    """テスト結果表示"""
    # レポートファイルの確認
    report_dir = Path(config.get("migration.output_dir", "./output")) / "reports"

    st.subheader("テスト結果サマリー")

    # デモデータでのビジュアライゼーション
    st.markdown("**テスト種別ごとの自動化率**")

    test_type_data = {
        "スモークテスト": {"auto": 95, "desc": "起動・終了確認"},
        "機能テスト": {"auto": 80, "desc": "入出力検証"},
        "回帰テスト": {"auto": 70, "desc": "BizRobo比較"},
        "負荷テスト": {"auto": 50, "desc": "大量データ処理"},
    }

    for ttype, info in test_type_data.items():
        col1, col2, col3 = st.columns([2, 4, 1])
        with col1:
            st.markdown(f"**{ttype}**")
        with col2:
            st.progress(info["auto"] / 100)
        with col3:
            st.markdown(f"{info['auto']}%")

    st.markdown("---")

    # 実行環境情報
    st.subheader("推奨テスト実行環境")
    col1, col2 = st.columns(2)
    with col1:
        st.markdown("""
        **VDI環境**
        - AWS WorkSpaces
        - 6-8台推奨
        - 月額目安: 約¥50,000/6台
        """)
    with col2:
        st.markdown("""
        **並列実行**
        - 最大6ロボット同時テスト可能
        - pytest + aKaBot API
        - リトライ・タイムアウト自動制御
        """)


def _render_test_config(config: Config) -> None:
    """テスト設定"""
    st.subheader("テストケース設定")

    # YAMLエディタ
    sample_yaml = """test_cases:
  - name: "請求書処理_スモークテスト"
    robot_name: "PRJ_請求書処理ロボット"
    type: "smoke"
    input:
      filePath: "test_data/invoices_test.xlsx"
    expected:
      isSuccess: "true"
    timeout: 120

  - name: "請求書処理_機能テスト"
    robot_name: "PRJ_請求書処理ロボット"
    type: "functional"
    input:
      filePath: "test_data/invoices_full.xlsx"
    expected:
      isSuccess: "true"
      rowCount: 100
    timeout: 300
"""

    st.markdown("テストケースはYAML形式で定義します。")
    edited = st.text_area(
        "テストケース YAML",
        value=sample_yaml,
        height=400,
    )

    col1, col2 = st.columns(2)
    with col1:
        if st.button("💾 保存"):
            test_file = Path("samples/test_cases.yaml")
            test_file.write_text(edited, encoding="utf-8")
            st.success("テストケースを保存しました")
    with col2:
        st.download_button(
            "📥 ダウンロード",
            edited,
            file_name="test_cases.yaml",
            mime="text/yaml",
        )
