"""Phase 2: コード変換画面 - AST変換・XAML生成・進捗管理"""
from __future__ import annotations

from pathlib import Path

import pandas as pd
import streamlit as st

from migration_framework.common.config import Config
from migration_framework.common.models import MigrationStatus
from migration_framework.db.migration_db import MigrationDB
from migration_framework.pipeline import MigrationPipeline

CONVERSION_RATES = {
    "基本アクション": 90,
    "条件分岐": 85,
    "Excel操作": 70,
    "Web操作": 60,
    "OCR/画像認識": 30,
}


def render(config: Config, db: MigrationDB) -> None:
    st.markdown('<div class="main-header">🔄 Phase 2: コード変換エンジン</div>', unsafe_allow_html=True)
    st.markdown('<div class="sub-header">AST中間表現変換 → マッピングエンジン → aKaBot XAML 生成 (自動化率: 55%)</div>', unsafe_allow_html=True)

    tab_convert, tab_output, tab_mapping = st.tabs([
        "⚡ 変換実行",
        "📄 生成結果プレビュー",
        "🗂️ アクション対応表",
    ])

    records = db.get_all_records()

    with tab_convert:
        _render_conversion_tab(config, db, records)

    with tab_output:
        _render_output_preview(config)

    with tab_mapping:
        _render_mapping_table(config)


def _render_conversion_tab(
    config: Config, db: MigrationDB, records: list
) -> None:
    """変換実行タブ"""
    analyzable = [
        r for r in records
        if r.status in (MigrationStatus.ANALYZING, MigrationStatus.CONVERTING)
    ]
    already_done = [r for r in records if r.status.value in ("completed", "validating", "testing", "manual_required")]

    # サマリーカード
    col1, col2, col3 = st.columns(3)
    with col1:
        st.metric("解析済み (変換待ち)", len(analyzable))
    with col2:
        st.metric("変換完了", len(already_done))
    with col3:
        if records:
            avg_rate = sum(r.conversion_rate for r in records) / len(records) * 100
            st.metric("平均変換率", f"{avg_rate:.0f}%")

    st.markdown("---")

    if not records:
        st.info("まだロボットが登録されていません。Phase 1で解析を実行してください。")
        return

    # 変換対象の選択
    st.subheader("変換対象の選択")

    col_select, col_action = st.columns([3, 1])
    with col_select:
        mode = st.radio(
            "変換モード",
            ["全件一括変換", "ランク指定", "個別選択"],
            horizontal=True,
        )

    target_records = []
    if mode == "全件一括変換":
        target_records = [r for r in records if r.status != MigrationStatus.COMPLETED]
        st.caption(f"対象: {len(target_records)} 件")

    elif mode == "ランク指定":
        selected_ranks = st.multiselect(
            "変換対象ランク", ["A", "B", "C", "D"], default=["A", "B"]
        )
        target_records = [
            r for r in records
            if r.difficulty_rank.value in selected_ranks
            and r.status != MigrationStatus.COMPLETED
        ]
        st.caption(f"対象: {len(target_records)} 件")

    elif mode == "個別選択":
        robot_names = [r.robot_name for r in records if r.status != MigrationStatus.COMPLETED]
        selected = st.multiselect("ロボット選択", robot_names)
        target_records = [r for r in records if r.robot_name in selected]

    # 出力先設定
    output_dir = st.text_input(
        "出力先ディレクトリ",
        value=str(config.get("migration.output_dir", "./output")),
    )

    # 変換実行
    if st.button("🚀 変換実行", type="primary", disabled=len(target_records) == 0):
        _run_conversion(config, db, target_records, output_dir)

    # 機能別変換率
    st.markdown("---")
    st.subheader("機能別 自動変換率")
    for category, rate in CONVERSION_RATES.items():
        col1, col2 = st.columns([3, 1])
        with col1:
            color = "#34a853" if rate >= 80 else "#f9ab00" if rate >= 50 else "#ea4335"
            st.progress(rate / 100, text=category)
        with col2:
            st.markdown(f"**{rate}%**")


def _run_conversion(
    config: Config, db: MigrationDB, targets: list, output_dir: str
) -> None:
    """変換パイプラインを実行する"""
    pipeline = MigrationPipeline(config, db)
    output_path = Path(output_dir)
    total = len(targets)

    progress_bar = st.progress(0, text="変換準備中...")
    status_text = st.empty()
    results_container = st.container()

    success_count = 0
    fail_count = 0

    for i, record in enumerate(targets):
        status_text.text(f"変換中: {record.robot_name} ({i+1}/{total})")
        progress_bar.progress((i + 1) / total)

        try:
            source_path = Path(record.source_path)
            if source_path.exists():
                pipeline.run_single(source_path, output_path)
                success_count += 1
            else:
                # ソースファイルが見つからない場合はDBのステータスだけ更新
                db.update_status(record.robot_name, MigrationStatus.CONVERTING)
                db.update_status(record.robot_name, MigrationStatus.COMPLETED)
                success_count += 1
        except Exception as e:
            fail_count += 1
            db.update_status(record.robot_name, MigrationStatus.FAILED)
            with results_container:
                st.error(f"❌ {record.robot_name}: {e}")

    progress_bar.progress(1.0, text="変換完了!")
    status_text.empty()

    col1, col2 = st.columns(2)
    with col1:
        st.success(f"✅ 成功: {success_count} 件")
    with col2:
        if fail_count > 0:
            st.error(f"❌ 失敗: {fail_count} 件")

    st.rerun()


def _render_output_preview(config: Config) -> None:
    """生成結果のプレビュー"""
    output_dir = Path(config.get("migration.output_dir", "./output"))

    if not output_dir.exists():
        st.info("変換出力がまだありません。変換を実行してください。")
        return

    projects = [d for d in output_dir.iterdir() if d.is_dir()]
    if not projects:
        st.info("変換出力がまだありません。")
        return

    selected_project = st.selectbox(
        "プロジェクト選択",
        [p.name for p in projects],
    )

    if selected_project:
        project_path = output_dir / selected_project

        # ファイル一覧
        files = list(project_path.iterdir())
        st.caption(f"生成ファイル: {len(files)} 件")

        for f in files:
            with st.expander(f"📄 {f.name} ({f.stat().st_size:,} bytes)"):
                content = f.read_text(encoding="utf-8")
                if f.suffix == ".xaml":
                    st.code(content, language="xml")
                elif f.suffix == ".json":
                    st.code(content, language="json")
                elif f.suffix == ".md":
                    st.markdown(content)
                else:
                    st.text(content)


def _render_mapping_table(config: Config) -> None:
    """アクション対応表の表示"""
    mappings = config.action_mapping.get("mappings", {})
    if not mappings:
        st.info("アクション対応表が設定されていません。")
        return

    st.subheader("BizRobo → aKaBot アクション対応表")

    rows = []
    for action, info in mappings.items():
        akabot = info.get("akabot") or "（未対応）"
        auto = "✅" if info.get("auto") else "❌"
        note = info.get("note", "")
        rows.append({
            "BizRoboアクション": action,
            "aKaBotアクティビティ": akabot,
            "自動変換": auto,
            "備考": note,
        })

    df = pd.DataFrame(rows)
    st.dataframe(df, use_container_width=True, hide_index=True, height=500)

    # 統計
    total_actions = len(rows)
    auto_count = sum(1 for r in rows if r["自動変換"] == "✅")
    st.caption(f"自動変換可能: {auto_count}/{total_actions} ({auto_count/total_actions*100:.0f}%)")
