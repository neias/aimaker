"""GSD (Get Shit Done) strategy - pragmatic, minimal task extraction."""

from __future__ import annotations

from aimaker.strategy.base import BaseStrategy


class GSDStrategy(BaseStrategy):
    """Pragmatic strategy focused on speed and directness."""

    def get_extraction_prompt(self) -> str:
        return """Use the GSD (Get Shit Done) approach:
- Create minimal, actionable tasks
- Focus on the shortest path to a working solution
- Skip unnecessary documentation or ceremony
- Each task should be directly implementable
- Prefer modifying existing code over creating new abstractions"""

    def get_task_format(self) -> str:
        return """Each task should have:
- id: Short ID (BE-1, FE-1)
- title: What to do in 5-10 words
- description: Implementation instructions (2-3 sentences max)
- files_to_create: New files needed
- files_to_modify: Existing files to change
- acceptance_criteria: 1-3 testable conditions"""
