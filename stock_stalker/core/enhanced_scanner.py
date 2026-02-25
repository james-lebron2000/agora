"""Enhanced Watchlist Scanner with technical indicators."""

import json
from datetime import datetime
from typing import Dict, List, Any, Optional

from core.watchlist_scanner import WatchlistScanner
from analysis.technical_indicators import TechnicalAnalyzer, TechnicalIndicators


class EnhancedWatchlistScanner(WatchlistScanner):
    """Watchlist scanner with technical analysis."""
    
    def __init__(self, watchlist_path: str = "data/watchlist.json",
                 db_path: str = "data/stock_stalker.db"):
        super().__init__(watchlist_path, db_path)
        self.technical_cache: Dict[str, TechnicalIndicators] = {}
    
    def scan_with_technicals(self, ticker: str, days: int = 250) -> Dict[str, Any]:
        """Scan ticker with technical indicators."""
        
        # Get base scan result
        result = self.scan_ticker(ticker, save_to_db=True)
        
        # Get price history (simulate with random data for now)
        # In production, this would come from Yahoo Finance
        prices, volumes, highs, lows = self._get_price_history(ticker, days)
        
        if prices and len(prices) >= 50:
            # Calculate technical indicators
            technicals = TechnicalAnalyzer.calculate_all(
                ticker=ticker,
                prices=prices,
                volumes=volumes,
                highs=highs,
                lows=lows
            )
            
            self.technical_cache[ticker] = technicals
            
            # Enhance result with technical analysis
            result['technical_indicators'] = technicals.to_dict()
            result['technical_signal'] = technicals.get_signal()
            
            # Update conviction based on technicals
            result = self._update_conviction_with_technicals(result, technicals)
        
        return result
    
    def _get_price_history(self, ticker: str, days: int) -> tuple:
        """Get price history for technical analysis.
        
        In production, this would fetch from Yahoo Finance API.
        For now, generate simulated data.
        """
        import random
        
        # Get current price from base scanner
        ticker_info = self.items.get(ticker, {})
        base_price = 100  # Default
        
        # Generate random walk
        prices = []
        volumes = []
        highs = []
        lows = []
        
        current_price = base_price
        for i in range(days):
            change = random.gauss(0, 2)
            current_price += change
            current_price = max(current_price, 50)
            
            prices.append(current_price)
            volumes.append(random.randint(1000000, 5000000))
            highs.append(current_price + random.uniform(0, 3))
            lows.append(current_price - random.uniform(0, 3))
        
        return prices, volumes, highs, lows
    
    def _update_conviction_with_technicals(self, result: Dict[str, Any], 
                                           technicals: TechnicalIndicators) -> Dict[str, Any]:
        """Update conviction score based on technical indicators."""
        
        conviction = result.get('conviction', {})
        current_score = conviction.get('score', 50)
        
        adjustments = []
        
        # RSI adjustment
        if technicals.rsi_14 is not None:
            if technicals.rsi_14 < 30:
                adjustments.append(("RSI oversold", 10))
            elif technicals.rsi_14 > 70:
                adjustments.append(("RSI overbought", -10))
        
        # MACD adjustment
        if technicals.macd_histogram is not None:
            if technicals.macd_histogram > 0:
                adjustments.append(("MACD bullish", 5))
            else:
                adjustments.append(("MACD bearish", -5))
        
        # Moving Average adjustment
        if technicals.sma_20 and technicals.sma_50:
            if technicals.sma_20 > technicals.sma_50:
                adjustments.append(("Golden cross", 8))
            else:
                adjustments.append(("Death cross", -8))
        
        # Bollinger Band adjustment
        if technicals.bb_width is not None and technicals.bb_width < 0.05:
            adjustments.append(("BB squeeze (volatility expansion expected)", 5))
        
        # Apply adjustments
        total_adjustment = sum(adj[1] for adj in adjustments)
        new_score = max(0, min(100, current_score + total_adjustment))
        
        conviction['score'] = new_score
        conviction['technical_adjustments'] = adjustments
        conviction['technical_adjustment_total'] = total_adjustment
        
        result['conviction'] = conviction
        
        return result
    
    def scan_all_with_technicals(self) -> List[Dict[str, Any]]:
        """Scan all watchlist tickers with technical analysis."""
        results = []
        
        for ticker in self.items:
            print(f"\n🔍 Scanning {ticker} with technicals...")
            result = self.scan_with_technicals(ticker)
            results.append(result)
            
            # Print summary
            tech_signal = result.get('technical_signal', 'N/A')
            conviction = result.get('conviction', {}).get('score', 0)
            print(f"  Technical Signal: {tech_signal}")
            print(f"  Conviction: {conviction}")
        
        return results
    
    def get_technical_summary(self, ticker: str) -> str:
        """Get formatted technical summary for a ticker."""
        if ticker not in self.technical_cache:
            return f"No technical data for {ticker}"
        
        tech = self.technical_cache[ticker]
        
        lines = [
            f"\n📊 Technical Analysis for {ticker}",
            "=" * 50,
            f"RSI (14): {tech.rsi_14:.2f}" if tech.rsi_14 else "RSI: N/A",
            f"MACD: {tech.macd:.4f}" if tech.macd else "MACD: N/A",
            f"Signal: {tech.get_signal()}",
            "",
            "Moving Averages:",
            f"  SMA 20: ${tech.sma_20:.2f}" if tech.sma_20 else "  SMA 20: N/A",
            f"  SMA 50: ${tech.sma_50:.2f}" if tech.sma_50 else "  SMA 50: N/A",
            "",
            "Support/Resistance:",
            f"  S1: ${tech.support_1:.2f}" if tech.support_1 else "  S1: N/A",
            f"  R1: ${tech.resistance_1:.2f}" if tech.resistance_1 else "  R1: N/A",
            "=" * 50,
        ]
        
        return "\n".join(lines)


if __name__ == "__main__":
    import sys
    
    scanner = EnhancedWatchlistScanner()
    
    # Add sample tickers if empty
    if not scanner.items:
        print("Adding sample tickers...")
        scanner.add_ticker("AAPL", "Apple Inc.")
        scanner.add_ticker("TSLA", "Tesla Inc.")
        scanner.add_ticker("NVDA", "NVIDIA Corp")
    
    # Scan all with technicals
    results = scanner.scan_all_with_technicals()
    
    # Print detailed summary for first ticker
    if results:
        first_ticker = results[0].get('ticker')
        print(scanner.get_technical_summary(first_ticker))
    
    print("\n✅ Enhanced scanning complete!")
