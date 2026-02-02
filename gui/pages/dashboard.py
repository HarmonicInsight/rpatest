"""InsightMigration - ダッシュボード (全体進捗・KPI・統計)
Copyright (c) 2025-2026 HarmonicInsight / FPT Consulting Japan. All rights reserved.
"""
from __future__ import annotations

import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st

from migration_framework.common.config import Config
from migration_framework.db.migration_db import MigrationDB

RANK_COLORS = {"A": "#34a853", "B": "#1a73e8", "C": "#f9ab00", "D": "#ea4335"}
STATUS_COLORS = {
    "completed": "#34a853",
    "failed": "#ea4335",
    "pending": "#9e9e9e",
    "manual_required": "#f9ab00",
    "analyzing": "#42a5f5",
    "converting": "#7e57c2",
    "validating": "#26a69a",
    "testing": "#ff7043",
}


def render(config: Config, db: MigrationDB) -> None:
    st.markdown('<div class="main-header">🔷 InsightMigration ダッシュボード</div>', unsafe_allow_html=True)
    st.markdown('<div class="sub-header">RPA移行進捗をリアルタイムで管理 — Powered by InsightMigration</div>', unsafe_allow_html=True)

    summary = db.get_summary()
    records = db.get_all_records()

    total = summary.get("total", 0)
    by_status = summary.get("by_status", {})
    by_rank = summary.get("by_rank", {})
    avg_rate = summary.get("avg_conversion_rate", 0) * 100

    completed = by_status.get("completed", 0)
    failed = by_status.get("failed", 0)
    manual = by_status.get("manual_required", 0)

    # --- KPIカード ---
    cols = st.columns(6)
    kpi_data = [
        ("対象ロボット数", total, "#667eea"),
        ("完了", completed, "#34a853"),
        ("失敗", failed, "#ea4335"),
        ("手動対応", manual, "#f9ab00"),
        ("完了率", f"{completed/total*100:.0f}%" if total > 0 else "0%", "#1a73e8"),
        ("平均変換率", f"{avg_rate:.0f}%", "#7e57c2"),
    ]
    for col, (label, value, color) in zip(cols, kpi_data):
        with col:
            st.markdown(
                f"""<div style="background: {color}; padding: 1rem; border-radius: 10px;
                color: white; text-align: center;">
                <div style="font-size: 1.8rem; font-weight: bold;">{value}</div>
                <div style="font-size: 0.8rem; opacity: 0.9;">{label}</div>
                </div>""",
                unsafe_allow_html=True,
            )

    st.markdown("---")

    if total == 0:
        st.info("まだロボットが登録されていません。「Phase 1: 解析」からロボットファイルをアップロードしてください。")
        return

    # --- チャートセクション ---
    col_left, col_right = st.columns(2)

    with col_left:
        st.subheader("ステータス分布")
        status_df = pd.DataFrame(
            [{"ステータス": k, "件数": v} for k, v in by_status.items()]
        )
        if not status_df.empty:
            colors = [STATUS_COLORS.get(s, "#999") for s in status_df["ステータス"]]
            fig = go.Figure(data=[go.Pie(
                labels=status_df["ステータス"],
                values=status_df["件数"],
                marker=dict(colors=colors),
                hole=0.4,
                textinfo="label+value",
            )])
            fig.update_layout(
                height=350,
                margin=dict(t=20, b=20, l=20, r=20),
                showlegend=True,
                legend=dict(orientation="h", y=-0.1),
            )
            st.plotly_chart(fig, use_container_width=True)

    with col_right:
        st.subheader("難易度ランク分布")
        rank_df = pd.DataFrame(
            [{"ランク": k, "件数": v} for k, v in by_rank.items()]
        )
        if not rank_df.empty:
            rank_order = ["A", "B", "C", "D"]
            rank_df["sort"] = rank_df["ランク"].map(
                {r: i for i, r in enumerate(rank_order)}
            )
            rank_df = rank_df.sort_values("sort")
            colors = [RANK_COLORS.get(r, "#999") for r in rank_df["ランク"]]
            fig = go.Figure(data=[go.Bar(
                x=rank_df["ランク"],
                y=rank_df["件数"],
                marker_color=colors,
                text=rank_df["件数"],
                textposition="outside",
            )])
            fig.update_layout(
                height=350,
                margin=dict(t=20, b=20, l=20, r=20),
                xaxis_title="難易度ランク",
                yaxis_title="ロボット数",
            )
            st.plotly_chart(fig, use_container_width=True)

    # --- フェーズ別進捗 ---
    st.subheader("フェーズ別進捗")
    phase_data = _compute_phase_progress(records)
    cols = st.columns(4)
    phase_info = [
        ("Phase 1: 解析", "analyzed", "#42a5f5", "80%"),
        ("Phase 2: 変換", "converted", "#7e57c2", "55%"),
        ("Phase 3: 検証", "validated", "#26a69a", "90%"),
        ("Phase 4: テスト", "tested", "#ff7043", "70%"),
    ]
    for col, (name, key, color, auto_rate) in zip(cols, phase_info):
        with col:
            done = phase_data.get(key, 0)
            pct = done / total if total > 0 else 0
            st.markdown(f"**{name}**")
            st.markdown(f"自動化率: {auto_rate}")
            st.progress(pct, text=f"{done}/{total} ({pct:.0%})")

    st.markdown("---")

    # --- 推奨スケジュール ---
    st.subheader("推奨スケジュール")
    schedule_cols = st.columns(5)
    schedule = [
        ("Week 1-2", "パイロット (10本)", f"{by_rank.get('A', 0)}本がAランク"),
        ("Week 3-4", "Aランク 40本 (簡単)", "基本アクション中心"),
        ("Week 5-6", "Bランク 50本 (中程度)", "Excel/Web操作含む"),
        ("Week 7-10", "C/Dランク 30本 (複雑)", "OCR/画像認識等"),
        ("Week 11-12", "並行稼働・切替", "UAT・最終承認"),
    ]
    for col, (week, task, detail) in zip(schedule_cols, schedule):
        with col:
            st.markdown(f"**{week}**")
            st.markdown(task)
            st.caption(detail)

    st.markdown("---")

    # --- 最近の変換結果テーブル ---
    st.subheader("ロボット一覧 (上位20件)")
    if records:
        df = pd.DataFrame([
            {
                "ロボット名": r.robot_name,
                "ステータス": r.status.value,
                "ランク": r.difficulty_rank.value,
                "複雑度": f"{r.complexity_score:.1f}",
                "変換率": f"{r.conversion_rate:.0%}",
                "検証スコア": f"{r.validation_score:.1f}",
                "更新日時": r.updated_at.strftime("%Y-%m-%d %H:%M"),
            }
            for r in records[:20]
        ])
        st.dataframe(
            df,
            use_container_width=True,
            hide_index=True,
            column_config={
                "変換率": st.column_config.ProgressColumn(
                    "変換率", format="%.0f%%", min_value=0, max_value=1,
                ),
            },
        )


def _compute_phase_progress(records) -> dict[str, int]:
    """各フェーズの完了数を算出する"""
    from migration_framework.common.models import MigrationStatus

    phase_map = {
        MigrationStatus.ANALYZING: [],
        MigrationStatus.CONVERTING: ["analyzed"],
        MigrationStatus.VALIDATING: ["analyzed", "converted"],
        MigrationStatus.TESTING: ["analyzed", "converted", "validated"],
        MigrationStatus.COMPLETED: ["analyzed", "converted", "validated", "tested"],
        MigrationStatus.MANUAL_REQUIRED: ["analyzed", "converted", "validated"],
    }

    counts = {"analyzed": 0, "converted": 0, "validated": 0, "tested": 0}
    for r in records:
        phases = phase_map.get(r.status, [])
        for p in phases:
            counts[p] += 1

    return counts
