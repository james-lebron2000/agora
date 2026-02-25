#!/usr/bin/env python3
"""Comprehensive test suite for Stock Stalker."""

import sys
import traceback
from datetime import datetime, timezone
from io import StringIO


def run_tests():
    """Run all tests and generate report."""
    results = []
    
    def test(name, func):
        """Run a single test."""
        try:
            func()
            results.append(("✓", name, "PASSED"))
            return True
        except Exception as e:
            results.append(("✗", name, str(e)))
            return False
    
    # Test 1: Models
    def test_models():
        from models import Event, EventType, EvidenceLevel, MarketSession
        event = Event(
            ticker="TEST",
            event_type=EventType.EARNINGS_RELEASE,
            title="Test Event",
            occurred_at=datetime.now(timezone.utc),
            source_url="https://test.com",
            evidence_level=EvidenceLevel.A,
            market_session=MarketSession.REGULAR,
            importance=5,
        )
        assert event.ticker == "TEST"
        assert event.evidence_level == EvidenceLevel.A
    
    # Test 2: Yahoo Finance Fetcher (Structure)
    def test_yahoo_fetcher():
        from data.fetchers import YahooFinanceFetcher
        fetcher = YahooFinanceFetcher()
        assert fetcher is not None
    
    # Test 3: Database
    def test_database():
        import os
        import tempfile
        from data.storage.database import Database
        from models import Event, EventType, EvidenceLevel, MarketSession
        
        # Use file-based database instead of :memory: for proper initialization
        db_path = tempfile.mktemp(suffix='.db')
        try:
            db = Database(db_path)
            
            event = Event(
                ticker="AAPL",
                event_type=EventType.EARNINGS_RELEASE,
                title="Q4 Earnings",
                occurred_at=datetime.now(timezone.utc),
                source_url="https://test.com",
                evidence_level=EvidenceLevel.A,
                market_session=MarketSession.REGULAR,
                importance=5,
            )
            db.save_event(event)
            
            events = db.get_events("AAPL")
            assert len(events) == 1
            assert events[0].ticker == "AAPL"
        finally:
            if os.path.exists(db_path):
                os.remove(db_path)
    
    # Test 4: Agents
    def test_agents():
        from agents import ConvictionAgent, TimelineAgent, ResearchAgent
        agents = [ConvictionAgent(), TimelineAgent(), ResearchAgent()]
        assert all(agents)
    
    # Test 5: State Machine
    def test_state_machine():
        from agents.state_machine import TradingStateMachine
        from models import AgentState
        
        sm = TradingStateMachine()
        assert sm.state == AgentState.S0_OBSERVE
        
        sm.update(conviction_score=65, has_position=False)
        assert sm.state == AgentState.S1_WARMUP
    
    # Test 6: Watchlist Scanner
    def test_watchlist():
        from core.watchlist_scanner import WatchlistScanner
        scanner = WatchlistScanner(watchlist_path="/tmp/test_watchlist.json")
        scanner.add_ticker("AAPL", "Test")
        assert "AAPL" in scanner.items
        scanner.remove_ticker("AAPL")
        assert "AAPL" not in scanner.items
    
    # Test 7: Evidence Validator
    def test_evidence_validator():
        from data.validators import EvidenceValidator
        from models import Event, EventType, EvidenceLevel, MarketSession
        
        validator = EvidenceValidator()
        events = [
            Event(
                ticker="AAPL",
                event_type=EventType.NEWS_CLUE,
                title="News",
                occurred_at=datetime.now(timezone.utc),
                source_url="https://sec.gov/...",
                evidence_level=EvidenceLevel.C,
                market_session=MarketSession.REGULAR,
                importance=3,
            )
        ]
        result = validator.validate(events)
        assert len(result.events) == 1
    
    # Run all tests
    tests = [
        ("Models", test_models),
        ("Yahoo Finance Fetcher", test_yahoo_fetcher),
        ("Database", test_database),
        ("Agents", test_agents),
        ("State Machine", test_state_machine),
        ("Watchlist Scanner", test_watchlist),
        ("Evidence Validator", test_evidence_validator),
    ]
    
    passed = 0
    failed = 0
    
    print("=" * 60)
    print("Stock Stalker Test Suite")
    print("=" * 60)
    
    for name, func in tests:
        if test(name, func):
            passed += 1
        else:
            failed += 1
    
    print("\n" + "=" * 60)
    print("Results:")
    print("=" * 60)
    
    for status, name, msg in results:
        print(f"{status} {name:<30} {msg}")
    
    print("\n" + "=" * 60)
    print(f"Passed: {passed}/{len(tests)}")
    print(f"Failed: {failed}/{len(tests)}")
    print("=" * 60)
    
    return failed == 0


if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
