"""Base fetcher abstractions and HTTP helpers."""

from __future__ import annotations

import json
import logging
from abc import ABC, abstractmethod
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from models.event import Event

LOGGER = logging.getLogger(__name__)


class FetcherError(RuntimeError):
    """Raised when a data fetcher cannot retrieve or parse upstream data."""


class BaseFetcher(ABC):
    """Abstract base class for all fetcher implementations."""

    def __init__(self, timeout_seconds: int = 20, user_agent: str | None = None) -> None:
        """Initialize fetcher settings shared by all concrete implementations."""
        self.timeout_seconds = timeout_seconds
        self.user_agent = user_agent or "stock-stalker/1.0 (+research@local)"

    @abstractmethod
    def fetch(self, ticker: str) -> list[Event]:
        """Fetch normalized events for a ticker."""

    def _request_json(self, url: str, headers: dict[str, str] | None = None) -> dict[str, Any]:
        """Perform an HTTP GET request and parse JSON payload."""
        text = self._request_text(url, headers=headers)
        try:
            parsed = json.loads(text)
        except json.JSONDecodeError as exc:
            LOGGER.exception("Failed to parse JSON from %s", url)
            raise FetcherError(f"invalid json payload from {url}") from exc
        if not isinstance(parsed, dict):
            raise FetcherError(f"unexpected non-object json from {url}")
        return parsed

    def _request_text(self, url: str, headers: dict[str, str] | None = None) -> str:
        """Perform an HTTP GET request and return response body as UTF-8 text."""
        merged_headers = {"User-Agent": self.user_agent}
        if headers:
            merged_headers.update(headers)

        req = Request(url=url, headers=merged_headers, method="GET")
        try:
            with urlopen(req, timeout=self.timeout_seconds) as response:
                payload = response.read()
        except HTTPError as exc:
            LOGGER.warning("HTTP error when fetching %s: %s", url, exc)
            raise FetcherError(f"http error from {url}: {exc.code}") from exc
        except URLError as exc:
            LOGGER.warning("Network error when fetching %s: %s", url, exc)
            raise FetcherError(f"network error from {url}") from exc

        try:
            return payload.decode("utf-8")
        except UnicodeDecodeError as exc:
            LOGGER.exception("Failed to decode response body from %s", url)
            raise FetcherError(f"failed to decode response from {url}") from exc
