"""Spec-Kit strategy - enterprise-grade, detailed technical specifications."""

from __future__ import annotations

from aimaker.strategy.base import BaseStrategy


class SpecKitStrategy(BaseStrategy):
    """Enterprise strategy with detailed specs and strict criteria."""

    def get_extraction_prompt(self) -> str:
        return """Use the Spec-Kit approach:
- Create detailed, RFC-style technical specifications for each task
- Include data flow descriptions (user action → API call → DB → response → UI update)
- Define strict acceptance criteria with edge cases and error scenarios
- Consider backward compatibility and migration paths
- Include error handling scenarios and rollback plans
- Define performance requirements where applicable
- Each task description must be self-contained — an engineer should implement it without asking questions
- IMPORTANT: You must also produce a "spec_document" field containing a full RFC-style Markdown document"""

    def get_task_format(self) -> str:
        return """Each task should have:
- id: Structured ID (BE-001, FE-001)
- title: Descriptive title
- description: Detailed technical specification including:
  - Problem statement
  - Proposed solution with specific implementation details
  - Data flow (step by step)
  - Error handling (what can go wrong, how to handle it)
  - Edge cases (empty states, concurrent access, invalid input)
- files_to_create: New files with purpose description
- files_to_modify: Existing files with what specific changes are needed
- acceptance_criteria: 5-7 testable conditions covering:
  - Happy path (normal operation)
  - Error cases (invalid input, network failure)
  - Edge cases (empty data, boundary values)
  - Security (input validation, authorization)"""
