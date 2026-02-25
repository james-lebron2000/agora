"""Shared enums for the stock stalker domain."""

from __future__ import annotations

from enum import Enum


class EvidenceLevel(str, Enum):
    """Evidence confidence tiers used across data and agent layers."""

    A = "A"
    B = "B"
    C = "C"

    @property
    def priority(self) -> int:
        """Return numeric priority where larger means more reliable evidence."""
        ranking = {
            EvidenceLevel.A: 3,
            EvidenceLevel.B: 2,
            EvidenceLevel.C: 1,
        }
        return ranking[self]

    @classmethod
    def from_value(cls, value: str) -> "EvidenceLevel":
        """Parse a string into an EvidenceLevel."""
        normalized = value.strip().upper()
        return cls(normalized)


class MarketSession(str, Enum):
    """Trading session labels used in timeline output."""

    PRE_MARKET = "pre_market"
    REGULAR = "regular"
    POST_MARKET = "post_market"
    UNKNOWN = "unknown"


class EventType(str, Enum):
    """Supported event categories for event-driven research."""

    SEC_FILING = "sec_filing"
    EARNINGS_RELEASE = "earnings_release"
    EARNINGS_CALL = "earnings_call"
    OPTIONS_IV_SNAPSHOT = "options_iv_snapshot"
    NEWS_CLUE = "news_clue"
    SOCIAL_CLUE = "social_clue"
    OTHER = "other"


class PositionStatus(str, Enum):
    """Lifecycle status for a tracked position."""

    WATCHLIST = "watchlist"
    OPEN = "open"
    CLOSED = "closed"


class AgentState(str, Enum):
    """State-machine states for the execution lifecycle."""

    S0_OBSERVE = "S0_OBSERVE"
    S1_WARMUP = "S1_WARMUP"
    S2_POSITION_ON = "S2_POSITION_ON"
    S3_VALIDATING = "S3_VALIDATING"
    S4_REALIZING = "S4_REALIZING"
    S5_EXITED = "S5_EXITED"
