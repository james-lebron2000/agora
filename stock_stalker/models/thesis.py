"""Thesis model describing hypothesis and falsification rules."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone


@dataclass(slots=True)
class Thesis:
    """Research thesis with explicit falsification and scenario paths."""

    ticker: str
    main_hypothesis: str
    falsification_conditions: list[str]
    win_paths: list[str]
    loss_paths: list[str]
    verification_tasks: list[str] = field(default_factory=list)
    has_changed: bool = False
    change_reason: str = ""
    generated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def is_falsified(self, observed_facts: list[str]) -> bool:
        """Check whether observed facts trigger any explicit falsification condition."""
        observed = "\n".join(observed_facts).lower()
        for condition in self.falsification_conditions:
            if condition.lower() in observed:
                return True
        return False

    def to_dict(self) -> dict[str, object]:
        """Serialize thesis into a JSON-friendly structure."""
        return {
            "ticker": self.ticker,
            "main_hypothesis": self.main_hypothesis,
            "falsification_conditions": self.falsification_conditions,
            "win_paths": self.win_paths,
            "loss_paths": self.loss_paths,
            "verification_tasks": self.verification_tasks,
            "has_changed": self.has_changed,
            "change_reason": self.change_reason,
            "generated_at": self.generated_at.isoformat(),
        }
