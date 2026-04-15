# AIMAKER

AI-powered development orchestration platform. Connect any project, define tasks or milestones, and let AI agents write code using Claude Code CLI.

## How It Works

```
Dashboard (Next.js) → NestJS API → Python Engine → Claude Code CLI
                          ↑                              ↓
                     WebSocket ← Redis Pub/Sub ←── Agents (PM, Backend, Frontend, QA)
```

**Two workflows:**

- **Task** — Direct execution. Write a task description, click "Run", the appropriate agent (Frontend or Backend based on project type) implements it immediately using Claude Code.
- **Milestone** — Strategic planning. Describe a big feature, choose GSD or Spec-Kit strategy, and the PM agent analyzes it with full codebase context, then breaks it into individual tasks automatically.

## Features

### Multi-Project Support
Connect any number of projects. Each project has its own:
- **Project Type**: Frontend, Backend, or Full Stack — agents and task generation adapt accordingly
- **Project Description**: Context about what the project is, its tech stack and purpose
- **Repository Paths**: Local paths where agents work
- **Codebase Snapshot**: One-time scan stored in DB — agents understand your existing code without rescanning
- **Policies**: Rules agents must follow
- **Strategy**: GSD or Spec-Kit for milestone analysis

### Project-Aware Agents
Four specialized agents, each running Claude Code CLI (`claude -p`) in the target project directory:

| Agent | Role | Tier |
|-------|------|------|
| **PM** | Analyzes milestones with codebase context, creates task breakdowns | L1 (Haiku) |
| **Backend** | Implements APIs, DB schemas, business logic | L2 (Sonnet) |
| **Frontend** | Builds UI components, state management, API integration | L2 (Sonnet) |
| **QA** | Reviews code, runs tests, produces pass/fail verdict | L3 (Haiku) |

Agents are automatically selected based on project type:
- **Frontend project** → Frontend Agent runs in `frontend_path`
- **Backend project** → Backend Agent runs in `backend_path`
- **Full Stack project** → Both agents, backend first

### Codebase Snapshot
Scan your project once from Settings — the directory structure, `package.json`, `CLAUDE.md`, `tsconfig.json`, and other key files are read and stored in the database. When milestones are analyzed, this snapshot is sent to the PM agent so it:
- Creates tasks that work WITH existing code, not from scratch
- References existing files in `files_to_modify` instead of `files_to_create`
- Follows patterns, conventions, and dependencies already in use
- Doesn't suggest installing packages already in your dependencies

Rescan anytime from project settings when your codebase changes.

### Strategy Modes

**GSD (Get Shit Done)** — Fast, pragmatic. Minimal task descriptions, 1-3 acceptance criteria, shortest path to working code. Best for prototyping and small features.

**Spec-Kit** — Enterprise-grade. Produces RFC-style technical specifications with:
- Problem statement & proposed solution
- Technical design (data model, API, frontend, data flow) — adapted to project type
- Error handling & edge cases
- Security considerations
- Testing strategy
- 5-7 acceptance criteria per task
- QA uses strict 16-point checklist for review

### Policy Manager
Define rules that agents must follow per project:
- **Global**: "No `any` type in TypeScript"
- **Backend**: "Use repository pattern", "Zod validation on all inputs"
- **Frontend**: "Only Tailwind CSS", "All components in `components/` directory"

Features:
- Import existing `.md` rule files (e.g., `CLAUDE.md`) with automatic scope detection based on keywords
- Edit scope per rule during import (click scope badge to cycle: global → backend → frontend)
- Expand any rule to see full text, edit inline, change scope
- Enable/disable rules without deleting

### Multilingual Support
PM agent detects the language of your milestone title/description and generates all task titles, descriptions, and acceptance criteria in the same language. Technical terms (file paths, API endpoints, variable names) stay in English.

### Safety Guardrails
- **Max Iterations**: If QA fails N times, stops and marks "Human Intervention Required"
- **Git Checkpoints**: Auto-commits after each stage, rollback to last known good state on failure
- **Retry Mechanism**: Milestone analysis automatically retries up to 2 times on failure

### Dashboard
- **Kanban Board** — 4 columns (Waiting → Processing → Testing → Done) with search, priority filters, pagination (30 per column)
- **Live Console** — Real-time pipeline events on the project page
- **Activity Log** — Persistent DB-backed log of all engine actions, Claude CLI calls with prompt previews, model info, and durations. Filterable by category (ENGINE, AGENT, WS, SYSTEM). Survives page refresh.
- **Analytics** — Task status distribution, priority breakdown, milestone progress, recently completed/failed lists
- **Terminal** — Live Xterm.js terminal for watching agent output
- **Project Settings** — Project type, description, paths, GitHub integration, codebase snapshot, strategy, danger zone
- **Light/Dark Mode** — Toggle in sidebar footer, preference saved to localStorage
- **Toast Notifications** — Success/error feedback for all actions

### GitHub Integration
- Sync issues from any GitHub repository (public or private with token)
- Auto-normalizes URLs (paste `https://github.com/owner/repo` or just `owner/repo`)
- Handles rate limits and auth errors with clear messages
- Webhook receiver for real-time issue sync

## Architecture

```
aimaker/
├── api/                    # NestJS — REST API + WebSocket + DB
│   └── src/
│       ├── projects/       # Project CRUD + codebase scan
│       ├── issues/         # Task management + GitHub sync
│       ├── milestones/     # Milestone CRUD + analyze trigger
│       ├── policies/       # Guardrail rules
│       ├── activity/       # Persistent activity logging
│       ├── analytics/      # Stats & metrics
│       ├── orchestrator/   # Engine communication + Redis subscriber
│       ├── integrations/   # GitHub API service
│       └── ws/             # WebSocket gateway (Socket.IO)
│
├── engine/                 # Python — Orchestration engine
│   └── aimaker/
│       ├── graph/          # LangGraph state machines (direct + full pipeline)
│       ├── agents/         # PM, Backend, Frontend, QA + system prompts
│       ├── runner/         # Claude Code CLI wrapper with activity logging
│       ├── strategy/       # GSD & Spec-Kit prompt generators
│       ├── safety/         # Budget tracking, git checkpoints
│       ├── scanner.py      # Codebase directory scanner
│       ├── activity.py     # Activity log client
│       ├── events.py       # Redis pub/sub event publisher
│       └── server.py       # FastAPI endpoints (process, analyze, scan, health)
│
├── dashboard/              # Next.js 16 — Web UI
│   └── src/
│       ├── app/            # Pages (dashboard, projects, milestones, activity, terminal, settings)
│       ├── components/     # Kanban, console, toast, sidebar, theme provider
│       ├── hooks/          # WebSocket hooks
│       ├── stores/         # Zustand stores
│       └── lib/            # API client, WebSocket client
│
└── docker-compose.yml      # All services (postgres, redis, api, engine, dashboard)
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **API** | NestJS 11, TypeORM, PostgreSQL, Socket.IO, ioredis |
| **Engine** | Python 3.11+, LangGraph, FastAPI, Redis pub/sub, httpx |
| **Dashboard** | Next.js 16, React 19, Tailwind CSS, shadcn/ui, Zustand, TanStack Query, Xterm.js, Recharts, Lucide Icons |
| **Agent Runtime** | Claude Code CLI (`claude -p`) — uses your existing Claude Code subscription, no API key needed |
| **Communication** | REST (API↔Engine), WebSocket (API↔Dashboard), Redis pub/sub (Engine→API) |

## Prerequisites

- **Docker** and **Docker Compose**
- **Claude Code CLI** (`npm install -g @anthropic-ai/claude-code`)

## Setup

### 1. Clone & configure

```bash
git clone https://github.com/neias/aimaker.git
cd aimaker
cp .env.example .env
# Edit .env if needed
```

### 2. Start (Docker)

```bash
docker compose up -d
```

All 5 services start together:

| Service | URL |
|---------|-----|
| **Dashboard** | http://localhost:3000 |
| **API** | http://localhost:3001 |
| **API Docs** | http://localhost:3001/api/docs |
| **Engine** | http://localhost:8100 |

```bash
# View logs
docker compose logs -f

# Stop
docker compose down
```

### Manual Setup (without Docker)

<details>
<summary>Click to expand</summary>

**Requirements:** Bun, Python 3.11+, PostgreSQL, Redis

#### Database

```bash
# If using brew PostgreSQL:
createuser aimaker --pwprompt   # password: aimaker_secret
createdb aimaker -O aimaker

# Or just the infra containers:
docker compose up -d postgres redis
```

#### API (Terminal 1)

```bash
cd api
bun install
bun run start:dev
# Runs on http://localhost:3001
# Swagger: http://localhost:3001/api/docs
```

#### Engine (Terminal 2)

```bash
cd engine
python3 -m venv .venv
source .venv/bin/activate
pip install -e .
aimaker-engine serve
# Runs on http://localhost:8100
```

#### Dashboard (Terminal 3)

```bash
cd dashboard
bun install
bun dev --port 3000
# Runs on http://localhost:3000
```

</details>

## Usage

### Quick Start
1. Open dashboard → **Projects** → **New Project**
2. Set name, project type (Frontend/Backend/Full Stack), description, repo path(s)
3. Go to **Settings** → **Scan Codebase** (one-time, stored in DB)
4. Add **Policies** (or import from `.md` file)
5. You're ready to create tasks or milestones

### Direct Task
1. Click **"+ Add Task"** on the project page
2. Describe what you want built
3. Click **"Run"** on the task card
4. Watch progress in the console

### Milestone (GSD)
1. Click **Milestones** → **New Milestone**
2. Describe the feature (in any language)
3. Select **GSD** → **Create** → **Analyze**
4. PM agent reads your codebase snapshot + policies, breaks it into tasks
5. Tasks appear on Kanban → run them

### Milestone (Spec-Kit)
1. Same flow but select **Spec-Kit**
2. PM agent produces a full RFC specification document
3. Tasks have 5-7 acceptance criteria each
4. QA agent uses strict checklist for review

## API Endpoints

```
# Projects
POST   /api/projects
GET    /api/projects
GET    /api/projects/:id
PATCH  /api/projects/:id
POST   /api/projects/:id/scan              # Scan codebase
DELETE /api/projects/:id

# Issues (Tasks)
POST   /api/projects/:id/issues
GET    /api/projects/:id/issues
POST   /api/projects/:id/issues/sync       # GitHub sync
GET    /api/issues/:id
POST   /api/issues/:id/process             # Start agent
POST   /api/issues/:id/cancel
POST   /api/issues/:id/retry
DELETE /api/issues/:id

# Milestones
POST   /api/projects/:id/milestones
GET    /api/projects/:id/milestones
GET    /api/milestones/:id
POST   /api/milestones/:id/analyze         # Run PM agent
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
API_PORT=3001
ENGINE_PORT=8100

# GitHub (optional)
GITHUB_TOKEN=ghp_xxx

# Claude Code model defaults (no API key needed)
MODEL_L1=haiku      # PM, QA (fast)
MODEL_L2=sonnet     # Backend, Frontend (smart)
MODEL_L3=haiku      # Review

# Safety
DEFAULT_MAX_ITERATIONS=3
```

## License

MIT
