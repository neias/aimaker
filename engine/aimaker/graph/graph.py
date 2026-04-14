"""LangGraph state machine definitions for issue processing pipelines."""

from __future__ import annotations

from langgraph.graph import END, StateGraph

from aimaker.graph.state import PipelineState
from aimaker.graph.nodes import (
    analyze_issue,
    execute_direct_task,
    create_git_branch,
    run_backend_tasks,
    checkpoint_backend,
    run_frontend_tasks,
    checkpoint_frontend,
    run_qa,
    commit_and_close,
    handle_rollback,
    mark_human_required,
)


def route_qa_verdict(state: PipelineState) -> str:
    """Route based on QA verdict."""
    verdict = state.get("review_verdict", "FAIL")
    if verdict in ("PASS", "PASS_WITH_WARNINGS"):
        return "commit_and_close"
    return "handle_rollback"


def build_full_pipeline() -> StateGraph:
    """Full pipeline with PM analysis (used by milestones internally, kept for compatibility)."""
    graph = StateGraph(PipelineState)

    graph.add_node("analyze_issue", analyze_issue)
    graph.add_node("create_git_branch", create_git_branch)
    graph.add_node("run_backend_tasks", run_backend_tasks)
    graph.add_node("checkpoint_backend", checkpoint_backend)
    graph.add_node("run_frontend_tasks", run_frontend_tasks)
    graph.add_node("checkpoint_frontend", checkpoint_frontend)
    graph.add_node("run_qa", run_qa)
    graph.add_node("commit_and_close", commit_and_close)
    graph.add_node("handle_rollback", handle_rollback)
    graph.add_node("mark_human_required", mark_human_required)

    graph.set_entry_point("analyze_issue")
    graph.add_edge("analyze_issue", "create_git_branch")
    graph.add_edge("create_git_branch", "run_backend_tasks")
    graph.add_edge("run_backend_tasks", "checkpoint_backend")
    graph.add_edge("checkpoint_backend", "run_frontend_tasks")
    graph.add_edge("run_frontend_tasks", "checkpoint_frontend")
    graph.add_edge("checkpoint_frontend", "run_qa")

    graph.add_conditional_edges(
        "run_qa",
        route_qa_verdict,
        {"commit_and_close": "commit_and_close", "handle_rollback": "handle_rollback"},
    )

    graph.add_conditional_edges(
        "handle_rollback",
        lambda state: (
            "mark_human_required"
            if state.get("iteration", 0) >= state.get("max_iterations", 3)
            else "run_backend_tasks"
        ),
        {"mark_human_required": "mark_human_required", "run_backend_tasks": "run_backend_tasks"},
    )

    graph.add_edge("commit_and_close", END)
    graph.add_edge("mark_human_required", END)

    return graph


def build_direct_pipeline() -> StateGraph:
    """Direct task pipeline - no PM analysis, sends task straight to agent."""
    graph = StateGraph(PipelineState)

    graph.add_node("create_git_branch", create_git_branch)
    graph.add_node("execute_direct_task", execute_direct_task)
    graph.add_node("run_qa", run_qa)
    graph.add_node("commit_and_close", commit_and_close)
    graph.add_node("handle_rollback", handle_rollback)
    graph.add_node("mark_human_required", mark_human_required)

    graph.set_entry_point("create_git_branch")
    graph.add_edge("create_git_branch", "execute_direct_task")
    graph.add_edge("execute_direct_task", "run_qa")

    graph.add_conditional_edges(
        "run_qa",
        route_qa_verdict,
        {"commit_and_close": "commit_and_close", "handle_rollback": "handle_rollback"},
    )

    graph.add_conditional_edges(
        "handle_rollback",
        lambda state: (
            "mark_human_required"
            if state.get("iteration", 0) >= state.get("max_iterations", 3)
            else "execute_direct_task"
        ),
        {"mark_human_required": "mark_human_required", "execute_direct_task": "execute_direct_task"},
    )

    graph.add_edge("commit_and_close", END)
    graph.add_edge("mark_human_required", END)

    return graph


def compile_pipeline():
    """Compile the direct task pipeline (default for single tasks)."""
    return build_direct_pipeline().compile()


def compile_full_pipeline():
    """Compile the full pipeline with PM analysis."""
    return build_full_pipeline().compile()
