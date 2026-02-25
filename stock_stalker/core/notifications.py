"""Notification system for Stock Stalker."""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from typing import List, Optional, Dict, Any
import json
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from urllib.request import Request, urlopen
from urllib.error import URLError


@dataclass
class NotificationMessage:
    """A notification message."""
    title: str
    body: str
    priority: str = "normal"  # low, normal, high, urgent
    timestamp: datetime = None
    metadata: Dict[str, Any] = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now()
        if self.metadata is None:
            self.metadata = {}
    
    def to_dict(self) -> Dict:
        return {
            "title": self.title,
            "body": self.body,
            "priority": self.priority,
            "timestamp": self.timestamp.isoformat(),
            "metadata": self.metadata,
        }


class NotificationChannel(ABC):
    """Abstract base class for notification channels."""
    
    @abstractmethod
    def send(self, message: NotificationMessage) -> bool:
        """Send a notification. Returns True if successful."""
        pass
    
    @abstractmethod
    def is_configured(self) -> bool:
        """Check if the channel is properly configured."""
        pass


class ConsoleNotifier(NotificationChannel):
    """Simple console/stdout notifier for debugging."""
    
    def __init__(self, print_metadata: bool = False):
        self.print_metadata = print_metadata
    
    def is_configured(self) -> bool:
        return True
    
    def send(self, message: NotificationMessage) -> bool:
        """Print notification to console."""
        print("\n" + "=" * 60)
        print(f"🔔 [{message.priority.upper()}] {message.title}")
        print("=" * 60)
        print(message.body)
        print(f"Time: {message.timestamp.strftime('%Y-%m-%d %H:%M:%S')}")
        
        if self.print_metadata and message.metadata:
            print("\nMetadata:")
            for key, value in message.metadata.items():
                print(f"  {key}: {value}")
        
        print("=" * 60)
        return True


class EmailNotifier(NotificationChannel):
    """Email notification channel."""
    
    def __init__(
        self,
        smtp_host: str,
        smtp_port: int,
        username: str,
        password: str,
        from_addr: str,
        to_addrs: List[str],
        use_tls: bool = True,
    ):
        self.smtp_host = smtp_host
        self.smtp_port = smtp_port
        self.username = username
        self.password = password
        self.from_addr = from_addr
        self.to_addrs = to_addrs
        self.use_tls = use_tls
    
    def is_configured(self) -> bool:
        return all([
            self.smtp_host,
            self.username,
            self.password,
            self.from_addr,
            self.to_addrs,
        ])
    
    def send(self, message: NotificationMessage) -> bool:
        """Send email notification."""
        try:
            msg = MIMEMultipart()
            msg['From'] = self.from_addr
            msg['To'] = ', '.join(self.to_addrs)
            msg['Subject'] = f"[Stock Stalker] {message.title}"
            
            # Body
            body = f"""
{message.body}

---
Priority: {message.priority}
Time: {message.timestamp.strftime('%Y-%m-%d %H:%M:%S')}
"""
            
            if message.metadata:
                body += "\nMetadata:\n"
                for key, value in message.metadata.items():
                    body += f"  {key}: {value}\n"
            
            msg.attach(MIMEText(body, 'plain'))
            
            # Send
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                if self.use_tls:
                    server.starttls()
                server.login(self.username, self.password)
                server.send_message(msg)
            
            return True
        except Exception as e:
            print(f"❌ Email notification failed: {e}")
            return False


class SlackNotifier(NotificationChannel):
    """Slack webhook notifier."""
    
    def __init__(self, webhook_url: str, channel: Optional[str] = None):
        self.webhook_url = webhook_url
        self.channel = channel
    
    def is_configured(self) -> bool:
        return bool(self.webhook_url)
    
    def send(self, message: NotificationMessage) -> bool:
        """Send Slack notification via webhook."""
        try:
            # Priority emoji mapping
            emoji_map = {
                "low": "ℹ️",
                "normal": "🔔",
                "high": "⚠️",
                "urgent": "🚨",
            }
            emoji = emoji_map.get(message.priority, "🔔")
            
            payload = {
                "text": f"{emoji} *{message.title}*",
                "blocks": [
                    {
                        "type": "header",
                        "text": {
                            "type": "plain_text",
                            "text": f"{emoji} {message.title}",
                        }
                    },
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": message.body,
                        }
                    },
                    {
                        "type": "context",
                        "elements": [
                            {
                                "type": "mrkdwn",
                                "text": f"Priority: *{message.priority.upper()}* | {message.timestamp.strftime('%Y-%m-%d %H:%M:%S')}",
                            }
                        ]
                    }
                ]
            }
            
            if self.channel:
                payload["channel"] = self.channel
            
            req = Request(
                self.webhook_url,
                data=json.dumps(payload).encode('utf-8'),
                headers={'Content-Type': 'application/json'},
            )
            with urlopen(req, timeout=10) as response:
                return response.getcode() == 200
        except Exception as e:
            print(f"❌ Slack notification failed: {e}")
            return False


class DingTalkNotifier(NotificationChannel):
    """DingTalk webhook notifier."""
    
    def __init__(self, webhook_url: str, secret: Optional[str] = None):
        self.webhook_url = webhook_url
        self.secret = secret
    
    def is_configured(self) -> bool:
        return bool(self.webhook_url)
    
    def send(self, message: NotificationMessage) -> bool:
        """Send DingTalk notification."""
        try:
            payload = {
                "msgtype": "markdown",
                "markdown": {
                    "title": message.title,
                    "text": f"**{message.title}**\n\n{message.body}\n\n---\nPriority: {message.priority}\nTime: {message.timestamp.strftime('%Y-%m-%d %H:%M:%S')}",
                },
            }
            
            req = Request(
                self.webhook_url,
                data=json.dumps(payload).encode('utf-8'),
                headers={'Content-Type': 'application/json'},
            )
            with urlopen(req, timeout=10) as response:
                return response.getcode() == 200
        except Exception as e:
            print(f"❌ DingTalk notification failed: {e}")
            return False


class NotificationManager:
    """Manage multiple notification channels."""
    
    def __init__(self):
        self.channels: List[NotificationChannel] = []
        self.history: List[NotificationMessage] = []
        self.max_history = 1000
    
    def add_channel(self, channel: NotificationChannel):
        """Add a notification channel."""
        if channel.is_configured():
            self.channels.append(channel)
            print(f"✅ Added notification channel: {channel.__class__.__name__}")
        else:
            print(f"⚠️  Channel not configured: {channel.__class__.__name__}")
    
    def notify(self, message: NotificationMessage) -> Dict[str, bool]:
        """
        Send notification to all configured channels.
        Returns dict of channel_name -> success status.
        """
        results = {}
        
        # Add to history
        self.history.append(message)
        if len(self.history) > self.max_history:
            self.history = self.history[-self.max_history:]
        
        # Send to all channels
        for channel in self.channels:
            channel_name = channel.__class__.__name__
            success = channel.send(message)
            results[channel_name] = success
        
        return results
    
    def send_trade_signal(
        self,
        ticker: str,
        action: str,
        price: float,
        conviction: int,
        reason: str,
        priority: str = "normal",
    ):
        """Send a trade signal notification."""
        message = NotificationMessage(
            title=f"Trade Signal: {action} {ticker}",
            body=f"""
Ticker: {ticker}
Action: {action}
Price: ${price:.2f}
Conviction: {conviction}/100
Reason: {reason}
""",
            priority=priority,
            metadata={
                "ticker": ticker,
                "action": action,
                "price": price,
                "conviction": conviction,
            },
        )
        return self.notify(message)
    
    def send_alert(
        self,
        title: str,
        body: str,
        priority: str = "normal",
        metadata: Dict[str, Any] = None,
    ):
        """Send a general alert."""
        message = NotificationMessage(
            title=title,
            body=body,
            priority=priority,
            metadata=metadata or {},
        )
        return self.notify(message)
    
    def get_history(self, limit: int = 100) -> List[NotificationMessage]:
        """Get notification history."""
        return self.history[-limit:]


# Convenience function for quick setup
def create_notification_manager(
    console: bool = True,
    email_config: Optional[Dict] = None,
    slack_webhook: Optional[str] = None,
    dingtalk_webhook: Optional[str] = None,
) -> NotificationManager:
    """
    Create a notification manager with specified channels.
    
    Example:
        manager = create_notification_manager(
            console=True,
            email_config={
                "smtp_host": "smtp.gmail.com",
                "smtp_port": 587,
                "username": "your_email@gmail.com",
                "password": "your_password",
                "from_addr": "your_email@gmail.com",
                "to_addrs": ["recipient@example.com"],
            },
            slack_webhook="https://hooks.slack.com/services/...",
        )
    """
    manager = NotificationManager()
    
    if console:
        manager.add_channel(ConsoleNotifier())
    
    if email_config:
        manager.add_channel(EmailNotifier(**email_config))
    
    if slack_webhook:
        manager.add_channel(SlackNotifier(slack_webhook))
    
    if dingtalk_webhook:
        manager.add_channel(DingTalkNotifier(dingtalk_webhook))
    
    return manager
