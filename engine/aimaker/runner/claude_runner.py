"""Claude Code CLI wrapper - ported from sporhub orchestrator with streaming support."""

from __future__ import annotations

import json
import logging
import re
import subprocess
import time
from dataclasses import dataclass

import httpx

from aimaker.config import settings

logger = logging.getLogger("aimaker.runner")

API_BASE = "http://localhost:3000/api"


@dataclass
class ClaudeResult:
    success: bool
    output: str
    parsed_json: dict | None = None
    duration_seconds: float = 0
    error: str | None = None


def _log_activity_sync(
    project_id: str,
    event: str,
    message: str,
    category: str = "agent",
    level: str = "info",
    issue_id: str | None = None,
    milestone_id: str | None = None,
    metadata: dict | None = None,
):
    """Synchronous activity logging (used inside subprocess-based runner)."""
    payload: dict = {
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
        httpx.post(f"{API_BASE}/activity", json=payload, timeout=5)
    except Exception:
        pass


class ClaudeRunner:
    """Claude Code CLI wrapper with model tier support and activity logging."""

    def __init__(
        self,
        cli_path: str | None = None,
        model: str = "sonnet",
        max_budget_per_task: float | None = None,
        project_id: str | None = None,
        issue_id: str | None = None,
        milestone_id: str | None = None,
    ):
        self.cli_path = cli_path or settings.claude_cli_path
        self.model = model
        self.max_budget_per_task = max_budget_per_task
        self.project_id = project_id
        self.issue_id = issue_id
        self.milestone_id = milestone_id

    def _log(self, event: str, message: str, level: str = "info", metadata: dict | None = None):
        """Log activity if project context is available."""
        if self.project_id:
            _log_activity_sync(
                project_id=self.project_id,
                event=event,
                message=message,
                level=level,
                issue_id=self.issue_id,
                milestone_id=self.milestone_id,
                metadata=metadata,
            )

    @staticmethod
    def _extract_json(text: str) -> dict | None:
        """Extract JSON block from Claude output."""
        json_match = re.search(r"```json\s*\n(.*?)\n```", text, re.DOTALL)
        if json_match:
            try:
                return json.loads(json_match.group(1))
            except json.JSONDecodeError:
                pass

        brace_start = text.find("{")
        brace_end = text.rfind("}")
        if brace_start != -1 and brace_end != -1:
            try:
                return json.loads(text[brace_start : brace_end + 1])
            except json.JSONDecodeError:
                pass

        return None

    def run(
        self,
        prompt: str,
        system_prompt: str | None = None,
        working_dir: str | None = None,
        max_turns: int = 10,
        allowed_tools: list[str] | None = None,
        timeout: int = 600,
        on_output: callable | None = None,
    ) -> ClaudeResult:
        """Run Claude Code CLI."""
        start_time = time.time()

        # Log start
        self._log("claude.run.start", f"Claude starting (model={self.model}, max_turns={max_turns})", metadata={
            "model": self.model,
            "max_turns": max_turns,
            "timeout": timeout,
            "prompt_length": len(prompt),
            "prompt_preview": prompt[:300],
            "has_system_prompt": bool(system_prompt),
            "system_prompt_preview": (system_prompt or "")[:200],
            "allowed_tools": allowed_tools,
            "working_dir": working_dir,
            "max_budget_usd": self.max_budget_per_task,
        })

        try:
            cmd = [
                self.cli_path,
                "-p",
                "--output-format", "text",
                "--model", self.model,
                "--max-turns", str(max_turns),
            ]

            if self.max_budget_per_task:
                cmd.extend(["--max-budget-usd", str(self.max_budget_per_task)])

            full_prompt = prompt
            if system_prompt:
                full_prompt = (
                    f"<system-instructions>\n{system_prompt}\n</system-instructions>\n\n"
                    f"{prompt}"
                )

            if allowed_tools:
                for tool in allowed_tools:
                    cmd.extend(["--allowedTools", tool])

            logger.info(f"Running Claude (model={self.model}, max_turns={max_turns})")

            if on_output:
                process = subprocess.Popen(
                    cmd,
                    stdin=subprocess.PIPE,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True,
                    cwd=working_dir,
                )
                process.stdin.write(full_prompt)
                process.stdin.close()

                output_lines = []
                for line in process.stdout:
                    output_lines.append(line)
                    on_output(line.rstrip("\n"))

                process.wait(timeout=timeout)
                output = "".join(output_lines).strip()
                stderr = process.stderr.read()
                returncode = process.returncode
            else:
                result = subprocess.run(
                    cmd,
                    input=full_prompt,
                    capture_output=True,
                    text=True,
                    cwd=working_dir,
                    timeout=timeout,
                )
                output = result.stdout.strip()
                stderr = result.stderr.strip()
                returncode = result.returncode

            duration = time.time() - start_time

            if returncode != 0:
                error_msg = stderr or output[:500] or "Claude process failed"
                logger.error(f"Claude error (code={returncode}): {error_msg[:300]}")
                self._log("claude.run.error", f"Claude failed (code={returncode}, {duration:.1f}s)", level="error", metadata={
                    "model": self.model,
                    "return_code": returncode,
                    "duration_seconds": round(duration, 2),
                    "error": error_msg[:500],
                })
                return ClaudeResult(
                    success=False,
                    output=output,
                    error=error_msg,
                    duration_seconds=duration,
                )

            parsed = self._extract_json(output)
            logger.info(f"Claude completed ({duration:.1f}s), JSON: {'OK' if parsed else 'N/A'}")

            self._log("claude.run.complete", f"Claude completed ({duration:.1f}s)", metadata={
                "model": self.model,
                "duration_seconds": round(duration, 2),
                "output_length": len(output),
                "output_preview": output[:500],
                "json_parsed": parsed is not None,
                "json_keys": list(parsed.keys()) if parsed else None,
            })

            return ClaudeResult(
                success=True,
                output=output,
                parsed_json=parsed,
                duration_seconds=duration,
            )

        except subprocess.TimeoutExpired:
            duration = time.time() - start_time
            logger.error(f"Claude timeout ({timeout}s)")
            self._log("claude.run.timeout", f"Claude timed out after {timeout}s", level="error", metadata={
                "model": self.model,
                "timeout": timeout,
                "duration_seconds": round(duration, 2),
            })
            return ClaudeResult(
                success=False,
                output="",
                error=f"Timeout after {timeout}s",
                duration_seconds=duration,
            )

        except FileNotFoundError:
            self._log("claude.run.error", "Claude CLI not found", level="error", metadata={
                "cli_path": self.cli_path,
            })
            return ClaudeResult(
                success=False,
                output="",
                error=f"Claude CLI not found: {self.cli_path}. "
                       "Install with 'npm install -g @anthropic-ai/claude-code'.",
            )
