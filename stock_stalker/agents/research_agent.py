"""Research agent generating hypothesis and falsification framework."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from models import Event, EventType, EvidenceLevel, Thesis

LOGGER = logging.getLogger(__name__)


@dataclass(slots=True)
class ResearchReport:
    """Output of research analysis."""

    thesis: Thesis
    facts: list[str]
    must_verify: list[str]


class ResearchAgent:
    """Create thesis, falsification conditions, and verification checklist."""

    def analyze(self, ticker: str, events: list[Event], pending_checks: list[str]) -> ResearchReport:
        """Analyze event set and generate a structured thesis."""
        now = datetime.now(timezone.utc)
        upper_ticker = ticker.upper()

        earnings_events = [event for event in events if event.event_type == EventType.EARNINGS_RELEASE]
        sec_events = [event for event in events if event.event_type == EventType.SEC_FILING]
        iv_events = [event for event in events if event.event_type == EventType.OPTIONS_IV_SNAPSHOT]

        upcoming_earnings = [
            event for event in earnings_events if now <= event.occurred_at <= now + timedelta(days=30)
        ]
        has_recent_sec = any(event.occurred_at >= now - timedelta(days=45) for event in sec_events)

        avg_iv = None
        if iv_events:
            iv_values = [float(event.details.get("atm_iv", 0.0)) for event in iv_events]
            iv_values = [iv for iv in iv_values if iv > 0]
            if iv_values:
                avg_iv = sum(iv_values) / len(iv_values)

        hypothesis = (
            f"{upper_ticker} is entering an event-rich window where upcoming catalysts "
            f"can reprice expectations if A/B evidence confirms directional fundamentals."
        )
        if avg_iv and avg_iv > 0.65:
            hypothesis = (
                f"{upper_ticker} options imply elevated move expectations; if earnings or filing data "
                f"beats consensus narrative, there is asymmetric upside from expectation reset."
            )

        falsification = [
            "A/B source confirms guidance cut or major miss vs prior quarter trend",
            "No A-tier confirmation appears within 24h after catalyst",
            "Post-event price closes below risk line by more than stop threshold",
        ]
        win_paths = [
            "Earnings/8-K confirms better-than-feared trend and market reprices forward estimates",
            "Implied volatility compresses after event while spot follows through in thesis direction",
        ]
        loss_paths = [
            "Catalyst details contradict thesis and invalidate core driver",
            "Narrative stays C-tier without A/B confirmation, causing false breakout",
        ]

        must_verify = list(dict.fromkeys((
            pending_checks
            + [
                "Confirm exact earnings release timestamp from IR or SEC 8-K",
                "Validate conference call schedule and transcript source",
                "Extract key guidance KPI fields from latest filing",
                "Cross-check options IV percentile vs 1y history",
            ]
        )))[:5]

        has_changed = len(pending_checks) > 0 and sum(
            1 for event in events if event.evidence_level == EvidenceLevel.C
        ) > max(1, len(events) // 2)

        thesis = Thesis(
            ticker=upper_ticker,
            main_hypothesis=hypothesis,
            falsification_conditions=falsification,
            win_paths=win_paths,
            loss_paths=loss_paths,
            verification_tasks=must_verify,
            has_changed=has_changed,
            change_reason="Evidence quality degraded by C-tier dominance" if has_changed else "",
        )

        facts = [
            f"Upcoming earnings in 30d: {len(upcoming_earnings)}",
            f"Recent SEC filings in 45d: {sum(1 for event in sec_events if event.occurred_at >= now - timedelta(days=45))}",
            f"Average ATM IV: {avg_iv:.3f}" if avg_iv is not None else "Average ATM IV: unavailable",
            f"Has recent SEC confirmation: {'Yes' if has_recent_sec else 'No'}",
        ]

        LOGGER.info("Generated research thesis for %s", upper_ticker)
        return ResearchReport(thesis=thesis, facts=facts, must_verify=must_verify)
