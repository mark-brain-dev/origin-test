# Nexus OS — Workspace

## Overview

pnpm workspace monorepo using TypeScript. Full-stack "Nexus OS" desktop app — Notion + Obsidian + ClickUp + AI-native workspace with full Composio v3 API integration (1,033 connectors).

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

## Port Conflict Fix

`nexus-hub-clone` workflows may steal ports 8080/5173. Before restarting main workflows:
```
fuser -k 8080/tcp 5173/tcp 2>/dev/null; sleep 2
```
Restart order: ports → `artifacts/api-server: API Server` → `artifacts/nexus: web`

## Nexus OS Features

### Core Views (all real, no "Coming Soon")
- **Page Editor** — TipTap block editor with slash commands, markdown, code highlighting
- **Database View** — Notion-style table/kanban/gallery views
- **Knowledge Graph** — react-force-graph-2d visual page connections
- **Meetings View** — Full calendar (month/week/list), create meetings, connect Google/Apple/Outlook calendar
- **Tasks View** — Task list with priority, status, due dates, filtering, sorting
- **Library View** — Recent pages grid/list, collections, 8+ templates
- **Trash View** — Deleted pages with restore/permanent delete
- **AI Agents Panel** — 5 agents (Research, Writing, Data, Automation, Nexus Assistant) with REAL AI chat via `/api/ai/chat`; Chat/Tools toggle; Composio tools browser
- **Marketplace** — Live Composio app catalog (1,033 apps), real OAuth connection flow, disconnect support
- **Settings** — Providers (25+ AI), Memory, Skills, MCP (live Composio MCP URL), Appearance, Import, People, Security

### AI & Integration
- 25+ AI providers (OpenAI, Anthropic, Gemini, Groq, Mistral, Ollama, etc.)
- AI memory system (short/long-term, skills, preferences) stored in DB
- **Composio v3 full integration** — 1,033 connectors, OAuth, actions, triggers, MCP
- MCP Protocol: live Composio MCP URL + custom server management (localStorage)
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
- `GET /api/composio/status` — Composio account status
- `GET /api/composio/apps` — all 1,033 Composio apps
- `GET /api/composio/connections` — user OAuth connections
- `GET /api/composio/connections/health` — health stats (total/active/expired) — MUST be before `:id` routes
- `DELETE /api/composio/connections/stale/cleanup` — delete EXPIRED connections — MUST be before `:id` routes
- `GET /api/composio/connections/:id/status` — poll single connection status (INITIATED→ACTIVE)
- `POST /api/composio/connections/initiate` — start OAuth flow
- `DELETE /api/composio/connections/:id` — disconnect app
- `GET /api/composio/integrations` — list integrations
- `GET /api/composio/actions` — browse Composio actions
- `POST /api/composio/actions/execute` — execute a Composio action (with NO_ACTIVE_CONNECTION error handling)
- `GET /api/composio/calendar/events` — sync calendar events via multi-action fallback chain
- `GET /api/composio/triggers` — list triggers
- `GET /api/composio/triggers/instances` — list active trigger subscriptions
- `POST /api/composio/triggers/:name/subscribe` — subscribe to a trigger
- `DELETE /api/composio/triggers/:name/unsubscribe` — unsubscribe from trigger
- `POST /api/composio/webhook` — receive Composio trigger events (stores in ring buffer, pushes to SSE)
- `GET /api/composio/webhook/events` — fetch last 100 webhook events from ring buffer
- `GET /api/composio/webhook/stream` — SSE real-time webhook event stream (replaces polling)
- `GET /api/composio/webhook/config` — returns webhook URL for Composio dashboard setup
- `GET /api/composio/mcp` — get Composio MCP server config

### Agent Tool Execution (AgentsPanel)
- LLM emits `TOOL_CALL: ACTION_NAME {...}` in response → auto-detected and executed via `/api/composio/actions/execute`
- After successful execution: `synthesizeToolResult()` calls LLM again with tool output → produces human-readable summary appended to conversation
- Manual "Execute" button on pending tool calls also triggers synthesis
- If app not connected: toast with link to Settings → Integrations
- `agent`, `conversationSnapshot`, `providerId` all passed through for full context

### Triggers & Webhooks (TriggersSection)
- Switched from 4s polling to true SSE (`EventSource`) via `/api/composio/webhook/stream`
- On SSE connect: server sends `init` event with existing ring buffer (last 20 events)
- On new webhook POST: server pushes `event` message to all SSE clients instantly
- SSE error fallback: falls back to one-time REST fetch of `/api/composio/webhook/events`
- "● Live" / "○ Paused" toggle controls SSE connection lifecycle

### Composio Config
- **Base URL**: `https://backend.composio.dev/api/v1`
- **Auth**: `x-api-key` header using `COMPOSIO_API_KEY` env secret
- **MCP URL**: `https://mcp.composio.dev?apiKey={KEY}&entityId={entityId}`
- **Account**: `time.plixerofficial@gmail.com` (free plan)
- **SDK**: `composio-core@0.5.39` installed in api-server

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
- nexus-hub-clone at `/nexus-hub` — legacy, ignore all `nexus-hub-clone/*` workflows

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
