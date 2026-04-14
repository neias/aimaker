# AIMAKER

AI-powered development orchestration platform. Connect any project, define tasks or milestones, and let AI agents write code using Claude Code CLI.

## How It Works

```
Dashboard (Next.js) → NestJS API → Python Engine → Claude Code CLI
                          ↑                              ↓
                     WebSocket ← Redis Pub/Sub ←── Agents (PM, Backend, Frontend, QA)
```

**Two workflows:**

- **Task** — Direct execution. Write a task description, click "Run", Claude Code implements it immediately.
- **Milestone** — Strategic planning. Describe a big feature, choose GSD or Spec-Kit strategy, and the PM agent breaks it into individual tasks automatically.

## Features

### Multi-Project Support
Connect any number of projects. Each project has its own repo paths, GitHub integration, policies, and strategy settings.

### Agent System
Four specialized agents, each running Claude Code CLI in the target project directory:

| Agent | Role | Tier |
|-------|------|------|
| **PM** | Analyzes milestones, creates task breakdowns, defines API contracts | L1 (Haiku) |
| **Backend** | Implements APIs, DB schemas, business logic | L2 (Sonnet) |
| **Frontend** | Builds UI components, state management, API integration | L2 (Sonnet) |
| **QA** | Reviews code, runs tests, produces pass/fail verdict | L3 (Haiku) |

### Strategy Modes

**GSD (Get Shit Done)** — Fast, pragmatic. Minimal task descriptions, shortest path to working code. Best for prototyping.

**Spec-Kit** — Enterprise-grade. Produces RFC-style technical specifications with:
- Problem statement & proposed solution
- Data model & API design
- Error handling & edge cases
- Security considerations
- Testing strategy & migration plan
- 5-7 acceptance criteria per task

### Policy Manager
Define rules that agents must follow per project:
- **Global**: "No `any` type in TypeScript"
- **Backend**: "Use repository pattern", "Zod validation on all inputs"
- **Frontend**: "Only Tailwind CSS", "All components in `components/` directory"

Import existing `.md` rule files (e.g., `CLAUDE.md`) with auto scope detection.

### Safety Guardrails
- **Max Iterations**: If QA fails N times, stops and marks "Human Intervention Required"
- **Git Checkpoints**: Auto-commits after each stage, rollback to last known good state on failure
- **Budget Tracking**: Per-task budget limits

### Dashboard
- **Kanban Board** — 4 columns (Waiting → Processing → Testing → Done) with search, priority filters, pagination
- **Live Console** — Real-time pipeline events on the project page
- **Activity Log** — Persistent, searchable log of all engine actions, agent runs, and Claude CLI calls (stored in DB)
- **Analytics** — Task status distribution, priority breakdown, milestone progress, success rates
- **Terminal** — Live Xterm.js terminal for watching agent output

### GitHub Integration
- Sync issues from any GitHub repository (public or private with token)
- Auto-normalizes URLs (paste full URL or `owner/repo`)
- Webhook receiver for real-time issue sync

## Architecture

```
aimaker/
├── api/                    # NestJS — REST API + WebSocket + DB
│   └── src/
│       ├── projects/       # Project CRUD
│       ├── issues/         # Task management + GitHub sync
│       ├── milestones/     # Milestone CRUD + analyze trigger
│       ├── policies/       # Guardrail rules
│       ├── activity/       # Persistent activity logging
│       ├── analytics/      # Stats & metrics
│       ├── orchestrator/   # Engine communication + Redis subscriber
│       └── ws/             # WebSocket gateway (Socket.IO)
│
├── engine/                 # Python — Orchestration engine
│   └── aimaker/
│       ├── graph/          # LangGraph state machine (pipeline)
│       ├── agents/         # PM, Backend, Frontend, QA + prompts
│       ├── runner/         # Claude Code CLI wrapper
│       ├── strategy/       # GSD & Spec-Kit
│       ├── safety/         # Budget tracking, git checkpoints
│       └── server.py       # FastAPI endpoints for NestJS
│
├── dashboard/              # Next.js 16 — Web UI
│   └── src/
│       ├── app/            # Pages (dashboard, projects, activity, terminal)
│       ├── components/     # Kanban, console, toast, sidebar
│       ├── hooks/          # WebSocket hooks
│       ├── stores/         # Zustand stores
│       └── lib/            # API client, WebSocket client
│
└── docker-compose.yml      # PostgreSQL + Redis
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **API** | NestJS 11, TypeORM, PostgreSQL, Socket.IO, ioredis |
| **Engine** | Python 3.11+, LangGraph, FastAPI, Redis pub/sub |
| **Dashboard** | Next.js 16, React 19, Tailwind CSS, shadcn/ui, Zustand, TanStack Query, Xterm.js, Recharts |
| **Agent Runtime** | Claude Code CLI (`claude -p`) |
| **Communication** | REST (API↔Engine), WebSocket (API↔Dashboard), Redis pub/sub (Engine→API) |

## Prerequisites

- **Bun** (for NestJS API and Next.js dashboard)
- **Python 3.11+** (for engine)
- **PostgreSQL** (database)
- **Redis** (event pub/sub)
- **Claude Code CLI** (`npm install -g @anthropic-ai/claude-code`)

## Setup

### 1. Clone & configure

```bash
git clone https://github.com/neias/aimaker.git
cd aimaker
cp .env.example .env
# Edit .env with your PostgreSQL credentials
```

### 2. Database

```bash
# If using brew PostgreSQL:
createuser aimaker --pwprompt   # password: aimaker_secret
createdb aimaker -O aimaker

# Or use Docker:
docker-compose up -d
```

### 3. API (Terminal 1)

```bash
cd api
bun install
bun run start:dev
# Runs on http://localhost:3000
# Swagger: http://localhost:3000/api/docs
```

### 4. Engine (Terminal 2)

```bash
cd engine
python3 -m venv .venv
source .venv/bin/activate
pip install -e .
aimaker-engine serve
# Runs on http://localhost:8100
```

### 5. Dashboard (Terminal 3)

```bash
cd dashboard
bun install
bun dev --port 3001
# Runs on http://localhost:3001
```

## Usage

### Quick Task
1. Create a project → set backend/frontend repo paths
2. Click **"+ Add Task"** → describe what you want
3. Click **"Run"** on the task card
4. Watch progress in the console and terminal

### Milestone (GSD)
1. Go to **Milestones** → **New Milestone**
2. Write: "User authentication with JWT, login/register pages"
3. Select **GSD** → **Create** → **Analyze**
4. PM agent breaks it into backend + frontend tasks
5. Tasks appear on Kanban → run them individually or in sequence

### Milestone (Spec-Kit)
1. Same flow but select **Spec-Kit**
2. PM agent produces a full RFC specification document
3. Tasks have 5-7 acceptance criteria each
4. QA agent uses strict 16-point checklist for review

## API Endpoints

```
# Projects
POST   /api/projects
GET    /api/projects
GET    /api/projects/:id
PATCH  /api/projects/:id
DELETE /api/projects/:id

# Issues (Tasks)
POST   /api/projects/:id/issues
GET    /api/projects/:id/issues
POST   /api/projects/:id/issues/sync    # GitHub sync
GET    /api/issues/:id
POST   /api/issues/:id/process          # Start agent
POST   /api/issues/:id/cancel
POST   /api/issues/:id/retry
DELETE /api/issues/:id

# Milestones
POST   /api/projects/:id/milestones
GET    /api/projects/:id/milestones
GET    /api/milestones/:id
POST   /api/milestones/:id/analyze      # Run PM agent
DELETE /api/milestones/:id

# Policies
POST   /api/projects/:id/policies
GET    /api/projects/:id/policies
PATCH  /api/policies/:id
DELETE /api/policies/:id

# Activity
GET    /api/projects/:id/activity
POST   /api/activity

# Analytics
GET    /api/projects/:id/analytics/costs
GET    /api/projects/:id/analytics/success-rate
GET    /api/projects/:id/analytics/timeline

# Engine
GET    /api/orchestrator/health
POST   /api/webhooks/github
```

## Environment Variables

```bash
# Database
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=aimaker
POSTGRES_PASSWORD=aimaker_secret
POSTGRES_DB=aimaker

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Ports
API_PORT=3000
ENGINE_PORT=8100

# GitHub (optional)
GITHUB_TOKEN=ghp_xxx

# Claude Code model defaults
MODEL_L1=haiku      # PM, QA (fast/cheap)
MODEL_L2=sonnet     # Backend, Frontend (smart)
MODEL_L3=haiku      # Review

# Safety
DEFAULT_TOKEN_BUDGET_USD=5.00
DEFAULT_MAX_ITERATIONS=3
```

## License

MIT
