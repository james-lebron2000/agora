"""SEC EDGAR fetcher for 8-K, 10-Q and 10-K filings."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from data.fetchers.base import BaseFetcher, FetcherError
from models import Event, EventType, EvidenceLevel, MarketSession

LOGGER = logging.getLogger(__name__)


class SecFetcher(BaseFetcher):
    """Fetcher for SEC filings sourced from EDGAR JSON feeds."""

    SEC_TICKERS_URL = "https://www.sec.gov/files/company_tickers.json"
    SUBMISSIONS_URL = "https://data.sec.gov/submissions/CIK{cik}.json"
    SUPPORTED_FORMS = ("8-K", "10-Q", "10-K")

    def _resolve_cik(self, ticker: str) -> str:
        """Resolve ticker symbol to zero-padded SEC CIK."""
        payload = self._request_json(self.SEC_TICKERS_URL)
        ticker_upper = ticker.upper().strip()

        for value in payload.values():
            if not isinstance(value, dict):
                continue
            if str(value.get("ticker", "")).upper() == ticker_upper:
                cik_number = int(value["cik_str"])
                return f"{cik_number:010d}"

        raise FetcherError(f"ticker {ticker} not found in SEC ticker map")

    @staticmethod
    def _parse_time(filing_date: str, acceptance_time: str | None) -> datetime:
        """Parse SEC acceptance or filing time into timezone-aware datetime."""
        if acceptance_time:
            normalized = acceptance_time.replace("Z", "+00:00")
            return datetime.fromisoformat(normalized)
        return datetime.fromisoformat(f"{filing_date}T00:00:00+00:00")

    @staticmethod
    def _filing_url(cik: str, accession: str, primary_document: str) -> str:
        """Build canonical SEC archive URL for a filing document."""
        accession_no_dash = accession.replace("-", "")
        cik_no_padding = str(int(cik))
        return (
            f"https://www.sec.gov/Archives/edgar/data/"
            f"{cik_no_padding}/{accession_no_dash}/{primary_document}"
        )

    def fetch(self, ticker: str) -> list[Event]:
        """Fetch recent SEC filings and normalize them as events."""
        try:
            cik = self._resolve_cik(ticker)
            submissions = self._request_json(self.SUBMISSIONS_URL.format(cik=cik))
        except FetcherError:
            LOGGER.exception("Failed fetching SEC data for %s", ticker)
            return []

        recent = submissions.get("filings", {}).get("recent", {})
        forms = recent.get("form", [])
        filing_dates = recent.get("filingDate", [])
        accessions = recent.get("accessionNumber", [])
        primary_docs = recent.get("primaryDocument", [])
        acceptance_times = recent.get("acceptanceDateTime", [])

        events: list[Event] = []
        max_len = min(len(forms), len(filing_dates), len(accessions), len(primary_docs))
        for index in range(max_len):
            form = str(forms[index])
            if form not in self.SUPPORTED_FORMS:
                continue

            filing_date = str(filing_dates[index])
            accession = str(accessions[index])
            primary_doc = str(primary_docs[index])
            acceptance_time = str(acceptance_times[index]) if index < len(acceptance_times) else None

            try:
                occurred_at = self._parse_time(filing_date=filing_date, acceptance_time=acceptance_time)
            except ValueError:
                LOGGER.warning("Invalid SEC filing time for %s: %s", ticker, filing_date)
                occurred_at = datetime.now(timezone.utc)

            source_url = self._filing_url(cik=cik, accession=accession, primary_document=primary_doc)
            events.append(
                Event(
                    ticker=ticker.upper(),
                    event_type=EventType.SEC_FILING,
                    title=f"SEC {form} filing",
                    occurred_at=occurred_at,
                    source_url=source_url,
                    evidence_level=EvidenceLevel.A,
                    market_session=MarketSession.UNKNOWN,
                    importance=5 if form == "8-K" else 4,
                    details={
                        "form": form,
                        "accession": accession,
                        "primary_document": primary_doc,
                    },
                )
            )

        LOGGER.info("Fetched %s SEC filing events for %s", len(events), ticker)
        return events
