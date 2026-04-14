"""Redis pub/sub event broadcasting for real-time updates to NestJS."""

from __future__ import annotations

import json
import logging
import time

import redis.asyncio as aioredis

from aimaker.config import settings

logger = logging.getLogger("aimaker.events")

_redis: aioredis.Redis | None = None


async def get_redis() -> aioredis.Redis:
    """Get or create Redis connection."""
    global _redis
    if _redis is None:
        _redis = aioredis.Redis(host=settings.redis_host, port=settings.redis_port)
    return _redis


async def close_redis():
    """Close Redis connection."""
    global _redis
    if _redis:
        await _redis.close()
        _redis = None


async def publish_event(
    project_id: str,
    event_type: str,
    data: dict,
    issue_id: str | None = None,
):
    """Publish an event to Redis for NestJS to pick up.

    NestJS subscribes to 'aimaker:events:{project_id}' channel.
    """
    r = await get_redis()

    message = {
        "type": event_type,
        "timestamp": int(time.time() * 1000),
        "data": {
            "project_id": project_id,
            "issue_id": issue_id,
            **data,
        },
    }

    channel = f"aimaker:events:{project_id}"
    await r.publish(channel, json.dumps(message, ensure_ascii=False))
    logger.debug(f"Published {event_type} to {channel}")


async def publish_terminal_output(
    run_id: str,
    stream: str,
    line: str,
):
    """Publish terminal output line for live streaming."""
    r = await get_redis()

    message = {
        "type": "run:output",
        "timestamp": int(time.time() * 1000),
        "data": {"run_id": run_id, "stream": stream, "line": line},
    }

    channel = f"aimaker:terminal:{run_id}"
    await r.publish(channel, json.dumps(message, ensure_ascii=False))
