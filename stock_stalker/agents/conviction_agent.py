"""Conviction agent scoring confidence from evidence and catalyst context."""

from __future__ import annotations

import logging
from dataclasses import dataclass

from models import Event, EventType, EvidenceLevel

LOGGER = logging.getLogger(__name__)


@dataclass(slots=True)
class ConvictionResult:
    """Conviction scoring output."""

    score: int
    breakdown: dict[str, int]
    band: str
    rationale: list[str]


class ConvictionAgent:
    """Score conviction across certainty, catalyst, expectation gap, and execution."""

    def _score_information_certainty(self, events: list[Event]) -> int:
        """Score evidence certainty using weighted evidence quality."""
        if not events:
            return 0
        weighted_sum = sum(event.evidence_level.priority for event in events)
        max_sum = 3 * len(events)
        return int(round((weighted_sum / max_sum) * 25))

    def _score_catalyst_strength(self, events: list[Event]) -> int:
        """Score catalyst intensity from event importance and earnings presence."""
        if not events:
            return 0
        avg_importance = sum(event.importance for event in events) / len(events)
        score = int(round((avg_importance / 5.0) * 20))
        if any(event.event_type == EventType.EARNINGS_RELEASE for event in events):
            score += 5
        return min(score, 25)

    def _score_expectation_gap(self, events: list[Event]) -> int:
        """Score expectation gap using implied volatility clues."""
        iv_values: list[float] = []
        for event in events:
            if event.event_type != EventType.OPTIONS_IV_SNAPSHOT:
                continue
            iv = event.details.get("atm_iv")
            if iv is not None:
                iv_values.append(float(iv))

        if not iv_values:
            return 10

        avg_iv = sum(iv_values) / len(iv_values)
        if avg_iv >= 0.8:
            return 23
        if avg_iv >= 0.6:
            return 19
        if avg_iv >= 0.45:
            return 15
        return 11

    def _score_execution_feasibility(self, events: list[Event], conflict_count: int, pending_count: int) -> int:
        """Score execution readiness from data quality and conflict burden."""
        if not events:
            return 0
        c_ratio = sum(1 for event in events if event.evidence_level == EvidenceLevel.C) / len(events)
        score = 25
        score -= int(round(c_ratio * 10))
        score -= conflict_count * 4
        score -= min(pending_count, 5) * 2
        return max(0, min(score, 25))

    def score(self, events: list[Event], conflict_count: int = 0, pending_count: int = 0) -> ConvictionResult:
        """Calculate overall conviction score and decision band."""
        certainty = self._score_information_certainty(events)
        catalyst = self._score_catalyst_strength(events)
        gap = self._score_expectation_gap(events)
        execution = self._score_execution_feasibility(events, conflict_count, pending_count)

        total = certainty + catalyst + gap + execution
        total = max(0, min(total, 100))

        if total >= 75:
            band = "HIGH"
        elif total >= 60:
            band = "MEDIUM"
        else:
            band = "LOW"

        rationale = [
            f"Information certainty={certainty}/25",
            f"Catalyst strength={catalyst}/25",
            f"Expectation gap={gap}/25",
            f"Execution feasibility={execution}/25",
        ]
        LOGGER.info("Conviction score=%s band=%s", total, band)

        return ConvictionResult(
            score=total,
            breakdown={
                "information_certainty": certainty,
                "catalyst_strength": catalyst,
                "expectation_gap": gap,
                "execution_feasibility": execution,
            },
            band=band,
            rationale=rationale,
        )
