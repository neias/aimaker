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

PROJECT_TYPE_INSTRUCTIONS = {
    "frontend": """## Project Type: Frontend Only
This is a frontend-only project. Do NOT create any backend tasks.
- All tasks must have agent_role="frontend"
- "backend_tasks" must be an empty array []
- "shared_contract" should be null (no API to define)
- Focus on UI components, state management, styling, and client-side logic.""",

    "backend": """## Project Type: Backend Only
This is a backend-only project. Do NOT create any frontend tasks.
- All tasks must have agent_role="backend"
- "frontend_tasks" must be an empty array []
- Focus on API endpoints, database schemas, business logic, and server-side code.""",

    "fullstack": """## Project Type: Fullstack
This project has both backend and frontend.
- Create tasks for both backend and frontend agents
- Define a "shared_contract" with API endpoints and types for communication between them
- Backend tasks should be ordered before frontend tasks (frontend depends on API).""",
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
        project_type: str = "fullstack",
        project_description: str = "",
        codebase_context: str = "",
    ) -> dict:
        """Analyze an issue and produce task breakdown."""
        system_prompt = self._load_system_prompt()
        system_prompt = self._inject_policies(system_prompt, policies or [])

        strategy_cls = STRATEGIES.get(strategy, GSDStrategy)()
        strategy_prompt = strategy_cls.get_extraction_prompt()
        task_format = strategy_cls.get_task_format()

        type_instructions = PROJECT_TYPE_INSTRUCTIONS.get(project_type, PROJECT_TYPE_INSTRUCTIONS["fullstack"])

        project_context = ""
        if project_description:
            project_context = f"""## Project Context
{project_description}
"""

        spec_section = ""
        if strategy == "spec_kit":
            # Adapt spec sections based on project type
            design_sections = ""
            if project_type in ("backend", "fullstack"):
                design_sections += """
  ### Data Model Changes
  Database/schema changes needed.
  ### API Design
  New or modified endpoints with request/response schemas."""
            if project_type in ("frontend", "fullstack"):
                design_sections += """
  ### Frontend Changes
  Component hierarchy, state management, user flows."""
            if project_type == "fullstack":
                design_sections += """
  ### Data Flow
  How data moves through the system from user action to persistence and back."""

            spec_section = f"""
- "spec_document": A detailed RFC-style technical specification document in Markdown format containing:
  ## 1. Problem Statement
  What problem does this solve? Current vs desired behavior.

  ## 2. Proposed Solution
  High-level description of the approach.

  ## 3. Technical Design
{design_sections}

  ## 4. Error Handling
  Edge cases, error states, fallback behaviors.

  ## 5. Security Considerations
  Input validation, authorization, data exposure risks.

  ## 6. Testing Strategy
  What should be tested and how.
"""

        # Build output format based on project type
        if project_type == "frontend":
            output_fields = """- "analysis": what needs to be done
- "frontend_tasks": list of frontend tasks, each with agent_role="frontend"
- "backend_tasks": [] (empty, frontend-only project)
- "shared_contract": null"""
        elif project_type == "backend":
            output_fields = """- "analysis": what needs to be done
- "backend_tasks": list of backend tasks, each with agent_role="backend"
- "frontend_tasks": [] (empty, backend-only project)
- "shared_contract": null"""
        else:
            output_fields = """- "analysis": what needs to be done
- "shared_contract": API contract with "api_endpoints" (method, path, request_body, response_body) and "types" (name, fields)
- "backend_tasks": list of backend tasks, each with agent_role="backend"
- "frontend_tasks": list of frontend tasks, each with agent_role="frontend" """

        codebase_section = ""
        if codebase_context:
            codebase_section = f"""{codebase_context}

IMPORTANT: The project already has existing code. You MUST:
- Review the file structure and tech stack above before creating tasks
- Create tasks that work WITH the existing codebase, not from scratch
- Reference existing files in files_to_modify (not files_to_create) when they already exist
- Follow the patterns, conventions, and dependencies already in use
- Do NOT suggest installing packages that are already in package.json/requirements.txt
"""

        prompt = f"""Analyze the following and create a task breakdown.

{project_context}
{codebase_section}
{type_instructions}

## Milestone / Issue
**Title:** {title}
**Labels:** {', '.join(labels) if labels else 'none'}
**Description:**
{body or 'No description provided.'}

## Strategy Instructions
{strategy_prompt}

## Task Format
{task_format}

## Required Output
Respond with a JSON object containing:
{output_fields}
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
