"""Risk agent for scenario risk checks and hedge suggestions."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from agents.conviction_agent import ConvictionResult
from models import Event, EventType, EvidenceLevel, TradePlan

LOGGER = logging.getLogger(__name__)


@dataclass(slots=True)
class RiskReport:
    """Risk evaluation report for a proposed trade plan."""

    risks: list[str]
    hedges: list[str]
    max_position_pct: float
    stop_policy: str
    forced_explanation_rule: str


class RiskAgent:
    """Evaluate event and execution risks, then output hedge guidance."""

    def assess(self, trade_plan: TradePlan, events: list[Event], conviction: ConvictionResult) -> RiskReport:
        """Assess risks and suggest hedges for the current trade plan."""
        risks: list[str] = []
        hedges: list[str] = []

        now = datetime.now(timezone.utc)
        near_term_earnings = [
            event
            for event in events
            if event.event_type == EventType.EARNINGS_RELEASE
            and now <= event.occurred_at <= now + timedelta(days=7)
        ]

        if near_term_earnings:
            risks.append("Earnings gap risk in next 7 days")
            hedges.append("Use defined-risk options structure (put spread or call spread)")

        c_ratio = (sum(1 for event in events if event.evidence_level == EvidenceLevel.C) / len(events)) if events else 1
        if c_ratio > 0.4:
            risks.append("High C-tier evidence ratio; information quality risk")
            hedges.append("Delay sizing until A/B confirmation")

        if conviction.score < 60:
            risks.append("Low conviction regime; false-breakout probability elevated")
            hedges.append("Keep exposure minimal and trade only on trigger confirmation")

        if not hedges:
            hedges.append("Maintain hard stop and reduce size before major catalyst windows")

        forced_rule = "Mandatory post-move explanation if 3-day drawdown >8% or single-day drop >5%"
        stop_policy = f"Hard stop at {trade_plan.base_case.stop_loss_pct * 100:.1f}% from entry"
        max_position = min(trade_plan.recommended_position_pct(), 0.20)

        LOGGER.info("Risk assessment generated for %s", trade_plan.ticker)
        return RiskReport(
            risks=risks,
            hedges=hedges,
            max_position_pct=max_position,
            stop_policy=stop_policy,
            forced_explanation_rule=forced_rule,
        )
