"""Migration DB - SQLiteベースの移行進捗・結果管理"""
from __future__ import annotations

import logging
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Any

from migration_framework.common.models import (
    DifficultyRank,
    MigrationRecord,
    MigrationStatus,
)

logger = logging.getLogger(__name__)


class MigrationDB:
    """SQLiteベースの移行管理データベース"""

    def __init__(self, db_path: str | Path = "migration.db"):
        self.db_path = str(db_path)
        self._conn: sqlite3.Connection | None = None

    def connect(self) -> None:
        self._conn = sqlite3.connect(self.db_path)
        self._conn.row_factory = sqlite3.Row
        self._create_tables()
        logger.info("DB接続: %s", self.db_path)

    def close(self) -> None:
        if self._conn:
            self._conn.close()
            self._conn = None

    def _create_tables(self) -> None:
        assert self._conn is not None
        self._conn.executescript("""
            CREATE TABLE IF NOT EXISTS migration_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                robot_name TEXT UNIQUE NOT NULL,
                source_path TEXT,
                status TEXT DEFAULT 'pending',
                difficulty_rank TEXT DEFAULT 'A',
                complexity_score REAL DEFAULT 0.0,
                conversion_rate REAL DEFAULT 0.0,
                validation_score REAL DEFAULT 0.0,
                test_pass_rate REAL DEFAULT 0.0,
                manual_items TEXT DEFAULT '',
                created_at TEXT,
                updated_at TEXT
            );

            CREATE TABLE IF NOT EXISTS migration_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                robot_name TEXT NOT NULL,
                phase TEXT NOT NULL,
                level TEXT DEFAULT 'info',
                message TEXT,
                created_at TEXT
            );

            CREATE TABLE IF NOT EXISTS test_results (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                robot_name TEXT NOT NULL,
                test_name TEXT,
                test_type TEXT,
                result TEXT,
                duration REAL DEFAULT 0.0,
                details TEXT,
                executed_at TEXT
            );
        """)

    @property
    def conn(self) -> sqlite3.Connection:
        if self._conn is None:
            self.connect()
        assert self._conn is not None
        return self._conn

    def upsert_record(self, record: MigrationRecord) -> None:
        """移行レコードを挿入/更新する"""
        now = datetime.now().isoformat()
        self.conn.execute("""
            INSERT INTO migration_records
                (robot_name, source_path, status, difficulty_rank,
                 complexity_score, conversion_rate, validation_score,
                 test_pass_rate, manual_items, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(robot_name) DO UPDATE SET
                status=excluded.status,
                difficulty_rank=excluded.difficulty_rank,
                complexity_score=excluded.complexity_score,
                conversion_rate=excluded.conversion_rate,
                validation_score=excluded.validation_score,
                test_pass_rate=excluded.test_pass_rate,
                manual_items=excluded.manual_items,
                updated_at=excluded.updated_at
        """, (
            record.robot_name, record.source_path, record.status.value,
            record.difficulty_rank.value, record.complexity_score,
            record.conversion_rate, record.validation_score,
            record.test_pass_rate, record.manual_items,
            now, now,
        ))
        self.conn.commit()

    def update_status(self, robot_name: str, status: MigrationStatus) -> None:
        now = datetime.now().isoformat()
        self.conn.execute(
            "UPDATE migration_records SET status=?, updated_at=? WHERE robot_name=?",
            (status.value, now, robot_name),
        )
        self.conn.commit()

    def add_log(
        self, robot_name: str, phase: str, message: str, level: str = "info"
    ) -> None:
        now = datetime.now().isoformat()
        self.conn.execute(
            "INSERT INTO migration_logs (robot_name, phase, level, message, created_at) "
            "VALUES (?, ?, ?, ?, ?)",
            (robot_name, phase, level, message, now),
        )
        self.conn.commit()

    def get_record(self, robot_name: str) -> MigrationRecord | None:
        row = self.conn.execute(
            "SELECT * FROM migration_records WHERE robot_name=?",
            (robot_name,),
        ).fetchone()
        if row is None:
            return None
        return MigrationRecord(
            robot_name=row["robot_name"],
            source_path=row["source_path"] or "",
            status=MigrationStatus(row["status"]),
            difficulty_rank=DifficultyRank(row["difficulty_rank"]),
            complexity_score=row["complexity_score"],
            conversion_rate=row["conversion_rate"],
            validation_score=row["validation_score"],
            test_pass_rate=row["test_pass_rate"],
            manual_items=row["manual_items"] or "",
        )

    def get_all_records(self) -> list[MigrationRecord]:
        rows = self.conn.execute(
            "SELECT * FROM migration_records ORDER BY robot_name"
        ).fetchall()
        return [
            MigrationRecord(
                robot_name=r["robot_name"],
                source_path=r["source_path"] or "",
                status=MigrationStatus(r["status"]),
                difficulty_rank=DifficultyRank(r["difficulty_rank"]),
                complexity_score=r["complexity_score"],
                conversion_rate=r["conversion_rate"],
                validation_score=r["validation_score"],
                test_pass_rate=r["test_pass_rate"],
                manual_items=r["manual_items"] or "",
            )
            for r in rows
        ]

    def get_summary(self) -> dict[str, Any]:
        """全体サマリーを取得する"""
        total = self.conn.execute(
            "SELECT COUNT(*) as cnt FROM migration_records"
        ).fetchone()["cnt"]

        by_status = {}
        for row in self.conn.execute(
            "SELECT status, COUNT(*) as cnt FROM migration_records GROUP BY status"
        ).fetchall():
            by_status[row["status"]] = row["cnt"]

        by_rank = {}
        for row in self.conn.execute(
            "SELECT difficulty_rank, COUNT(*) as cnt FROM migration_records GROUP BY difficulty_rank"
        ).fetchall():
            by_rank[row["difficulty_rank"]] = row["cnt"]

        avg_conversion = self.conn.execute(
            "SELECT AVG(conversion_rate) as avg_rate FROM migration_records"
        ).fetchone()["avg_rate"] or 0.0

        return {
            "total": total,
            "by_status": by_status,
            "by_rank": by_rank,
            "avg_conversion_rate": avg_conversion,
        }
