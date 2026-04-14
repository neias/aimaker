"""LangGraph pipeline state definition."""

from __future__ import annotations

from typing import Literal, TypedDict


class Checkpoint(TypedDict):
    repo_side: Literal["backend", "frontend"]
    commit_sha: str
    stage: str


class TaskSpec(TypedDict):
    id: str
    title: str
    description: str
    files_to_create: list[str]
    files_to_modify: list[str]
    acceptance_criteria: list[str]
    agent_role: str


class PipelineState(TypedDict, total=False):
    # Input
    issue_id: str
    project_id: str
    issue_title: str
    issue_body: str
    labels: list[str]
    priority: str
    strategy: Literal["gsd", "spec_kit"]
    policies: list[str]
    backend_path: str
    frontend_path: str
    base_branch: str

    # PM Agent output
    analysis: dict | None
    backend_tasks: list[TaskSpec]
    frontend_tasks: list[TaskSpec]
    shared_contract: dict | None
    spec_document: str | None

    # Worker outputs
    backend_results: list[dict]
    frontend_results: list[dict]

    # QA output
    test_results: dict | None
    review_verdict: str | None  # PASS | FAIL | PASS_WITH_WARNINGS
    review_issues: list[dict]

    # Control flow
    current_stage: str
    iteration: int
    max_iterations: int
    budget_remaining_usd: float
    error: str | None

    # Git
    branch_name: str | None
    checkpoints: list[Checkpoint]
