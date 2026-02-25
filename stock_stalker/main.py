"""CLI entrypoint for the stock stalker event-driven workflow."""

from __future__ import annotations

import argparse
import json
import logging
from pathlib import Path
from typing import Any

from agents import (
    ConvictionAgent,
    ExecutionAgent,
    ResearchAgent,
    RiskAgent,
    TimelineAgent,
    TradingStateMachine,
)

LOGGER = logging.getLogger(__name__)


def configure_logging(verbose: bool = False) -> None:
    """Configure root logging for CLI execution."""
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    )


def load_config(path: Path) -> dict[str, Any]:
    """Load YAML config when available, otherwise return empty config."""
    if not path.exists():
        LOGGER.info("Config file not found: %s", path)
        return {}

    try:
        import yaml  # type: ignore
    except ModuleNotFoundError:
        LOGGER.warning("pyyaml not installed; skipping config load")
        return {}

    try:
        payload = yaml.safe_load(path.read_text(encoding="utf-8"))
    except Exception:
        LOGGER.exception("Failed to parse config file: %s", path)
        return {}

    if isinstance(payload, dict):
        return payload
    return {}


def run_workflow(ticker: str, include_clues: bool, local_tz: str) -> dict[str, Any]:
    """Run end-to-end workflow across all core agents."""
    timeline_agent = TimelineAgent()
    research_agent = ResearchAgent()
    conviction_agent = ConvictionAgent()
    execution_agent = ExecutionAgent()
    risk_agent = RiskAgent()
    state_machine = TradingStateMachine()

    timeline_report = timeline_agent.build_timeline(ticker=ticker, include_clues=include_clues)
    research_report = research_agent.analyze(
        ticker=ticker,
        events=timeline_report.events,
        pending_checks=timeline_report.pending_checks,
    )
    conviction_report = conviction_agent.score(
        events=timeline_report.events,
        conflict_count=len(timeline_report.conflicts),
        pending_count=len(timeline_report.pending_checks),
    )
    execution_report = execution_agent.create_plan(
        ticker=ticker,
        conviction=conviction_report,
        thesis=research_report.thesis,
        events=timeline_report.events,
    )
    risk_report = risk_agent.assess(
        trade_plan=execution_report.trade_plan,
        events=timeline_report.events,
        conviction=conviction_report,
    )

    state_machine.update(conviction_score=conviction_report.score, has_position=False)
    has_position = execution_report.action in {"TRADE", "TRADE_SMALL"}
    final_state = state_machine.update(conviction_score=conviction_report.score, has_position=has_position)

    return {
        "ticker": ticker.upper(),
        "timeline": {
            "rows": TimelineAgent.to_table_rows(timeline_report, local_tz=local_tz),
            "pending_checks": timeline_report.pending_checks,
            "conflicts": [
                {
                    "event_type": conflict.event_type,
                    "date": conflict.date,
                    "candidate_event_ids": conflict.candidate_event_ids,
                    "chosen_event_id": conflict.chosen_event_id,
                    "reason": conflict.reason,
                }
                for conflict in timeline_report.conflicts
            ],
        },
        "research": {
            "thesis": research_report.thesis.to_dict(),
            "facts": research_report.facts,
            "must_verify": research_report.must_verify,
        },
        "conviction": {
            "score": conviction_report.score,
            "band": conviction_report.band,
            "breakdown": conviction_report.breakdown,
            "rationale": conviction_report.rationale,
        },
        "execution": {
            "action": execution_report.action,
            "note": execution_report.note,
            "trade_plan": execution_report.trade_plan.to_dict(),
        },
        "risk": {
            "risks": risk_report.risks,
            "hedges": risk_report.hedges,
            "max_position_pct": risk_report.max_position_pct,
            "stop_policy": risk_report.stop_policy,
            "forced_explanation_rule": risk_report.forced_explanation_rule,
        },
        "state": {
            "current": final_state.value,
            "history": state_machine.snapshot()["history"],
        },
    }


def print_text_report(result: dict[str, Any]) -> None:
    """Render workflow result in readable plain text format."""
    print(f"Ticker: {result['ticker']}")
    print(f"Conviction: {result['conviction']['score']} ({result['conviction']['band']})")
    print(f"Action: {result['execution']['action']}")
    print(f"State: {result['state']['current']}")

    print("\nTimeline:")
    for row in result["timeline"]["rows"][:10]:
        print(
            f"- {row['event']} | ET={row['et_time']} | Evidence={row['evidence']} | Source={row['source']}"
        )

    print("\nMust Verify:")
    for item in result["research"]["must_verify"]:
        print(f"- {item}")

    print("\nTrade Plan (Base Case):")
    base = result["execution"]["trade_plan"]["base_case"]
    print(
        "- Entry: {entry} | Position: {size:.0%} | Stop: {stop:.1%} | TP: {tp:.1%}".format(
            entry=base["entry_trigger"],
            size=base["position_size_pct"],
            stop=base["stop_loss_pct"],
            tp=base["take_profit_pct"],
        )
    )

    print("\nRisk:")
    for risk in result["risk"]["risks"]:
        print(f"- {risk}")
    for hedge in result["risk"]["hedges"]:
        print(f"- Hedge: {hedge}")


def build_arg_parser() -> argparse.ArgumentParser:
    """Build argument parser for CLI."""
    parser = argparse.ArgumentParser(description="Stock Stalker event-driven agent")
    parser.add_argument("--ticker", required=True, help="Stock ticker symbol, e.g. AAPL")
    parser.add_argument("--event", default="", help="Optional event hint (ER/8-K/etc)")
    parser.add_argument("--config", default="config/config.yaml", help="Path to config YAML")
    parser.add_argument("--local-tz", default="America/New_York", help="Output local timezone")
    parser.add_argument("--no-clues", action="store_true", help="Exclude C-tier news/social clues")
    parser.add_argument("--json", action="store_true", help="Print JSON output")
    parser.add_argument("--verbose", action="store_true", help="Enable debug logging")
    return parser


def main() -> int:
    """CLI main function."""
    parser = build_arg_parser()
    args = parser.parse_args()

    configure_logging(verbose=args.verbose)
    _ = load_config(Path(args.config))

    if args.event:
        LOGGER.info("Received event hint: %s", args.event)

    result = run_workflow(
        ticker=args.ticker,
        include_clues=not args.no_clues,
        local_tz=args.local_tz,
    )

    if args.json:
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        print_text_report(result)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
