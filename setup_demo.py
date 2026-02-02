"""セットアップスクリプト - サンプルロボット生成 + DB初期投入"""
from __future__ import annotations

import sys
from pathlib import Path

# プロジェクトルートをパスに追加
ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from gui.generate_sample_robots import main as generate_robots
from migration_framework.common.config import Config
from migration_framework.db.migration_db import MigrationDB
from migration_framework.pipeline import MigrationPipeline


def setup():
    print("=" * 60)
    print("BizRobo → aKaBot 移行ツール セットアップ")
    print("=" * 60)

    # 1. サンプルロボット生成
    print("\n[1/3] 100本のサンプルBizRoboファイルを生成中...")
    generate_robots()

    # 2. 設定読み込み
    print("\n[2/3] 設定読み込み...")
    config = Config(ROOT / "config")
    config.load()

    # 3. パイプライン実行
    print("\n[3/3] 全ロボットを解析・変換・検証中...")
    db_path = ROOT / "migration.db"
    db = MigrationDB(str(db_path))
    db.connect()

    pipeline = MigrationPipeline(config, db)
    source_dir = ROOT / "samples" / "bizrobo_input"
    output_dir = ROOT / "output"

    records = pipeline.run_batch(source_dir, output_dir)

    summary = db.get_summary()
    db.close()

    print("\n" + "=" * 60)
    print("セットアップ完了!")
    print(f"  対象ロボット数: {summary['total']}")
    print(f"  ステータス: {summary['by_status']}")
    print(f"  ランク分布: {summary['by_rank']}")
    print(f"  平均変換率: {summary['avg_conversion_rate']:.0%}")
    print("=" * 60)
    print("\nGUIを起動するには:")
    print("  python -m streamlit run gui/app.py")
    print()


if __name__ == "__main__":
    setup()
