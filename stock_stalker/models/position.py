"""Position model for lifecycle and P&L tracking."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone

from models.enums import PositionStatus


@dataclass(slots=True)
class Position:
    """Current position state with realized/unrealized P&L tracking."""

    ticker: str
    quantity: float = 0.0
    average_cost: float = 0.0
    current_price: float = 0.0
    realized_pnl: float = 0.0
    status: PositionStatus = PositionStatus.WATCHLIST
    opened_at: datetime | None = None
    closed_at: datetime | None = None

    def open(self, quantity: float, price: float) -> None:
        """Open a new position from flat state."""
        if self.status == PositionStatus.OPEN:
            raise ValueError("position is already open")
        if quantity <= 0 or price <= 0:
            raise ValueError("quantity and price must be positive")

        self.quantity = quantity
        self.average_cost = price
        self.current_price = price
        self.status = PositionStatus.OPEN
        self.opened_at = datetime.now(timezone.utc)
        self.closed_at = None

    def add(self, quantity: float, price: float) -> None:
        """Increase position size and update weighted average cost."""
        if self.status != PositionStatus.OPEN:
            raise ValueError("position must be open before adding")
        if quantity <= 0 or price <= 0:
            raise ValueError("quantity and price must be positive")

        total_cost = self.average_cost * self.quantity + price * quantity
        self.quantity += quantity
        self.average_cost = total_cost / self.quantity
        self.current_price = price

    def reduce(self, quantity: float, price: float) -> None:
        """Reduce position and realize proportional P&L."""
        if self.status != PositionStatus.OPEN:
            raise ValueError("position must be open before reducing")
        if quantity <= 0 or price <= 0:
            raise ValueError("quantity and price must be positive")
        if quantity > self.quantity:
            raise ValueError("cannot reduce more than current quantity")

        self.realized_pnl += (price - self.average_cost) * quantity
        self.quantity -= quantity
        self.current_price = price

        if self.quantity == 0:
            self.status = PositionStatus.CLOSED
            self.closed_at = datetime.now(timezone.utc)

    def mark_to_market(self, latest_price: float) -> None:
        """Update the current marked price for unrealized P&L calculations."""
        if latest_price <= 0:
            raise ValueError("latest_price must be positive")
        self.current_price = latest_price

    @property
    def unrealized_pnl(self) -> float:
        """Return unrealized P&L using the latest marked price."""
        return (self.current_price - self.average_cost) * self.quantity

    @property
    def total_pnl(self) -> float:
        """Return combined realized and unrealized P&L."""
        return self.realized_pnl + self.unrealized_pnl

    def to_dict(self) -> dict[str, object]:
        """Serialize position to a dictionary for persistence/output."""
        return {
            "ticker": self.ticker,
            "quantity": self.quantity,
            "average_cost": self.average_cost,
            "current_price": self.current_price,
            "realized_pnl": self.realized_pnl,
            "unrealized_pnl": self.unrealized_pnl,
            "total_pnl": self.total_pnl,
            "status": self.status.value,
            "opened_at": self.opened_at.isoformat() if self.opened_at else None,
            "closed_at": self.closed_at.isoformat() if self.closed_at else None,
        }
