"""FastAPI micro-server for the engine - called by NestJS API."""

from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from aimaker.config import settings
from aimaker.events import close_redis, publish_event
from aimaker.graph.graph import compile_pipeline

logger = logging.getLogger("aimaker.server")

# Active processing tasks
_active_tasks: dict[str, asyncio.Task] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Engine server starting on {settings.engine_host}:{settings.engine_port}")
    yield
    await close_redis()


from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

app = FastAPI(title="AIMAKER Engine", lifespan=lifespan)

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    errors = exc.errors()
    logger.error(f"Validation error: {errors}")
    return JSONResponse(
        status_code=422,
        content={"detail": "Validation error", "errors": [str(e) for e in errors]},
    )

pipeline = compile_pipeline()


class ModelOverride(BaseModel):
    model: str | None = None
    max_turns: int | None = None
    timeout: int | None = None
    max_budget_usd: float | None = None


class ProjectConfig(BaseModel):
    """Full project configuration sent by NestJS."""
    backend_path: str | None = None
    frontend_path: str | None = None
    base_branch: str = "main"
    strategy: str = "gsd"
    policies: list[str] = []
    model_overrides: dict[str, ModelOverride] = {}  # per-agent model overrides


class ProcessRequest(BaseModel):
    issue_id: str
    project_id: str
    title: str
    body: str | None = None
    labels: list[str] = []
    priority: str = "P1"
    max_iterations: int = 3
    token_budget_usd: float | None = None
    enable_qa: bool = True
    project_config: ProjectConfig = ProjectConfig()


async def _run_pipeline(request: ProcessRequest):
    """Run the LangGraph pipeline for an issue."""
    cfg = request.project_config

    try:
        initial_state = {
            "issue_id": request.issue_id,
            "project_id": request.project_id,
            "issue_title": request.title,
            "issue_body": request.body or "",
            "labels": request.labels,
            "priority": request.priority,
            "strategy": cfg.strategy,
            "policies": cfg.policies,
            "backend_path": cfg.backend_path or "",
            "frontend_path": cfg.frontend_path or "",
            "base_branch": cfg.base_branch,
            "iteration": 0,
            "max_iterations": request.max_iterations,
            "budget_remaining_usd": request.token_budget_usd or settings.default_token_budget_usd,
            "enable_qa": request.enable_qa,
            "checkpoints": [],
            "backend_tasks": [],
            "frontend_tasks": [],
            "backend_results": [],
            "frontend_results": [],
            "review_issues": [],
        }

        result = await pipeline.ainvoke(initial_state)

        stage = result.get("current_stage", "unknown")
        await publish_event(
            request.project_id, "pipeline:completed",
            {"stage": stage, "iteration": result.get("iteration", 0)},
            issue_id=request.issue_id,
        )
        logger.info(f"Pipeline completed for issue {request.issue_id}: {stage}")

    except Exception as e:
        logger.exception(f"Pipeline failed for issue {request.issue_id}")
        await publish_event(
            request.project_id, "pipeline:failed",
            {"error": str(e)[:500]},
            issue_id=request.issue_id,
        )


class ScanRequest(BaseModel):
    backend_path: str = ""
    frontend_path: str = ""


@app.post("/scan-codebase")
async def scan_codebase(request: ScanRequest):
    """Scan project directories and return separate backend/frontend snapshots."""
    from aimaker.scanner import scan_project
    import os
    logger.info(f"Scanning codebase - backend: '{request.backend_path}' (exists: {os.path.isdir(request.backend_path) if request.backend_path else False}), frontend: '{request.frontend_path}' (exists: {os.path.isdir(request.frontend_path) if request.frontend_path else False})")
    backend_snapshot = scan_project(request.backend_path, "") if request.backend_path else ""
    frontend_snapshot = scan_project("", request.frontend_path) if request.frontend_path else ""
    logger.info(f"Scan result - backend: {len(backend_snapshot)} chars, frontend: {len(frontend_snapshot)} chars")
    return {
        "backend_snapshot": backend_snapshot,
        "frontend_snapshot": frontend_snapshot,
        "backend_length": len(backend_snapshot),
        "frontend_length": len(frontend_snapshot),
    }


class AnalyzeMilestoneRequest(BaseModel):
    milestone_id: str
    project_id: str
    title: str
    description: str = ""
    strategy: str = "gsd"
    policies: list[str] = []
    project_type: str = "fullstack"
    project_description: str = ""
    backend_path: str = ""
    frontend_path: str = ""
    codebase_snapshot_backend: str = ""
    codebase_snapshot_frontend: str = ""


@app.post("/analyze-milestone")
async def analyze_milestone(request: AnalyzeMilestoneRequest):
    """Run PM Agent to analyze a milestone and return task breakdown."""
    from aimaker.agents.pm import PMAgent
    from aimaker.activity import log_activity

    # Build codebase context from cached snapshots or live scan
    snapshots = []
    if request.codebase_snapshot_backend:
        snapshots.append(request.codebase_snapshot_backend)
    if request.codebase_snapshot_frontend:
        snapshots.append(request.codebase_snapshot_frontend)

    if snapshots:
        codebase_context = "\n\n".join(snapshots)
    else:
        from aimaker.scanner import scan_project
        codebase_context = scan_project(request.backend_path, request.frontend_path)

    await log_activity(
        project_id=request.project_id,
        event="milestone.analyze.start",
        message=f"Analyzing milestone with {request.strategy} strategy: {request.title}",
        milestone_id=request.milestone_id,
        metadata={
            "strategy": request.strategy,
            "title": request.title,
            "description_length": len(request.description),
            "policies_count": len(request.policies),
            "policies": request.policies[:5],
            "codebase_scanned": bool(codebase_context),
            "codebase_context_length": len(codebase_context),
        },
    )

    agent = PMAgent(
        project_id=request.project_id,
        milestone_id=request.milestone_id,
    )

    # Retry up to 2 times on failure
    result = None
    max_retries = 2
    for attempt in range(max_retries + 1):
        result = await agent.analyze(
            title=request.title,
            body=request.description,
            labels=[],
            strategy=request.strategy,
            policies=request.policies,
            project_type=request.project_type,
            project_description=request.project_description,
            codebase_context=codebase_context,
        )

        analysis = result.get("analysis", "")
        has_tasks = len(result.get("backend_tasks", [])) + len(result.get("frontend_tasks", [])) > 0

        if analysis and analysis != "Analysis failed" and has_tasks:
            break

        if attempt < max_retries:
            await log_activity(
                project_id=request.project_id,
                event="milestone.analyze.retry",
                message=f"Analysis attempt {attempt + 1} failed, retrying...",
                level="warn",
                milestone_id=request.milestone_id,
                metadata={"attempt": attempt + 1, "analysis": analysis},
            )

    backend_tasks = result.get("backend_tasks", [])
    frontend_tasks = result.get("frontend_tasks", [])

    await log_activity(
        project_id=request.project_id,
        event="milestone.analyze.complete",
        message=f"Milestone analysis complete: {len(backend_tasks)} backend + {len(frontend_tasks)} frontend tasks",
        milestone_id=request.milestone_id,
        metadata={
            "strategy": request.strategy,
            "backend_tasks_count": len(backend_tasks),
            "frontend_tasks_count": len(frontend_tasks),
            "has_spec_document": bool(result.get("spec_document")),
            "has_shared_contract": bool(result.get("shared_contract")),
            "analysis_preview": str(result.get("analysis", ""))[:300],
        },
    )

    return {
        "analysis": result.get("analysis", ""),
        "shared_contract": result.get("shared_contract"),
        "spec_document": result.get("spec_document"),
        "backend_tasks": backend_tasks,
        "frontend_tasks": frontend_tasks,
    }


@app.post("/process")
async def process_issue(request: ProcessRequest):
    """Start processing an issue asynchronously."""
    if request.issue_id in _active_tasks:
        raise HTTPException(400, f"Issue {request.issue_id} is already being processed")

    task = asyncio.create_task(_run_pipeline(request))
    _active_tasks[request.issue_id] = task
    task.add_done_callback(lambda t: _active_tasks.pop(request.issue_id, None))

    return {"status": "started", "issue_id": request.issue_id}


@app.get("/status/{issue_id}")
async def get_status(issue_id: str):
    """Get processing status for an issue."""
    if issue_id in _active_tasks:
        task = _active_tasks[issue_id]
        if task.done():
            exc = task.exception()
            if exc:
                return {"status": "failed", "error": str(exc)}
            return {"status": "completed"}
        return {"status": "processing"}
    return {"status": "not_found"}


@app.post("/cancel/{issue_id}")
async def cancel_issue(issue_id: str):
    """Cancel processing for an issue."""
    if issue_id in _active_tasks:
        _active_tasks[issue_id].cancel()
        _active_tasks.pop(issue_id, None)
        return {"status": "cancelled"}
    raise HTTPException(404, f"No active processing for issue {issue_id}")


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {
        "status": "ok",
        "active_tasks": len(_active_tasks),
        "active_issue_ids": list(_active_tasks.keys()),
    }


def start_server():
    """Start the engine server."""
    import uvicorn
    uvicorn.run(
        app,
        host=settings.engine_host,
        port=settings.engine_port,
        log_level="info",
    )
