# core/watchlist_scanner.py
"""Watchlist scanner for continuous monitoring of multiple tickers."""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from agents import (
    ConvictionAgent,
    ExecutionAgent,
    ResearchAgent,
    RiskAgent,
    TimelineAgent,
    TradingStateMachine,
)
from data.fetchers import YahooFinanceFetcher
from data.storage.database import Database
from models import AgentState

LOGGER = logging.getLogger(__name__)


@dataclass(slots=True)
class WatchlistItem:
    """Single watchlist entry with tracking state."""
    
    ticker: str
    added_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    last_scan_at: datetime | None = None
    current_state: AgentState = field(default=AgentState.S0_OBSERVE)
    conviction_score: int = 0
    notes: str = ""
    
    def to_dict(self) -> dict[str, Any]:
        return {
            "ticker": self.ticker,
            "added_at": self.added_at.isoformat(),
            "last_scan_at": self.last_scan_at.isoformat() if self.last_scan_at else None,
            "current_state": self.current_state.value,
            "conviction_score": self.conviction_score,
            "notes": self.notes,
        }
    
    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "WatchlistItem":
        return cls(
            ticker=data["ticker"],
            added_at=datetime.fromisoformat(data["added_at"]),
            last_scan_at=datetime.fromisoformat(data["last_scan_at"]) if data.get("last_scan_at") else None,
            current_state=AgentState(data.get("current_state", "S0_OBSERVE")),
            conviction_score=data.get("conviction_score", 0),
            notes=data.get("notes", ""),
        )


class WatchlistScanner:
    """Continuous scanner for watchlist tickers."""
    
    def __init__(
        self,
        watchlist_path: str = "watchlist.json",
        db: Database | None = None,
    ) -> None:
        """Initialize watchlist scanner."""
        self.watchlist_path = Path(watchlist_path)
        self.db = db or Database()
        self.items: dict[str, WatchlistItem] = {}
        
        # Initialize agents
        self.timeline_agent = TimelineAgent(fetchers=[YahooFinanceFetcher()])
        self.research_agent = ResearchAgent()
        self.conviction_agent = ConvictionAgent()
        self.execution_agent = ExecutionAgent()
        self.risk_agent = RiskAgent()
        
        self._load_watchlist()
    
    def _load_watchlist(self) -> None:
        """Load watchlist from file."""
        if not self.watchlist_path.exists():
            LOGGER.info("Watchlist file not found, starting empty")
            return
        
        try:
            data = json.loads(self.watchlist_path.read_text())
            for item_data in data.get("items", []):
                item = WatchlistItem.from_dict(item_data)
                self.items[item.ticker.upper()] = item
            LOGGER.info("Loaded %d tickers from watchlist", len(self.items))
        except Exception as e:
            LOGGER.error("Failed to load watchlist: %s", e)
    
    def _save_watchlist(self) -> None:
        """Save watchlist to file."""
        data = {
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "items": [item.to_dict() for item in self.items.values()],
        }
        self.watchlist_path.write_text(json.dumps(data, indent=2))
        LOGGER.debug("Saved watchlist with %d items", len(self.items))
    
    def add_ticker(self, ticker: str, notes: str = "") -> WatchlistItem:
        """Add a ticker to watchlist."""
        ticker = ticker.upper().strip()
        if ticker in self.items:
            LOGGER.info("%s already in watchlist", ticker)
            return self.items[ticker]
        
        item = WatchlistItem(ticker=ticker, notes=notes)
        self.items[ticker] = item
        self._save_watchlist()
        LOGGER.info("Added %s to watchlist", ticker)
        return item
    
    def remove_ticker(self, ticker: str) -> bool:
        """Remove a ticker from watchlist."""
        ticker = ticker.upper().strip()
        if ticker not in self.items:
            LOGGER.warning("%s not in watchlist", ticker)
            return False
        
        del self.items[ticker]
        self._save_watchlist()
        LOGGER.info("Removed %s from watchlist", ticker)
        return True
    
    def scan_ticker(self, ticker: str, save_to_db: bool = True) -> dict[str, Any]:
        """Scan a single ticker and return full analysis."""
        ticker = ticker.upper().strip()
        LOGGER.info("Scanning %s...", ticker)
        
        try:
            # Run full workflow
            timeline_report = self.timeline_agent.build_timeline(ticker, include_clues=False)
            research_report = self.research_agent.analyze(
                ticker, timeline_report.events, timeline_report.pending_checks
            )
            conviction_report = self.conviction_agent.score(
                timeline_report.events,
                conflict_count=len(timeline_report.conflicts),
                pending_count=len(timeline_report.pending_checks),
            )
            execution_report = self.execution_agent.create_plan(
                ticker, conviction_report, research_report.thesis, timeline_report.events
            )
            risk_report = self.risk_agent.assess(
                execution_report.trade_plan, timeline_report.events, conviction_report
            )
            
            # Update watchlist item
            item = self.items.get(ticker)
            if item:
                item.last_scan_at = datetime.now(timezone.utc)
                item.conviction_score = conviction_report.score
                # Update state based on conviction
                if conviction_report.score >= 75:
                    item.current_state = AgentState.S1_WARMUP
                elif conviction_report.score >= 60:
                    item.current_state = AgentState.S1_WARMUP
                else:
                    item.current_state = AgentState.S0_OBSERVE
            
            result = {
                "ticker": ticker,
                "scan_time": datetime.now(timezone.utc).isoformat(),
                "conviction": {
                    "score": conviction_report.score,
                    "band": conviction_report.band,
                    "rationale": conviction_report.rationale,
                },
                "action": execution_report.action,
                "state": item.current_state.value if item else "S0_OBSERVE",
                "events_count": len(timeline_report.events),
                "pending_checks": timeline_report.pending_checks,
                "risks": risk_report.risks,
                "hedges": risk_report.hedges,
                "trade_plan": execution_report.trade_plan.to_dict(),
            }
            
            # Save to database
            if save_to_db:
                # Save events
                for event in timeline_report.events:
                    self.db.save_event(event)
                
                # Save thesis
                self.db.save_thesis(research_report.thesis)
                
                # Save trade plan
                self.db.save_trade_plan(execution_report.trade_plan)
                
                # Save workflow run
                self.db.save_workflow_run(ticker, result)
            
            LOGGER.info("Scan completed for %s (conviction: %d)", ticker, conviction_report.score)
            return result
            
        except Exception as e:
            LOGGER.error("Scan failed for %s: %s", ticker, e)
            return {
                "ticker": ticker,
                "error": str(e),
                "scan_time": datetime.now(timezone.utc).isoformat(),
            }
    
    def scan_all(self, force: bool = False) -> list[dict[str, Any]]:
        """Scan all tickers in watchlist."""
        results = []
        
        for ticker in self.items:
            item = self.items[ticker]
            
            # Skip if scanned recently (within 1 hour) unless forced
            if not force and item.last_scan_at:
                time_since_scan = datetime.now(timezone.utc) - item.last_scan_at
                if time_since_scan < timedelta(hours=1):
                    LOGGER.debug("Skipping %s (scanned %s ago)", ticker, time_since_scan)
                    continue
            
            result = self.scan_ticker(ticker)
            results.append(result)
        
        self._save_watchlist()
        return results
    
    def scan_earnings_due(self, days: int = 7) -> list[dict[str, Any]]:
        """Scan only tickers with earnings due in specified days."""
        from data.fetchers import YahooFinanceFetcher
        
        due_tickers = []
        fetcher = YahooFinanceFetcher()
        
        for ticker in self.items:
            try:
                events = fetcher.fetch(ticker)
                for event in events:
                    if event.event_type.value == "earnings_release":
                        time_to_event = event.occurred_at - datetime.now(timezone.utc)
                        if timedelta(0) <= time_to_event <= timedelta(days=days):
                            due_tickers.append(ticker)
                            break
            except Exception as e:
                LOGGER.warning("Failed to check earnings for %s: %s", ticker, e)
        
        LOGGER.info("Found %d tickers with earnings due in %d days", len(due_tickers), days)
        
        results = []
        for ticker in due_tickers:
            result = self.scan_ticker(ticker)
            results.append(result)
        
        return results
    
    def get_high_conviction(self, min_score: int = 75) -> list[dict[str, Any]]:
        """Get tickers with high conviction scores."""
        high_conviction = []
        
        for ticker, item in self.items.items():
            if item.conviction_score >= min_score:
                # Get latest analysis from database
                runs = self.db.get_recent_workflow_runs(ticker, limit=1)
                if runs:
                    high_conviction.append(runs[0])
        
        return high_conviction
    
    def generate_report(self) -> dict[str, Any]:
        """Generate watchlist summary report."""
        states = {}
        conviction_distribution = {"high": 0, "medium": 0, "low": 0}
        
        for ticker, item in self.items.items():
            states[item.current_state.value] = states.get(item.current_state.value, 0) + 1
            
            if item.conviction_score >= 75:
                conviction_distribution["high"] += 1
            elif item.conviction_score >= 60:
                conviction_distribution["medium"] += 1
            else:
                conviction_distribution["low"] += 1
        
        return {
            "total_tickers": len(self.items),
            "last_updated": datetime.now(timezone.utc).isoformat(),
            "state_distribution": states,
            "conviction_distribution": conviction_distribution,
            "high_conviction_tickers": self.get_high_conviction(min_score=75),
        }


# CLI commands for watchlist
def watchlist_add(ticker: str, notes: str = "") -> None:
    """Add ticker to watchlist."""
    scanner = WatchlistScanner()
    scanner.add_ticker(ticker, notes)
    print(f"✓ Added {ticker} to watchlist")


def watchlist_remove(ticker: str) -> None:
    """Remove ticker from watchlist."""
    scanner = WatchlistScanner()
    if scanner.remove_ticker(ticker):
        print(f"✓ Removed {ticker} from watchlist")
    else:
        print(f"✗ {ticker} not in watchlist")


def watchlist_scan(ticker: str | None = None, all_tickers: bool = False, earnings_due: int = 0) -> None:
    """Scan watchlist tickers."""
    scanner = WatchlistScanner()
    
    if ticker:
        result = scanner.scan_ticker(ticker)
        print(json.dumps(result, indent=2, ensure_ascii=False))
    elif earnings_due > 0:
        results = scanner.scan_earnings_due(days=earnings_due)
        print(f"Scanned {len(results)} tickers with earnings due in {earnings_due} days")
        for result in results:
            print(f"\n{result['ticker']}: Conviction={result.get('conviction', {}).get('score', 0)}")
    elif all_tickers:
        results = scanner.scan_all()
        print(f"Scanned {len(results)} tickers")
        report = scanner.generate_report()
        print(json.dumps(report, indent=2, ensure_ascii=False))
    else:
        # Show watchlist status
        report = scanner.generate_report()
        print("Watchlist Status:")
        print(f"Total tickers: {report['total_tickers']}")
        print(f"State distribution: {report['state_distribution']}")
        print(f"Conviction distribution: {report['conviction_distribution']}")


def watchlist_list() -> None:
    """List all watchlist tickers."""
    scanner = WatchlistScanner()
    
    if not scanner.items:
        print("Watchlist is empty")
        return
    
    print(f"{'Ticker':<10} {'State':<15} {'Conviction':<10} {'Last Scan':<20} {'Notes'}")
    print("-" * 80)
    
    for ticker, item in sorted(scanner.items.items()):
        last_scan = item.last_scan_at.strftime("%Y-%m-%d %H:%M") if item.last_scan_at else "Never"
        print(f"{ticker:<10} {item.current_state.value:<15} {item.conviction_score:<10} {last_scan:<20} {item.notes[:30]}")


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python watchlist_scanner.py <command> [args...]")
        print("Commands: add, remove, scan, list")
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == "add" and len(sys.argv) >= 3:
        watchlist_add(sys.argv[2], " ".join(sys.argv[3:]) if len(sys.argv) > 3 else "")
    elif command == "remove" and len(sys.argv) >= 3:
        watchlist_remove(sys.argv[2])
    elif command == "scan":
        if len(sys.argv) >= 3 and sys.argv[2] != "--all":
            watchlist_scan(ticker=sys.argv[2])
        elif "--all" in sys.argv:
            watchlist_scan(all_tickers=True)
        elif "--earnings" in sys.argv:
            days = int(sys.argv[sys.argv.index("--earnings") + 1]) if sys.argv.index("--earnings") + 1 < len(sys.argv) else 7
            watchlist_scan(earnings_due=days)
        else:
            watchlist_scan(all_tickers=True)
    elif command == "list":
        watchlist_list()
    else:
        print(f"Unknown command: {command}")
