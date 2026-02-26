#!/usr/bin/env python3
"""
Alpha Vantage API Quick Start Example
使用Alpha Vantage API获取实时股票数据

API密钥: 2HV3KV4QHQP0QXK0
"""

import sys
sys.path.insert(0, '.')

from data.fetchers.alpha_vantage_fetcher import AlphaVantageFetcher
from analysis.technical_indicators import TechnicalAnalyzer

# 初始化API（使用你的密钥）
API_KEY = "2HV3KV4QHQP0QXK0"
fetcher = AlphaVantageFetcher(API_KEY)

print("🚀 Alpha Vantage API 快速示例")
print("=" * 60)
print()

# 示例1: 获取实时行情
print("📊 示例1: 获取实时行情")
print("-" * 60)
try:
    quote = fetcher.get_quote("AAPL")
    print(f"股票: {quote['symbol']}")
    print(f"价格: ${quote['price']:.2f}")
    print(f"涨跌: {quote['change']:.2f} ({quote['change_percent']})")
    print(f"成交量: {quote['volume']:,}")
except Exception as e:
    print(f"❌ 错误: {e}")

print()

# 示例2: 获取技术指标
print("📈 示例2: 获取技术指标")
print("-" * 60)
try:
    # RSI
    rsi_data = fetcher.get_rsi("MSFT", time_period=14)
    if rsi_data:
        latest_rsi = list(rsi_data[-1].values())[1]
        print(f"MSFT RSI(14): {latest_rsi:.2f}")
        if latest_rsi < 30:
            print("  📊 信号: 超卖 (买入机会)")
        elif latest_rsi > 70:
            print("  📊 信号: 超买 (卖出机会)")
        else:
            print("  📊 信号: 中性")
    
    # SMA
    sma_data = fetcher.get_sma("AAPL", time_period=20)
    if sma_data:
        latest_sma = list(sma_data[-1].values())[1]
        print(f"AAPL SMA(20): ${latest_sma:.2f}")
except Exception as e:
    print(f"❌ 错误: {e}")

print()

# 示例3: 获取历史数据并分析
print("📉 示例3: 历史数据分析")
print("-" * 60)
try:
    daily_data = fetcher.get_daily("TSLA", outputsize='compact')
    print(f"获取到 {len(daily_data)} 天历史数据")
    
    if len(daily_data) >= 50:
        prices = [d['close'] for d in daily_data]
        volumes = [d['volume'] for d in daily_data]
        highs = [d['high'] for d in daily_data]
        lows = [d['low'] for d in daily_data]
        
        # 计算技术指标
        indicators = TechnicalAnalyzer.calculate_all(
            ticker="TSLA",
            prices=prices,
            volumes=volumes,
            highs=highs,
            lows=lows,
        )
        
        print(f"SMA 20: ${indicators.sma_20:.2f}" if indicators.sma_20 else "SMA 20: N/A")
        print(f"RSI 14: {indicators.rsi_14:.2f}" if indicators.rsi_14 else "RSI 14: N/A")
        print(f"信号: {indicators.get_signal()}")
except Exception as e:
    print(f"❌ 错误: {e}")

print()

# 示例4: 获取公司信息
print("🏢 示例4: 公司基本面")
print("-" * 60)
try:
    overview = fetcher.get_company_overview("GOOGL")
    print(f"公司: {overview['name']}")
    print(f"行业: {overview['sector']} / {overview['industry']}")
    print(f"市值: ${float(overview['market_cap'])/1e12:.2f}T")
    print(f"市盈率: {overview['pe_ratio']}")
except Exception as e:
    print(f"❌ 错误: {e}")

print()
print("=" * 60)
print("✅ 示例完成！")
print()
print("💡 提示:")
print("  - 免费版限制: 5次/分钟, 500次/天")
print("  - 更多功能请参考: data/fetchers/alpha_vantage_fetcher.py")
print("=" * 60)
