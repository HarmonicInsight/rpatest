"""ロボット一覧・詳細・一括操作画面"""
from __future__ import annotations

from pathlib import Path

import pandas as pd
import plotly.graph_objects as go
import streamlit as st

from migration_framework.common.config import Config
from migration_framework.common.models import MigrationRecord, MigrationStatus
from migration_framework.db.migration_db import MigrationDB

RANK_COLORS = {"A": "#34a853", "B": "#1a73e8", "C": "#f9ab00", "D": "#ea4335"}
STATUS_LABELS = {
    "pending": "待機中",
    "analyzing": "解析中",
    "converting": "変換中",
    "validating": "検証中",
    "testing": "テスト中",
    "completed": "完了",
    "failed": "失敗",
    "manual_required": "手動対応",
}


def render(config: Config, db: MigrationDB) -> None:
    st.markdown('<div class="main-header">📋 ロボット一覧</div>', unsafe_allow_html=True)
    st.markdown('<div class="sub-header">全ロボットの管理・詳細表示・一括操作</div>', unsafe_allow_html=True)

    records = db.get_all_records()

    if not records:
        st.info("まだロボットが登録されていません。Phase 1で解析を実行してください。")
        return

    tab_list, tab_detail, tab_batch = st.tabs([
        "📋 一覧表示",
        "🔍 詳細表示",
        "⚡ 一括操作",
    ])

    with tab_list:
        _render_list(records)

    with tab_detail:
        _render_detail(config, db, records)

    with tab_batch:
        _render_batch_operations(config, db, records)


def _render_list(records: list) -> None:
    """一覧テーブル"""
    # フィルタ
    col1, col2, col3 = st.columns(3)
    with col1:
        rank_filter = st.multiselect(
            "ランク", ["A", "B", "C", "D"],
            default=["A", "B", "C", "D"],
            key="list_rank",
        )
    with col2:
        status_opts = list(set(r.status.value for r in records))
        status_filter = st.multiselect(
            "ステータス", status_opts, default=status_opts, key="list_status"
        )
    with col3:
        search = st.text_input("検索", placeholder="ロボット名を入力...", key="list_search")

    # フィルタ適用
    filtered = records
    if rank_filter:
        filtered = [r for r in filtered if r.difficulty_rank.value in rank_filter]
    if status_filter:
        filtered = [r for r in filtered if r.status.value in status_filter]
    if search:
        filtered = [r for r in filtered if search.lower() in r.robot_name.lower()]

    st.caption(f"表示中: {len(filtered)} / {len(records)} 件")

    # テーブル
    if filtered:
        df = pd.DataFrame([
            {
                "ロボット名": r.robot_name,
                "ステータス": STATUS_LABELS.get(r.status.value, r.status.value),
                "ランク": r.difficulty_rank.value,
                "複雑度": r.complexity_score,
                "変換率": r.conversion_rate,
                "検証スコア": r.validation_score,
                "テスト合格率": r.test_pass_rate,
                "更新日時": r.updated_at.strftime("%m/%d %H:%M"),
            }
            for r in filtered
        ])

        st.dataframe(
            df,
            use_container_width=True,
            hide_index=True,
            height=600,
            column_config={
                "変換率": st.column_config.ProgressColumn(
                    "変換率", format="%.0f%%", min_value=0, max_value=1,
                ),
                "検証スコア": st.column_config.ProgressColumn(
                    "検証スコア", format="%.0f", min_value=0, max_value=100,
                ),
                "テスト合格率": st.column_config.ProgressColumn(
                    "テスト合格率", format="%.0f%%", min_value=0, max_value=1,
                ),
            },
        )

        # CSV エクスポート
        csv = df.to_csv(index=False).encode("utf-8-sig")
        st.download_button(
            "📥 CSV エクスポート",
            csv,
            file_name="migration_status.csv",
            mime="text/csv",
        )


def _render_detail(config: Config, db: MigrationDB, records: list) -> None:
    """個別ロボットの詳細表示"""
    selected = st.selectbox(
        "ロボット選択",
        [r.robot_name for r in records],
        key="detail_select",
    )

    if not selected:
        return

    record = next(r for r in records if r.robot_name == selected)

    # ヘッダー
    rank_color = RANK_COLORS.get(record.difficulty_rank.value, "#999")
    st.markdown(
        f"""<div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
        <div style="font-size: 1.5rem; font-weight: bold;">{record.robot_name}</div>
        <div style="background: {rank_color}; color: white; padding: 0.2rem 0.8rem;
        border-radius: 20px; font-weight: bold;">ランク {record.difficulty_rank.value}</div>
        <div style="color: #5f6368;">{STATUS_LABELS.get(record.status.value, record.status.value)}</div>
        </div>""",
        unsafe_allow_html=True,
    )

    # メトリクス行
    cols = st.columns(5)
    metrics = [
        ("複雑度", f"{record.complexity_score:.1f}"),
        ("変換率", f"{record.conversion_rate:.0%}"),
        ("検証スコア", f"{record.validation_score:.1f}"),
        ("テスト合格率", f"{record.test_pass_rate:.0%}"),
        ("ステータス", STATUS_LABELS.get(record.status.value, record.status.value)),
    ]
    for col, (label, value) in zip(cols, metrics):
        col.metric(label, value)

    # 進捗フロー
    st.markdown("---")
    st.subheader("移行フロー")

    phases = [
        ("Phase 1: 解析", MigrationStatus.ANALYZING),
        ("Phase 2: 変換", MigrationStatus.CONVERTING),
        ("Phase 3: 検証", MigrationStatus.VALIDATING),
        ("Phase 4: テスト", MigrationStatus.TESTING),
        ("完了", MigrationStatus.COMPLETED),
    ]

    status_order = [s.value for _, s in phases]
    current_idx = (
        status_order.index(record.status.value)
        if record.status.value in status_order
        else -1
    )

    phase_cols = st.columns(5)
    for i, (col, (name, _)) in enumerate(zip(phase_cols, phases)):
        with col:
            if i <= current_idx:
                st.markdown(f"✅ **{name}**")
            elif i == current_idx + 1:
                st.markdown(f"🔵 **{name}**")
            else:
                st.markdown(f"⬜ {name}")

    # 手動対応項目
    if record.manual_items:
        st.markdown("---")
        st.subheader("手動対応項目")
        for item in record.manual_items.split(";"):
            item = item.strip()
            if item and item != "なし":
                st.checkbox(item, key=f"detail_{selected}_{item}")

    # 出力ファイル
    output_dir = Path(config.get("migration.output_dir", "./output")) / f"PRJ_{record.robot_name}"
    if output_dir.exists():
        st.markdown("---")
        st.subheader("出力ファイル")
        for f in output_dir.iterdir():
            with st.expander(f"📄 {f.name}"):
                content = f.read_text(encoding="utf-8")
                lang = "xml" if f.suffix == ".xaml" else "json" if f.suffix == ".json" else "markdown"
                st.code(content, language=lang)

    # ログ
    st.markdown("---")
    st.subheader("操作ログ")
    logs = db.get_logs(record.robot_name) if hasattr(db, "get_logs") else []
    if logs:
        for log in logs:
            st.text(f"[{log['timestamp']}] [{log['phase']}] {log['message']}")
    else:
        st.caption("ログが記録されていません")


def _render_batch_operations(config: Config, db: MigrationDB, records: list) -> None:
    """一括操作"""
    st.subheader("一括操作")

    # 対象選択
    col1, col2 = st.columns(2)
    with col1:
        batch_rank = st.multiselect(
            "ランク選択", ["A", "B", "C", "D"], key="batch_rank"
        )
    with col2:
        batch_status = st.multiselect(
            "ステータス選択",
            list(set(r.status.value for r in records)),
            key="batch_status",
        )

    targets = records
    if batch_rank:
        targets = [r for r in targets if r.difficulty_rank.value in batch_rank]
    if batch_status:
        targets = [r for r in targets if r.status.value in batch_status]

    st.caption(f"対象: {len(targets)} 件")

    st.markdown("---")

    # 操作ボタン
    col1, col2, col3, col4 = st.columns(4)

    with col1:
        if st.button("🔄 一括再解析", disabled=len(targets) == 0):
            for r in targets:
                db.update_status(r.robot_name, MigrationStatus.ANALYZING)
            st.success(f"{len(targets)} 件のステータスをリセットしました")
            st.rerun()

    with col2:
        if st.button("⚡ 一括変換実行", disabled=len(targets) == 0):
            st.info("Phase 2「変換」画面から一括変換を実行してください")

    with col3:
        if st.button("🗑️ 選択削除", disabled=len(targets) == 0, type="secondary"):
            if st.session_state.get("confirm_delete"):
                for r in targets:
                    db.delete_record(r.robot_name)
                st.session_state.confirm_delete = False
                st.success(f"{len(targets)} 件を削除しました")
                st.rerun()
            else:
                st.session_state.confirm_delete = True
                st.warning("もう一度クリックすると削除を実行します")

    with col4:
        # Excel エクスポート
        if targets:
            df = pd.DataFrame([
                {
                    "ロボット名": r.robot_name,
                    "ステータス": r.status.value,
                    "ランク": r.difficulty_rank.value,
                    "複雑度": r.complexity_score,
                    "変換率": f"{r.conversion_rate:.0%}",
                    "検証スコア": r.validation_score,
                    "テスト合格率": f"{r.test_pass_rate:.0%}",
                    "手動対応": r.manual_items or "なし",
                }
                for r in targets
            ])
            csv = df.to_csv(index=False).encode("utf-8-sig")
            st.download_button(
                "📥 CSV出力",
                csv,
                file_name="robots_export.csv",
                mime="text/csv",
            )
