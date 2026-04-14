"""PM (Project Manager) Agent - analyzes issues and creates task breakdown."""

from __future__ import annotations

import logging

from aimaker.agents.base import BaseAgent
from aimaker.strategy.gsd import GSDStrategy
from aimaker.strategy.spec_kit import SpecKitStrategy

logger = logging.getLogger("aimaker.agents.pm")

STRATEGIES = {
    "gsd": GSDStrategy,
    "spec_kit": SpecKitStrategy,
}


class PMAgent(BaseAgent):
    role = "pm"

    async def analyze(
        self,
        title: str,
        body: str,
        labels: list[str],
        strategy: str = "gsd",
        policies: list[str] | None = None,
    ) -> dict:
        """Analyze an issue and produce task breakdown."""
        system_prompt = self._load_system_prompt()
        system_prompt = self._inject_policies(system_prompt, policies or [])

        strategy_cls = STRATEGIES.get(strategy, GSDStrategy)()
        strategy_prompt = strategy_cls.get_extraction_prompt()
        task_format = strategy_cls.get_task_format()

        spec_section = ""
        if strategy == "spec_kit":
            spec_section = """
- "spec_document": A detailed RFC-style technical specification document in Markdown format containing:
  ## 1. Problem Statement
  What problem does this issue solve? What is the current behavior vs desired behavior?

  ## 2. Proposed Solution
  High-level description of the approach.

  ## 3. Technical Design
  ### 3.1 Data Model Changes
  Database/schema changes needed.
  ### 3.2 API Design
  New or modified endpoints with request/response schemas.
  ### 3.3 Frontend Changes
  Component hierarchy, state management, user flows.
  ### 3.4 Data Flow
  How data moves through the system from user action to persistence and back.

  ## 4. Error Handling
  Edge cases, error states, fallback behaviors.

  ## 5. Security Considerations
  Input validation, authorization, data exposure risks.

  ## 6. Testing Strategy
  What should be tested: unit tests, integration tests, edge cases.

  ## 7. Migration & Rollback
  How to deploy safely and roll back if needed.
"""

        prompt = f"""Analyze the following GitHub issue and create a task breakdown.

## Issue
**Title:** {title}
**Labels:** {', '.join(labels) if labels else 'none'}
**Body:**
{body or 'No description provided.'}

## Strategy Instructions
{strategy_prompt}

## Task Format
{task_format}

## Required Output
Respond with a JSON object containing:
- "analysis": brief analysis of what needs to be done (2-3 sentences for GSD, detailed paragraph for Spec-Kit)
- "shared_contract": API contract between backend and frontend with "api_endpoints" (method, path, request_body, response_body) and "types" (name, fields)
- "backend_tasks": list of backend tasks following the format above, each with agent_role="backend"
- "frontend_tasks": list of frontend tasks following the format above, each with agent_role="frontend"
{spec_section}
Output ONLY the JSON, wrapped in ```json``` markers."""

        result = self.runner.run(
            prompt=prompt,
            system_prompt=system_prompt,
            max_turns=self.model_config.max_turns,
            timeout=self.model_config.timeout,
        )

        if result.success and result.parsed_json:
            return result.parsed_json

        logger.error(f"PM analysis failed: {result.error or 'No JSON output'}")
        return {
            "analysis": "Analysis failed",
            "backend_tasks": [],
            "frontend_tasks": [],
            "shared_contract": None,
            "spec_document": None,
        }
