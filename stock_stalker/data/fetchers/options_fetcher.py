"""Options fetcher for implied volatility snapshots."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from statistics import mean

from data.fetchers.base import BaseFetcher, FetcherError
from models import Event, EventType, EvidenceLevel, MarketSession

LOGGER = logging.getLogger(__name__)


class OptionsFetcher(BaseFetcher):
    """Fetcher that derives near-the-money implied volatility from option chain."""

    OPTIONS_URL = "https://query2.finance.yahoo.com/v7/finance/options/{ticker}"

    @staticmethod
    def _collect_atm_ivs(contracts: list[dict], spot_price: float) -> list[float]:
        """Extract near-the-money implied volatility values from contracts."""
        if spot_price <= 0:
            return []
        values: list[float] = []
        lower = spot_price * 0.95
        upper = spot_price * 1.05
        for contract in contracts:
            strike = contract.get("strike")
            iv = contract.get("impliedVolatility")
            if strike is None or iv is None:
                continue
            if lower <= float(strike) <= upper and float(iv) > 0:
                values.append(float(iv))
        return values

    def fetch(self, ticker: str) -> list[Event]:
        """Fetch options chain and emit implied volatility snapshot event."""
        url = self.OPTIONS_URL.format(ticker=ticker.upper())
        try:
            payload = self._request_json(url)
        except FetcherError:
            LOGGER.exception("Failed fetching options chain for %s", ticker)
            return []

        chain = payload.get("optionChain", {}).get("result", [])
        if not chain:
            LOGGER.info("No options chain result for %s", ticker)
            return []

        first = chain[0]
        quote = first.get("quote", {})
        option_sets = first.get("options", [])
        if not option_sets:
            return []

        spot_price = float(quote.get("regularMarketPrice", 0.0))
        nearest = option_sets[0]
        calls = nearest.get("calls", [])
        puts = nearest.get("puts", [])

        atm_ivs = self._collect_atm_ivs(calls, spot_price) + self._collect_atm_ivs(puts, spot_price)
        if not atm_ivs:
            LOGGER.info("No ATM IV values available for %s", ticker)
            return []

        avg_iv = mean(atm_ivs)
        expiration_ts = nearest.get("expirationDate")
        expiration = (
            datetime.fromtimestamp(float(expiration_ts), tz=timezone.utc)
            if expiration_ts is not None
            else None
        )

        event = Event(
            ticker=ticker.upper(),
            event_type=EventType.OPTIONS_IV_SNAPSHOT,
            title="ATM implied volatility snapshot",
            occurred_at=datetime.now(timezone.utc),
            source_url=url,
            evidence_level=EvidenceLevel.B,
            market_session=MarketSession.REGULAR,
            importance=4,
            details={
                "spot_price": spot_price,
                "atm_iv": avg_iv,
                "contracts_count": len(atm_ivs),
                "nearest_expiration": expiration.isoformat() if expiration else None,
            },
        )
        LOGGER.info("Fetched options IV snapshot for %s: %.4f", ticker, avg_iv)
        return [event]
