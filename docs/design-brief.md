# AIMAKER - AI Development Orchestration Platform

## Overview
A web-based platform that connects to any software project and uses Claude Code CLI to automate development tasks. Users create projects, define tasks or milestones, and AI agents write code directly in the project directory.

## Core Concepts
- **Project**: A registered software project with repo paths, type (Frontend/Backend/Fullstack), description, policies, and codebase snapshot
- **Task**: A single work item sent directly to an AI agent for implementation
- **Milestone**: A big feature broken into multiple tasks using GSD (fast/pragmatic) or Spec-Kit (detailed RFC) strategy
- **Policy**: Rules agents must follow (e.g., "Use Tailwind CSS only", "Zod validation required")

## Key Screens

### 1. Dashboard (/)
- Overview cards: total projects, engine status (online/offline), active tasks
- Recent projects grid with strategy badges and GitHub repo info

### 2. Projects List (/projects)
- Project cards with name, GitHub repo, type badge (FE/BE/Fullstack), strategy badge (GSD/Spec-Kit)
- "New Project" dialog: name, slug, project type selector (3 buttons), description textarea, repo paths (conditional on type), strategy selector

### 3. Project Detail (/projects/[id]) - Main workspace
- Header: project name, GitHub repo, action buttons (Add Task, Milestones, Policies, Analytics, Sync GitHub, Settings)
- **Kanban Board**: 4 columns (Waiting → Processing → Testing → Done)
  - Search bar + priority filters (P0/P1/P2) + issue counter
  - Compact cards: title, priority badge, labels, hover actions (Run/Stop/Retry/Delete/Archive)
  - Each column scrolls independently, max 30 cards with "Show more"
- **Console Panel**: below kanban, collapsible, shows real-time pipeline events with color-coded labels (STATUS/AGENT/DONE/FAIL/QA)
- **Add Task Dialog**: title, description, priority (P0/P1/P2), QA Review toggle
- **Issue Detail Drawer** (slide-in from right): status badges, QA on/off badge, description, stats (status/attempts/created), expandable sections (PM Analysis, Shared Contract, RFC Spec), task list. Waiting tasks have Edit button for title/body/priority/QA toggle.

### 4. Milestones (/projects/[id]/milestones)
- List of milestones with status badge, strategy badge, progress bar, expand/collapse
- Expanded: analysis text, RFC spec document (Spec-Kit only), generated tasks list
- "New Milestone" dialog: title, description, strategy selector (GSD/Spec-Kit cards), QA Review toggle, Analyze button
- "Analyze" triggers AI to break milestone into tasks

### 5. Policy Manager (/projects/[id]/policies)
- "Import .md" button: upload markdown files, auto-detect scope from keywords, preview rules with clickable scope badges
- Add rule form: scope selector (global/backend/frontend), name, rule text
- Rules list with tabs (All/Global/Backend/Frontend), expandable cards with inline editing, enable/disable toggle, delete

### 6. Analytics (/projects/[id]/analytics)
- Summary cards: Total Tasks, Completed, Failed, In Progress, Success Rate
- Status distribution donut chart, priority bar chart
- Milestones summary with progress
- Recently completed and failed task lists

### 7. Activity (/activity)
- Persistent log from database (survives refresh)
- Project selector dropdown
- Category filters: ENGINE, AGENT, WS, SYSTEM
- Each entry: timestamp, category badge, event name, message
- Expandable metadata: prompt preview, model, duration, strategy used

### 8. Project Settings (/projects/[id]/settings)
- General: name, slug, project type (Frontend/Backend/Fullstack), description
- GitHub: repo, access token
- Paths: backend path, frontend path, base branch
- Codebase Snapshot: scan button, rescan, separate BE/FE previews with char count
- Strategy: GSD/Spec-Kit selector cards
- Danger zone: delete project with confirmation

### 9. Live Terminal (/terminal/[runId])
- Full-screen Xterm.js terminal showing agent output in real-time

## UI Design
- Dark theme primary (#111114 bg, #1a1a1f cards, #2a2a32 borders)
- Light mode available (toggle in sidebar footer)
- Violet accent (#8b5cf6), Inter font, JetBrains Mono for code
- Sidebar: logo, navigation (Dashboard/Projects/Activity), engine status indicator, theme toggle
- shadcn/ui components, Lucide icons, gradient accents on hover
