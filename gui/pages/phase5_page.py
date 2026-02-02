"""Phase 5: デプロイ画面 - パッケージング・端末配布・ヘルスチェック"""
from __future__ import annotations

from pathlib import Path

import pandas as pd
import plotly.graph_objects as go
import streamlit as st

from migration_framework.common.config import Config
from migration_framework.common.models import (
    DeploymentRecord,
    DeploymentStatus,
    MachineInfo,
    MigrationStatus,
)
from migration_framework.db.migration_db import MigrationDB

STATUS_COLORS = {
    "deployed": "#34a853",
    "partial": "#f9ab00",
    "failed": "#ea4335",
    "pending": "#9e9e9e",
    "packaging": "#42a5f5",
    "uploading": "#7e57c2",
    "configuring": "#26a69a",
    "health_check": "#ff7043",
}
ENV_COLORS = {
    "Production": "#ea4335",
    "Staging": "#f9ab00",
    "Development": "#34a853",
}


def render(config: Config, db: MigrationDB) -> None:
    st.markdown('<div class="main-header">🚀 Phase 5: デプロイ管理</div>', unsafe_allow_html=True)
    st.markdown(
        '<div class="sub-header">'
        'パッケージング → Orchestrator配布 → 端末割当 → ヘルスチェック'
        '</div>',
        unsafe_allow_html=True,
    )

    tab_machines, tab_deploy, tab_status = st.tabs([
        "🖥️ 端末管理",
        "📦 デプロイ実行",
        "📊 デプロイ状況",
    ])

    with tab_machines:
        _render_machines(config, db)

    with tab_deploy:
        _render_deploy(config, db)

    with tab_status:
        _render_status(config, db)


# ---------- 端末管理 ----------

def _render_machines(config: Config, db: MigrationDB) -> None:
    st.subheader("デプロイ先端末一覧")

    # セッション初期化
    if "machines" not in st.session_state:
        st.session_state.machines = _default_machines()

    machines: list[dict] = st.session_state.machines

    # KPI
    cols = st.columns(4)
    with cols[0]:
        st.metric("総端末数", len(machines))
    with cols[1]:
        available = sum(1 for m in machines if m["status"] == "Available")
        st.metric("利用可能", available)
    with cols[2]:
        envs = set(m["environment"] for m in machines)
        st.metric("環境数", len(envs))
    with cols[3]:
        st.metric("推奨VDI", "AWS WorkSpaces")

    st.markdown("---")

    # 端末テーブル
    if machines:
        df = pd.DataFrame(machines)
        st.dataframe(df, use_container_width=True, hide_index=True, height=300)

    # 端末追加
    st.markdown("---")
    st.subheader("端末追加")
    with st.form("add_machine", clear_on_submit=True):
        col1, col2, col3, col4 = st.columns(4)
        with col1:
            name = st.text_input("端末名", placeholder="VDI-001")
        with col2:
            ip = st.text_input("IPアドレス", placeholder="10.0.1.10")
        with col3:
            env = st.selectbox("環境", ["Production", "Staging", "Development"])
        with col4:
            os_type = st.selectbox("OS", ["Windows 10", "Windows 11", "Windows Server 2022"])

        if st.form_submit_button("➕ 追加"):
            if name:
                new_machine = {
                    "name": name,
                    "machine_id": len(machines) + 1,
                    "ip_address": ip,
                    "environment": env,
                    "os_type": os_type,
                    "status": "Available",
                    "agent_version": "1.0.0",
                }
                st.session_state.machines.append(new_machine)
                st.success(f"端末 '{name}' を追加しました")
                st.rerun()

    # 推奨構成
    st.markdown("---")
    st.subheader("推奨環境構成")
    rec_cols = st.columns(3)
    with rec_cols[0]:
        st.markdown("""
        **開発・変換用** (2台)
        - BizRobo解析 + aKaBot変換
        - CPU: 4 vCPU / RAM: 8 GB
        """)
    with rec_cols[1]:
        st.markdown("""
        **BizRobo検証用** (1-2台)
        - 既存ロボットの動作確認
        - BizRoboライセンス必要
        """)
    with rec_cols[2]:
        st.markdown("""
        **aKaBot検証用** (3-4台)
        - 変換後ロボットのテスト
        - 並列テスト実行
        - 月額目安: ~¥50,000/6台
        """)


# ---------- デプロイ実行 ----------

def _render_deploy(config: Config, db: MigrationDB) -> None:
    st.subheader("デプロイ実行")

    records = db.get_all_records()
    completed = [r for r in records if r.status == MigrationStatus.COMPLETED]
    machines = st.session_state.get("machines", _default_machines())

    if not completed:
        st.info("デプロイ可能なロボットがありません。Phase 1-4 を完了してください。")
        return

    # ステップ表示
    st.markdown("""
    **デプロイフロー:**
    `プロジェクト選択` → `パッケージ(.nupkg)生成` → `Orchestratorアップロード` → `端末割当` → `環境設定` → `ヘルスチェック`
    """)

    st.markdown("---")

    # 対象選択
    col1, col2 = st.columns(2)
    with col1:
        deploy_mode = st.radio(
            "デプロイ対象",
            ["全件一括", "ランク指定", "個別選択"],
            horizontal=True,
        )

    targets = []
    if deploy_mode == "全件一括":
        targets = completed
    elif deploy_mode == "ランク指定":
        ranks = st.multiselect("対象ランク", ["A", "B", "C", "D"], default=["A", "B"])
        targets = [r for r in completed if r.difficulty_rank.value in ranks]
    elif deploy_mode == "個別選択":
        names = st.multiselect("ロボット選択", [r.robot_name for r in completed])
        targets = [r for r in completed if r.robot_name in names]

    st.caption(f"デプロイ対象: {len(targets)} プロジェクト")

    # 端末選択
    st.markdown("---")
    st.subheader("配布先端末")
    target_machine_names = st.multiselect(
        "端末選択",
        [m["name"] for m in machines],
        default=[m["name"] for m in machines if m["status"] == "Available"],
    )

    # 環境設定オーバーライド
    with st.expander("🔧 環境設定オーバーライド (任意)"):
        col1, col2 = st.columns(2)
        with col1:
            db_conn = st.text_input("DB接続文字列", placeholder="Server=...;Database=...")
            api_url = st.text_input("API URL", placeholder="https://api.example.com")
        with col2:
            smtp_server = st.text_input("SMTPサーバー", placeholder="smtp.example.com")
            file_share = st.text_input("共有フォルダ", placeholder="\\\\server\\share")

    # デプロイ実行
    if st.button(
        "🚀 デプロイ実行",
        type="primary",
        disabled=len(targets) == 0 or len(target_machine_names) == 0,
    ):
        _run_deploy(config, db, targets, target_machine_names, machines)


def _run_deploy(config, db, targets, machine_names, all_machines):
    """デプロイ実行シミュレーション"""
    import random
    import time

    target_machines = [m for m in all_machines if m["name"] in machine_names]
    total = len(targets)
    progress = st.progress(0, text="デプロイ準備中...")

    # セッションにデプロイ結果を保存
    if "deployments" not in st.session_state:
        st.session_state.deployments = []

    for i, record in enumerate(targets):
        progress.progress(
            (i + 1) / total,
            text=f"デプロイ中: {record.robot_name} ({i+1}/{total})",
        )
        time.sleep(0.1)

        # パッケージング
        output_dir = Path(config.get("migration.output_dir", "./output"))
        project_dir = output_dir / f"PRJ_{record.robot_name}"
        package_path = f"{record.robot_name}.1.0.0.nupkg"

        # 端末別ヘルスチェック結果
        health = {}
        for m in target_machines:
            health[m["name"]] = random.random() > 0.1  # 90%成功率

        all_ok = all(health.values())
        status = "deployed" if all_ok else "partial"

        deployment = {
            "project_name": record.robot_name,
            "package": package_path,
            "target_machines": machine_names,
            "status": status,
            "health_results": health,
            "deployed_at": pd.Timestamp.now().strftime("%Y-%m-%d %H:%M:%S"),
        }
        st.session_state.deployments.append(deployment)

    progress.progress(1.0, text="デプロイ完了!")

    deployed = sum(1 for d in st.session_state.deployments[-total:] if d["status"] == "deployed")
    st.success(f"✅ デプロイ完了: {deployed}/{total} 成功")
    st.rerun()


# ---------- デプロイ状況 ----------

def _render_status(config: Config, db: MigrationDB) -> None:
    st.subheader("デプロイ状況")

    deployments = st.session_state.get("deployments", [])

    if not deployments:
        st.info("まだデプロイが実行されていません。「デプロイ実行」タブから開始してください。")
        return

    # KPI
    cols = st.columns(4)
    with cols[0]:
        st.metric("総デプロイ数", len(deployments))
    with cols[1]:
        ok = sum(1 for d in deployments if d["status"] == "deployed")
        st.metric("成功", ok)
    with cols[2]:
        partial = sum(1 for d in deployments if d["status"] == "partial")
        st.metric("一部失敗", partial)
    with cols[3]:
        rate = ok / len(deployments) * 100 if deployments else 0
        st.metric("成功率", f"{rate:.0f}%")

    st.markdown("---")

    # ステータス別円グラフ
    col1, col2 = st.columns(2)

    with col1:
        status_counts = {}
        for d in deployments:
            s = d["status"]
            status_counts[s] = status_counts.get(s, 0) + 1

        fig = go.Figure(data=[go.Pie(
            labels=list(status_counts.keys()),
            values=list(status_counts.values()),
            marker=dict(colors=[STATUS_COLORS.get(s, "#999") for s in status_counts]),
            hole=0.4,
        )])
        fig.update_layout(title="デプロイステータス", height=300, margin=dict(t=40, b=20))
        st.plotly_chart(fig, use_container_width=True)

    with col2:
        # 端末別ヘルスチェック集計
        machine_health: dict[str, dict[str, int]] = {}
        for d in deployments:
            for machine, ok in d.get("health_results", {}).items():
                if machine not in machine_health:
                    machine_health[machine] = {"ok": 0, "ng": 0}
                if ok:
                    machine_health[machine]["ok"] += 1
                else:
                    machine_health[machine]["ng"] += 1

        if machine_health:
            mh_df = pd.DataFrame([
                {
                    "端末": name,
                    "成功": counts["ok"],
                    "失敗": counts["ng"],
                    "成功率": counts["ok"] / (counts["ok"] + counts["ng"]) * 100,
                }
                for name, counts in machine_health.items()
            ])
            st.markdown("**端末別ヘルスチェック**")
            st.dataframe(mh_df, use_container_width=True, hide_index=True)

    # デプロイ履歴テーブル
    st.markdown("---")
    st.subheader("デプロイ履歴")

    df = pd.DataFrame([
        {
            "プロジェクト": d["project_name"],
            "パッケージ": d["package"],
            "配布先": ", ".join(d["target_machines"]),
            "ステータス": d["status"],
            "デプロイ日時": d["deployed_at"],
        }
        for d in reversed(deployments)
    ])
    st.dataframe(df, use_container_width=True, hide_index=True, height=400)

    # ロールバック
    st.markdown("---")
    st.subheader("ロールバック")
    deployed_names = list(set(d["project_name"] for d in deployments))
    rollback_target = st.selectbox("対象プロジェクト", deployed_names)

    if st.button("⏪ ロールバック実行", type="secondary"):
        st.session_state.deployments = [
            d for d in deployments if d["project_name"] != rollback_target
        ]
        st.success(f"'{rollback_target}' をロールバックしました")
        st.rerun()


def _default_machines() -> list[dict]:
    """デフォルトのVDI端末構成"""
    return [
        {"name": "VDI-DEV-001", "machine_id": 1, "ip_address": "10.0.1.10",
         "environment": "Development", "os_type": "Windows 11", "status": "Available", "agent_version": "1.0.0"},
        {"name": "VDI-DEV-002", "machine_id": 2, "ip_address": "10.0.1.11",
         "environment": "Development", "os_type": "Windows 11", "status": "Available", "agent_version": "1.0.0"},
        {"name": "VDI-STG-001", "machine_id": 3, "ip_address": "10.0.2.10",
         "environment": "Staging", "os_type": "Windows Server 2022", "status": "Available", "agent_version": "1.0.0"},
        {"name": "VDI-STG-002", "machine_id": 4, "ip_address": "10.0.2.11",
         "environment": "Staging", "os_type": "Windows Server 2022", "status": "Available", "agent_version": "1.0.0"},
        {"name": "VDI-PRD-001", "machine_id": 5, "ip_address": "10.0.3.10",
         "environment": "Production", "os_type": "Windows Server 2022", "status": "Available", "agent_version": "1.0.0"},
        {"name": "VDI-PRD-002", "machine_id": 6, "ip_address": "10.0.3.11",
         "environment": "Production", "os_type": "Windows Server 2022", "status": "Available", "agent_version": "1.0.0"},
    ]
