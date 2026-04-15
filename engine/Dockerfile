FROM python:3.11-slim AS base
WORKDIR /app

RUN pip install --no-cache-dir uv

COPY pyproject.toml ./
RUN uv pip install --system -e .

COPY . .
RUN uv pip install --system -e .

EXPOSE 8100
CMD ["aimaker-engine", "serve"]
