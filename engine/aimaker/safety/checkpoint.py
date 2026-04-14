"""Git state checkpointing and rollback."""

from __future__ import annotations

import logging
import subprocess

logger = logging.getLogger("aimaker.safety.checkpoint")


def create_checkpoint(
    repo_path: str,
    stage: str,
    branch_name: str | None = None,
) -> dict | None:
    """Create a git checkpoint (commit) at the current state.

    Returns checkpoint dict or None if no changes to commit.
    """
    if not repo_path:
        return None

    try:
        # Check for changes
        status = subprocess.run(
            ["git", "status", "--porcelain"],
            cwd=repo_path,
            capture_output=True,
            text=True,
        )
        if not status.stdout.strip():
            logger.debug(f"No changes to checkpoint at {stage}")
            return None

        # Stage all changes
        subprocess.run(
            ["git", "add", "-A"],
            cwd=repo_path,
            capture_output=True,
            check=True,
        )

        # Commit
        msg = f"aimaker: checkpoint [{stage}]"
        subprocess.run(
            ["git", "commit", "-m", msg],
            cwd=repo_path,
            capture_output=True,
            check=True,
        )

        # Get commit SHA
        result = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            cwd=repo_path,
            capture_output=True,
            text=True,
            check=True,
        )
        sha = result.stdout.strip()

        logger.info(f"Checkpoint created: {stage} -> {sha[:8]}")

        # Determine repo side from path
        repo_side = "backend" if "backend" in repo_path.lower() else "frontend"

        return {
            "repo_side": repo_side,
            "commit_sha": sha,
            "stage": stage,
        }

    except subprocess.CalledProcessError as e:
        logger.error(f"Git checkpoint failed: {e}")
        return None


def rollback_to_checkpoint(repo_path: str, commit_sha: str) -> bool:
    """Rollback to a specific checkpoint."""
    if not repo_path or not commit_sha:
        return False

    try:
        subprocess.run(
            ["git", "reset", "--hard", commit_sha],
            cwd=repo_path,
            capture_output=True,
            check=True,
        )
        logger.info(f"Rolled back to {commit_sha[:8]}")
        return True

    except subprocess.CalledProcessError as e:
        logger.error(f"Git rollback failed: {e}")
        return False
