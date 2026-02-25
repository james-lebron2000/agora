"""Backtesting engine for trading strategies."""

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Callable
from enum import Enum
import json

from models import Event, EventType, EvidenceLevel
from analysis.technical_indicators import TechnicalIndicators


class TradeAction(Enum):
    BUY = "buy"
    SELL = "sell"
    HOLD = "hold"


@dataclass
class Trade:
    """A single trade record."""
    ticker: str
    action: TradeAction
    price: float
    shares: int
    timestamp: datetime
    conviction: int
    reason: str
    
    def to_dict(self) -> Dict:
        return {
            "ticker": self.ticker,
            "action": self.action.value,
            "price": self.price,
            "shares": self.shares,
            "timestamp": self.timestamp.isoformat(),
            "conviction": self.conviction,
            "reason": self.reason,
        }


@dataclass
class BacktestResult:
    """Results of a backtest run."""
    ticker: str
    start_date: datetime
    end_date: datetime
    initial_capital: float
    final_capital: float
    total_return: float
    total_return_pct: float
    
    # Trade statistics
    total_trades: int
    winning_trades: int
    losing_trades: int
    win_rate: float
    
    # Risk metrics
    max_drawdown: float
    max_drawdown_pct: float
    sharpe_ratio: float
    
    # Trade history
    trades: List[Trade] = field(default_factory=list)
    
    def to_dict(self) -> Dict:
        return {
            "ticker": self.ticker,
            "start_date": self.start_date.isoformat(),
            "end_date": self.end_date.isoformat(),
            "initial_capital": self.initial_capital,
            "final_capital": self.final_capital,
            "total_return": self.total_return,
            "total_return_pct": self.total_return_pct,
            "total_trades": self.total_trades,
            "winning_trades": self.winning_trades,
            "losing_trades": self.losing_trades,
            "win_rate": self.win_rate,
            "max_drawdown": self.max_drawdown,
            "max_drawdown_pct": self.max_drawdown_pct,
            "sharpe_ratio": self.sharpe_ratio,
            "trades": [t.to_dict() for t in self.trades],
        }
    
    def summary(self) -> str:
        """Generate a human-readable summary."""
        lines = [
            f"\n📊 Backtest Results for {self.ticker}",
            f"{'=' * 50}",
            f"Period: {self.start_date.date()} to {self.end_date.date()}",
            f"",
            f"💰 Capital:",
            f"  Initial: ${self.initial_capital:,.2f}",
            f"  Final:   ${self.final_capital:,.2f}",
            f"  Return:  ${self.total_return:,.2f} ({self.total_return_pct:+.2f}%)",
            f"",
            f"📈 Trading Statistics:",
            f"  Total Trades: {self.total_trades}",
            f"  Winning:      {self.winning_trades}",
            f"  Losing:       {self.losing_trades}",
            f"  Win Rate:     {self.win_rate:.1%}",
            f"",
            f"⚠️  Risk Metrics:",
            f"  Max Drawdown: ${self.max_drawdown:,.2f} ({self.max_drawdown_pct:.2f}%)",
            f"  Sharpe Ratio: {self.sharpe_ratio:.2f}",
            f"{'=' * 50}",
        ]
        return "\n".join(lines)


class BacktestEngine:
    """Backtest trading strategies on historical data."""
    
    def __init__(self, initial_capital: float = 100000.0):
        self.initial_capital = initial_capital
        self.current_capital = initial_capital
        self.positions: Dict[str, int] = {}
        self.trades: List[Trade] = []
        self.equity_curve: List[float] = []
        
    def reset(self):
        """Reset the engine state."""
        self.current_capital = self.initial_capital
        self.positions = {}
        self.trades = []
        self.equity_curve = []
    
    def run_backtest(
        self,
        ticker: str,
        price_data: List[Dict],
        strategy: Callable,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> BacktestResult:
        """
        Run a backtest with the given strategy.
        
        Args:
            ticker: Stock ticker symbol
            price_data: List of price bars (dict with 'date', 'open', 'high', 'low', 'close', 'volume')
            strategy: Function that returns TradeAction given current state
            start_date: Optional start date filter
            end_date: Optional end date filter
        """
        self.reset()
        
        # Filter data by date if specified
        if start_date:
            price_data = [d for d in price_data if d['date'] >= start_date]
        if end_date:
            price_data = [d for d in price_data if d['date'] <= end_date]
        
        if not price_data:
            raise ValueError("No price data available for backtest period")
        
        actual_start = price_data[0]['date']
        actual_end = price_data[-1]['date']
        
        # Run through each price bar
        for i, bar in enumerate(price_data):
            # Update equity curve
            current_price = bar['close']
            position_value = self.positions.get(ticker, 0) * current_price
            total_value = self.current_capital + position_value
            self.equity_curve.append(total_value)
            
            # Get strategy signal
            signal = strategy(
                ticker=ticker,
                current_bar=bar,
                historical_data=price_data[:i+1],
                current_position=self.positions.get(ticker, 0),
                capital=self.current_capital,
            )
            
            # Execute trade if signal is not HOLD
            if signal['action'] != TradeAction.HOLD:
                self._execute_trade(
                    ticker=ticker,
                    action=signal['action'],
                    price=current_price,
                    conviction=signal.get('conviction', 50),
                    reason=signal.get('reason', 'Strategy signal'),
                    timestamp=bar['date'],
                )
        
        # Calculate final metrics
        return self._calculate_results(ticker, actual_start, actual_end)
    
    def _execute_trade(
        self,
        ticker: str,
        action: TradeAction,
        price: float,
        conviction: int,
        reason: str,
        timestamp: datetime,
    ):
        """Execute a trade."""
        current_position = self.positions.get(ticker, 0)
        
        if action == TradeAction.BUY:
            # Calculate position size (simple version: use 10% of capital per trade)
            position_size = self.current_capital * 0.1
            shares = int(position_size / price)
            
            if shares > 0:
                cost = shares * price
                if cost <= self.current_capital:
                    self.current_capital -= cost
                    self.positions[ticker] = current_position + shares
                    
                    trade = Trade(
                        ticker=ticker,
                        action=action,
                        price=price,
                        shares=shares,
                        timestamp=timestamp,
                        conviction=conviction,
                        reason=reason,
                    )
                    self.trades.append(trade)
        
        elif action == TradeAction.SELL:
            if current_position > 0:
                proceeds = current_position * price
                self.current_capital += proceeds
                
                trade = Trade(
                    ticker=ticker,
                    action=action,
                    price=price,
                    shares=current_position,
                    timestamp=timestamp,
                    conviction=conviction,
                    reason=reason,
                )
                self.trades.append(trade)
                
                self.positions[ticker] = 0
    
    def _calculate_results(
        self,
        ticker: str,
        start_date: datetime,
        end_date: datetime,
    ) -> BacktestResult:
        """Calculate backtest results and metrics."""
        # Final capital including positions
        final_price = self.equity_curve[-1] if self.equity_curve else self.initial_capital
        position_value = self.positions.get(ticker, 0) * final_price
        final_capital = self.current_capital + position_value
        
        total_return = final_capital - self.initial_capital
        total_return_pct = (total_return / self.initial_capital) * 100
        
        # Calculate trade statistics
        winning_trades = 0
        losing_trades = 0
        
        for trade in self.trades:
            # Simplified P&L calculation
            if trade.action == TradeAction.SELL:
                # Find corresponding buy
                for t in reversed(self.trades):
                    if t.action == TradeAction.BUY and t.ticker == trade.ticker:
                        pnl = (trade.price - t.price) * trade.shares
                        if pnl > 0:
                            winning_trades += 1
                        else:
                            losing_trades += 1
                        break
        
        total_trades = len([t for t in self.trades if t.action == TradeAction.SELL])
        win_rate = winning_trades / total_trades if total_trades > 0 else 0
        
        # Calculate max drawdown
        max_drawdown = 0
        max_drawdown_pct = 0
        peak = self.initial_capital
        
        for value in self.equity_curve:
            if value > peak:
                peak = value
            drawdown = peak - value
            drawdown_pct = (drawdown / peak) * 100
            
            if drawdown > max_drawdown:
                max_drawdown = drawdown
                max_drawdown_pct = drawdown_pct
        
        # Simplified Sharpe ratio (assuming risk-free rate of 2%)
        if len(self.equity_curve) > 1:
            returns = []
            for i in range(1, len(self.equity_curve)):
                daily_return = (self.equity_curve[i] - self.equity_curve[i-1]) / self.equity_curve[i-1]
                returns.append(daily_return)
            
            avg_return = sum(returns) / len(returns)
            variance = sum((r - avg_return) ** 2 for r in returns) / len(returns)
            std_dev = variance ** 0.5
            
            sharpe_ratio = (avg_return - 0.02/252) / std_dev if std_dev > 0 else 0
        else:
            sharpe_ratio = 0
        
        return BacktestResult(
            ticker=ticker,
            start_date=start_date,
            end_date=end_date,
            initial_capital=self.initial_capital,
            final_capital=final_capital,
            total_return=total_return,
            total_return_pct=total_return_pct,
            total_trades=total_trades,
            winning_trades=winning_trades,
            losing_trades=losing_trades,
            win_rate=win_rate,
            max_drawdown=max_drawdown,
            max_drawdown_pct=max_drawdown_pct,
            sharpe_ratio=sharpe_ratio,
            trades=self.trades,
        )


# Example strategies
def simple_ma_strategy(
    ticker: str,
    current_bar: Dict,
    historical_data: List[Dict],
    current_position: int,
    capital: float,
) -> Dict:
    """
    Simple moving average crossover strategy.
    Buy when price crosses above 20-day MA.
    Sell when price crosses below 20-day MA.
    """
    if len(historical_data) < 20:
        return {"action": TradeAction.HOLD, "conviction": 0, "reason": "Insufficient data"}
    
    current_price = current_bar['close']
    ma20 = sum(d['close'] for d in historical_data[-20:]) / 20
    ma50 = sum(d['close'] for d in historical_data[-50:]) / 50 if len(historical_data) >= 50 else ma20
    
    if current_price > ma20 and current_position == 0:
        return {
            "action": TradeAction.BUY,
            "conviction": 70,
            "reason": f"Price ({current_price:.2f}) crossed above 20-day MA ({ma20:.2f})"
        }
    elif current_price < ma20 and current_position > 0:
        return {
            "action": TradeAction.SELL,
            "conviction": 70,
            "reason": f"Price ({current_price:.2f}) crossed below 20-day MA ({ma20:.2f})"
        }
    
    return {"action": TradeAction.HOLD, "conviction": 50, "reason": "No signal"}


def rsi_strategy(
    ticker: str,
    current_bar: Dict,
    historical_data: List[Dict],
    current_position: int,
    capital: float,
) -> Dict:
    """
    RSI-based mean reversion strategy.
    Buy when RSI < 30 (oversold).
    Sell when RSI > 70 (overbought).
    """
    if len(historical_data) < 14:
        return {"action": TradeAction.HOLD, "conviction": 0, "reason": "Insufficient data"}
    
    # Calculate RSI
    prices = [d['close'] for d in historical_data[-15:]]
    deltas = [prices[i] - prices[i-1] for i in range(1, len(prices))]
    gains = [d if d > 0 else 0 for d in deltas]
    losses = [-d if d < 0 else 0 for d in deltas]
    
    avg_gain = sum(gains) / len(gains)
    avg_loss = sum(losses) / len(losses)
    
    if avg_loss == 0:
        rsi = 100
    else:
        rs = avg_gain / avg_loss
        rsi = 100 - (100 / (1 + rs))
    
    current_price = current_bar['close']
    
    if rsi < 30 and current_position == 0:
        return {
            "action": TradeAction.BUY,
            "conviction": 80,
            "reason": f"RSI oversold ({rsi:.1f})"
        }
    elif rsi > 70 and current_position > 0:
        return {
            "action": TradeAction.SELL,
            "conviction": 80,
            "reason": f"RSI overbought ({rsi:.1f})"
        }
    
    return {"action": TradeAction.HOLD, "conviction": 50, "reason": f"RSI neutral ({rsi:.1f})"}
