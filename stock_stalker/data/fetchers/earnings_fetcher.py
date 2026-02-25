"""Earnings calendar fetcher for release and call schedule clues."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from data.fetchers.base import BaseFetcher, FetcherError
from models import Event, EventType, EvidenceLevel, MarketSession

LOGGER = logging.getLogger(__name__)


class EarningsFetcher(BaseFetcher):
    """Fetcher for earnings release windows and conference call hints."""

    CALENDAR_URL = (
        "https://query2.finance.yahoo.com/v10/finance/quoteSummary/"
        "{ticker}?modules=calendarEvents"
    )

    @staticmethod
    def _session_from_hint(hint: str | None) -> MarketSession:
        """Map provider hint text into market session classification."""
        if not hint:
            return MarketSession.UNKNOWN
        lowered = hint.lower()
        if "amc" in lowered or "after" in lowered:
            return MarketSession.POST_MARKET
        if "bmo" in lowered or "before" in lowered:
            return MarketSession.PRE_MARKET
        if "dmt" in lowered:
            return MarketSession.REGULAR
        return MarketSession.UNKNOWN

    @staticmethod
    def _from_unix(raw_ts: int | float) -> datetime:
        """Convert unix timestamp into timezone-aware datetime."""
        return datetime.fromtimestamp(float(raw_ts), tz=timezone.utc)

    def fetch(self, ticker: str) -> list[Event]:
        """Fetch earnings release date and call hints for a ticker."""
        url = self.CALENDAR_URL.format(ticker=ticker.upper())
        try:
            payload = self._request_json(url)
        except FetcherError:
            LOGGER.exception("Failed fetching earnings schedule for %s", ticker)
            return []

        result = payload.get("quoteSummary", {}).get("result")
        if not isinstance(result, list) or not result:
            LOGGER.info("No earnings calendar result for %s", ticker)
            return []

        calendar = result[0].get("calendarEvents", {})
        earnings = calendar.get("earnings", {})
        earnings_dates = earnings.get("earningsDate", [])
        call_time_hint = earnings.get("earningsCallTime", "")

        events: list[Event] = []
        for date_payload in earnings_dates:
            raw_ts = date_payload.get("raw")
            if raw_ts is None:
                continue

            occurred_at = self._from_unix(raw_ts)
            events.append(
                Event(
                    ticker=ticker.upper(),
                    event_type=EventType.EARNINGS_RELEASE,
                    title="Estimated earnings release",
                    occurred_at=occurred_at,
                    source_url=url,
                    evidence_level=EvidenceLevel.B,
                    market_session=self._session_from_hint(call_time_hint),
                    importance=5,
                    details={
                        "provider": "yahoo_finance",
                        "call_time_hint": call_time_hint,
                    },
                )
            )

            if call_time_hint:
                events.append(
                    Event(
                        ticker=ticker.upper(),
                        event_type=EventType.EARNINGS_CALL,
                        title="Estimated earnings conference call",
                        occurred_at=occurred_at,
                        source_url=url,
                        evidence_level=EvidenceLevel.C,
                        market_session=self._session_from_hint(call_time_hint),
                        importance=4,
                        details={
                            "provider": "yahoo_finance",
                            "call_time_hint": call_time_hint,
                            "note": "Call detail must be verified from IR page or 8-K",
                        },
                    )
                )

        LOGGER.info("Fetched %s earnings events for %s", len(events), ticker)
        return events
