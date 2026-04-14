"""CLI entrypoint for testing and debugging the engine."""

from __future__ import annotations

import argparse
import asyncio
import logging
import sys


def main():
    parser = argparse.ArgumentParser(description="AIMAKER Engine")
    subparsers = parser.add_subparsers(dest="command")

    # Server command
    server_parser = subparsers.add_parser("serve", help="Start the engine server")
    server_parser.add_argument("--port", type=int, default=None)

    # Process command (for CLI testing)
    process_parser = subparsers.add_parser("process", help="Process a single issue")
    process_parser.add_argument("--title", required=True, help="Issue title")
    process_parser.add_argument("--body", default="", help="Issue body")
    process_parser.add_argument("--backend-path", help="Path to backend repo")
    process_parser.add_argument("--frontend-path", help="Path to frontend repo")
    process_parser.add_argument("--strategy", default="gsd", choices=["gsd", "spec_kit"])
    process_parser.add_argument("--max-iterations", type=int, default=3)

    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    )

    if args.command == "serve":
        from aimaker.config import settings
        if args.port:
            settings.engine_port = args.port
        from aimaker.server import start_server
        start_server()

    elif args.command == "process":
        asyncio.run(_process_cli(args))

    else:
        parser.print_help()
        sys.exit(1)


async def _process_cli(args):
    """Run pipeline from CLI for testing."""
    import uuid
    from aimaker.graph.graph import compile_pipeline
    from aimaker.config import settings

    pipeline = compile_pipeline()

    state = {
        "issue_id": str(uuid.uuid4()),
        "project_id": "cli-test",
        "issue_title": args.title,
        "issue_body": args.body,
        "labels": [],
        "priority": "P1",
        "strategy": args.strategy,
        "policies": [],
        "backend_path": args.backend_path or "",
        "frontend_path": args.frontend_path or "",
        "base_branch": "main",
        "iteration": 0,
        "max_iterations": args.max_iterations,
        "budget_remaining_usd": settings.default_token_budget_usd,
        "checkpoints": [],
        "backend_tasks": [],
        "frontend_tasks": [],
        "backend_results": [],
        "frontend_results": [],
        "review_issues": [],
    }

    print(f"Processing: {args.title}")
    print(f"Strategy: {args.strategy}")
    print("-" * 60)

    result = await pipeline.ainvoke(state)

    print("-" * 60)
    print(f"Result: {result.get('current_stage', 'unknown')}")
    if result.get("error"):
        print(f"Error: {result['error']}")


if __name__ == "__main__":
    main()
