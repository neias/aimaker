"""QA Agent - reviews code, runs tests, produces verdict."""

from __future__ import annotations

import json
import logging

from aimaker.agents.base import BaseAgent

logger = logging.getLogger("aimaker.agents.qa")

GSD_REVIEW_INSTRUCTIONS = """## Review Mode: GSD (Pragmatic)
Focus on:
1. Does the code work? Run it or test it.
2. Any obvious bugs or crashes?
3. Does the API match the shared contract?
4. Basic security (no hardcoded secrets, SQL injection, XSS)

Be pragmatic — minor style issues are NOT failures. Only FAIL for real bugs or broken functionality."""

SPEC_KIT_REVIEW_INSTRUCTIONS = """## Review Mode: Spec-Kit (Strict)
You must check ALL of the following:

### Functional Correctness
1. Does every acceptance criteria from the task pass?
2. Does the implementation match the shared contract exactly (endpoints, types, status codes)?
3. Do all happy path scenarios work?

### Error Handling
4. Are all error cases handled? (invalid input, missing data, network failures)
5. Are appropriate HTTP status codes returned?
6. Are error messages user-friendly and not leaking internals?

### Edge Cases
7. Empty states (no data, empty arrays, null values)
8. Boundary values (max length, zero, negative numbers)
9. Concurrent access considerations

### Security
10. Input validation on ALL user inputs (Zod, class-validator, etc.)
11. No SQL injection, XSS, or command injection vulnerabilities
12. Authorization checks where needed
13. No hardcoded secrets or sensitive data in code

### Code Quality
14. Follows existing patterns in the codebase
15. No unused imports, dead code, or TODO comments left behind
16. Types are properly defined (no `any` unless justified)

FAIL if ANY of items 1-13 are violated. PASS_WITH_WARNINGS only for items 14-16."""


class QAAgent(BaseAgent):
    role = "qa"

    async def review(
        self,
        backend_path: str,
        frontend_path: str,
        backend_results: list[dict],
        frontend_results: list[dict],
        shared_contract: dict | None = None,
        policies: list[str] | None = None,
        strategy: str = "gsd",
    ) -> dict:
        """Review implemented code and run tests."""
        system_prompt = self._load_system_prompt()
        system_prompt = self._inject_policies(system_prompt, policies or [])

        review_instructions = (
            SPEC_KIT_REVIEW_INSTRUCTIONS if strategy == "spec_kit"
            else GSD_REVIEW_INSTRUCTIONS
        )

        summary = {
            "backend_tasks": len(backend_results),
            "backend_successful": sum(1 for r in backend_results if r.get("success")),
            "frontend_tasks": len(frontend_results),
            "frontend_successful": sum(1 for r in frontend_results if r.get("success")),
        }

        prompt = f"""Review the code changes made by backend and frontend agents.

{review_instructions}

## Task Summary
{json.dumps(summary, indent=2)}

## Shared Contract
{json.dumps(shared_contract, indent=2) if shared_contract else 'No contract defined.'}

## Instructions
1. Read the changed/created files in the working directory
2. Run any existing tests (npm test, pytest, etc.)
3. Check the implementation against the shared contract
4. Apply the review checklist above

Respond with a JSON object:
- "verdict": "PASS" | "FAIL" | "PASS_WITH_WARNINGS"
- "issues": list of objects with "severity" (error/warning/info), "file", "line" (optional), "description", "checklist_item" (which review item failed)
- "test_results": object with "passed", "failed", "skipped" counts
- "summary": 2-3 sentence overall assessment

Output ONLY the JSON, wrapped in ```json``` markers."""

        result = self.runner.run(
            prompt=prompt,
            system_prompt=system_prompt,
            working_dir=backend_path or frontend_path,
            max_turns=self.model_config.max_turns,
            allowed_tools=["Read", "Glob", "Grep", "Bash"],
            timeout=self.model_config.timeout,
        )

        if result.success and result.parsed_json:
            return result.parsed_json

        logger.error(f"QA review failed: {result.error or 'No JSON output'}")
        return {
            "verdict": "FAIL",
            "issues": [{"severity": "error", "file": "", "description": "QA review failed to produce results"}],
            "test_results": {"passed": 0, "failed": 0, "skipped": 0},
            "summary": "QA agent failed to complete review.",
        }
