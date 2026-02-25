"""Core unit tests for stock stalker agents and validators."""

from __future__ import annotations

from dataclasses import replace
from datetime import datetime, timedelta, timezone

from agents import (
    ConvictionAgent,
    ExecutionAgent,
    ResearchAgent,
    RiskAgent,
    TimelineAgent,
    TradingStateMachine,
)
from data.fetchers import BaseFetcher
from data.validators import EvidenceValidator, TimelineValidator
from models import Event, EventType, EvidenceLevel, MarketSession


class StubFetcher(BaseFetcher):
    """In-memory fetcher used for deterministic tests."""

    def __init__(self, events: list[Event]) -> None:
        """Initialize stub fetcher with static event list."""
        super().__init__()
        self._events = events

    def fetch(self, ticker: str) -> list[Event]:
        """Return static events with normalized ticker override."""
        return [replace(event, ticker=ticker.upper()) for event in self._events]


def _event(
    event_type: EventType,
    title: str,
    hours_from_now: int,
    source_url: str,
    evidence: EvidenceLevel,
    importance: int,
    details: dict | None = None,
) -> Event:
    """Build a timezone-aware test event."""
    return Event(
        ticker="AAPL",
        event_type=event_type,
        title=title,
        occurred_at=datetime.now(timezone.utc) + timedelta(hours=hours_from_now),
        source_url=source_url,
        evidence_level=evidence,
        market_session=MarketSession.UNKNOWN,
        importance=importance,
        details=details or {},
    )


def test_evidence_and_timeline_validation() -> None:
    """Validator should reclassify levels and resolve timeline conflicts."""
    validator = EvidenceValidator()
    timeline = TimelineValidator(conflict_window_minutes=30)

    event_a = _event(
        EventType.EARNINGS_RELEASE,
        "Estimated earnings release",
        24,
        "https://query2.finance.yahoo.com/v10/finance/quoteSummary/AAPL?modules=calendarEvents",
        EvidenceLevel.C,
        5,
    )
    event_b = _event(
        EventType.EARNINGS_RELEASE,
        "Estimated earnings release",
        27,
        "https://www.sec.gov/Archives/edgar/data/123/abc.htm",
        EvidenceLevel.B,
        5,
    )

    evidence_result = validator.validate([event_a, event_b])
    assert len(evidence_result.issues) >= 1

    timeline_result = timeline.validate(evidence_result.events)
    assert len(timeline_result.events) == 1
    assert len(timeline_result.conflicts) == 1
    assert timeline_result.events[0].evidence_level == EvidenceLevel.A


def test_end_to_end_agent_flow() -> None:
    """Core agents should produce conviction, trade plan, and risk report."""
    events = [
        _event(
            EventType.SEC_FILING,
            "SEC 8-K filing",
            -12,
            "https://www.sec.gov/Archives/edgar/data/320193/abc.htm",
            EvidenceLevel.A,
            5,
        ),
        _event(
            EventType.EARNINGS_RELEASE,
            "Estimated earnings release",
            72,
            "https://query2.finance.yahoo.com/v10/finance/quoteSummary/AAPL?modules=calendarEvents",
            EvidenceLevel.B,
            5,
        ),
        _event(
            EventType.OPTIONS_IV_SNAPSHOT,
            "ATM implied volatility snapshot",
            -1,
            "https://query2.finance.yahoo.com/v7/finance/options/AAPL",
            EvidenceLevel.B,
            4,
            details={"atm_iv": 0.72},
        ),
        _event(
            EventType.NEWS_CLUE,
            "Media rumor",
            -2,
            "https://example.com/story",
            EvidenceLevel.C,
            1,
        ),
    ]

    timeline_agent = TimelineAgent(fetchers=[StubFetcher(events)])
    timeline_report = timeline_agent.build_timeline("AAPL", include_clues=True)

    research = ResearchAgent().analyze("AAPL", timeline_report.events, timeline_report.pending_checks)
    conviction = ConvictionAgent().score(
        timeline_report.events,
        conflict_count=len(timeline_report.conflicts),
        pending_count=len(timeline_report.pending_checks),
    )
    execution = ExecutionAgent().create_plan("AAPL", conviction, research.thesis, timeline_report.events)
    risk = RiskAgent().assess(execution.trade_plan, timeline_report.events, conviction)

    assert 0 <= conviction.score <= 100
    assert execution.trade_plan.ticker == "AAPL"
    assert execution.trade_plan.base_case.position_size_pct >= 0
    assert "drawdown" in risk.forced_explanation_rule.lower()


def test_state_machine_transitions() -> None:
    """State machine should move through S0->S5 with expected triggers."""
    sm = TradingStateMachine()
    assert sm.update(conviction_score=65, has_position=False).value == "S1_WARMUP"
    assert sm.update(conviction_score=65, has_position=True).value == "S2_POSITION_ON"
    assert sm.update(conviction_score=65, has_position=True).value == "S3_VALIDATING"
    assert sm.update(conviction_score=65, has_position=True, take_profit_hit=True).value == "S4_REALIZING"
    assert sm.update(conviction_score=65, has_position=False).value == "S5_EXITED"
