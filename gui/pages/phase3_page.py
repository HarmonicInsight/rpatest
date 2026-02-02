"""Phase 3: 検証画面 - 構文チェック・命名規則・ベストプラクティス"""
from __future__ import annotations

import pandas as pd
import plotly.graph_objects as go
import streamlit as st

from migration_framework.common.config import Config
from migration_framework.common.models import MigrationStatus
from migration_framework.db.migration_db import MigrationDB

SEVERITY_COLORS = {"error": "#ea4335", "warning": "#f9ab00", "info": "#1a73e8"}
SEVERITY_ICONS = {"error": "🔴", "warning": "🟡", "info": "🔵"}


def render(config: Config, db: MigrationDB) -> None:
    st.markdown('<div class="main-header">✅ Phase 3: 検証エンジン</div>', unsafe_allow_html=True)
    st.markdown('<div class="sub-header">構文チェック・命名規則・ベストプラクティス準拠・差分検出 (自動化率: 90%)</div>', unsafe_allow_html=True)

    records = db.get_all_records()

    # KPIカード
    validated = [r for r in records if r.validation_score > 0]
    passed = [r for r in validated if r.validation_score >= 60]
    avg_score = (
        sum(r.validation_score for r in validated) / len(validated)
        if validated
        else 0
    )

    cols = st.columns(4)
    with cols[0]:
        st.metric("検証済み", len(validated))
    with cols[1]:
        st.metric("合格", len(passed))
    with cols[2]:
        st.metric("平均スコア", f"{avg_score:.1f}")
    with cols[3]:
        pass_rate = len(passed) / len(validated) * 100 if validated else 0
        st.metric("合格率", f"{pass_rate:.0f}%")

    st.markdown("---")

    if not records:
        st.info("まだロボットが登録されていません。Phase 1から開始してください。")
        return

    tab_overview, tab_rules, tab_detail = st.tabs([
        "📊 検証概要",
        "📝 命名規則・ベストプラクティス",
        "🔍 詳細結果",
    ])

    with tab_overview:
        _render_overview(records)

    with tab_rules:
        _render_rules(config)

    with tab_detail:
        _render_detail(db, records)


def _render_overview(records: list) -> None:
    """検証概要"""
    validated = [r for r in records if r.validation_score > 0]

    if not validated:
        st.info("検証結果がまだありません。Phase 2で変換後に自動で検証されます。")
        return

    # スコア分布
    st.subheader("検証スコア分布")
    scores = [r.validation_score for r in validated]
    fig = go.Figure(data=[go.Histogram(
        x=scores,
        nbinsx=20,
        marker_color="#1a73e8",
    )])
    fig.update_layout(
        xaxis_title="検証スコア",
        yaxis_title="ロボット数",
        height=350,
        margin=dict(t=20, b=40),
    )
    fig.add_vline(x=60, line_dash="dash", line_color="red", annotation_text="合格ライン")
    st.plotly_chart(fig, use_container_width=True)

    # テーブル
    st.subheader("検証結果一覧")
    df = pd.DataFrame([
        {
            "ロボット名": r.robot_name,
            "ランク": r.difficulty_rank.value,
            "変換率": r.conversion_rate,
            "検証スコア": r.validation_score,
            "判定": "✅ 合格" if r.validation_score >= 60 else "❌ 要修正",
            "手動対応": r.manual_items or "なし",
        }
        for r in validated
    ])
    df = df.sort_values("検証スコア", ascending=False)

    st.dataframe(
        df,
        use_container_width=True,
        hide_index=True,
        column_config={
            "変換率": st.column_config.ProgressColumn(
                "変換率", format="%.0f%%", min_value=0, max_value=1,
            ),
            "検証スコア": st.column_config.ProgressColumn(
                "検証スコア", format="%.1f", min_value=0, max_value=100,
            ),
        },
    )


def _render_rules(config: Config) -> None:
    """命名規則とベストプラクティスの表示"""
    st.subheader("命名規則 (自動チェック率: 95%)")

    rules = [
        ("プロジェクト名", "PRJ_{業務名}_{連番:03d}", "PRJ_請求書処理_001"),
        ("ワークフロー名", "Main / Sub_{機能名}", "Main, Sub_ログイン処理"),
        ("変数名", "{型接頭辞}_{用途}_{スコープ}", "str_filePath_local"),
        ("コメント", "各アクティビティに説明を記述", "「請求書データの読み込み」"),
    ]

    for name, pattern, example in rules:
        with st.expander(f"📌 {name}"):
            st.markdown(f"**規則:** `{pattern}`")
            st.markdown(f"**例:** `{example}`")

    st.markdown("---")
    st.subheader("ベストプラクティス チェック項目")

    practices = [
        ("エラーハンドリング", "TryCatchブロックの存在チェック", "error"),
        ("ログ出力", "開始・終了ログの存在チェック", "warning"),
        ("タイムアウト設定", "Web操作にタイムアウトが設定されているか", "warning"),
        ("ハードコード", "パスやURLの直書きがないか", "info"),
        ("コメント", "主要アクティビティにコメントがあるか", "info"),
    ]

    for name, desc, severity in practices:
        icon = SEVERITY_ICONS.get(severity, "")
        color = SEVERITY_COLORS.get(severity, "#999")
        st.markdown(
            f"{icon} **{name}** — {desc}",
        )


def _render_detail(db: MigrationDB, records: list) -> None:
    """個別ロボットの検証詳細"""
    validated = [r for r in records if r.validation_score > 0]
    if not validated:
        st.info("検証結果がまだありません。")
        return

    selected = st.selectbox(
        "ロボット選択",
        [r.robot_name for r in validated],
    )

    if selected:
        record = next(r for r in validated if r.robot_name == selected)

        col1, col2, col3 = st.columns(3)
        with col1:
            st.metric("検証スコア", f"{record.validation_score:.1f}")
        with col2:
            st.metric("変換率", f"{record.conversion_rate:.0%}")
        with col3:
            status = "✅ 合格" if record.validation_score >= 60 else "❌ 要修正"
            st.metric("判定", status)

        # スコアゲージ
        fig = go.Figure(go.Indicator(
            mode="gauge+number",
            value=record.validation_score,
            domain={"x": [0, 1], "y": [0, 1]},
            gauge={
                "axis": {"range": [0, 100]},
                "bar": {"color": "#1a73e8"},
                "steps": [
                    {"range": [0, 40], "color": "#fce4ec"},
                    {"range": [40, 60], "color": "#fff3e0"},
                    {"range": [60, 80], "color": "#e8f5e9"},
                    {"range": [80, 100], "color": "#c8e6c9"},
                ],
                "threshold": {
                    "line": {"color": "red", "width": 2},
                    "thickness": 0.75,
                    "value": 60,
                },
            },
            title={"text": "品質スコア"},
        ))
        fig.update_layout(height=300, margin=dict(t=50, b=20))
        st.plotly_chart(fig, use_container_width=True)

        if record.manual_items:
            st.subheader("手動対応項目")
            for item in record.manual_items.split(";"):
                item = item.strip()
                if item:
                    st.checkbox(item, key=f"manual_{selected}_{item}")
