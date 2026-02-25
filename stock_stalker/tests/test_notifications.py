"""Test notification system."""

import sys
sys.path.insert(0, '.')

from core.notifications import (
    NotificationManager,
    ConsoleNotifier,
    NotificationMessage,
    create_notification_manager,
)


def test_notifications():
    """Test the notification system."""
    print("=" * 60)
    print("Testing Notification System")
    print("=" * 60)
    
    # Test 1: Console notifier
    print("\n1️⃣ Testing Console Notifier")
    print("-" * 60)
    
    manager = NotificationManager()
    manager.add_channel(ConsoleNotifier())
    
    # Send test trade signal
    results = manager.send_trade_signal(
        ticker="AAPL",
        action="BUY",
        price=150.25,
        conviction=85,
        reason="RSI oversold, MACD bullish crossover",
        priority="high",
    )
    
    print(f"\nResults: {results}")
    
    # Test 2: General alert
    print("\n2️⃣ Testing General Alert")
    print("-" * 60)
    
    results = manager.send_alert(
        title="Market Alert",
        body="S&P 500 dropped 2% in the last hour",
        priority="urgent",
    )
    
    print(f"\nResults: {results}")
    
    # Test 3: Notification history
    print("\n3️⃣ Testing Notification History")
    print("-" * 60)
    
    history = manager.get_history(limit=10)
    print(f"History count: {len(history)}")
    
    if history:
        print(f"Latest: {history[-1].title}")
    
    # Test 4: Multiple priorities
    print("\n4️⃣ Testing Different Priorities")
    print("-" * 60)
    
    for priority in ["low", "normal", "high", "urgent"]:
        msg = NotificationMessage(
            title=f"Test {priority} priority",
            body=f"This is a {priority} priority test message.",
            priority=priority,
        )
        manager.notify(msg)
    
    # Test 5: Convenience factory function
    print("\n5️⃣ Testing Factory Function")
    print("-" * 60)
    
    manager2 = create_notification_manager(console=True)
    results = manager2.send_trade_signal(
        ticker="TSLA",
        action="SELL",
        price=200.00,
        conviction=75,
        reason="Target price reached",
    )
    
    print(f"\nFactory results: {results}")
    
    # Verification
    print("\n" + "=" * 60)
    print("Verification")
    print("=" * 60)
    
    checks = [
        ("Manager created", manager is not None),
        ("Channel added", len(manager.channels) > 0),
        ("Trade signal sent", len(manager.history) > 0),
        ("History tracked", len(manager.history) >= 6),
        ("Factory works", manager2 is not None),
    ]
    
    all_passed = True
    for name, passed in checks:
        status = "✓" if passed else "✗"
        print(f"  {status} {name}")
        if not passed:
            all_passed = False
    
    print("\n" + "=" * 60)
    if all_passed:
        print("✅ All tests PASSED")
    else:
        print("❌ Some tests FAILED")
    print("=" * 60)
    
    return all_passed


if __name__ == "__main__":
    success = test_notifications()
    sys.exit(0 if success else 1)
