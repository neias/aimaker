"""Token/cost budget tracking and enforcement."""

from __future__ import annotations

import logging

logger = logging.getLogger("aimaker.safety.budget")


class BudgetExceededError(Exception):
    """Raised when token/cost budget is exceeded."""


def check_budget(state: dict) -> None:
    """Check if the remaining budget allows continuation.

    Raises BudgetExceededError if budget is exhausted.
    """
    remaining = state.get("budget_remaining_usd")
    if remaining is not None and remaining <= 0:
        raise BudgetExceededError(
            f"Budget exhausted. Remaining: ${remaining:.4f}"
        )


def deduct_cost(state: dict, cost_usd: float) -> dict:
    """Deduct cost from the remaining budget."""
    remaining = state.get("budget_remaining_usd")
    if remaining is not None:
        new_remaining = remaining - cost_usd
        logger.info(f"Budget: ${cost_usd:.4f} deducted, ${new_remaining:.4f} remaining")
        return {"budget_remaining_usd": new_remaining}
    return {}
