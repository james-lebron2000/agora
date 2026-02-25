"""State machine for event-driven trading lifecycle tracking."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime, timezone

from models import AgentState

LOGGER = logging.getLogger(__name__)


@dataclass(slots=True)
class StateTransition:
    """Single state transition record."""

    from_state: AgentState
    to_state: AgentState
    reason: str
    changed_at: datetime


class TradingStateMachine:
    """Track execution lifecycle from observation to exit."""

    def __init__(self, initial_state: AgentState = AgentState.S0_OBSERVE) -> None:
        """Initialize state machine."""
        self.state = initial_state
        self.history: list[StateTransition] = []

    def _transition(self, next_state: AgentState, reason: str) -> AgentState:
        """Apply state transition and append history."""
        if next_state == self.state:
            return self.state
        transition = StateTransition(
            from_state=self.state,
            to_state=next_state,
            reason=reason,
            changed_at=datetime.now(timezone.utc),
        )
        self.history.append(transition)
        LOGGER.info("State transition: %s -> %s | %s", self.state.value, next_state.value, reason)
        self.state = next_state
        return self.state

    def update(
        self,
        conviction_score: int,
        has_position: bool,
        thesis_falsified: bool = False,
        take_profit_hit: bool = False,
        stop_loss_hit: bool = False,
    ) -> AgentState:
        """Update state based on execution and thesis signals."""
        if thesis_falsified or stop_loss_hit:
            return self._transition(AgentState.S5_EXITED, "Thesis invalidated or stop-loss triggered")

        if self.state == AgentState.S0_OBSERVE and conviction_score >= 60:
            return self._transition(AgentState.S1_WARMUP, "Conviction reached tradable threshold")

        if self.state in {AgentState.S0_OBSERVE, AgentState.S1_WARMUP} and has_position:
            return self._transition(AgentState.S2_POSITION_ON, "Position initiated")

        if self.state == AgentState.S2_POSITION_ON and has_position:
            return self._transition(AgentState.S3_VALIDATING, "Position active and catalyst validating")

        if self.state == AgentState.S3_VALIDATING and take_profit_hit:
            return self._transition(AgentState.S4_REALIZING, "Take-profit condition met")

        if self.state == AgentState.S4_REALIZING and not has_position:
            return self._transition(AgentState.S5_EXITED, "Position closed after realization")

        if conviction_score < 60 and not has_position and self.state != AgentState.S5_EXITED:
            return self._transition(AgentState.S0_OBSERVE, "Conviction dropped below threshold")

        return self.state

    def snapshot(self) -> dict[str, object]:
        """Return serializable current state and history."""
        return {
            "state": self.state.value,
            "history": [
                {
                    "from": item.from_state.value,
                    "to": item.to_state.value,
                    "reason": item.reason,
                    "changed_at": item.changed_at.isoformat(),
                }
                for item in self.history
            ],
        }
