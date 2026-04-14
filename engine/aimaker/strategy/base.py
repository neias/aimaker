"""Base strategy interface."""

from __future__ import annotations

from abc import ABC, abstractmethod


class BaseStrategy(ABC):
    """Base class for task extraction strategies."""

    @abstractmethod
    def get_extraction_prompt(self) -> str:
        """Return the prompt instructions for task extraction."""
        ...

    @abstractmethod
    def get_task_format(self) -> str:
        """Return the expected output format description."""
        ...
