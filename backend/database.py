import json
import sqlite3
from pathlib import Path
from typing import Any

from model_config import DEFAULT_MODELS, DEFAULT_POLICIES
from pricing import apply_model_pricing

DB_PATH = Path(__file__).with_name("router.sqlite3")


def model_db_row(model: dict[str, Any]) -> dict[str, Any]:
    priced = apply_model_pricing(model)
    return {
        **priced,
        "allowed_sensitive": int(priced["allowed_sensitive"]),
        "enabled": int(priced["enabled"]),
    }


def connect() -> sqlite3.Connection:
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def init_db() -> None:
    with connect() as db:
        db.execute(
            """
            CREATE TABLE IF NOT EXISTS models (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                tier TEXT NOT NULL,
                cost_per_1k_tokens REAL NOT NULL,
                region TEXT NOT NULL,
                allowed_sensitive INTEGER NOT NULL,
                enabled INTEGER NOT NULL
            )
            """
        )
        db.execute(
            """
            CREATE TABLE IF NOT EXISTS policies (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                data TEXT NOT NULL
            )
            """
        )
        db.execute(
            """
            CREATE TABLE IF NOT EXISTS request_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                user_id TEXT NOT NULL,
                prompt TEXT NOT NULL,
                sensitivity TEXT NOT NULL,
                difficulty TEXT NOT NULL,
                task_type TEXT NOT NULL,
                chosen_model TEXT NOT NULL,
                tier TEXT NOT NULL,
                tokens INTEGER NOT NULL,
                estimated_cost REAL NOT NULL,
                baseline_cost REAL NOT NULL,
                latency_ms INTEGER NOT NULL,
                quality_score REAL NOT NULL,
                escalated INTEGER NOT NULL,
                demo_mode INTEGER NOT NULL
            )
            """
        )
        db.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL COLLATE NOCASE UNIQUE,
                full_name TEXT NOT NULL DEFAULT '',
                password_hash TEXT,
                google_subject TEXT UNIQUE,
                github_id TEXT UNIQUE,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        db.execute(
            """
            CREATE TABLE IF NOT EXISTS chats (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                title TEXT NOT NULL DEFAULT 'New chat',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        db.execute(
            """
            CREATE TABLE IF NOT EXISTS chat_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                chat_id INTEGER NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
                role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
                content TEXT NOT NULL,
                metadata TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        db.execute("CREATE INDEX IF NOT EXISTS chats_user_updated ON chats(user_id, updated_at DESC)")
        db.execute("CREATE INDEX IF NOT EXISTS chat_messages_chat_created ON chat_messages(chat_id, created_at)")
        model_count = db.execute("SELECT COUNT(*) FROM models").fetchone()[0]
        if model_count == 0:
            db.executemany(
                """
                INSERT INTO models
                (name, tier, cost_per_1k_tokens, region, allowed_sensitive, enabled)
                VALUES (:name, :tier, :cost_per_1k_tokens, :region, :allowed_sensitive, :enabled)
                """,
                [model_db_row(model) for model in DEFAULT_MODELS],
            )
        policy = db.execute("SELECT id FROM policies WHERE id = 1").fetchone()
        if policy is None:
            db.execute(
                "INSERT INTO policies (id, data) VALUES (1, ?)",
                (json.dumps(DEFAULT_POLICIES),),
            )


def get_models() -> list[dict[str, Any]]:
    with connect() as db:
        rows = db.execute("SELECT * FROM models ORDER BY id").fetchall()
    return [
        {
            **dict(row),
            "allowed_sensitive": bool(row["allowed_sensitive"]),
            "enabled": bool(row["enabled"]),
        }
        for row in rows
    ]


def replace_models(models: list[dict[str, Any]]) -> list[dict[str, Any]]:
    with connect() as db:
        db.execute("DELETE FROM models")
        db.executemany(
            """
            INSERT INTO models
            (id, name, tier, cost_per_1k_tokens, region, allowed_sensitive, enabled)
            VALUES (:id, :name, :tier, :cost_per_1k_tokens, :region, :allowed_sensitive, :enabled)
                """,
            [model_db_row(model) for model in models],
        )
    return get_models()


def get_policies() -> dict[str, Any]:
    with connect() as db:
        row = db.execute("SELECT data FROM policies WHERE id = 1").fetchone()
    return json.loads(row["data"])


def set_policies(policies: dict[str, Any]) -> dict[str, Any]:
    with connect() as db:
        db.execute(
            "UPDATE policies SET data = ? WHERE id = 1",
            (json.dumps(policies),),
        )
    return get_policies()


def log_request(row: dict[str, Any]) -> int:
    with connect() as db:
        cursor = db.execute(
            """
            INSERT INTO request_logs
            (user_id, prompt, sensitivity, difficulty, task_type, chosen_model, tier,
             tokens, estimated_cost, baseline_cost, latency_ms, quality_score, escalated, demo_mode)
            VALUES
            (:user_id, :prompt, :sensitivity, :difficulty, :task_type, :chosen_model, :tier,
             :tokens, :estimated_cost, :baseline_cost, :latency_ms, :quality_score, :escalated, :demo_mode)
            """,
            {
                **row,
                "escalated": int(row["escalated"]),
                "demo_mode": int(row["demo_mode"]),
            },
        )
        return int(cursor.lastrowid)
