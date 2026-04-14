"""Activity logging - sends structured logs to NestJS API for persistence."""

from __future__ import annotations

import logging

import httpx

logger = logging.getLogger("aimaker.activity")

API_BASE = "http://localhost:3000/api"


async def log_activity(
    project_id: str,
    event: str,
    message: str,
    category: str = "engine",
    level: str = "info",
    issue_id: str | None = None,
    milestone_id: str | None = None,
    metadata: dict | None = None,
):
    """Send an activity log to the NestJS API."""
    payload = {
        "projectId": project_id,
        "category": category,
        "level": level,
        "event": event,
        "message": message,
        "metadata": metadata or {},
    }
    if issue_id:
        payload["issueId"] = issue_id
    if milestone_id:
        payload["milestoneId"] = milestone_id

    try:
        async with httpx.AsyncClient() as client:
            await client.post(f"{API_BASE}/activity", json=payload, timeout=5)
    except Exception as e:
        logger.debug(f"Failed to log activity: {e}")
