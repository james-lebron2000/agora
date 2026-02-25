"""Trade plan model used by execution and risk agents."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone


@dataclass(slots=True)
class TradeScenario:
    """Single scenario parameters for an actionable trade setup."""

    entry_trigger: str
    stop_loss_pct: float
    take_profit_pct: float
    position_size_pct: float
    add_on_condition: str = ""
    invalidation_condition: str = ""
    notes: str = ""

    def __post_init__(self) -> None:
        """Validate percentage ranges for risk controls."""
        if self.position_size_pct < 0 or self.position_size_pct > 1:
            raise ValueError("position_size_pct must be in range [0, 1]")
        if self.stop_loss_pct <= 0:
            raise ValueError("stop_loss_pct must be > 0")
        if self.take_profit_pct <= 0:
            raise ValueError("take_profit_pct must be > 0")

    def risk_reward_ratio(self) -> float:
        """Calculate risk-reward ratio using scenario percentages."""
        return self.take_profit_pct / self.stop_loss_pct


@dataclass(slots=True)
class TradePlan:
    """Executable plan containing base and alternative trading scenarios."""

    ticker: str
    conviction_score: int
    base_case: TradeScenario
    alt_case: TradeScenario
    generated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    status: str = "draft"

    def recommended_position_pct(self) -> float:
        """Return the larger position recommendation between both scenarios."""
        return max(self.base_case.position_size_pct, self.alt_case.position_size_pct)

    def to_dict(self) -> dict[str, object]:
        """Serialize trade plan into a JSON-friendly structure."""
        return {
            "ticker": self.ticker,
            "conviction_score": self.conviction_score,
            "generated_at": self.generated_at.isoformat(),
            "status": self.status,
            "base_case": {
                "entry_trigger": self.base_case.entry_trigger,
                "stop_loss_pct": self.base_case.stop_loss_pct,
                "take_profit_pct": self.base_case.take_profit_pct,
                "position_size_pct": self.base_case.position_size_pct,
                "add_on_condition": self.base_case.add_on_condition,
                "invalidation_condition": self.base_case.invalidation_condition,
                "notes": self.base_case.notes,
            },
            "alt_case": {
                "entry_trigger": self.alt_case.entry_trigger,
                "stop_loss_pct": self.alt_case.stop_loss_pct,
                "take_profit_pct": self.alt_case.take_profit_pct,
                "position_size_pct": self.alt_case.position_size_pct,
                "add_on_condition": self.alt_case.add_on_condition,
                "invalidation_condition": self.alt_case.invalidation_condition,
                "notes": self.alt_case.notes,
            },
        }
