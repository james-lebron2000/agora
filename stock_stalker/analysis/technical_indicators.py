"""Technical indicators for stock analysis."""

from dataclasses import dataclass
from typing import List, Optional, Dict, Any
import numpy as np
from datetime import datetime


@dataclass
class TechnicalIndicators:
    """Collection of technical indicators for a stock."""
    
    ticker: str
    timestamp: datetime
    
    # Trend Indicators
    sma_20: Optional[float] = None  # 20-day Simple Moving Average
    sma_50: Optional[float] = None  # 50-day Simple Moving Average
    sma_200: Optional[float] = None  # 200-day Simple Moving Average
    ema_12: Optional[float] = None  # 12-day EMA (for MACD)
    ema_26: Optional[float] = None  # 26-day EMA (for MACD)
    
    # Momentum Indicators
    rsi_14: Optional[float] = None  # 14-day RSI
    macd: Optional[float] = None  # MACD line
    macd_signal: Optional[float] = None  # MACD signal line
    macd_histogram: Optional[float] = None  # MACD histogram
    
    # Volatility Indicators
    bb_upper: Optional[float] = None  # Bollinger Band Upper
    bb_middle: Optional[float] = None  # Bollinger Band Middle (SMA 20)
    bb_lower: Optional[float] = None  # Bollinger Band Lower
    bb_width: Optional[float] = None  # Bollinger Band Width
    
    # Volume Indicators
    volume_sma: Optional[float] = None  # Volume SMA
    obv: Optional[float] = None  # On-Balance Volume
    
    # Support/Resistance
    pivot_point: Optional[float] = None
    support_1: Optional[float] = None
    support_2: Optional[float] = None
    resistance_1: Optional[float] = None
    resistance_2: Optional[float] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            'ticker': self.ticker,
            'timestamp': self.timestamp.isoformat(),
            'sma_20': self.sma_20,
            'sma_50': self.sma_50,
            'sma_200': self.sma_200,
            'ema_12': self.ema_12,
            'ema_26': self.ema_26,
            'rsi_14': self.rsi_14,
            'macd': self.macd,
            'macd_signal': self.macd_signal,
            'macd_histogram': self.macd_histogram,
            'bb_upper': self.bb_upper,
            'bb_middle': self.bb_middle,
            'bb_lower': self.bb_lower,
            'bb_width': self.bb_width,
            'volume_sma': self.volume_sma,
            'obv': self.obv,
            'pivot_point': self.pivot_point,
            'support_1': self.support_1,
            'support_2': self.support_2,
            'resistance_1': self.resistance_1,
            'resistance_2': self.resistance_2,
        }
    
    def get_signal(self) -> str:
        """Generate trading signal based on indicators."""
        signals = []
        
        # RSI signals
        if self.rsi_14 is not None:
            if self.rsi_14 < 30:
                signals.append("RSI_OVERSOLD")
            elif self.rsi_14 > 70:
                signals.append("RSI_OVERBOUGHT")
        
        # MACD signals
        if self.macd_histogram is not None:
            if self.macd_histogram > 0:
                signals.append("MACD_BULLISH")
            else:
                signals.append("MACD_BEARISH")
        
        # Bollinger Band signals
        if self.bb_width is not None:
            if self.bb_width < 0.1:
                signals.append("BB_SQUEEZE")
        
        # Moving Average signals
        if self.sma_20 and self.sma_50:
            if self.sma_20 > self.sma_50:
                signals.append("MA_GOLDEN_CROSS")
            else:
                signals.append("MA_DEATH_CROSS")
        
        return ", ".join(signals) if signals else "NEUTRAL"


class TechnicalAnalyzer:
    """Calculate technical indicators from price data."""
    
    @staticmethod
    def calculate_all(ticker: str, prices: List[float], volumes: List[float], 
                      highs: Optional[List[float]] = None,
                      lows: Optional[List[float]] = None) -> TechnicalIndicators:
        """Calculate all technical indicators."""
        
        if len(prices) < 200:
            # Not enough data for all indicators
            return TechnicalIndicators(
                ticker=ticker,
                timestamp=datetime.now(),
                sma_20=TechnicalAnalyzer.sma(prices, 20) if len(prices) >= 20 else None,
                sma_50=TechnicalAnalyzer.sma(prices, 50) if len(prices) >= 50 else None,
            )
        
        # Calculate indicators
        sma_20 = TechnicalAnalyzer.sma(prices, 20)
        sma_50 = TechnicalAnalyzer.sma(prices, 50)
        sma_200 = TechnicalAnalyzer.sma(prices, 200)
        
        ema_12 = TechnicalAnalyzer.ema(prices, 12)
        ema_26 = TechnicalAnalyzer.ema(prices, 26)
        
        rsi_14 = TechnicalAnalyzer.rsi(prices, 14)
        macd_line, macd_signal, macd_histogram = TechnicalAnalyzer.macd(prices)
        
        bb_upper, bb_middle, bb_lower = TechnicalAnalyzer.bollinger_bands(prices, 20, 2)
        bb_width = (bb_upper - bb_lower) / bb_middle if bb_middle else None
        
        volume_sma = TechnicalAnalyzer.sma(volumes, 20) if len(volumes) >= 20 else None
        obv = TechnicalAnalyzer.obv(prices, volumes)
        
        # Pivot points (using last day's data)
        if highs and lows and len(highs) > 1 and len(lows) > 1:
            prev_high = highs[-2]
            prev_low = lows[-2]
            prev_close = prices[-2]
            pivot, s1, s2, r1, r2 = TechnicalAnalyzer.pivot_points(prev_high, prev_low, prev_close)
        else:
            pivot = s1 = s2 = r1 = r2 = None
        
        return TechnicalIndicators(
            ticker=ticker,
            timestamp=datetime.now(),
            sma_20=sma_20,
            sma_50=sma_50,
            sma_200=sma_200,
            ema_12=ema_12,
            ema_26=ema_26,
            rsi_14=rsi_14,
            macd=macd_line,
            macd_signal=macd_signal,
            macd_histogram=macd_histogram,
            bb_upper=bb_upper,
            bb_middle=bb_middle,
            bb_lower=bb_lower,
            bb_width=bb_width,
            volume_sma=volume_sma,
            obv=obv,
            pivot_point=pivot,
            support_1=s1,
            support_2=s2,
            resistance_1=r1,
            resistance_2=r2,
        )
    
    @staticmethod
    def sma(data: List[float], period: int) -> Optional[float]:
        """Calculate Simple Moving Average."""
        if len(data) < period:
            return None
        return sum(data[-period:]) / period
    
    @staticmethod
    def ema(data: List[float], period: int) -> Optional[float]:
        """Calculate Exponential Moving Average."""
        if len(data) < period:
            return None
        
        multiplier = 2 / (period + 1)
        ema_values = [sum(data[:period]) / period]  # Start with SMA
        
        for price in data[period:]:
            ema_values.append((price - ema_values[-1]) * multiplier + ema_values[-1])
        
        return ema_values[-1]
    
    @staticmethod
    def rsi(prices: List[float], period: int = 14) -> Optional[float]:
        """Calculate Relative Strength Index."""
        if len(prices) < period + 1:
            return None
        
        deltas = [prices[i] - prices[i-1] for i in range(1, len(prices))]
        gains = [d if d > 0 else 0 for d in deltas]
        losses = [-d if d < 0 else 0 for d in deltas]
        
        avg_gain = sum(gains[-period:]) / period
        avg_loss = sum(losses[-period:]) / period
        
        if avg_loss == 0:
            return 100
        
        rs = avg_gain / avg_loss
        rsi = 100 - (100 / (1 + rs))
        
        return rsi
    
    @staticmethod
    def macd(prices: List[float], fast: int = 12, slow: int = 26, signal: int = 9):
        """Calculate MACD, Signal line, and Histogram."""
        if len(prices) < slow + signal:
            return None, None, None
        
        # Calculate EMAs
        ema_fast = TechnicalAnalyzer._ema_series(prices, fast)
        ema_slow = TechnicalAnalyzer._ema_series(prices, slow)
        
        # MACD Line
        macd_line = [f - s for f, s in zip(ema_fast, ema_slow)]
        
        # Signal Line (EMA of MACD)
        signal_line_values = TechnicalAnalyzer._ema_series(macd_line, signal)
        
        # Histogram
        histogram = [m - s for m, s in zip(macd_line[-len(signal_line_values):], signal_line_values)]
        
        return macd_line[-1], signal_line_values[-1], histogram[-1]
    
    @staticmethod
    def _ema_series(data: List[float], period: int) -> List[float]:
        """Calculate EMA series for internal use."""
        if len(data) < period:
            return data
        
        multiplier = 2 / (period + 1)
        ema_values = [sum(data[:period]) / period]
        
        for value in data[period:]:
            ema_values.append((value - ema_values[-1]) * multiplier + ema_values[-1])
        
        return ema_values
    
    @staticmethod
    def bollinger_bands(prices: List[float], period: int = 20, 
                        std_dev: float = 2) -> tuple:
        """Calculate Bollinger Bands."""
        if len(prices) < period:
            return None, None, None
        
        sma = sum(prices[-period:]) / period
        variance = sum((p - sma) ** 2 for p in prices[-period:]) / period
        std = variance ** 0.5
        
        upper = sma + (std_dev * std)
        lower = sma - (std_dev * std)
        
        return upper, sma, lower
    
    @staticmethod
    def obv(prices: List[float], volumes: List[float]) -> Optional[float]:
        """Calculate On-Balance Volume."""
        if len(prices) != len(volumes) or len(prices) < 2:
            return None
        
        obv = volumes[0]
        
        for i in range(1, len(prices)):
            if prices[i] > prices[i-1]:
                obv += volumes[i]
            elif prices[i] < prices[i-1]:
                obv -= volumes[i]
            # If equal, OBV unchanged
        
        return obv
    
    @staticmethod
    def pivot_points(high: float, low: float, close: float) -> tuple:
        """Calculate Pivot Points and Support/Resistance levels."""
        pivot = (high + low + close) / 3
        
        r1 = (2 * pivot) - low
        r2 = pivot + (high - low)
        
        s1 = (2 * pivot) - high
        s2 = pivot - (high - low)
        
        return pivot, s1, s2, r1, r2
