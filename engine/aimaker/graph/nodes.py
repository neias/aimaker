"""LangGraph node functions - each step in the pipeline."""

from __future__ import annotations

import logging
import subprocess

import httpx

from aimaker.agents.pm import PMAgent
from aimaker.agents.backend import BackendAgent
from aimaker.agents.frontend import FrontendAgent
from aimaker.agents.qa import QAAgent
from aimaker.events import publish_event
from aimaker.graph.state import PipelineState
from aimaker.safety.budget import BudgetExceededError, check_budget, deduct_cost
from aimaker.safety.checkpoint import create_checkpoint, rollback_to_checkpoint

logger = logging.getLogger("aimaker.nodes")


def _ids(state: PipelineState) -> tuple[str, str]:
    """Extract project_id and issue_id for event publishing."""
    return state.get("project_id", ""), state.get("issue_id", "")


async def analyze_issue(state: PipelineState) -> dict:
    """L1: PM Agent analyzes the issue and breaks it into tasks."""
    project_id, issue_id = _ids(state)
    logger.info(f"Analyzing issue: {state['issue_title']}")

    await publish_event(project_id, "issue:status_changed", {
        "old_status": "waiting",
        "new_status": "analyzing",
    }, issue_id=issue_id)

    agent = PMAgent()
    result = await agent.analyze(
        title=state["issue_title"],
        body=state.get("issue_body", ""),
        labels=state.get("labels", []),
        strategy=state.get("strategy", "gsd"),
        policies=state.get("policies", []),
    )

    backend_tasks = result.get("backend_tasks", [])
    frontend_tasks = result.get("frontend_tasks", [])

    # Publish task creation events
    for task in backend_tasks + frontend_tasks:
        await publish_event(project_id, "task:created", {
            "task_id": task.get("id"),
            "agent_role": task.get("agent_role"),
            "title": task.get("title"),
        }, issue_id=issue_id)

    await publish_event(project_id, "issue:status_changed", {
        "old_status": "analyzing",
        "new_status": "processing",
    }, issue_id=issue_id)

    # Save analysis to DB via NestJS API
    try:
        async with httpx.AsyncClient() as client:
            await client.post(
                f"http://localhost:3000/api/issues/{issue_id}/analysis",
                json={
                    "analysis": result.get("analysis", ""),
                    "sharedContract": result.get("shared_contract"),
                    "specDocument": result.get("spec_document"),
                },
                timeout=10,
            )
    except Exception as e:
        logger.warning(f"Failed to save analysis to API: {e}")

    return {
        "analysis": result.get("analysis"),
        "backend_tasks": backend_tasks,
        "frontend_tasks": frontend_tasks,
        "shared_contract": result.get("shared_contract"),
        "spec_document": result.get("spec_document"),
        "current_stage": "analyzed",
    }


async def execute_direct_task(state: PipelineState) -> dict:
    """Execute a single task directly - no PM analysis, send title+body straight to agent."""
    project_id, issue_id = _ids(state)
    title = state.get("issue_title", "")
    body = state.get("issue_body", "")
    logger.info(f"Direct task execution: {title}")

    await publish_event(project_id, "issue:status_changed", {
        "old_status": "waiting",
        "new_status": "processing",
    }, issue_id=issue_id)

    # Pick agent based on project type and available paths
    backend_path = state.get("backend_path", "")
    frontend_path = state.get("frontend_path", "")

    if frontend_path and not backend_path:
        agent = FrontendAgent(project_id=project_id, issue_id=issue_id)
        agent_role = "frontend"
        working_dir = frontend_path
    elif backend_path and not frontend_path:
        agent = BackendAgent(project_id=project_id, issue_id=issue_id)
        agent_role = "backend"
        working_dir = backend_path
    else:
        # Fullstack: default to backend agent with backend path
        agent = BackendAgent(project_id=project_id, issue_id=issue_id)
        agent_role = "backend"
        working_dir = backend_path or frontend_path

    await publish_event(project_id, "task:started", {
        "task_id": "direct",
        "agent_role": agent_role,
    }, issue_id=issue_id)

    result = await agent.execute(
        task={"id": "direct", "title": title, "description": body or title},
        working_dir=working_dir,
        shared_contract=None,
        policies=state.get("policies", []),
        review_issues=state.get("review_issues", []),
    )

    estimated_cost = result.get("duration_seconds", 0) * 0.001
    budget_update = deduct_cost(state, estimated_cost)

    event = "task:completed" if result.get("success") else "task:failed"
    await publish_event(project_id, event, {
        "task_id": "direct",
        "agent_role": agent_role,
        "duration_seconds": result.get("duration_seconds"),
        "error": result.get("error"),
    }, issue_id=issue_id)

    return {
        "backend_results": [result],
        "frontend_results": [],
        "current_stage": "task_done",
        **budget_update,
    }


async def create_git_branch(state: PipelineState) -> dict:
    """Create a feature branch for this issue."""
    issue_id = state["issue_id"][:8]
    slug = state["issue_title"][:40].lower().replace(" ", "-").replace("/", "-")
    branch_name = f"aimaker/{issue_id}-{slug}"

    for path in [state.get("backend_path"), state.get("frontend_path")]:
        if path:
            try:
                subprocess.run(
                    ["git", "checkout", "-b", branch_name],
                    cwd=path,
                    capture_output=True,
                    text=True,
                    check=True,
                )
            except subprocess.CalledProcessError:
                subprocess.run(
                    ["git", "checkout", branch_name],
                    cwd=path,
                    capture_output=True,
                    text=True,
                )

    return {"branch_name": branch_name, "current_stage": "branch_created"}


async def run_backend_tasks(state: PipelineState) -> dict:
    """L2: Backend Agent executes backend tasks sequentially."""
    project_id, issue_id = _ids(state)
    tasks = state.get("backend_tasks", [])
    logger.info(f"Running {len(tasks)} backend tasks")

    agent = BackendAgent()
    results = []
    budget_update = {}

    for task in tasks:
        try:
            check_budget(state)
        except BudgetExceededError as e:
            logger.warning(f"Budget exceeded during backend tasks: {e}")
            await publish_event(project_id, "budget:exceeded", {
                "used_usd": state.get("budget_remaining_usd", 0),
            }, issue_id=issue_id)
            break

        task_id = task.get("id", "unknown")
        await publish_event(project_id, "task:started", {
            "task_id": task_id,
            "agent_role": "backend",
        }, issue_id=issue_id)

        result = await agent.execute(
            task=task,
            working_dir=state.get("backend_path", ""),
            shared_contract=state.get("shared_contract"),
            policies=state.get("policies", []),
            review_issues=state.get("review_issues", []),
        )
        results.append(result)

        # Deduct estimated cost (rough estimate from duration)
        estimated_cost = result.get("duration_seconds", 0) * 0.001  # placeholder
        budget_update = deduct_cost(state, estimated_cost)

        event = "task:completed" if result.get("success") else "task:failed"
        await publish_event(project_id, event, {
            "task_id": task_id,
            "agent_role": "backend",
            "duration_seconds": result.get("duration_seconds"),
            "error": result.get("error"),
        }, issue_id=issue_id)

    return {"backend_results": results, "current_stage": "backend_done", **budget_update}


async def checkpoint_backend(state: PipelineState) -> dict:
    """Git commit after backend tasks complete."""
    project_id, issue_id = _ids(state)

    cp = create_checkpoint(
        repo_path=state.get("backend_path", ""),
        stage="post_backend",
        branch_name=state.get("branch_name"),
    )
    checkpoints = list(state.get("checkpoints", []))
    if cp:
        checkpoints.append(cp)
        await publish_event(project_id, "checkpoint:created", {
            "repo_side": cp["repo_side"],
            "commit_sha": cp["commit_sha"],
            "stage": cp["stage"],
        }, issue_id=issue_id)

    return {"checkpoints": checkpoints}


async def run_frontend_tasks(state: PipelineState) -> dict:
    """L2: Frontend Agent executes frontend tasks sequentially."""
    project_id, issue_id = _ids(state)
    tasks = state.get("frontend_tasks", [])
    logger.info(f"Running {len(tasks)} frontend tasks")

    agent = FrontendAgent()
    results = []
    budget_update = {}

    for task in tasks:
        try:
            check_budget(state)
        except BudgetExceededError as e:
            logger.warning(f"Budget exceeded during frontend tasks: {e}")
            await publish_event(project_id, "budget:exceeded", {
                "used_usd": state.get("budget_remaining_usd", 0),
            }, issue_id=issue_id)
            break

        task_id = task.get("id", "unknown")
        await publish_event(project_id, "task:started", {
            "task_id": task_id,
            "agent_role": "frontend",
        }, issue_id=issue_id)

        result = await agent.execute(
            task=task,
            working_dir=state.get("frontend_path", ""),
            shared_contract=state.get("shared_contract"),
            policies=state.get("policies", []),
        )
        results.append(result)

        estimated_cost = result.get("duration_seconds", 0) * 0.001
        budget_update = deduct_cost(state, estimated_cost)

        event = "task:completed" if result.get("success") else "task:failed"
        await publish_event(project_id, event, {
            "task_id": task_id,
            "agent_role": "frontend",
            "duration_seconds": result.get("duration_seconds"),
            "error": result.get("error"),
        }, issue_id=issue_id)

    return {"frontend_results": results, "current_stage": "frontend_done", **budget_update}


async def checkpoint_frontend(state: PipelineState) -> dict:
    """Git commit after frontend tasks complete."""
    project_id, issue_id = _ids(state)

    cp = create_checkpoint(
        repo_path=state.get("frontend_path", ""),
        stage="post_frontend",
        branch_name=state.get("branch_name"),
    )
    checkpoints = list(state.get("checkpoints", []))
    if cp:
        checkpoints.append(cp)
        await publish_event(project_id, "checkpoint:created", {
            "repo_side": cp["repo_side"],
            "commit_sha": cp["commit_sha"],
            "stage": cp["stage"],
        }, issue_id=issue_id)

    return {"checkpoints": checkpoints}


async def run_qa(state: PipelineState) -> dict:
    """L3: QA Agent reviews and tests the code."""
    project_id, issue_id = _ids(state)
    logger.info("Running QA review")

    await publish_event(project_id, "issue:status_changed", {
        "old_status": "processing",
        "new_status": "testing",
    }, issue_id=issue_id)

    agent = QAAgent()
    result = await agent.review(
        backend_path=state.get("backend_path", ""),
        frontend_path=state.get("frontend_path", ""),
        backend_results=state.get("backend_results", []),
        frontend_results=state.get("frontend_results", []),
        shared_contract=state.get("shared_contract"),
        policies=state.get("policies", []),
        strategy=state.get("strategy", "gsd"),
    )

    verdict = result.get("verdict", "FAIL")
    await publish_event(project_id, "qa:verdict", {
        "verdict": verdict,
        "issues_count": len(result.get("issues", [])),
        "test_results": result.get("test_results"),
    }, issue_id=issue_id)

    return {
        "test_results": result.get("test_results"),
        "review_verdict": verdict,
        "review_issues": result.get("issues", []),
        "current_stage": "qa_done",
    }


async def commit_and_close(state: PipelineState) -> dict:
    """Final commit and mark issue as done."""
    project_id, issue_id = _ids(state)
    logger.info(f"Issue {issue_id} passed QA - committing final state")

    create_checkpoint(
        repo_path=state.get("backend_path", ""),
        stage="final",
        branch_name=state.get("branch_name"),
    )
    create_checkpoint(
        repo_path=state.get("frontend_path", ""),
        stage="final",
        branch_name=state.get("branch_name"),
    )

    await publish_event(project_id, "issue:status_changed", {
        "old_status": "testing",
        "new_status": "done",
    }, issue_id=issue_id)

    return {"current_stage": "done"}


async def handle_rollback(state: PipelineState) -> dict:
    """Rollback to last checkpoint and prepare for retry."""
    project_id, issue_id = _ids(state)
    iteration = state.get("iteration", 0) + 1
    logger.warning(f"QA failed, rolling back (iteration {iteration})")

    for cp in reversed(state.get("checkpoints", [])):
        path = (
            state.get("backend_path")
            if cp["repo_side"] == "backend"
            else state.get("frontend_path")
        )
        if path:
            rollback_to_checkpoint(path, cp["commit_sha"])
            await publish_event(project_id, "checkpoint:rollback", {
                "repo_side": cp["repo_side"],
                "target_sha": cp["commit_sha"],
            }, issue_id=issue_id)

    return {
        "iteration": iteration,
        "current_stage": "retrying",
    }


async def mark_human_required(state: PipelineState) -> dict:
    """Mark issue as requiring human intervention."""
    project_id, issue_id = _ids(state)
    max_iter = state.get("max_iterations", 3)
    logger.error(f"Issue {issue_id} exceeded max iterations ({max_iter})")

    await publish_event(project_id, "issue:status_changed", {
        "old_status": "testing",
        "new_status": "human_required",
    }, issue_id=issue_id)

    return {
        "current_stage": "human_required",
        "error": f"Max iterations ({max_iter}) exceeded. "
                 f"QA issues: {state.get('review_issues', [])}",
    }
