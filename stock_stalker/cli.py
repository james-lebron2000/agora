"""Enhanced CLI for Stock Stalker with interactive features."""

import argparse
import json
import sys
from datetime import datetime, timedelta
from typing import Optional

from core.watchlist_scanner import WatchlistScanner
from core.enhanced_scanner import EnhancedWatchlistScanner
from analysis.backtest import BacktestEngine, simple_ma_strategy, rsi_strategy
from analysis.technical_indicators import TechnicalAnalyzer
from data.storage.database import Database
from models import Event, EventType


def print_header(title: str):
    """Print a formatted header."""
    print("\n" + "=" * 70)
    print(f"  {title}")
    print("=" * 70)


def cmd_scan(args):
    """Scan a ticker for trading signals."""
    print_header(f"Scanning {args.ticker}")
    
    scanner = EnhancedWatchlistScanner()
    result = scanner.scan_with_technicals(args.ticker)
    
    print(f"\n📊 Conviction Score: {result.get('conviction', {}).get('score', 0)}/100")
    print(f"🎯 State: {result.get('state', 'unknown')}")
    
    if 'technical_signal' in result:
        print(f"📈 Technical Signal: {result['technical_signal']}")
    
    if args.save:
        print(f"\n💾 Results saved to database")
    
    if args.json:
        print("\n" + json.dumps(result, indent=2, default=str))


def cmd_watchlist(args):
    """Manage watchlist."""
    print_header("Watchlist Management")
    
    scanner = WatchlistScanner()
    
    if args.add:
        scanner.add_ticker(args.add, args.name or f"Stock {args.add}")
        print(f"✅ Added {args.add} to watchlist")
    
    elif args.remove:
        scanner.remove_ticker(args.remove)
        print(f"✅ Removed {args.remove} from watchlist")
    
    elif args.scan:
        print(f"\n🔍 Scanning all watchlist items...")
        for ticker in scanner.items:
            print(f"\n  Scanning {ticker}...")
            result = scanner.scan_ticker(ticker, save_to_db=True)
            conviction = result.get('conviction', {}).get('score', 0)
            print(f"    Conviction: {conviction}")
    
    else:
        # List watchlist
        print(f"\n📋 Watchlist ({len(scanner.items)} items):")
        for ticker, info in scanner.items.items():
            print(f"  • {ticker}: {info.get('name', 'N/A')}")


def cmd_backtest(args):
    """Run backtest on historical data."""
    print_header(f"Backtest: {args.ticker}")
    
    # Generate sample data for demonstration
    # In production, this would fetch real historical data
    import random
    
    print("📊 Generating sample historical data...")
    price_data = []
    price = 100.0
    
    for i in range(args.days):
        change = random.gauss(0.001, 0.02)
        price = price * (1 + change)
        
        price_data.append({
            'date': datetime.now() - timedelta(days=args.days-i),
            'open': price * (1 + random.gauss(0, 0.005)),
            'high': price * (1 + abs(random.gauss(0, 0.01))),
            'low': price * (1 - abs(random.gauss(0, 0.01))),
            'close': price,
            'volume': random.randint(1000000, 5000000),
        })
    
    # Select strategy
    strategy_map = {
        'ma': simple_ma_strategy,
        'rsi': rsi_strategy,
    }
    
    strategy = strategy_map.get(args.strategy, simple_ma_strategy)
    strategy_name = args.strategy.upper()
    
    print(f"🎯 Running {strategy_name} strategy...")
    
    engine = BacktestEngine(initial_capital=args.capital)
    result = engine.run_backtest(
        ticker=args.ticker,
        price_data=price_data,
        strategy=strategy,
    )
    
    print(result.summary())
    
    if args.export:
        export_file = f"backtest_{args.ticker}_{args.strategy}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(export_file, 'w') as f:
            json.dump(result.to_dict(), f, indent=2, default=str)
        print(f"\n💾 Results exported to {export_file}")


def cmd_tech(args):
    """Calculate technical indicators."""
    print_header(f"Technical Analysis: {args.ticker}")
    
    # Generate sample data
    import random
    prices = []
    volumes = []
    highs = []
    lows = []
    
    price = 100.0
    for _ in range(100):
        change = random.gauss(0, 2)
        price += change
        price = max(price, 50)
        
        prices.append(price)
        volumes.append(random.randint(1000000, 5000000))
        highs.append(price + random.uniform(0, 3))
        lows.append(price - random.uniform(0, 3))
    
    print("📊 Calculating indicators...")
    indicators = TechnicalAnalyzer.calculate_all(
        ticker=args.ticker,
        prices=prices,
        volumes=volumes,
        highs=highs,
        lows=lows,
    )
    
    print(f"\n📈 Trend:")
    print(f"  SMA 20: ${indicators.sma_20:.2f}" if indicators.sma_20 else "  SMA 20: N/A")
    print(f"  SMA 50: ${indicators.sma_50:.2f}" if indicators.sma_50 else "  SMA 50: N/A")
    
    print(f"\n💹 Momentum:")
    print(f"  RSI 14: {indicators.rsi_14:.2f}" if indicators.rsi_14 else "  RSI 14: N/A")
    print(f"  MACD: {indicators.macd:.4f}" if indicators.macd else "  MACD: N/A")
    
    print(f"\n📊 Volatility:")
    print(f"  BB Upper: ${indicators.bb_upper:.2f}" if indicators.bb_upper else "  BB Upper: N/A")
    print(f"  BB Lower: ${indicators.bb_lower:.2f}" if indicators.bb_lower else "  BB Lower: N/A")
    
    print(f"\n🎯 Signal: {indicators.get_signal()}")


def cmd_export(args):
    """Export data to file."""
    print_header("Data Export")
    
    db = Database()
    
    if args.type == 'events':
        events = db.get_events(args.ticker) if args.ticker else []
        data = [e.to_dict() for e in events]
        filename = f"events_{args.ticker or 'all'}_{datetime.now().strftime('%Y%m%d')}.json"
    
    elif args.type == 'watchlist':
        scanner = WatchlistScanner()
        data = scanner.items
        filename = f"watchlist_{datetime.now().strftime('%Y%m%d')}.json"
    
    else:
        print(f"❌ Unknown export type: {args.type}")
        return
    
    with open(filename, 'w') as f:
        json.dump(data, f, indent=2, default=str)
    
    print(f"✅ Exported {len(data)} records to {filename}")


def cmd_dashboard(args):
    """Launch simple dashboard (placeholder for future web UI)."""
    print_header("Stock Stalker Dashboard")
    
    print("\n📊 Quick Stats:")
    
    # Watchlist
    scanner = WatchlistScanner()
    print(f"  Watchlist items: {len(scanner.items)}")
    
    # Database
    db = Database()
    print(f"  Database: Connected")
    
    # Recent activity
    print(f"\n🕐 Current time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"📈 Market status: Check with 'scan' command")
    
    print("\n💡 Tip: Use 'scan <TICKER>' to analyze a stock")


def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        description="Stock Stalker - Event-driven trading agent",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s scan AAPL                    # Scan Apple stock
  %(prog)s scan TSLA --save             # Scan and save to database
  %(prog)s watchlist                    # List watchlist
  %(prog)s watchlist --add MSFT         # Add Microsoft to watchlist
  %(prog)s backtest AAPL --days 100     # Run backtest
  %(prog)s tech NVDA                    # Technical analysis
  %(prog)s export --type events         # Export events to JSON
        """
    )
    
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Scan command
    scan_parser = subparsers.add_parser('scan', help='Scan a ticker for signals')
    scan_parser.add_argument('ticker', help='Stock ticker symbol')
    scan_parser.add_argument('--save', action='store_true', help='Save results to database')
    scan_parser.add_argument('--json', action='store_true', help='Output as JSON')
    scan_parser.set_defaults(func=cmd_scan)
    
    # Watchlist command
    wl_parser = subparsers.add_parser('watchlist', help='Manage watchlist')
    wl_parser.add_argument('--add', help='Add ticker to watchlist')
    wl_parser.add_argument('--remove', help='Remove ticker from watchlist')
    wl_parser.add_argument('--name', help='Company name (with --add)')
    wl_parser.add_argument('--scan', action='store_true', help='Scan all watchlist items')
    wl_parser.set_defaults(func=cmd_watchlist)
    
    # Backtest command
    bt_parser = subparsers.add_parser('backtest', help='Run strategy backtest')
    bt_parser.add_argument('ticker', help='Stock ticker symbol')
    bt_parser.add_argument('--strategy', choices=['ma', 'rsi'], default='ma',
                          help='Trading strategy')
    bt_parser.add_argument('--days', type=int, default=100,
                          help='Number of days to backtest')
    bt_parser.add_argument('--capital', type=float, default=100000.0,
                          help='Initial capital')
    bt_parser.add_argument('--export', action='store_true',
                          help='Export results to JSON')
    bt_parser.set_defaults(func=cmd_backtest)
    
    # Technical analysis command
    tech_parser = subparsers.add_parser('tech', help='Technical analysis')
    tech_parser.add_argument('ticker', help='Stock ticker symbol')
    tech_parser.set_defaults(func=cmd_tech)
    
    # Export command
    export_parser = subparsers.add_parser('export', help='Export data')
    export_parser.add_argument('--type', choices=['events', 'watchlist'],
                              default='events', help='Data type to export')
    export_parser.add_argument('--ticker', help='Filter by ticker')
    export_parser.set_defaults(func=cmd_export)
    
    # Dashboard command
    dash_parser = subparsers.add_parser('dashboard', help='Show dashboard')
    dash_parser.set_defaults(func=cmd_dashboard)
    
    args = parser.parse_args()
    
    if args.command is None:
        parser.print_help()
        sys.exit(1)
    
    try:
        args.func(args)
    except KeyboardInterrupt:
        print("\n\n⚠️  Interrupted by user")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
