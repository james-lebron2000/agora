"""Evidence quality validation and classification utilities."""

from __future__ import annotations

import logging
from dataclasses import dataclass, replace
from urllib.parse import urlparse

from models import Event, EvidenceLevel

LOGGER = logging.getLogger(__name__)


@dataclass(slots=True)
class EvidenceIssue:
    """Represents a validation issue detected during evidence checks."""

    event_id: str
    message: str
    detected_level: EvidenceLevel


@dataclass(slots=True)
class EvidenceValidationResult:
    """Validation output containing normalized events and findings."""

    events: list[Event]
    issues: list[EvidenceIssue]

    @property
    def tradeable_events(self) -> list[Event]:
        """Return events that satisfy A/B evidence standards."""
        return [event for event in self.events if event.is_tradeable_evidence()]

    @property
    def clue_events(self) -> list[Event]:
        """Return events that are C-tier clues requiring verification."""
        return [event for event in self.events if event.evidence_level == EvidenceLevel.C]


class EvidenceValidator:
    """Classify event source evidence tier and normalize event labels."""

    TIER_A_DOMAINS = {
        "sec.gov",
        "www.sec.gov",
    }
    TIER_B_DOMAINS = {
        "reuters.com",
        "www.reuters.com",
        "bloomberg.com",
        "www.bloomberg.com",
        "finance.yahoo.com",
        "query2.finance.yahoo.com",
        "www.nasdaq.com",
        "www.nyse.com",
    }

    def classify_source(self, source_url: str) -> EvidenceLevel:
        """Infer evidence level from source domain."""
        hostname = urlparse(source_url).netloc.lower()
        if hostname in self.TIER_A_DOMAINS or "investor" in hostname:
            return EvidenceLevel.A
        if hostname in self.TIER_B_DOMAINS:
            return EvidenceLevel.B
        return EvidenceLevel.C

    def validate(self, events: list[Event]) -> EvidenceValidationResult:
        """Validate and normalize event evidence levels."""
        issues: list[EvidenceIssue] = []
        normalized: list[Event] = []

        for event in events:
            detected_level = self.classify_source(event.source_url)
            if detected_level != event.evidence_level:
                message = (
                    f"Evidence level adjusted from {event.evidence_level.value} "
                    f"to {detected_level.value} based on source domain"
                )
                issues.append(
                    EvidenceIssue(
                        event_id=event.event_id,
                        message=message,
                        detected_level=detected_level,
                    )
                )
                LOGGER.info("%s | event_id=%s", message, event.event_id)
                normalized.append(replace(event, evidence_level=detected_level))
                continue

            if event.evidence_level == EvidenceLevel.C:
                issues.append(
                    EvidenceIssue(
                        event_id=event.event_id,
                        message="C-tier clue cannot directly trigger trading action",
                        detected_level=detected_level,
                    )
                )
            normalized.append(event)

        return EvidenceValidationResult(events=normalized, issues=issues)
