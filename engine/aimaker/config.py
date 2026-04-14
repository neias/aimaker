"""Engine configuration via environment variables."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Engine server
    engine_port: int = 8100
    engine_host: str = "0.0.0.0"

    # Redis (for pub/sub with NestJS)
    redis_host: str = "localhost"
    redis_port: int = 6379

    # Claude Code CLI model defaults (API key gerekmez, CLI kendi hesabını kullanır)
    model_l1: str = "haiku"
    model_l2: str = "sonnet"
    model_l3: str = "haiku"

    # Budget defaults
    default_token_budget_usd: float = 5.00
    default_max_iterations: int = 3

    # Claude CLI
    claude_cli_path: str = "claude"

    model_config = {"env_file": "../.env", "extra": "ignore"}


settings = Settings()
