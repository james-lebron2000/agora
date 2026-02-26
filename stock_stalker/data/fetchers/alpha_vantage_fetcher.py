"""Alpha Vantage data fetcher for real-time stock data."""

import json
import urllib.request
import urllib.error
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
import time

from data.fetchers.base import BaseFetcher
from models import Event, EventType, EvidenceLevel, MarketSession


class AlphaVantageFetcher(BaseFetcher):
    """Fetch real-time stock data from Alpha Vantage API."""
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://www.alphavantage.co/query"
        self.last_call_time = 0
        self.min_interval = 12  # Free tier: 5 calls per minute = 12 seconds interval
        
    def _make_request(self, params: Dict[str, str]) -> Dict[str, Any]:
        """Make API request with rate limiting."""
        # Rate limiting
        elapsed = time.time() - self.last_call_time
        if elapsed < self.min_interval:
            time.sleep(self.min_interval - elapsed)
        
        # Build URL
        params['apikey'] = self.api_key
        query_string = '&'.join([f"{k}={v}" for k, v in params.items()])
        url = f"{self.base_url}?{query_string}"
        
        try:
            req = urllib.request.Request(url)
            with urllib.request.urlopen(req, timeout=30) as response:
                self.last_call_time = time.time()
                return json.loads(response.read().decode('utf-8'))
        except urllib.error.HTTPError as e:
            raise Exception(f"Alpha Vantage HTTP {e.code}: {e.reason}")
        except Exception as e:
            raise Exception(f"Alpha Vantage request failed: {e}")
    
    def get_quote(self, ticker: str) -> Dict[str, Any]:
        """Get real-time stock quote."""
        params = {
            'function': 'GLOBAL_QUOTE',
            'symbol': ticker,
        }
        
        data = self._make_request(params)
        
        if 'Global Quote' not in data or not data['Global Quote']:
            raise Exception(f"No quote data for {ticker}")
        
        quote = data['Global Quote']
        
        return {
            'symbol': quote.get('01. symbol', ticker),
            'price': float(quote.get('05. price', 0)),
            'change': float(quote.get('09. change', 0)),
            'change_percent': quote.get('10. change percent', '0%'),
            'volume': int(quote.get('06. volume', 0)),
            'latest_trading_day': quote.get('07. latest trading day', ''),
            'timestamp': datetime.now().isoformat(),
        }
    
    def get_intraday(self, ticker: str, interval: str = '5min') -> List[Dict[str, Any]]:
        """Get intraday price data."""
        params = {
            'function': 'TIME_SERIES_INTRADAY',
            'symbol': ticker,
            'interval': interval,
            'outputsize': 'compact',
        }
        
        data = self._make_request(params)
        
        time_series_key = f"Time Series ({interval})"
        if time_series_key not in data:
            raise Exception(f"No intraday data for {ticker}")
        
        time_series = data[time_series_key]
        results = []
        
        for timestamp, values in time_series.items():
            results.append({
                'timestamp': timestamp,
                'open': float(values['1. open']),
                'high': float(values['2. high']),
                'low': float(values['3. low']),
                'close': float(values['4. close']),
                'volume': int(values['5. volume']),
            })
        
        # Sort by timestamp (oldest first)
        results.reverse()
        return results
    
    def get_daily(self, ticker: str, outputsize: str = 'compact') -> List[Dict[str, Any]]:
        """Get daily price data."""
        params = {
            'function': 'TIME_SERIES_DAILY',
            'symbol': ticker,
            'outputsize': outputsize,
        }
        
        data = self._make_request(params)
        
        if 'Time Series (Daily)' not in data:
            raise Exception(f"No daily data for {ticker}")
        
        time_series = data['Time Series (Daily)']
        results = []
        
        for date, values in time_series.items():
            results.append({
                'date': datetime.strptime(date, '%Y-%m-%d'),
                'open': float(values['1. open']),
                'high': float(values['2. high']),
                'low': float(values['3. low']),
                'close': float(values['4. close']),
                'volume': int(values['5. volume']),
            })
        
        # Sort by date (oldest first)
        results.reverse()
        return results
    
    def get_technical_indicator(
        self,
        ticker: str,
        indicator: str,
        interval: str = 'daily',
        time_period: int = 14,
        series_type: str = 'close',
    ) -> List[Dict[str, Any]]:
        """Get technical indicator data."""
        params = {
            'function': indicator,
            'symbol': ticker,
            'interval': interval,
            'time_period': str(time_period),
            'series_type': series_type,
        }
        
        data = self._make_request(params)
        
        # Find the technical analysis key
        tech_key = None
        for key in data.keys():
            if 'Technical Analysis' in key:
                tech_key = key
                break
        
        if not tech_key or tech_key not in data:
            raise Exception(f"No technical indicator data for {ticker}")
        
        tech_data = data[tech_key]
        results = []
        
        for timestamp, values in tech_data.items():
            result = {'timestamp': timestamp}
            result.update({k: float(v) for k, v in values.items()})
            results.append(result)
        
        # Sort by timestamp (oldest first)
        results.reverse()
        return results
    
    def get_rsi(self, ticker: str, time_period: int = 14) -> List[Dict[str, Any]]:
        """Get RSI (Relative Strength Index)."""
        return self.get_technical_indicator(
            ticker=ticker,
            indicator='RSI',
            time_period=time_period,
        )
    
    def get_sma(self, ticker: str, time_period: int = 20) -> List[Dict[str, Any]]:
        """Get SMA (Simple Moving Average)."""
        return self.get_technical_indicator(
            ticker=ticker,
            indicator='SMA',
            time_period=time_period,
        )
    
    def get_ema(self, ticker: str, time_period: int = 20) -> List[Dict[str, Any]]:
        """Get EMA (Exponential Moving Average)."""
        return self.get_technical_indicator(
            ticker=ticker,
            indicator='EMA',
            time_period=time_period,
        )
    
    def get_macd(
        self,
        ticker: str,
        fastperiod: int = 12,
        slowperiod: int = 26,
        signalperiod: int = 9,
    ) -> List[Dict[str, Any]]:
        """Get MACD (Moving Average Convergence Divergence)."""
        params = {
            'function': 'MACD',
            'symbol': ticker,
            'interval': 'daily',
            'series_type': 'close',
            'fastperiod': str(fastperiod),
            'slowperiod': str(slowperiod),
            'signalperiod': str(signalperiod),
            'apikey': self.api_key,
        }
        
        data = self._make_request(params)
        
        if 'Technical Analysis: MACD' not in data:
            raise Exception(f"No MACD data for {ticker}")
        
        macd_data = data['Technical Analysis: MACD']
        results = []
        
        for timestamp, values in macd_data.items():
            results.append({
                'timestamp': timestamp,
                'macd': float(values.get('MACD', 0)),
                'macd_signal': float(values.get('MACD_Signal', 0)),
                'macd_hist': float(values.get('MACD_Hist', 0)),
            })
        
        results.reverse()
        return results
    
    def get_bbands(
        self,
        ticker: str,
        time_period: int = 20,
        nbdevup: int = 2,
        nbdevdn: int = 2,
    ) -> List[Dict[str, Any]]:
        """Get Bollinger Bands."""
        params = {
            'function': 'BBANDS',
            'symbol': ticker,
            'interval': 'daily',
            'time_period': str(time_period),
            'series_type': 'close',
            'nbdevup': str(nbdevup),
            'nbdevdn': str(nbdevdn),
            'apikey': self.api_key,
        }
        
        data = self._make_request(params)
        
        if 'Technical Analysis: BBANDS' not in data:
            raise Exception(f"No BBANDS data for {ticker}")
        
        bbands_data = data['Technical Analysis: BBANDS']
        results = []
        
        for timestamp, values in bbands_data.items():
            results.append({
                'timestamp': timestamp,
                'upper_band': float(values.get('Real Upper Band', 0)),
                'middle_band': float(values.get('Real Middle Band', 0)),
                'lower_band': float(values.get('Real Lower Band', 0)),
            })
        
        results.reverse()
        return results
    
    def get_company_overview(self, ticker: str) -> Dict[str, Any]:
        """Get company overview and fundamentals."""
        params = {
            'function': 'OVERVIEW',
            'symbol': ticker,
        }
        
        data = self._make_request(params)
        
        if not data or 'Symbol' not in data:
            raise Exception(f"No company overview for {ticker}")
        
        return {
            'symbol': data.get('Symbol'),
            'name': data.get('Name'),
            'description': data.get('Description'),
            'sector': data.get('Sector'),
            'industry': data.get('Industry'),
            'market_cap': data.get('MarketCapitalization'),
            'pe_ratio': data.get('PERatio'),
            'dividend_yield': data.get('DividendYield'),
            '52_week_high': data.get('52WeekHigh'),
            '52_week_low': data.get('52WeekLow'),
            'eps': data.get('EPS'),
        }
    
    def fetch(self, ticker: str, **kwargs) -> List[Event]:
        """Fetch events from Alpha Vantage (implements BaseFetcher abstract method)."""
        days = kwargs.get('days', 30)
        return self.fetch_events(ticker, days)
    
    def fetch_events(self, ticker: str, days: int = 30) -> List[Event]:
        """Fetch events from Alpha Vantage (price movements as events)."""
        events = []
        
        try:
            # Get daily data
            daily_data = self.get_daily(ticker, outputsize='compact')
            
            # Detect significant price movements (>5%)
            for i in range(1, len(daily_data)):
                current = daily_data[i]
                previous = daily_data[i-1]
                
                price_change = (current['close'] - previous['close']) / previous['close']
                
                if abs(price_change) > 0.05:  # 5% threshold
                    direction = "surge" if price_change > 0 else "drop"
                    
                    event = Event(
                        ticker=ticker,
                        event_type=EventType.PRICE_MOVEMENT,
                        title=f"Price {direction}: {price_change:.1%}",
                        occurred_at=current['date'],
                        source_url=f"https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol={ticker}",
                        evidence_level=EvidenceLevel.B,
                        market_session=MarketSession.REGULAR,
                        importance=4 if abs(price_change) > 0.1 else 3,
                        details={
                            'change_percent': price_change * 100,
                            'volume': current['volume'],
                            'prev_close': previous['close'],
                            'curr_close': current['close'],
                        }
                    )
                    events.append(event)
            
            return events
            
        except Exception as e:
            print(f"⚠️  Error fetching Alpha Vantage events for {ticker}: {e}")
            return []
