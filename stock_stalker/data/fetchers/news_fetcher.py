"""News and social fetcher for low-confidence clue discovery."""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from xml.etree import ElementTree as ET

from data.fetchers.base import BaseFetcher, FetcherError
from models import Event, EventType, EvidenceLevel, MarketSession

LOGGER = logging.getLogger(__name__)


class NewsFetcher(BaseFetcher):
    """Fetcher for C-tier news and social signals used as verification leads."""

    RSS_URL = "https://feeds.finance.yahoo.com/rss/2.0/headline?s={ticker}&region=US&lang=en-US"
    STOCKTWITS_URL = "https://api.stocktwits.com/api/2/streams/symbol/{ticker}.json"

    def _parse_rss(self, ticker: str, xml_text: str) -> list[Event]:
        """Parse Yahoo RSS into C-tier news clue events."""
        events: list[Event] = []
        try:
            root = ET.fromstring(xml_text)
        except ET.ParseError:
            LOGGER.warning("Invalid RSS XML for %s", ticker)
            return events

        for item in root.findall("./channel/item")[:10]:
            title = item.findtext("title") or "News clue"
            link = item.findtext("link") or ""
            pub_date_text = item.findtext("pubDate")
            if pub_date_text:
                try:
                    occurred_at = parsedate_to_datetime(pub_date_text)
                    if occurred_at.tzinfo is None:
                        occurred_at = occurred_at.replace(tzinfo=timezone.utc)
                except (TypeError, ValueError):
                    occurred_at = datetime.now(timezone.utc)
            else:
                occurred_at = datetime.now(timezone.utc)

            events.append(
                Event(
                    ticker=ticker.upper(),
                    event_type=EventType.NEWS_CLUE,
                    title=title,
                    occurred_at=occurred_at,
                    source_url=link or self.RSS_URL.format(ticker=ticker),
                    evidence_level=EvidenceLevel.C,
                    market_session=MarketSession.UNKNOWN,
                    importance=2,
                    details={"provider": "yahoo_rss"},
                )
            )
        return events

    def _parse_stocktwits(self, ticker: str, payload: dict) -> list[Event]:
        """Parse Stocktwits JSON payload into social clue events."""
        events: list[Event] = []
        messages = payload.get("messages", [])

        for message in messages[:10]:
            body = str(message.get("body", "")).strip()
            created_at = str(message.get("created_at", ""))
            message_id = message.get("id")
            if not body or not created_at:
                continue

            try:
                occurred_at = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
            except ValueError:
                occurred_at = datetime.now(timezone.utc)

            source_url = f"https://stocktwits.com/message/{message_id}" if message_id else self.STOCKTWITS_URL
            events.append(
                Event(
                    ticker=ticker.upper(),
                    event_type=EventType.SOCIAL_CLUE,
                    title=body[:140],
                    occurred_at=occurred_at,
                    source_url=source_url,
                    evidence_level=EvidenceLevel.C,
                    market_session=MarketSession.UNKNOWN,
                    importance=1,
                    details={"provider": "stocktwits"},
                )
            )
        return events

    def fetch(self, ticker: str) -> list[Event]:
        """Fetch C-tier news and social clues for a ticker."""
        events: list[Event] = []

        rss_url = self.RSS_URL.format(ticker=ticker.upper())
        try:
            rss_text = self._request_text(rss_url)
            events.extend(self._parse_rss(ticker=ticker, xml_text=rss_text))
        except FetcherError:
            LOGGER.exception("Failed fetching RSS for %s", ticker)

        tw_url = self.STOCKTWITS_URL.format(ticker=ticker.upper())
        try:
            raw = self._request_text(tw_url)
            payload = json.loads(raw)
            if isinstance(payload, dict):
                events.extend(self._parse_stocktwits(ticker=ticker, payload=payload))
        except (FetcherError, json.JSONDecodeError):
            LOGGER.exception("Failed fetching stocktwits feed for %s", ticker)

        events.sort(key=lambda x: x.occurred_at, reverse=True)
        LOGGER.info("Fetched %s C-tier clue events for %s", len(events), ticker)
        return events
