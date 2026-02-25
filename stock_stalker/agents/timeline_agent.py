"""Timeline agent that orchestrates fetchers and validators."""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from data.fetchers import BaseFetcher, EarningsFetcher, NewsFetcher, OptionsFetcher, SecFetcher
from data.validators import (
    EvidenceValidationResult,
    EvidenceValidator,
    TimelineConflict,
    TimelineValidationResult,
    TimelineValidator,
)
from models import Event

LOGGER = logging.getLogger(__name__)


@dataclass(slots=True)
class TimelineReport:
    """Report produced by timeline agent."""

    ticker: str
    events: list[Event]
    pending_checks: list[str]
    conflicts: list[TimelineConflict]
    evidence_issues: list[str]
    generated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


class TimelineAgent:
    """Generate validated event timeline for a given ticker."""

    def __init__(
        self,
        fetchers: list[BaseFetcher] | None = None,
        evidence_validator: EvidenceValidator | None = None,
        timeline_validator: TimelineValidator | None = None,
    ) -> None:
        """Initialize timeline agent with dependency-injected components."""
        self.fetchers = fetchers or [
            SecFetcher(),
            EarningsFetcher(),
            OptionsFetcher(),
            NewsFetcher(),
        ]
        self.evidence_validator = evidence_validator or EvidenceValidator()
        self.timeline_validator = timeline_validator or TimelineValidator()

    def build_timeline(self, ticker: str, include_clues: bool = True) -> TimelineReport:
        """Fetch and validate full timeline for a ticker."""
        normalized_ticker = ticker.upper().strip()
        all_events: list[Event] = []

        for fetcher in self.fetchers:
            if not include_clues and fetcher.__class__.__name__ == "NewsFetcher":
                continue
            try:
                fetched = fetcher.fetch(normalized_ticker)
                all_events.extend(fetched)
                LOGGER.info(
                    "Fetcher %s returned %s events for %s",
                    fetcher.__class__.__name__,
                    len(fetched),
                    normalized_ticker,
                )
            except Exception:
                LOGGER.exception("Fetcher %s failed for %s", fetcher.__class__.__name__, normalized_ticker)

        evidence_result: EvidenceValidationResult = self.evidence_validator.validate(all_events)
        timeline_result: TimelineValidationResult = self.timeline_validator.validate(evidence_result.events)

        pending_checks = list(timeline_result.pending_checks)
        evidence_issue_messages = [issue.message for issue in evidence_result.issues]
        pending_checks.extend(evidence_issue_messages)

        if not timeline_result.events:
            pending_checks.append("No event found from fetchers; verify ticker and data sources")

        pending_checks = sorted(set(pending_checks))
        return TimelineReport(
            ticker=normalized_ticker,
            events=timeline_result.events,
            pending_checks=pending_checks,
            conflicts=timeline_result.conflicts,
            evidence_issues=evidence_issue_messages,
        )

    @staticmethod
    def to_table_rows(report: TimelineReport, local_tz: str = "America/New_York") -> list[dict[str, str]]:
        """Convert timeline report into display table rows."""
        tz = ZoneInfo(local_tz)
        rows: list[dict[str, str]] = []
        for event in report.events:
            rows.append(
                {
                    "event": event.title,
                    "et_time": event.occurred_at.astimezone(ZoneInfo("America/New_York")).isoformat(),
                    "local_time": event.occurred_at.astimezone(tz).isoformat(),
                    "session": event.market_session.value,
                    "source": event.source_url,
                    "evidence": event.evidence_level.value,
                    "importance": str(event.importance),
                }
            )
        return rows
