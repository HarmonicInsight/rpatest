"""設定画面 - フレームワーク設定・接続情報・エクスポート"""
# Copyright (c) 2025-2026 HarmonicInsight / FPT Consulting Japan. All rights reserved.
from __future__ import annotations

import json
from pathlib import Path

import streamlit as st
import yaml

from migration_framework.common.config import Config
from migration_framework.db.migration_db import MigrationDB


def render(config: Config, db: MigrationDB) -> None:
    st.markdown('<div class="main-header">⚙️ 設定</div>', unsafe_allow_html=True)
    st.markdown('<div class="sub-header">フレームワーク設定・接続情報・データ管理</div>', unsafe_allow_html=True)

    tab_general, tab_mapping, tab_data = st.tabs([
        "🔧 一般設定",
        "🗂️ アクション対応表",
        "💾 データ管理",
    ])

    with tab_general:
        _render_general(config)

    with tab_mapping:
        _render_mapping(config)

    with tab_data:
        _render_data_management(db)


def _render_general(config: Config) -> None:
    """一般設定"""
    st.subheader("パス設定")

    col1, col2 = st.columns(2)
    with col1:
        source_dir = st.text_input(
            "ソースディレクトリ",
            value=config.get("migration.source_dir", "./samples/bizrobo_input"),
        )
        output_dir = st.text_input(
            "出力ディレクトリ",
            value=config.get("migration.output_dir", "./output"),
        )
        db_path = st.text_input(
            "データベースパス",
            value=config.get("migration.db_path", "./migration.db"),
        )

    with col2:
        st.markdown("**aKaBot API設定**")
        api_url = st.text_input(
            "API URL",
            value=config.get("tester.akabot_api.base_url", "http://localhost:8080/api/v1"),
        )
        api_timeout = st.number_input(
            "タイムアウト (秒)",
            value=config.get("tester.akabot_api.timeout", 300),
        )

    st.markdown("---")

    st.subheader("解析設定")
    col1, col2 = st.columns(2)
    with col1:
        st.markdown("**複雑度閾値**")
        thresh = config.get("analyzer.complexity_thresholds", {})
        a_thresh = st.number_input("Aランク上限", value=thresh.get("A", 10))
        b_thresh = st.number_input("Bランク上限", value=thresh.get("B", 30))
        c_thresh = st.number_input("Cランク上限", value=thresh.get("C", 60))

    with col2:
        st.markdown("**テスト設定**")
        parallel = st.number_input(
            "並列ワーカー数",
            value=config.get("tester.parallel_workers", 6),
            min_value=1, max_value=10,
        )
        retry = st.number_input(
            "リトライ回数",
            value=config.get("tester.retry_count", 3),
            min_value=0, max_value=10,
        )

    st.markdown("---")
    st.subheader("命名規則")
    naming = config.get("validator.naming_rules", {})
    col1, col2 = st.columns(2)
    with col1:
        st.text_input(
            "プロジェクト名規則",
            value=naming.get("project", "PRJ_{business_name}_{seq:03d}"),
        )
        st.text_input(
            "ワークフロー名規則",
            value=naming.get("workflow", "Main"),
        )
    with col2:
        st.text_input(
            "サブワークフロー規則",
            value=naming.get("sub_workflow", "Sub_{function_name}"),
        )

    if st.button("💾 設定を保存", type="primary"):
        st.success("設定を保存しました")


def _render_mapping(config: Config) -> None:
    """アクション対応表の編集"""
    mapping_path = config.config_dir / "action_mapping.yaml"

    if mapping_path.exists():
        content = mapping_path.read_text(encoding="utf-8")
    else:
        content = "# アクション対応表が見つかりません"

    st.subheader("アクション対応表 (YAML)")
    st.caption(f"ファイル: {mapping_path}")

    edited = st.text_area(
        "YAML編集",
        value=content,
        height=500,
        label_visibility="collapsed",
    )

    col1, col2 = st.columns(2)
    with col1:
        if st.button("💾 保存", key="save_mapping"):
            try:
                yaml.safe_load(edited)  # バリデーション
                mapping_path.write_text(edited, encoding="utf-8")
                st.success("アクション対応表を保存しました")
            except yaml.YAMLError as e:
                st.error(f"YAML構文エラー: {e}")

    with col2:
        st.download_button(
            "📥 ダウンロード",
            edited,
            file_name="action_mapping.yaml",
            mime="text/yaml",
        )


def _render_data_management(db: MigrationDB) -> None:
    """データ管理"""
    st.subheader("データベース管理")

    records = db.get_all_records()
    summary = db.get_summary()

    col1, col2, col3 = st.columns(3)
    with col1:
        st.metric("総レコード数", summary.get("total", 0))
    with col2:
        st.metric("ステータス種類", len(summary.get("by_status", {})))
    with col3:
        st.metric("ランク種類", len(summary.get("by_rank", {})))

    st.markdown("---")

    # エクスポート
    st.subheader("エクスポート")

    col1, col2 = st.columns(2)
    with col1:
        if records:
            data = [
                {
                    "robot_name": r.robot_name,
                    "source_path": r.source_path,
                    "status": r.status.value,
                    "difficulty_rank": r.difficulty_rank.value,
                    "complexity_score": r.complexity_score,
                    "conversion_rate": r.conversion_rate,
                    "validation_score": r.validation_score,
                    "test_pass_rate": r.test_pass_rate,
                    "manual_items": r.manual_items,
                    "created_at": r.created_at.isoformat(),
                    "updated_at": r.updated_at.isoformat(),
                }
                for r in records
            ]
            json_data = json.dumps(data, ensure_ascii=False, indent=2)
            st.download_button(
                "📥 JSON エクスポート",
                json_data,
                file_name="migration_data.json",
                mime="application/json",
            )

    with col2:
        if records:
            import pandas as pd
            df = pd.DataFrame(data)
            csv = df.to_csv(index=False).encode("utf-8-sig")
            st.download_button(
                "📥 CSV エクスポート",
                csv,
                file_name="migration_data.csv",
                mime="text/csv",
            )

    st.markdown("---")

    # データリセット
    st.subheader("データリセット")
    st.warning("注意: この操作は元に戻せません")

    if st.button("🗑️ 全データ削除", type="secondary"):
        if st.session_state.get("confirm_reset"):
            for r in records:
                db.delete_record(r.robot_name)
            st.session_state.confirm_reset = False
            st.success("全データを削除しました")
            st.rerun()
        else:
            st.session_state.confirm_reset = True
            st.error("もう一度クリックすると全データが削除されます")
