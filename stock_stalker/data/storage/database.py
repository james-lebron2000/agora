# data/storage/database.py
"""SQLite database persistence for events, theses, and positions."""

from __future__ import annotations

import json
import logging
import sqlite3
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path
from typing import Any

from models import Event, Position, Thesis, TradePlan

LOGGER = logging.getLogger(__name__)


class Database:
    """SQLite database manager for stock stalker persistence."""

    def __init__(self, db_path: str = "stock_stalker.db") -> None:
        """Initialize database connection."""
        self.db_path = Path(db_path)
        self._init_db()

    @contextmanager
    def _get_connection(self):
        """Context manager for database connections."""
        conn = sqlite3.connect(str(self.db_path), detect_types=sqlite3.PARSE_DECLTYPES)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    def _init_db(self) -> None:
        """Initialize database schema."""
        with self._get_connection() as conn:
            cursor = conn.cursor()

            # Events table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS events (
                    event_id TEXT PRIMARY KEY,
                    ticker TEXT NOT NULL,
                    event_type TEXT NOT NULL,
                    title TEXT NOT NULL,
                    occurred_at TIMESTAMP NOT NULL,
                    source_url TEXT NOT NULL,
                    evidence_level TEXT NOT NULL,
                    market_session TEXT NOT NULL,
                    importance INTEGER NOT NULL,
                    details TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            # Create index for faster queries
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_events_ticker_time 
                ON events(ticker, occurred_at DESC)
            """)

            # Theses table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS theses (
                    thesis_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    ticker TEXT NOT NULL,
                    main_hypothesis TEXT NOT NULL,
                    falsification_conditions TEXT NOT NULL,
                    win_paths TEXT NOT NULL,
                    loss_paths TEXT NOT NULL,
                    verification_tasks TEXT NOT NULL,
                    has_changed BOOLEAN DEFAULT FALSE,
                    change_reason TEXT,
                    generated_at TIMESTAMP NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            # Trade plans table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS trade_plans (
                    plan_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    ticker TEXT NOT NULL,
                    conviction_score INTEGER NOT NULL,
                    base_case_entry TEXT NOT NULL,
                    base_case_stop REAL NOT NULL,
                    base_case_tp REAL NOT NULL,
                    base_case_size REAL NOT NULL,
                    alt_case_entry TEXT NOT NULL,
                    alt_case_stop REAL NOT NULL,
                    alt_case_tp REAL NOT NULL,
                    alt_case_size REAL NOT NULL,
                    status TEXT NOT NULL,
                    generated_at TIMESTAMP NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            # Positions table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS positions (
                    position_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    ticker TEXT NOT NULL,
                    quantity REAL NOT NULL DEFAULT 0,
                    average_cost REAL NOT NULL DEFAULT 0,
                    current_price REAL NOT NULL DEFAULT 0,
                    realized_pnl REAL NOT NULL DEFAULT 0,
                    status TEXT NOT NULL,
                    opened_at TIMESTAMP,
                    closed_at TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            # Workflow runs table (for tracking analysis history)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS workflow_runs (
                    run_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    ticker TEXT NOT NULL,
                    conviction_score INTEGER,
                    action TEXT,
                    state TEXT,
                    events_count INTEGER,
                    pending_checks TEXT,
                    run_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            LOGGER.info("Database initialized at %s", self.db_path)

    def save_event(self, event: Event) -> None:
        """Save or update an event."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO events 
                (event_id, ticker, event_type, title, occurred_at, source_url,
                 evidence_level, market_session, importance, details)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                event.event_id,
                event.ticker,
                event.event_type.value,
                event.title,
                event.occurred_at,
                event.source_url,
                event.evidence_level.value,
                event.market_session.value,
                event.importance,
                json.dumps(event.details),
            ))
            LOGGER.debug("Saved event %s for %s", event.event_id, event.ticker)

    def get_events(self, ticker: str, limit: int = 100) -> list[Event]:
        """Get recent events for a ticker."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM events 
                WHERE ticker = ? 
                ORDER BY occurred_at DESC 
                LIMIT ?
            """, (ticker.upper(), limit))

            rows = cursor.fetchall()
            events = []
            for row in rows:
                event_data = dict(row)
                event_data["details"] = json.loads(event_data.get("details", "{}"))
                events.append(Event.from_dict(event_data))

            return events

    def save_thesis(self, thesis: Thesis) -> int:
        """Save a thesis and return its ID."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO theses 
                (ticker, main_hypothesis, falsification_conditions, win_paths,
                 loss_paths, verification_tasks, has_changed, change_reason, generated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                thesis.ticker,
                thesis.main_hypothesis,
                json.dumps(thesis.falsification_conditions),
                json.dumps(thesis.win_paths),
                json.dumps(thesis.loss_paths),
                json.dumps(thesis.verification_tasks),
                thesis.has_changed,
                thesis.change_reason,
                thesis.generated_at,
            ))
            thesis_id = cursor.lastrowid
            LOGGER.info("Saved thesis %d for %s", thesis_id, thesis.ticker)
            return thesis_id

    def get_latest_thesis(self, ticker: str) -> Thesis | None:
        """Get the most recent thesis for a ticker."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM theses 
                WHERE ticker = ? 
                ORDER BY generated_at DESC 
                LIMIT 1
            """, (ticker.upper(),))

            row = cursor.fetchone()
            if row:
                data = dict(row)
                return Thesis(
                    ticker=data["ticker"],
                    main_hypothesis=data["main_hypothesis"],
                    falsification_conditions=json.loads(data["falsification_conditions"]),
                    win_paths=json.loads(data["win_paths"]),
                    loss_paths=json.loads(data["loss_paths"]),
                    verification_tasks=json.loads(data["verification_tasks"]),
                    has_changed=bool(data["has_changed"]),
                    change_reason=data["change_reason"] or "",
                    generated_at=data["generated_at"],
                )
            return None

    def save_trade_plan(self, plan: TradePlan) -> int:
        """Save a trade plan and return its ID."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO trade_plans 
                (ticker, conviction_score, base_case_entry, base_case_stop, base_case_tp,
                 base_case_size, alt_case_entry, alt_case_stop, alt_case_tp, alt_case_size,
                 status, generated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                plan.ticker,
                plan.conviction_score,
                plan.base_case.entry_trigger,
                plan.base_case.stop_loss_pct,
                plan.base_case.take_profit_pct,
                plan.base_case.position_size_pct,
                plan.alt_case.entry_trigger,
                plan.alt_case.stop_loss_pct,
                plan.alt_case.take_profit_pct,
                plan.alt_case.position_size_pct,
                plan.status,
                plan.generated_at,
            ))
            plan_id = cursor.lastrowid
            LOGGER.info("Saved trade plan %d for %s", plan_id, plan.ticker)
            return plan_id

    def save_position(self, position: Position) -> None:
        """Save or update a position."""
        with self._get_connection() as conn:
            cursor = conn.cursor()

            # Check if position exists
            cursor.execute(
                "SELECT position_id FROM positions WHERE ticker = ? AND status = 'open'",
                (position.ticker.upper(),)
            )
            existing = cursor.fetchone()

            if existing:
                # Update existing position
                cursor.execute("""
                    UPDATE positions 
                    SET quantity = ?, average_cost = ?, current_price = ?,
                        realized_pnl = ?, status = ?, closed_at = ?, updated_at = ?
                    WHERE position_id = ?
                """, (
                    position.quantity,
                    position.average_cost,
                    position.current_price,
                    position.realized_pnl,
                    position.status.value,
                    position.closed_at,
                    datetime.now(),
                    existing["position_id"],
                ))
            else:
                # Insert new position
                cursor.execute("""
                    INSERT INTO positions 
                    (ticker, quantity, average_cost, current_price, realized_pnl,
                     status, opened_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    position.ticker,
                    position.quantity,
                    position.average_cost,
                    position.current_price,
                    position.realized_pnl,
                    position.status.value,
                    position.opened_at,
                    datetime.now(),
                ))

            LOGGER.debug("Saved position for %s", position.ticker)

    def get_position(self, ticker: str) -> Position | None:
        """Get current position for a ticker."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM positions 
                WHERE ticker = ? 
                ORDER BY updated_at DESC 
                LIMIT 1
            """, (ticker.upper(),))

            row = cursor.fetchone()
            if row:
                data = dict(row)
                from models.enums import PositionStatus
                return Position(
                    ticker=data["ticker"],
                    quantity=data["quantity"],
                    average_cost=data["average_cost"],
                    current_price=data["current_price"],
                    realized_pnl=data["realized_pnl"],
                    status=PositionStatus(data["status"]),
                    opened_at=data["opened_at"],
                    closed_at=data["closed_at"],
                )
            return None

    def save_workflow_run(self, ticker: str, result: dict[str, Any]) -> None:
        """Save a workflow run for history tracking."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO workflow_runs 
                (ticker, conviction_score, action, state, events_count, pending_checks)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                ticker.upper(),
                result.get("conviction", {}).get("score"),
                result.get("execution", {}).get("action"),
                result.get("state", {}).get("current"),
                len(result.get("timeline", {}).get("rows", [])),
                json.dumps(result.get("timeline", {}).get("pending_checks", [])),
            ))
            LOGGER.debug("Saved workflow run for %s", ticker)

    def get_recent_workflow_runs(self, ticker: str, limit: int = 10) -> list[dict]:
        """Get recent workflow runs for a ticker."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM workflow_runs 
                WHERE ticker = ? 
                ORDER BY run_at DESC 
                LIMIT ?
            """, (ticker.upper(), limit))

            return [dict(row) for row in cursor.fetchall()]

    def get_watchlist(self) -> list[str]:
        """Get unique tickers from recent events."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT DISTINCT ticker FROM events 
                WHERE occurred_at > datetime('now', '-30 days')
                ORDER BY ticker
            """)
            return [row["ticker"] for row in cursor.fetchall()]

    def cleanup_old_data(self, days: int = 90) -> int:
        """Clean up data older than specified days."""
        with self._get_connection() as conn:
            cursor = conn.cursor()

            # Delete old events
            cursor.execute("""
                DELETE FROM events 
                WHERE occurred_at < datetime('now', ?)
            """, (f"-{days} days",))
            events_deleted = cursor.rowcount

            # Delete old workflow runs
            cursor.execute("""
                DELETE FROM workflow_runs 
                WHERE run_at < datetime('now', ?)
            """, (f"-{days} days",))
            runs_deleted = cursor.rowcount

            LOGGER.info("Cleaned up %d events and %d workflow runs", events_deleted, runs_deleted)
            return events_deleted + runs_deleted
