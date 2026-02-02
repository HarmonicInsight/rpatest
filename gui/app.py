"""BizRobo → aKaBot 移行自動化ダッシュボード - メインアプリ"""
from __future__ import annotations

import sys
from pathlib import Path

import streamlit as st

# プロジェクトルートをパスに追加
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from migration_framework.common.config import Config
from migration_framework.db.migration_db import MigrationDB


def get_config() -> Config:
    if "config" not in st.session_state:
        config = Config(PROJECT_ROOT / "config")
        config.load()
        st.session_state.config = config
    return st.session_state.config


def get_db() -> MigrationDB:
    if "db" not in st.session_state:
        config = get_config()
        db_path = config.get("migration.db_path", str(PROJECT_ROOT / "migration.db"))
        db = MigrationDB(db_path)
        db.connect()
        st.session_state.db = db
    return st.session_state.db


# --- ページ設定 ---
st.set_page_config(
    page_title="BizRobo → aKaBot 移行ダッシュボード",
    page_icon="🔄",
    layout="wide",
    initial_sidebar_state="expanded",
)

# --- CSS ---
st.markdown("""
<style>
    .main-header {
        font-size: 1.8rem;
        font-weight: 700;
        color: #1a73e8;
        margin-bottom: 0.5rem;
    }
    .sub-header {
        font-size: 0.95rem;
        color: #5f6368;
        margin-bottom: 1.5rem;
    }
    .metric-card {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 1.2rem;
        border-radius: 12px;
        color: white;
        text-align: center;
    }
    .metric-card h2 {
        margin: 0;
        font-size: 2rem;
    }
    .metric-card p {
        margin: 0;
        font-size: 0.85rem;
        opacity: 0.9;
    }
    .rank-a { color: #34a853; font-weight: bold; }
    .rank-b { color: #1a73e8; font-weight: bold; }
    .rank-c { color: #f9ab00; font-weight: bold; }
    .rank-d { color: #ea4335; font-weight: bold; }
    .status-completed { color: #34a853; }
    .status-failed { color: #ea4335; }
    .status-pending { color: #9e9e9e; }
    .status-manual_required { color: #f9ab00; }
    div[data-testid="stSidebar"] {
        background: linear-gradient(180deg, #0d1b2a 0%, #1b2838 100%);
    }
    div[data-testid="stSidebar"] .stMarkdown {
        color: #e0e0e0;
    }
</style>
""", unsafe_allow_html=True)

# --- サイドバー ---
with st.sidebar:
    st.markdown("## 🔄 Migration Tool")
    st.markdown("**BizRobo → aKaBot**")
    st.markdown("---")

    page = st.radio(
        "ナビゲーション",
        [
            "📊 ダッシュボード",
            "📁 Phase 1: 解析",
            "🔄 Phase 2: 変換",
            "✅ Phase 3: 検証",
            "🧪 Phase 4: テスト",
            "📋 ロボット一覧",
            "⚙️ 設定",
        ],
        label_visibility="collapsed",
    )

    st.markdown("---")

    # クイックステータス
    try:
        db = get_db()
        summary = db.get_summary()
        total = summary.get("total", 0)
        completed = summary.get("by_status", {}).get("completed", 0)

        if total > 0:
            progress = completed / total
            st.progress(progress, text=f"移行進捗: {completed}/{total}")
        else:
            st.info("ロボット未登録")
    except Exception:
        st.warning("DB未初期化")

    st.markdown("---")
    st.caption("FPT Consulting Japan")
    st.caption("v1.0.0")


# --- ページルーティング ---
if page == "📊 ダッシュボード":
    from gui.pages import dashboard
    dashboard.render(get_config(), get_db())

elif page == "📁 Phase 1: 解析":
    from gui.pages import phase1_page
    phase1_page.render(get_config(), get_db())

elif page == "🔄 Phase 2: 変換":
    from gui.pages import phase2_page
    phase2_page.render(get_config(), get_db())

elif page == "✅ Phase 3: 検証":
    from gui.pages import phase3_page
    phase3_page.render(get_config(), get_db())

elif page == "🧪 Phase 4: テスト":
    from gui.pages import phase4_page
    phase4_page.render(get_config(), get_db())

elif page == "📋 ロボット一覧":
    from gui.pages import robot_list
    robot_list.render(get_config(), get_db())

elif page == "⚙️ 設定":
    from gui.pages import settings_page
    settings_page.render(get_config(), get_db())
