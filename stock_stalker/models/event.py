"""Event model for timeline construction and validation."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from models.enums import EvidenceLevel, EventType, MarketSession


@dataclass(slots=True)
class Event:
    """A normalized event record used by all agents."""

    ticker: str
    event_type: EventType
    title: str
    occurred_at: datetime
    source_url: str
    evidence_level: EvidenceLevel
    market_session: MarketSession = MarketSession.UNKNOWN
    importance: int = 3
    details: dict[str, Any] = field(default_factory=dict)
    event_id: str = field(default_factory=lambda: str(uuid4()))

    def __post_init__(self) -> None:
        """Validate fields and normalize datetime timezone handling."""
        if not self.ticker:
            raise ValueError("ticker must not be empty")
        if self.importance < 1 or self.importance > 5:
            raise ValueError("importance must be in range [1, 5]")
        if self.occurred_at.tzinfo is None:
            self.occurred_at = self.occurred_at.replace(tzinfo=timezone.utc)

    def is_tradeable_evidence(self) -> bool:
        """Return True when evidence quality allows direct trading actions."""
        return self.evidence_level in {EvidenceLevel.A, EvidenceLevel.B}

    def to_dict(self) -> dict[str, Any]:
        """Serialize the event into a JSON-friendly dictionary."""
        return {
            "event_id": self.event_id,
            "ticker": self.ticker,
            "event_type": self.event_type.value,
            "title": self.title,
            "occurred_at": self.occurred_at.isoformat(),
            "source_url": self.source_url,
            "evidence_level": self.evidence_level.value,
            "market_session": self.market_session.value,
            "importance": self.importance,
            "details": self.details,
        }

    @classmethod
    def from_dict(cls, payload: dict[str, Any]) -> "Event":
        """Build an Event instance from a dictionary payload."""
        # Handle datetime - could be string or datetime object
        occurred_at_raw = payload["occurred_at"]
        if isinstance(occurred_at_raw, datetime):
            occurred_at = occurred_at_raw
        elif isinstance(occurred_at_raw, str):
            occurred_at = datetime.fromisoformat(occurred_at_raw)
        else:
            # Try to parse from string representation
            occurred_at = datetime.fromisoformat(str(occurred_at_raw))
        
        return cls(
            ticker=payload["ticker"],
            event_type=EventType(payload["event_type"]),
            title=payload["title"],
            occurred_at=occurred_at,
            source_url=payload["source_url"],
            evidence_level=EvidenceLevel(payload["evidence_level"]),
            market_session=MarketSession(payload.get("market_session", MarketSession.UNKNOWN.value)),
            importance=int(payload.get("importance", 3)),
            details=payload.get("details", {}),
            event_id=payload.get("event_id", str(uuid4())),
        )
