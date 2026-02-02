"""Phase 1: BizRobo解析画面 - ファイルアップロード・一括解析・ランク判定"""
from __future__ import annotations

import tempfile
from pathlib import Path

import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st

from migration_framework.common.config import Config
from migration_framework.common.models import MigrationRecord, MigrationStatus
from migration_framework.db.migration_db import MigrationDB
from migration_framework.phase1_analyzer import Analyzer

RANK_COLORS = {"A": "#34a853", "B": "#1a73e8", "C": "#f9ab00", "D": "#ea4335"}
RANK_LABELS = {"A": "簡単", "B": "中程度", "C": "複雑", "D": "非常に複雑"}


def render(config: Config, db: MigrationDB) -> None:
    st.markdown('<div class="main-header">📁 Phase 1: BizRobo 解析エンジン</div>', unsafe_allow_html=True)
    st.markdown('<div class="sub-header">ロボットの構造解析・複雑度評価・移行難易度判定 (自動化率: 80%)</div>', unsafe_allow_html=True)

    tab_upload, tab_dir, tab_results = st.tabs([
        "📤 ファイルアップロード",
        "📂 ディレクトリ指定",
        "📊 解析結果一覧",
    ])

    # === ファイルアップロード ===
    with tab_upload:
        st.subheader("ロボットファイルをアップロード")
        uploaded_files = st.file_uploader(
            "BizRobo ファイル (.robot, .xml) を選択",
            type=["robot", "xml"],
            accept_multiple_files=True,
            help="複数ファイルを同時にアップロード可能です",
        )

        if uploaded_files:
            st.info(f"{len(uploaded_files)} ファイルが選択されました")

            if st.button("🔍 解析実行", key="analyze_upload", type="primary"):
                _run_analysis_uploaded(config, db, uploaded_files)

    # === ディレクトリ指定 ===
    with tab_dir:
        st.subheader("ディレクトリから一括解析")
        default_dir = str(config.get("migration.source_dir", "./samples/bizrobo_input"))
        source_dir = st.text_input(
            "BizRoboファイルのディレクトリパス",
            value=default_dir,
            help="サーバー上のディレクトリパスを指定してください",
        )

        col1, col2 = st.columns([1, 3])
        with col1:
            if st.button("🔍 一括解析実行", key="analyze_dir", type="primary"):
                _run_analysis_directory(config, db, source_dir)

        with col2:
            path = Path(source_dir)
            if path.exists():
                files = list(path.glob("**/*.robot")) + list(path.glob("**/*.xml"))
                st.caption(f"検出ファイル数: {len(files)}")
            else:
                st.caption("⚠️ ディレクトリが見つかりません")

    # === 解析結果一覧 ===
    with tab_results:
        _render_results(db)


def _run_analysis_uploaded(
    config: Config, db: MigrationDB, uploaded_files: list
) -> None:
    """アップロードファイルの解析を実行する"""
    analyzer = Analyzer(config)
    progress_bar = st.progress(0, text="解析準備中...")
    results_container = st.container()

    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp_path = Path(tmp_dir)
        for uf in uploaded_files:
            (tmp_path / uf.name).write_bytes(uf.read())

        files = list(tmp_path.glob("**/*.robot")) + list(tmp_path.glob("**/*.xml"))
        total = len(files)

        for i, file_path in enumerate(files):
            progress_bar.progress(
                (i + 1) / total,
                text=f"解析中: {file_path.name} ({i+1}/{total})"
            )

            try:
                report = analyzer.analyze_file(file_path)
                record = MigrationRecord(
                    robot_name=report.robot.name,
                    source_path=str(file_path),
                    status=MigrationStatus.ANALYZING,
                    difficulty_rank=report.complexity.rank,
                    complexity_score=report.complexity.total_score,
                    conversion_rate=report.auto_convertible_rate,
                    validation_score=0.0,
                    test_pass_rate=0.0,
                    manual_items="; ".join(report.manual_items),
                )
                db.upsert_record(record)
                db.add_log(report.robot.name, "phase1", "解析完了", "info")
            except Exception as e:
                st.error(f"解析失敗: {file_path.name} - {e}")

    progress_bar.progress(1.0, text="解析完了!")
    st.success(f"✅ {total} ファイルの解析が完了しました")
    st.rerun()


def _run_analysis_directory(
    config: Config, db: MigrationDB, source_dir: str
) -> None:
    """ディレクトリ指定での一括解析"""
    path = Path(source_dir)
    if not path.exists():
        st.error(f"ディレクトリが見つかりません: {source_dir}")
        return

    analyzer = Analyzer(config)
    files = list(path.glob("**/*.robot")) + list(path.glob("**/*.xml"))

    if not files:
        st.warning("ロボットファイルが見つかりません")
        return

    progress_bar = st.progress(0, text="解析準備中...")
    total = len(files)

    for i, file_path in enumerate(files):
        progress_bar.progress(
            (i + 1) / total,
            text=f"解析中: {file_path.name} ({i+1}/{total})"
        )

        try:
            report = analyzer.analyze_file(file_path)
            record = MigrationRecord(
                robot_name=report.robot.name,
                source_path=str(file_path),
                status=MigrationStatus.ANALYZING,
                difficulty_rank=report.complexity.rank,
                complexity_score=report.complexity.total_score,
                conversion_rate=report.auto_convertible_rate,
                validation_score=0.0,
                test_pass_rate=0.0,
                manual_items="; ".join(report.manual_items),
            )
            db.upsert_record(record)
        except Exception as e:
            st.error(f"解析失敗: {file_path.name} - {e}")

    progress_bar.progress(1.0, text="解析完了!")
    st.success(f"✅ {total} ファイルの解析が完了しました")
    st.rerun()


def _render_results(db: MigrationDB) -> None:
    """解析結果の一覧表示"""
    records = db.get_all_records()
    if not records:
        st.info("まだ解析結果がありません。ファイルをアップロードして解析を実行してください。")
        return

    st.subheader(f"解析済みロボット: {len(records)} 件")

    # ランク別サマリー
    rank_counts = {}
    for r in records:
        rank = r.difficulty_rank.value
        rank_counts[rank] = rank_counts.get(rank, 0) + 1

    cols = st.columns(4)
    for col, rank in zip(cols, ["A", "B", "C", "D"]):
        count = rank_counts.get(rank, 0)
        color = RANK_COLORS.get(rank, "#999")
        label = RANK_LABELS.get(rank, "")
        with col:
            st.markdown(
                f"""<div style="border-left: 4px solid {color}; padding: 0.5rem 1rem;
                background: {color}15; border-radius: 0 8px 8px 0;">
                <div style="font-size: 1.5rem; font-weight: bold; color: {color};">{count}</div>
                <div>ランク {rank} ({label})</div>
                </div>""",
                unsafe_allow_html=True,
            )

    st.markdown("")

    # 散布図: 複雑度 vs 変換見込み
    if len(records) > 1:
        df_chart = pd.DataFrame([
            {
                "ロボット名": r.robot_name,
                "複雑度スコア": r.complexity_score,
                "自動変換見込み": r.conversion_rate * 100,
                "ランク": r.difficulty_rank.value,
            }
            for r in records
        ])
        fig = px.scatter(
            df_chart,
            x="複雑度スコア",
            y="自動変換見込み",
            color="ランク",
            hover_name="ロボット名",
            color_discrete_map=RANK_COLORS,
            size_max=15,
            title="複雑度 vs 自動変換見込み",
        )
        fig.update_layout(height=400)
        st.plotly_chart(fig, use_container_width=True)

    # フィルタ
    col_f1, col_f2 = st.columns(2)
    with col_f1:
        rank_filter = st.multiselect(
            "ランクフィルタ", ["A", "B", "C", "D"], default=["A", "B", "C", "D"]
        )
    with col_f2:
        sort_by = st.selectbox(
            "ソート", ["複雑度 (低→高)", "複雑度 (高→低)", "変換率 (高→低)", "名前"]
        )

    filtered = [r for r in records if r.difficulty_rank.value in rank_filter]

    if sort_by == "複雑度 (低→高)":
        filtered.sort(key=lambda r: r.complexity_score)
    elif sort_by == "複雑度 (高→低)":
        filtered.sort(key=lambda r: r.complexity_score, reverse=True)
    elif sort_by == "変換率 (高→低)":
        filtered.sort(key=lambda r: r.conversion_rate, reverse=True)
    else:
        filtered.sort(key=lambda r: r.robot_name)

    # テーブル
    df = pd.DataFrame([
        {
            "ロボット名": r.robot_name,
            "ランク": r.difficulty_rank.value,
            "複雑度": r.complexity_score,
            "自動変換見込み": r.conversion_rate,
            "手動対応項目": r.manual_items or "なし",
            "ステータス": r.status.value,
        }
        for r in filtered
    ])

    st.dataframe(
        df,
        use_container_width=True,
        hide_index=True,
        column_config={
            "自動変換見込み": st.column_config.ProgressColumn(
                "自動変換見込み", format="%.0f%%", min_value=0, max_value=1,
            ),
            "複雑度": st.column_config.NumberColumn("複雑度", format="%.1f"),
        },
    )
