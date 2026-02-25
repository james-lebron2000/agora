"""Execution agent creating actionable trade plans."""

from __future__ import annotations

import logging
from dataclasses import dataclass

from agents.conviction_agent import ConvictionResult
from models import Event, Thesis, TradePlan, TradeScenario

LOGGER = logging.getLogger(__name__)


@dataclass(slots=True)
class ExecutionReport:
    """Execution output containing trade plan and action gate."""

    trade_plan: TradePlan
    action: str
    note: str


class ExecutionAgent:
    """Build base and alternative trade scenarios from conviction and thesis."""

    def create_plan(self, ticker: str, conviction: ConvictionResult, thesis: Thesis, events: list[Event]) -> ExecutionReport:
        """Create trade plan with position sizing and trigger conditions."""
        if conviction.score >= 75:
            base_size = 0.20
            alt_size = 0.12
            action = "TRADE"
            note = "High conviction: deploy primary setup with full risk controls"
        elif conviction.score >= 60:
            base_size = 0.10
            alt_size = 0.05
            action = "TRADE_SMALL"
            note = "Medium conviction: start with pilot size and add on confirmation"
        else:
            base_size = 0.02
            alt_size = 0.00
            action = "TRACK_ONLY"
            note = "Low conviction: no aggressive entry until A/B confirmation"

        base_case = TradeScenario(
            entry_trigger="A/B evidence confirms catalyst and price holds above trigger level for 30m",
            stop_loss_pct=0.04 if conviction.score >= 60 else 0.03,
            take_profit_pct=0.10 if conviction.score >= 75 else 0.07,
            position_size_pct=base_size,
            add_on_condition="Add 25% when thesis KPI confirms and IV starts compressing",
            invalidation_condition=thesis.falsification_conditions[0],
            notes="Base Case: follow primary hypothesis path",
        )
        alt_case = TradeScenario(
            entry_trigger="If gap move >8%, wait for pullback/retest before entry",
            stop_loss_pct=0.03,
            take_profit_pct=0.06,
            position_size_pct=alt_size,
            add_on_condition="No add-on unless second A-tier source confirms",
            invalidation_condition=thesis.falsification_conditions[1],
            notes="Alt Case: volatility control scenario",
        )

        plan = TradePlan(
            ticker=ticker.upper(),
            conviction_score=conviction.score,
            base_case=base_case,
            alt_case=alt_case,
            status="ready" if conviction.score >= 60 else "watch_only",
        )
        LOGGER.info("Generated trade plan for %s with action=%s", ticker.upper(), action)
        return ExecutionReport(trade_plan=plan, action=action, note=note)
