# Nexus OS — Workspace

## Overview

pnpm workspace monorepo using TypeScript. Full-stack "Nexus OS" desktop app — Notion + Obsidian + ClickUp + AI-native workspace.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite + TailwindCSS (dark/light theme)
- **State**: Zustand + TanStack React Query

## Artifacts

- `artifacts/nexus` — Nexus OS web app (preview path: `/`)
- `artifacts/api-server` — Express REST API (preview path: `/api`)
- `artifacts/mockup-sandbox` — Component preview server (preview path: `/__mockup`)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run typecheck:libs` — build composite libs (api-client-react)
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Nexus OS Features

### Core Views (all real, no "Coming Soon")
- **Page Editor** — TipTap block editor with slash commands, markdown, code highlighting
- **Database View** — Notion-style table/kanban/gallery views
- **Knowledge Graph** — react-force-graph-2d visual page connections
- **Meetings View** — Full calendar (month/week/list), create meetings, connect Google/Apple/Outlook calendar
- **Tasks View** — Task list with priority, status, due dates, filtering, sorting
- **Library View** — Recent pages grid/list, collections, 8+ templates
- **Trash View** — Deleted pages with restore/permanent delete
- **AI Agents Panel** — 5 agents (Research, Writing, Data, Automation, Nexus Assistant) with REAL AI chat via `/api/ai/chat`
- **Marketplace** — Connector marketplace with categories
- **Settings** — Providers (25+ AI), Memory, Skills, MCP, Appearance, Import, People, Security

### AI & Integration
- 25+ AI providers (OpenAI, Anthropic, Gemini, Groq, Mistral, Ollama, etc.)
- AI memory system (short/long-term, skills, preferences) stored in DB
- MCP Protocol connections (Composio, Brave Search, etc.)
- Real AI chat endpoint at `/api/ai/chat`
- AgentsPanel connected to real AI with full conversation history

### API Routes
- `GET/POST /api/workspaces` — workspace management
- `GET/POST/PATCH/DELETE /api/workspaces/:id/meetings` — calendar events (real DB)
- `GET/POST /api/workspaces/:id/pages` — pages CRUD
- `POST /api/ai/chat` — real AI chat (25+ providers)
- `GET/POST /api/ai/memory` — AI memory CRUD
- `GET /api/ai/skills` — AI skills catalog
- `GET /api/ai/providers` — connected providers + 25-provider catalog
- `GET /api/search` — full-text page search
- `GET /api/databases/:id/rows` — database rows

## DB Schema Tables

- `users`, `workspaces`, `workspace_members`
- `pages`, `page_links` (knowledge graph edges)
- `databases`, `database_columns`, `database_rows`
- `meetings` — calendar events with attendees, colors, recurrence
- `ai_providers`, `ai_conversations`, `ai_messages`
- `memories`, `skills`
- `activity`, `tags`, `templates`

## Architecture Notes

- **API client** lives in `lib/api-client-react` — composite TypeScript lib, built with `pnpm run typecheck:libs`
- **DB migrations** via `pnpm --filter @workspace/db run push` (Drizzle Kit)
- **Proxy routing**: frontend at `/`, API at `/api` — handled by `.replit-artifact/artifact.toml`
- **SSE events** at `/api/events` — real-time page invalidation
- nexus-hub-clone at `/nexus-hub` — legacy, ignore

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
