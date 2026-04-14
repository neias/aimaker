"""Backend Agent - implements API, DB schema, business logic."""

from __future__ import annotations

import json
import logging

from aimaker.agents.base import BaseAgent

logger = logging.getLogger("aimaker.agents.backend")


class BackendAgent(BaseAgent):
    role = "backend"

    async def execute(
        self,
        task: dict,
        working_dir: str,
        shared_contract: dict | None = None,
        policies: list[str] | None = None,
        review_issues: list[dict] | None = None,
    ) -> dict:
        """Execute a backend task."""
        system_prompt = self._load_system_prompt()
        system_prompt = self._inject_policies(system_prompt, policies or [])

        prompt_parts = [f"Implement the following backend task:\n\n{json.dumps(task, indent=2)}"]

        if shared_contract:
            prompt_parts.append(
                f"\n\n## Shared API Contract\n```json\n{json.dumps(shared_contract, indent=2)}\n```"
            )

        if review_issues:
            issues_text = "\n".join(f"- {i.get('description', str(i))}" for i in review_issues)
            prompt_parts.append(
                f"\n\n## Previous QA Issues (FIX THESE)\n{issues_text}"
            )

        result = self.runner.run(
            prompt="\n".join(prompt_parts),
            system_prompt=system_prompt,
            working_dir=working_dir,
            max_turns=self.model_config.max_turns,
            allowed_tools=["Read", "Write", "Edit", "Bash", "Glob", "Grep"],
            timeout=self.model_config.timeout,
        )

        return {
            "task_id": task.get("id"),
            "success": result.success,
            "output": result.output[:2000],
            "error": result.error,
            "duration_seconds": result.duration_seconds,
        }
