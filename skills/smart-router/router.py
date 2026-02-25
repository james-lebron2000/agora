#!/usr/bin/env python3
"""
Smart Router Skill for OpenClaw
Implements Kevin Simback's cost optimization principles
Routes tasks to appropriate models based on complexity
"""

import re
from typing import Optional

class SmartRouter:
    """
    Routes user requests to optimal LLM models
    Balances cost vs quality based on task characteristics
    """
    
    # Model definitions with costs (per 1M tokens, Feb 2026)
    MODELS = {
        "haiku": {
            "id": "anthropic/claude-3-haiku-20240307",
            "cost_input": 0.25,
            "cost_output": 1.25,
            "best_for": ["heartbeat", "simple_qa", "routine_checks"]
        },
        "gemini_flash": {
            "id": "google/gemini-2.5-flash",
            "cost_input": 0.15,
            "cost_output": 0.60,
            "best_for": ["summarization", "document_processing", "batch_tasks"]
        },
        "kimi_k25": {
            "id": "moonshot/kimi-k2.5",
            "cost_input": 0.50,
            "cost_output": 2.00,
            "best_for": ["general_tasks", "chinese_content", "long_context"]
        },
        "gpt_turbo": {
            "id": "openai/gpt-5.2-turbo",
            "cost_input": 1.00,
            "cost_output": 3.00,
            "best_for": ["code_generation", "structured_output", "api_design"]
        },
        "opus": {
            "id": "anthropic/claude-opus-4.6",
            "cost_input": 5.00,
            "cost_output": 25.00,
            "best_for": ["complex_reasoning", "architecture", "critical_decisions"]
        }
    }
    
    # Task classification patterns
    PATTERNS = {
        "simple": [
            r'\b(hello|hi|hey)\b',
            r'\b(status|check|ping)\b',
            r'\b(what time|what day)\b',
            r'\b(heartbeat|poll)\b',
        ],
        "code": [
            r'\b(code|script|function|class|api)\b',
            r'\b(debug|fix|error|bug)\b',
            r'\b(typescript|python|javascript|rust)\b',
            r'\b(generate|write|implement)\b.*\b(code|script)\b',
        ],
        "complex": [
            r'\b(architecture|design|strategy)\b',
            r'\b(optimize|refactor|redesign)\b',
            r'\b(critical|important|production)\b',
            r'\b(deep|thorough|comprehensive)\b',
        ],
        "emotional": [
            r'\b(feel|emotion|sad|happy|worried)\b',
            r'\b(help me|support|advice)\b.*\b(stress|anxiety|problem)\b',
        ]
    }
    
    def classify_task(self, prompt: str) -> tuple[str, float]:
        """
        Classify task complexity and return recommended model + estimated cost
        """
        prompt_lower = prompt.lower()
        
        # Check for code tasks
        if any(re.search(pattern, prompt_lower) for pattern in self.PATTERNS["code"]):
            if any(re.search(pattern, prompt_lower) for pattern in self.PATTERNS["complex"]):
                return "opus", 0.50  # Complex code needs Opus
            return "gpt_turbo", 0.15  # Routine code uses GPT
        
        # Check for complex reasoning
        if any(re.search(pattern, prompt_lower) for pattern in self.PATTERNS["complex"]):
            return "opus", 0.50
        
        # Check for emotional/sensitive content
        if any(re.search(pattern, prompt_lower) for pattern in self.PATTERNS["emotional"]):
            return "kimi_k25", 0.10  # Nuanced understanding
        
        # Check for simple tasks
        if any(re.search(pattern, prompt_lower) for pattern in self.PATTERNS["simple"]):
            return "gemini_flash", 0.02  # Cheapest for simple stuff
        
        # Default: balanced model
        return "kimi_k25", 0.10
    
    def should_confirm(self, model: str, prompt: str) -> bool:
        """
        Determine if user confirmation needed before expensive operation
        """
        expensive_models = ["opus"]
        long_indicators = ["analyze all", "process every", "scan entire", "generate 100"]
        
        if model in expensive_models:
            return True
        
        if any(indicator in prompt.lower() for indicator in long_indicators):
            return True
        
        return False
    
    def route(self, prompt: str, current_model: str = "kimi") -> dict:
        """
        Main routing logic
        Returns routing decision with explanation
        """
        recommended_model, estimated_cost = self.classify_task(prompt)
        
        # If already on optimal model, stay
        if recommended_model == current_model:
            return {
                "action": "stay",
                "model": current_model,
                "reason": f"Current model is optimal for this task",
                "estimated_cost": f"${estimated_cost:.2f}"
            }
        
        # Check if confirmation needed
        needs_confirm = self.should_confirm(recommended_model, prompt)
        
        return {
            "action": "suggest_switch" if needs_confirm else "auto_switch",
            "current_model": current_model,
            "recommended_model": recommended_model,
            "model_id": self.MODELS[recommended_model]["id"],
            "reason": self._get_reason(recommended_model),
            "estimated_cost": f"${estimated_cost:.2f}",
            "needs_confirmation": needs_confirm,
            "savings_vs_opus": f"{self._calculate_savings(recommended_model):.0f}%"
        }
    
    def _get_reason(self, model: str) -> str:
        """Human-readable explanation for model choice"""
        reasons = {
            "haiku": "Fast and cheap for routine checks",
            "gemini_flash": "Efficient for summarization and batch processing",
            "kimi_k25": "Balanced quality and cost for general tasks",
            "gpt_turbo": "Optimized for code generation and structured output",
            "opus": "Maximum capability for complex reasoning and critical decisions"
        }
        return reasons.get(model, "General purpose")
    
    def _calculate_savings(self, model: str) -> float:
        """Calculate cost savings vs using Opus for everything"""
        opus_cost = 5.00  # Input cost per 1M
        model_cost = self.MODELS[model]["cost_input"]
        return (1 - model_cost / opus_cost) * 100


# Usage example for OpenClaw integration
def get_routing_decision(user_prompt: str) -> str:
    """
    Returns routing recommendation as formatted text
    """
    router = SmartRouter()
    decision = router.route(user_prompt)
    
    if decision["action"] == "stay":
        return f"✓ Using optimal model ({decision['model']}). Estimated cost: {decision['estimated_cost']}"
    
    if decision["needs_confirmation"]:
        return f"💡 This task would benefit from {decision['recommended_model'].upper()} ({decision['reason']}).\n   Estimated cost: {decision['estimated_cost']} (saves {decision['savings_vs_opus']} vs Opus)\n   Switch? (Reply 'yes' to upgrade)"
    
    return f"⚡ Auto-switched to {decision['recommended_model'].upper()} for {decision['reason']}.\n   Cost: {decision['estimated_cost']} ({decision['savings_vs_opus']} savings)"


# If run directly, test routing
if __name__ == "__main__":
    test_prompts = [
        "Check heartbeat status",
        "Generate a Python function to parse JSON",
        "Design the overall architecture for a distributed system",
        "Summarize this document",
        "I'm feeling stressed about my project"
    ]
    
    router = SmartRouter()
    for prompt in test_prompts:
        decision = router.route(prompt)
        print(f"\nPrompt: {prompt}")
        print(f"→ Route to: {decision['recommended_model']}")
        print(f"→ Reason: {decision['reason']}")
        print(f"→ Savings: {decision['savings_vs_opus']}")
