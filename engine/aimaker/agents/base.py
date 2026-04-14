"""Base agent class - all agents inherit from this."""

from __future__ import annotations

import logging
from abc import ABC
from pathlib import Path

from aimaker.graph.router import get_model_config
from aimaker.runner.claude_runner import ClaudeRunner

logger = logging.getLogger("aimaker.agents")


class BaseAgent(ABC):
    """Base class for all AI agents."""

    role: str = "base"
    prompts_dir: Path = Path(__file__).parent / "prompts"

    def __init__(
        self,
        model_overrides: dict | None = None,
        project_id: str | None = None,
        issue_id: str | None = None,
        milestone_id: str | None = None,
    ):
        self.model_config = get_model_config(self.role, model_overrides)
        self.runner = ClaudeRunner(
            model=self.model_config.name,
            max_budget_per_task=self.model_config.max_budget_usd,
            project_id=project_id,
            issue_id=issue_id,
            milestone_id=milestone_id,
        )

    def _load_system_prompt(self) -> str:
        """Load the system prompt template for this agent."""
        prompt_file = self.prompts_dir / f"{self.role}.md"
        if prompt_file.exists():
            return prompt_file.read_text(encoding="utf-8")
        return ""

    def _inject_policies(self, system_prompt: str, policies: list[str]) -> str:
        """Inject project policies into the system prompt."""
        if not policies:
            return system_prompt
        rules = "\n".join(f"- {p}" for p in policies)
        return f"{system_prompt}\n\n## Project Rules (MUST follow)\n{rules}"
