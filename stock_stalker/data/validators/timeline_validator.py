"""Timeline consistency checks and conflict resolution."""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from datetime import timedelta
from itertools import groupby

from models import Event, EvidenceLevel

LOGGER = logging.getLogger(__name__)


@dataclass(slots=True)
class TimelineConflict:
    """Represents conflicting timestamps for likely identical events."""

    event_type: str
    date: str
    candidate_event_ids: list[str]
    chosen_event_id: str
    reason: str


@dataclass(slots=True)
class TimelineValidationResult:
    """Output of timeline validation and conflict resolution."""

    events: list[Event]
    conflicts: list[TimelineConflict]
    pending_checks: list[str]


class TimelineValidator:
    """Detect timeline conflicts and keep most reliable event records."""

    def __init__(self, conflict_window_minutes: int = 90) -> None:
        """Initialize validator conflict threshold."""
        self.conflict_window = timedelta(minutes=conflict_window_minutes)

    @staticmethod
    def _normalize_title(title: str) -> str:
        """Normalize title for fuzzy grouping of duplicate events."""
        lowered = title.lower().strip()
        return re.sub(r"[^a-z0-9]+", " ", lowered)[:48].strip()

    @staticmethod
    def _pick_best(events: list[Event]) -> Event:
        """Select best event by evidence level, then importance, then recency."""
        return sorted(
            events,
            key=lambda event: (
                event.evidence_level.priority,
                event.importance,
                event.occurred_at,
            ),
            reverse=True,
        )[0]

    def validate(self, events: list[Event]) -> TimelineValidationResult:
        """Validate timeline consistency and resolve duplicate timestamp conflicts."""
        if not events:
            return TimelineValidationResult(events=[], conflicts=[], pending_checks=["No events found"]) 

        events_sorted = sorted(
            events,
            key=lambda event: (event.ticker, event.event_type.value, event.occurred_at),
        )

        resolved: list[Event] = []
        conflicts: list[TimelineConflict] = []
        pending_checks: list[str] = []

        key_func = lambda event: (
            event.ticker,
            event.event_type.value,
            self._normalize_title(event.title),
            event.occurred_at.date().isoformat(),
        )

        for _, group_iter in groupby(events_sorted, key=key_func):
            group = list(group_iter)
            if len(group) == 1:
                resolved.append(group[0])
                continue

            chosen = self._pick_best(group)
            resolved.append(chosen)

            min_ts = min(item.occurred_at for item in group)
            max_ts = max(item.occurred_at for item in group)
            if max_ts - min_ts > self.conflict_window:
                conflict = TimelineConflict(
                    event_type=chosen.event_type.value,
                    date=chosen.occurred_at.date().isoformat(),
                    candidate_event_ids=[item.event_id for item in group],
                    chosen_event_id=chosen.event_id,
                    reason="timestamp mismatch across sources; selected highest evidence",
                )
                conflicts.append(conflict)
                LOGGER.warning(
                    "Timeline conflict resolved for %s on %s; chosen=%s",
                    conflict.event_type,
                    conflict.date,
                    conflict.chosen_event_id,
                )

            if all(item.evidence_level == EvidenceLevel.C for item in group):
                pending_checks.append(
                    f"{chosen.event_type.value} on {chosen.occurred_at.date()} has only C-tier evidence"
                )

        for event in resolved:
            if event.evidence_level == EvidenceLevel.C:
                pending_checks.append(
                    f"Verify {event.event_type.value} from A/B source: {event.title}"
                )

        resolved.sort(key=lambda event: event.occurred_at)
        dedup_pending = sorted(set(pending_checks))
        return TimelineValidationResult(events=resolved, conflicts=conflicts, pending_checks=dedup_pending)
