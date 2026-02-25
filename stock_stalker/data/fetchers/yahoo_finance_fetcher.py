# data/fetchers/yahoo_finance_fetcher.py
"""Yahoo Finance fetcher for free market data."""

from __future__ import annotations

import json
import logging
from datetime import datetime, timedelta, timezone
from urllib import request
from urllib.error import HTTPError, URLError

from data.fetchers.base import BaseFetcher, FetcherError
from models import Event, EventType, EvidenceLevel, MarketSession

LOGGER = logging.getLogger(__name__)


class YahooFinanceFetcher(BaseFetcher):
    """Fetch earnings calendar, options chain, and quote data from Yahoo Finance."""

    BASE_URL = "https://query1.finance.yahoo.com/v8/finance/chart"
    EARNINGS_URL = "https://query2.finance.yahoo.com/v1/finance/calendar/earnings"
    OPTIONS_URL = "https://query2.finance.yahoo.com/v7/finance/options"

    def __init__(self, timeout_seconds: int = 15) -> None:
        """Initialize Yahoo Finance fetcher."""
        super().__init__(timeout_seconds=timeout_seconds)

    def _fetch_json(self, url: str) -> dict:
        """Fetch JSON from Yahoo Finance with error handling."""
        headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                         "AppleWebKit/537.36 (KHTML, like Gecko) "
                         "Chrome/120.0.0.0 Safari/537.36",
            "Accept": "application/json",
        }
        req = request.Request(url, headers=headers)
        try:
            with request.urlopen(req, timeout=self.timeout_seconds) as response:
                return json.loads(response.read().decode("utf-8"))
        except HTTPError as e:
            LOGGER.error("HTTP %s for %s", e.code, url)
            raise FetcherError(f"Yahoo Finance HTTP {e.code}", url)
        except URLError as e:
            LOGGER.error("Network error: %s", e.reason)
            raise FetcherError(f"Network error: {e.reason}", url)
        except json.JSONDecodeError as e:
            LOGGER.error("JSON decode error: %s", e)
            raise FetcherError("Invalid JSON response", url)

    def _fetch_quote(self, ticker: str) -> dict:
        """Fetch current quote data."""
        url = f"{self.BASE_URL}/{ticker}?interval=1d&range=1d"
        return self._fetch_json(url)

    def _fetch_earnings(self, ticker: str) -> list[Event]:
        """Fetch earnings calendar events."""
        events = []
        try:
            url = f"{self.EARNINGS_URL}?symbol={ticker}"
            data = self._fetch_json(url)

            if not data or "earnings" not in data:
                LOGGER.info("No earnings data for %s", ticker)
                return events

            earnings = data.get("earnings", {})
            earnings_date = earnings.get("earningsDate", [])

            for date_item in earnings_date:
                date_str = date_item.get("fmt", "")
                if not date_str:
                    continue

                # Parse date and create event
                try:
                    event_date = datetime.strptime(date_str, "%Y-%m-%d").replace(
                        tzinfo=timezone.utc
                    )
                    # Assume earnings are after market close (4:00 PM ET)
                    event_date = event_date.replace(hour=21, minute=0)  # 4PM ET = 9PM UTC

                    event = Event(
                        ticker=ticker.upper(),
                        event_type=EventType.EARNINGS_RELEASE,
                        title=f"{ticker.upper()} Earnings Release",
                        occurred_at=event_date,
                        source_url=f"https://finance.yahoo.com/quote/{ticker}/",
                        evidence_level=EvidenceLevel.B,
                        market_session=MarketSession.POST_MARKET,
                        importance=5,
                        details={
                            "eps_estimate": earnings.get("epsEstimate", {}).get("fmt", "N/A"),
                            "revenue_estimate": earnings.get("revenueEstimate", {}).get("fmt", "N/A"),
                            "source": "yahoo_finance",
                        },
                    )
                    events.append(event)
                    LOGGER.info("Found earnings event for %s at %s", ticker, date_str)
                except ValueError as e:
                    LOGGER.warning("Failed to parse earnings date %s: %s", date_str, e)

        except FetcherError as e:
            LOGGER.warning("Failed to fetch earnings for %s: %s", ticker, e)

        return events

    def _fetch_options_iv(self, ticker: str) -> list[Event]:
        """Fetch options implied volatility data."""
        events = []
        try:
            url = f"{self.OPTIONS_URL}/{ticker}"
            data = self._fetch_json(url)

            if not data or "optionChain" not in data:
                return events

            option_chain = data["optionChain"].get("result", [])
            if not option_chain:
                return events

            result = option_chain[0]
            quote = result.get("quote", {})

            # Extract ATM IV
            underlying_price = quote.get("regularMarketPrice", 0)
            iv = quote.get("impliedVolatility", 0)

            if iv and underlying_price:
                event = Event(
                    ticker=ticker.upper(),
                    event_type=EventType.OPTIONS_IV_SNAPSHOT,
                    title=f"{ticker.upper()} Options IV Snapshot",
                    occurred_at=datetime.now(timezone.utc),
                    source_url=f"https://finance.yahoo.com/quote/{ticker}/options",
                    evidence_level=EvidenceLevel.B,
                    market_session=MarketSession.REGULAR,
                    importance=3,
                    details={
                        "atm_iv": iv,
                        "underlying_price": underlying_price,
                        "fifty_two_week_high": quote.get("fiftyTwoWeekHigh", 0),
                        "fifty_two_week_low": quote.get("fiftyTwoWeekLow", 0),
                        "average_volume": quote.get("averageDailyVolume3Month", 0),
                        "source": "yahoo_finance",
                    },
                )
                events.append(event)
                LOGGER.info("Found options IV %.2f for %s", iv, ticker)

        except FetcherError as e:
            LOGGER.warning("Failed to fetch options for %s: %s", ticker, e)

        return events

    def _fetch_sec_filings_clue(self, ticker: str) -> list[Event]:
        """Fetch SEC filing clues from Yahoo (redirects to SEC)."""
        events = []
        try:
            # Yahoo doesn't provide direct SEC filing data
            # This is a placeholder that creates a C-level clue
            event = Event(
                ticker=ticker.upper(),
                event_type=EventType.SEC_FILING,
                title=f"{ticker.upper()} Recent SEC Filings (Clue)",
                occurred_at=datetime.now(timezone.utc),
                source_url=f"https://finance.yahoo.com/quote/{ticker}/sec-filings",
                evidence_level=EvidenceLevel.C,
                market_session=MarketSession.UNKNOWN,
                importance=4,
                details={
                    "note": "Use SEC EDGAR for A-tier evidence",
                    "sec_url": f"https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK={ticker}&type=8-K",
                    "source": "yahoo_finance_clue",
                },
            )
            events.append(event)

        except Exception as e:
            LOGGER.warning("Failed to fetch SEC clue for %s: %s", ticker, e)

        return events

    def fetch(self, ticker: str) -> list[Event]:
        """Fetch all available Yahoo Finance data for ticker."""
        LOGGER.info("Fetching Yahoo Finance data for %s", ticker)
        events = []

        # Fetch earnings calendar
        try:
            events.extend(self._fetch_earnings(ticker))
        except Exception as e:
            LOGGER.warning("Earnings fetch failed for %s: %s", ticker, e)

        # Fetch options IV
        try:
            events.extend(self._fetch_options_iv(ticker))
        except Exception as e:
            LOGGER.warning("Options fetch failed for %s: %s", ticker, e)

        # Add SEC filing clue
        try:
            events.extend(self._fetch_sec_filings_clue(ticker))
        except Exception as e:
            LOGGER.warning("SEC clue fetch failed for %s: %s", ticker, e)

        LOGGER.info("Yahoo Finance fetcher found %d events for %s", len(events), ticker)
        return events


def fetch_yahoo_quote(ticker: str) -> dict | None:
    """Standalone function to fetch current quote (for quick checks)."""
    try:
        fetcher = YahooFinanceFetcher()
        url = f"{fetcher.BASE_URL}/{ticker}?interval=1d&range=1d"
        data = fetcher._fetch_json(url)

        if data and "chart" in data and data["chart"]["result"]:
            result = data["chart"]["result"][0]
            meta = result.get("meta", {})
            return {
                "symbol": meta.get("symbol"),
                "regular_market_price": meta.get("regularMarketPrice"),
                "previous_close": meta.get("previousClose"),
                "currency": meta.get("currency"),
            }
    except Exception as e:
        LOGGER.error("Failed to fetch quote for %s: %s", ticker, e)

    return None
