"""Model tier routing - selects the right model for each agent role."""

from __future__ import annotations

from dataclasses import dataclass

from aimaker.config import settings


@dataclass
class ModelConfig:
    name: str
    max_turns: int
    timeout: int
    max_budget_usd: float | None


# Default tier mapping
TIER_MODELS = {
    "L1": lambda: ModelConfig(
        name=settings.model_l1,
        max_turns=10,
        timeout=300,
        max_budget_usd=0.50,
    ),
    "L2": lambda: ModelConfig(
        name=settings.model_l2,
        max_turns=25,
        timeout=600,
        max_budget_usd=2.00,
    ),
    "L3": lambda: ModelConfig(
        name=settings.model_l3,
        max_turns=15,
        timeout=600,
        max_budget_usd=0.50,
    ),
}

AGENT_TIER: dict[str, str] = {
    "pm": "L1",
    "backend": "L2",
    "frontend": "L2",
    "qa": "L3",
}


def get_model_config(agent_role: str, overrides: dict | None = None) -> ModelConfig:
    """Get model config for an agent role, with optional per-project overrides."""
    tier = AGENT_TIER.get(agent_role, "L2")

    if overrides and agent_role in overrides:
        custom = overrides[agent_role]
        return ModelConfig(
            name=custom.get("model", TIER_MODELS[tier]().name),
            max_turns=custom.get("max_turns", TIER_MODELS[tier]().max_turns),
            timeout=custom.get("timeout", TIER_MODELS[tier]().timeout),
            max_budget_usd=custom.get("max_budget_usd", TIER_MODELS[tier]().max_budget_usd),
        )

    return TIER_MODELS[tier]()
