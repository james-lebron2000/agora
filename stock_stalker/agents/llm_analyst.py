# agents/llm_analyst.py
"""LLM-powered analysis for investment thesis and event interpretation."""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from typing import Any

from models import Event, Thesis

LOGGER = logging.getLogger(__name__)


@dataclass(slots=True)
class LLMInsight:
    """Structured output from LLM analysis."""

    summary: str
    key_points: list[str]
    risk_factors: list[str]
    recommendation: str
    confidence: str  # "high", "medium", "low"
    raw_response: str = ""


class LLMAnalyst:
    """Analyze events and thesis using LLM (OpenAI/Claude/etc)."""

    def __init__(self, api_key: str | None = None, provider: str = "openai") -> None:
        """Initialize LLM analyst.
        
        Args:
            api_key: API key for LLM provider (loaded from config if not provided)
            provider: "openai", "anthropic", or "local"
        """
        self.api_key = api_key
        self.provider = provider
        self._client = None
        self._init_client()

    def _init_client(self) -> None:
        """Initialize LLM client based on provider."""
        if not self.api_key:
            LOGGER.warning("No API key provided, LLM analysis will use fallback mode")
            return

        try:
            if self.provider == "openai":
                import openai
                self._client = openai.OpenAI(api_key=self.api_key)
            elif self.provider == "anthropic":
                import anthropic
                self._client = anthropic.Anthropic(api_key=self.api_key)
            elif self.provider == "local":
                # For local LLM (e.g., Ollama)
                self._client = "local"
            else:
                LOGGER.warning("Unknown provider %s, using fallback", self.provider)
        except ImportError as e:
            LOGGER.warning("Failed to import %s client: %s", self.provider, e)
        except Exception as e:
            LOGGER.error("Failed to initialize LLM client: %s", e)

    def _build_prompt(self, ticker: str, events: list[Event], thesis: Thesis) -> str:
        """Build analysis prompt for LLM."""
        event_descriptions = []
        for i, event in enumerate(events[:5], 1):  # Top 5 events
            event_descriptions.append(
                f"{i}. {event.title} ({event.event_type.value})\n"
                f"   Time: {event.occurred_at}\n"
                f"   Evidence Level: {event.evidence_level.value}\n"
                f"   Details: {json.dumps(event.details, indent=2)}"
            )

        prompt = f"""You are a professional equity analyst specializing in event-driven trading. 
Analyze the following information for {ticker} and provide investment insights.

## EVENTS (Latest 5)
{chr(10).join(event_descriptions)}

## THESIS
Main Hypothesis: {thesis.main_hypothesis}

Falsification Conditions:
{chr(10).join(f"- {cond}" for cond in thesis.falsification_conditions)}

Win Paths:
{chr(10).join(f"- {path}" for path in thesis.win_paths)}

Loss Paths:
{chr(10).join(f"- {path}" for path in thesis.loss_paths)}

## VERIFICATION TASKS
{chr(10).join(f"- {task}" for task in thesis.verification_tasks)}

## OUTPUT FORMAT (JSON)
Provide your analysis in the following JSON format:
{{
    "summary": "One paragraph executive summary",
    "key_points": ["Point 1", "Point 2", "Point 3"],
    "risk_factors": ["Risk 1", "Risk 2"],
    "recommendation": "Buy/Hold/Sell/Wait with brief rationale",
    "confidence": "high/medium/low"
}}

Be concise and actionable. Focus on event catalysts and risk/reward."""

        return prompt

    def _call_openai(self, prompt: str) -> str:
        """Call OpenAI API."""
        if not self._client:
            raise RuntimeError("OpenAI client not initialized")

        try:
            response = self._client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are a professional equity analyst."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=1500,
            )
            return response.choices[0].message.content or ""
        except Exception as e:
            LOGGER.error("OpenAI API error: %s", e)
            raise

    def _call_anthropic(self, prompt: str) -> str:
        """Call Anthropic Claude API."""
        if not self._client:
            raise RuntimeError("Anthropic client not initialized")

        try:
            response = self._client.messages.create(
                model="claude-3-sonnet-20240229",
                max_tokens=1500,
                temperature=0.3,
                messages=[{"role": "user", "content": prompt}]
            )
            return response.content[0].text
        except Exception as e:
            LOGGER.error("Anthropic API error: %s", e)
            raise

    def _call_local(self, prompt: str) -> str:
        """Call local LLM (e.g., Ollama)."""
        import urllib.request
        import json as json_mod

        url = "http://localhost:11434/api/generate"
        data = {
            "model": "llama2",
            "prompt": prompt,
            "stream": False,
        }

        req = urllib.request.Request(
            url,
            data=json_mod.dumps(data).encode(),
            headers={"Content-Type": "application/json"}
        )

        with urllib.request.urlopen(req, timeout=120) as response:
            result = json_mod.loads(response.read().decode())
            return result.get("response", "")

    def _parse_response(self, response: str) -> LLMInsight:
        """Parse LLM response into structured insight."""
        try:
            # Try to extract JSON from response
            # Handle cases where LLM wraps JSON in markdown code blocks
            cleaned = response.strip()
            if "```json" in cleaned:
                cleaned = cleaned.split("```json")[1].split("```")[0].strip()
            elif "```" in cleaned:
                cleaned = cleaned.split("```")[1].split("```")[0].strip()

            data = json.loads(cleaned)

            return LLMInsight(
                summary=data.get("summary", "No summary provided"),
                key_points=data.get("key_points", []),
                risk_factors=data.get("risk_factors", []),
                recommendation=data.get("recommendation", "Hold"),
                confidence=data.get("confidence", "low"),
                raw_response=response,
            )
        except json.JSONDecodeError as e:
            LOGGER.warning("Failed to parse LLM JSON response: %s", e)
            # Fallback: return raw text as summary
            return LLMInsight(
                summary=response[:500] + "..." if len(response) > 500 else response,
                key_points=[],
                risk_factors=[],
                recommendation="Hold (parse error)",
                confidence="low",
                raw_response=response,
            )

    def analyze(self, ticker: str, events: list[Event], thesis: Thesis) -> LLMInsight:
        """Generate LLM analysis for ticker based on events and thesis."""
        if not self._client:
            LOGGER.warning("LLM client not initialized, using fallback analysis")
            return self._fallback_analysis(ticker, events, thesis)

        prompt = self._build_prompt(ticker, events, thesis)

        try:
            if self.provider == "openai":
                response = self._call_openai(prompt)
            elif self.provider == "anthropic":
                response = self._call_anthropic(prompt)
            elif self.provider == "local":
                response = self._call_local(prompt)
            else:
                raise ValueError(f"Unknown provider: {self.provider}")

            insight = self._parse_response(response)
            LOGGER.info("LLM analysis completed for %s (confidence: %s)", ticker, insight.confidence)
            return insight

        except Exception as e:
            LOGGER.error("LLM analysis failed for %s: %s", ticker, e)
            return self._fallback_analysis(ticker, events, thesis)

    def _fallback_analysis(self, ticker: str, events: list[Event], thesis: Thesis) -> LLMInsight:
        """Generate basic analysis without LLM (fallback mode)."""
        # Count event types
        event_types = {}
        for event in events:
            event_types[event.event_type.value] = event_types.get(event.event_type.value, 0) + 1

        # Simple logic-based recommendation
        has_earnings = any(e.event_type.value == "earnings_release" for e in events)
        high_evidence = sum(1 for e in events if e.evidence_level.value in ("A", "B"))

        if has_earnings and high_evidence >= 2:
            recommendation = "Cautious Buy (verify earnings catalyst)"
            confidence = "medium"
        elif high_evidence == 0:
            recommendation = "Wait (insufficient evidence)"
            confidence = "low"
        else:
            recommendation = "Hold (monitor developments)"
            confidence = "low"

        summary = (
            f"Found {len(events)} events for {ticker}. "
            f"Main catalyst: {thesis.main_hypothesis[:100]}... "
            f"High-quality evidence: {high_evidence}/{len(events)}. "
            f"Recommendation: {recommendation}."
        )

        return LLMInsight(
            summary=summary,
            key_points=[
                f"{count} {event_type} events" for event_type, count in event_types.items()
            ],
            risk_factors=thesis.falsification_conditions[:3],
            recommendation=recommendation,
            confidence=confidence,
            raw_response="Fallback analysis (LLM not available)",
        )


# Quick test function
def test_llm_analyst() -> None:
    """Test LLM analyst with sample data."""
    from datetime import datetime, timezone
    from models import EventType, EvidenceLevel, MarketSession

    analyst = LLMAnalyst(api_key=None)  # Fallback mode

    events = [
        Event(
            ticker="AAPL",
            event_type=EventType.EARNINGS_RELEASE,
            title="Q4 Earnings",
            occurred_at=datetime.now(timezone.utc),
            source_url="https://example.com",
            evidence_level=EvidenceLevel.B,
            market_session=MarketSession.POST_MARKET,
            importance=5,
        )
    ]

    thesis = Thesis(
        ticker="AAPL",
        main_hypothesis="Earnings beat will drive upside",
        falsification_conditions=["Revenue miss > 5%"],
        win_paths=["EPS beat with strong guidance"],
        loss_paths=["Weak iPhone sales"],
        verification_tasks=["Check iPhone revenue"],
    )

    insight = analyst.analyze("AAPL", events, thesis)
    print(f"Summary: {insight.summary}")
    print(f"Recommendation: {insight.recommendation}")


if __name__ == "__main__":
    test_llm_analyst()
