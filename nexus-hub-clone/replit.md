# Nexus OS — Unified Knowledge OS

## Overview

A full-stack Knowledge OS combining Notion's block editor, Obsidian-style wiki-links, BrowserOS-style 2-tier AI memory + skills, and 25+ AI providers. Built as a pnpm monorepo with React + Vite + Express + PostgreSQL (Drizzle ORM).

## Architecture

- **Monorepo**: pnpm workspaces
- **Frontend** (`artifacts/nexus`): React + Vite + TipTap v3 editor, Zustand state, port 18245
- **API Server** (`artifacts/api-server`): Express 5 + Drizzle ORM, port 8080, mounted at `/api`
- **API Client** (`lib/api-client-react`): Orval-generated React Query hooks from OpenAPI spec
- **DB** (`lib/db`): Drizzle schema + migrations for PostgreSQL
- **Electron** (`electron/`): Desktop wrapper (optional), loads web app at configurable URL
- **Node.js**: v24 | **TypeScript**: 5.9 | **Package manager**: pnpm

## Design System

- **Inspiration**: AFFiNE (dark navy), Notion (sidebar + editor UX), Attio (clean cards)
- **Dark mode** (default): deep navy `--background: 222 47% 5%`, indigo primary `245 85% 62%`
- **Light mode**: off-white background `248 33% 97%`, same indigo primary
- **Pattern**: `hsl(var(--token))` for all color usages
- **Sidebar**: `bg-sidebar` (separate var `--color-sidebar`), uses `border-sidebar-border` alias
- **Scrollbars**: styled via `::-webkit-scrollbar` in `index.css`

## Critical Notes

### API Routing
- Generated API client URLs already include `/api` prefix (e.g., `/api/workspaces`)
- Vite dev proxy: `/api` → `http://localhost:8080`
- Express mounts router at `/api` in `artifacts/api-server/src/app.ts`
- Do NOT call `setBaseUrl("/api")` — it double-prefixes paths
- `/api/memory/*` and `/api/skills/*` proxy to `aiRouter` via `proxyToAiRouter()` helper in `routes/index.ts`

### Real-Time Sync (SSE)
- `artifacts/api-server/src/routes/events.ts` — SSE endpoint at `GET /api/events`
- `broadcastEvent(event, data)` exported from `events.ts`, called in `pages.ts` on create/update/delete/content-save
- Frontend: `artifacts/nexus/src/hooks/useRealtimeSync.ts` — EventSource hook that invalidates React Query on events
- Hook mounted in `App.tsx` via `<RealtimeProvider />`

### TipTap v3 Import Changes
- `BubbleMenu` moved from `@tiptap/react` → `@tiptap/react/menus`
- `Table`, `TableRow`, `TableCell`, `TableHeader` → replaced by `TableKit` from `@tiptap/extension-table`
- `TextStyle` and `Color` → both named exports from `@tiptap/extension-text-style`

### Routing & Navigation
- Routes: `/`, `/page/:pageId`, `/settings/:section?`, `/database/:databaseId`, `/agents`, `/marketplace`, `/library`, `/tasks`, `/trash`, `/meetings`, `/connections`
- `activeView` store type (expanded): `"home" | "page" | "settings" | "database" | "ai" | "agents" | "marketplace" | "connections" | "library" | "tasks" | "trash" | "chat" | "meetings" | "import" | "teamspaces" | "people"`
- AppShell: renders the correct panel based on `activeView`
- Keyboard shortcuts: `⌘P` → SearchModal, `⌘K` → AIBubble (cmd+k overlay)
- PageTreeItem: `isActive` is true only when `activeView === "page"` AND `currentPageId === page.id`

### AI Providers Fix
- Session-auth providers (`authType === "session"`) do NOT show the "Test" button — it would always fail without API keys
- Session providers show a blue info badge and explain browser-session auth instead

## Key Files

| File | Purpose |
|------|---------|
| `artifacts/nexus/src/App.tsx` | Router + providers + RealtimeProvider |
| `artifacts/nexus/src/store/app.ts` | Zustand store (expanded activeView union type) |
| `artifacts/nexus/src/components/layout/AppShell.tsx` | Main layout + routing for all views |
| `artifacts/nexus/src/components/layout/Sidebar.tsx` | Notion-style sidebar with sections + Nexus Apps |
| `artifacts/nexus/src/components/EmptyState.tsx` | Notion-style home: AI prompt bar + model selector + Get Started |
| `artifacts/nexus/src/components/agents/AgentsPanel.tsx` | AI Agents panel (list/run/stop/create sub-agents) |
| `artifacts/nexus/src/components/marketplace/MarketplacePage.tsx` | MCP & Connections marketplace (24 apps) |
| `artifacts/nexus/src/components/editor/PageEditor.tsx` | TipTap v3 block editor with autosave |
| `artifacts/nexus/src/components/ai/AIBubble.tsx` | AI Cmd+K overlay (chat, skill runners) |
| `artifacts/nexus/src/hooks/useRealtimeSync.ts` | SSE real-time sync hook |
| `artifacts/nexus/src/pages/SettingsPage.tsx` | Full Notion-style settings (14 sections) |
| `artifacts/api-server/src/routes/events.ts` | SSE broadcast endpoint + broadcastEvent() |
| `artifacts/api-server/src/routes/index.ts` | Express router registration |
| `artifacts/api-server/src/routes/pages.ts` | Page CRUD + SSE event broadcasting |
| `lib/api-client-react/src/generated/api.ts` | Orval-generated hooks + fetchers |
| `electron/main.js` | Electron desktop wrapper main process |
| `electron/preload.js` | Electron preload (contextBridge IPC) |
| `electron/package.json` | Electron build config (electron-builder) |

## Features Implemented

- **Home Dashboard**: Notion-style "What's our quest today?" with AI prompt bar, model selector (Sonnet/Opus/GPT-5/Gemini), app connector icons row, Get Started cards, Recent pages
- **Notion-style Sidebar**: Workspace header, Home/AI/Agents/Meetings/Settings nav, Recent/Favorites/Shared/Private page sections, Nexus Apps bottom section (Library/Tasks/Marketplace/Help/Trash)
- **SSE Real-time Sync**: `/api/events` broadcasts page:created/updated/deleted/content:saved → React Query auto-invalidates
- **Agents Panel**: 4 built-in agents (Research/Writing/Data/Automation), run/stop, activity log, task prompt, create custom agents
- **MCP Marketplace**: 24 integrations (ChatGPT, Claude, Composio, Cursor, GitHub, Linear, VS Code etc.), Discover/Manage tabs, category filter, search
- **Settings (14 sections)**: Profile, Preferences, Notifications, Integrations, General, People, Import (6 sources), AI Providers (fixed session auth), AI Memory, AI Skills, MCP, Agents config, Appearance, Security
- **AI Providers Fix**: Session-auth providers no longer show "Test" button; show clear info instead
- **Electron Wrapper**: `electron/` directory with main.js, preload.js, package.json — run `npm run start:dev` in `electron/` to launch desktop app
- **App Shell**: Sidebar with workspace switcher, page tree, favorites, recent pages, Home/Settings nav
- **Block Editor**: TipTap v3 with bubble menu, autosave (1.5s), heading/list/code/table/task blocks, slash commands, wiki-links
- **Database Views**: Table view (inline editing) + Kanban view by status
- **AI Bubble**: Cmd+K overlay with chat mode, skill runners
- **Search**: Full-text search modal (Cmd+P)
- **Auto-seeding**: New workspaces get starter pages

## Electron Desktop App

```bash
cd electron
npm install
npm run start:dev   # opens app pointing at localhost:18245
```

Build distributable:
```bash
npm run build:mac   # DMG for macOS
npm run build:win   # NSIS for Windows
npm run build:linux # AppImage + deb
```

## Database Schema (PostgreSQL)

- `users`, `workspaces`, `workspace_members`, `pages`, `page_content`, `page_links`
- `databases`, `database_rows`, `tags`
- `ai_providers`, `ai_conversations`, `memories`, `skills`

## GitHub Repository

- **Repo**: https://github.com/Time-Plixer-Production/Nexus-Hub (private)
- **Branch**: `main`
- **Token**: stored as `GITHUB_TOKEN` secret
- **Push command**: `git push "https://Time-Plixer-Production:${GITHUB_TOKEN}@github.com/Time-Plixer-Production/Nexus-Hub.git" main`

## Key Commands

```bash
pnpm --filter @workspace/nexus run dev
pnpm --filter @workspace/api-server run dev
pnpm --filter @workspace/db run push
pnpm --filter @workspace/api-client-react run codegen
```
