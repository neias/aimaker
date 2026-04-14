"""Codebase scanner - reads project structure and key files for PM agent context."""

from __future__ import annotations

import logging
import os
from pathlib import Path

logger = logging.getLogger("aimaker.scanner")

# Files to read content from (small, informative files)
KEY_FILES = [
    "package.json",
    "pyproject.toml",
    "requirements.txt",
    "Cargo.toml",
    "go.mod",
    "composer.json",
    "Gemfile",
    "CLAUDE.md",
    "README.md",
    "tsconfig.json",
    ".env.example",
    "docker-compose.yml",
    "Dockerfile",
    "nest-cli.json",
    "next.config.ts",
    "next.config.js",
    "vite.config.ts",
    "tailwind.config.ts",
    "tailwind.config.js",
]

# Directories to skip
SKIP_DIRS = {
    "node_modules", ".git", ".next", "dist", "build", "__pycache__",
    ".venv", "venv", ".cache", "coverage", ".turbo", ".nuxt",
    "target", "vendor", ".idea", ".vscode",
}

# Max depth for directory tree
MAX_DEPTH = 4
MAX_FILES_PER_DIR = 30
MAX_FILE_CONTENT_LENGTH = 3000


def scan_directory_tree(path: str, depth: int = 0, max_depth: int = MAX_DEPTH) -> str:
    """Generate a directory tree string."""
    if not path or not os.path.isdir(path):
        return ""

    lines = []
    try:
        entries = sorted(os.listdir(path))
    except PermissionError:
        return ""

    dirs = []
    files = []
    for entry in entries:
        if entry.startswith(".") and entry not in (".env.example",):
            continue
        full = os.path.join(path, entry)
        if os.path.isdir(full):
            if entry not in SKIP_DIRS:
                dirs.append(entry)
        else:
            files.append(entry)

    indent = "  " * depth

    for f in files[:MAX_FILES_PER_DIR]:
        lines.append(f"{indent}{f}")
    if len(files) > MAX_FILES_PER_DIR:
        lines.append(f"{indent}... and {len(files) - MAX_FILES_PER_DIR} more files")

    for d in dirs:
        lines.append(f"{indent}{d}/")
        if depth < max_depth:
            subtree = scan_directory_tree(os.path.join(path, d), depth + 1, max_depth)
            if subtree:
                lines.append(subtree)

    return "\n".join(lines)


def read_key_files(path: str) -> dict[str, str]:
    """Read content of key project files."""
    if not path or not os.path.isdir(path):
        return {}

    result = {}
    for filename in KEY_FILES:
        filepath = os.path.join(path, filename)
        if os.path.isfile(filepath):
            try:
                content = Path(filepath).read_text(encoding="utf-8", errors="ignore")
                if len(content) > MAX_FILE_CONTENT_LENGTH:
                    content = content[:MAX_FILE_CONTENT_LENGTH] + "\n... (truncated)"
                result[filename] = content
            except Exception:
                pass

    return result


def scan_project(backend_path: str = "", frontend_path: str = "") -> str:
    """Scan project directories and return a formatted context string."""
    sections = []

    for label, path in [("Backend", backend_path), ("Frontend", frontend_path)]:
        if not path or not os.path.isdir(path):
            continue

        sections.append(f"### {label} Directory: `{path}`")

        # Directory tree
        tree = scan_directory_tree(path)
        if tree:
            sections.append(f"```\n{tree}\n```")

        # Key files
        key_files = read_key_files(path)
        for filename, content in key_files.items():
            sections.append(f"**{filename}:**\n```\n{content}\n```")

    if not sections:
        return ""

    return "## Existing Codebase\n\n" + "\n\n".join(sections)
