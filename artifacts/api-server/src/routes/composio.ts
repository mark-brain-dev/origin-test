import { Router, type Request, type Response } from "express";

const router = Router();

// ─── Constants ────────────────────────────────────────────────────────────────

const V1 = "https://backend.composio.dev/api/v1";
const V2 = "https://backend.composio.dev/api/v2";
const V3 = "https://backend.composio.dev/api/v3";

// In-memory webhook event ring buffer (last 100 events)
const WEBHOOK_EVENTS: Array<{
  id: string;
  triggerName: string;
  appName: string;
  entityId: string;
  payload: Record<string, unknown>;
  receivedAt: string;
}> = [];
const MAX_WEBHOOK_EVENTS = 100;

// SSE clients for real-time webhook event streaming
const SSE_CLIENTS = new Set<import("express").Response>();

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

function getKey(): string {
  const key = process.env.COMPOSIO_API_KEY;
  if (!key) throw new Error("COMPOSIO_API_KEY not set");
  return key;
}

function hdrs(extra: Record<string, string> = {}) {
  return { "x-api-key": getKey(), "Content-Type": "application/json", ...extra };
}

async function cFetch(base: string, path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${base}${path}`, { ...init, headers: { ...hdrs(), ...(init?.headers as Record<string,string> ?? {}) } });
}

const v1 = (path: string, init?: RequestInit) => cFetch(V1, path, init);
const v2 = (path: string, init?: RequestInit) => cFetch(V2, path, init);
const v3 = (path: string, init?: RequestInit) => cFetch(V3, path, init);

async function safeJson(r: Response): Promise<any> {
  const text = await r.text().catch(() => "{}");
  try { return JSON.parse(text); } catch { return { _raw: text }; }
}

// ─── Curated action catalog ───────────────────────────────────────────────────

const CURATED_ACTIONS: Record<string, Array<{
  name: string; displayName: string; description: string; parameters: string[];
}>> = {
  github: [
    { name: "GITHUB_CREATE_ISSUE", displayName: "Create Issue", description: "Create a new issue in a repository", parameters: ["owner", "repo", "title", "body"] },
    { name: "GITHUB_LIST_ISSUES", displayName: "List Issues", description: "List open issues in a repository", parameters: ["owner", "repo", "state"] },
    { name: "GITHUB_CREATE_PULL_REQUEST", displayName: "Create Pull Request", description: "Open a pull request between two branches", parameters: ["owner", "repo", "title", "head", "base"] },
    { name: "GITHUB_LIST_REPOS", displayName: "List Repositories", description: "List repositories for a user or org", parameters: ["username"] },
    { name: "GITHUB_CREATE_COMMENT", displayName: "Add Comment", description: "Comment on an issue or PR", parameters: ["owner", "repo", "issue_number", "body"] },
    { name: "GITHUB_STAR_REPO", displayName: "Star Repository", description: "Star a GitHub repository", parameters: ["owner", "repo"] },
    { name: "GITHUB_GET_USER", displayName: "Get User", description: "Get info about a GitHub user", parameters: ["username"] },
    { name: "GITHUB_LIST_COMMITS", displayName: "List Commits", description: "List commits in a repository", parameters: ["owner", "repo", "per_page"] },
  ],
  slack: [
    { name: "SLACK_SENDS_A_MESSAGE_TO_A_SLACK_CHANNEL", displayName: "Send Message", description: "Post a message to a Slack channel", parameters: ["channel", "text"] },
    { name: "SLACK_LIST_ALL_SLACK_TEAM_CHANNEL", displayName: "List Channels", description: "Get a list of public channels", parameters: [] },
    { name: "SLACK_FETCH_MESSAGE_HISTORY_OF_A_SLACK_CHANNEL", displayName: "Get Messages", description: "Retrieve messages from a channel", parameters: ["channel", "limit"] },
    { name: "SLACK_CREATE_A_NEW_SLACK_CHANNEL", displayName: "Create Channel", description: "Create a new Slack channel", parameters: ["name", "is_private"] },
    { name: "SLACK_SCHEDULE_A_MESSAGE_TO_SLACK_CHANNEL", displayName: "Schedule Message", description: "Schedule a message to be sent at a specific time", parameters: ["channel", "text", "post_at"] },
  ],
  gmail: [
    { name: "GMAIL_SEND_EMAIL", displayName: "Send Email", description: "Compose and send an email", parameters: ["to", "subject", "body"] },
    { name: "GMAIL_FETCH_EMAILS", displayName: "List Emails", description: "Fetch recent emails from inbox", parameters: ["max_results", "query"] },
    { name: "GMAIL_GET_MAIL", displayName: "Read Email", description: "Read a specific email by ID", parameters: ["message_id"] },
    { name: "GMAIL_REPLY_TO_EMAIL_THREAD", displayName: "Reply to Thread", description: "Reply to an existing email thread", parameters: ["thread_id", "body"] },
    { name: "GMAIL_SEARCH_PEOPLE", displayName: "Search Contacts", description: "Search Gmail contacts", parameters: ["query"] },
    { name: "GMAIL_CREATE_EMAIL_DRAFT", displayName: "Create Draft", description: "Save an email as a draft", parameters: ["to", "subject", "body"] },
  ],
  googlecalendar: [
    { name: "GOOGLECALENDAR_LIST_EVENTS", displayName: "List Events", description: "List upcoming calendar events", parameters: ["calendar_id", "time_min", "time_max", "max_results"] },
    { name: "GOOGLECALENDAR_CREATE_EVENT", displayName: "Create Event", description: "Create a calendar event", parameters: ["summary", "start_datetime", "end_datetime", "description", "attendees"] },
    { name: "GOOGLECALENDAR_FIND_FREE_SLOTS", displayName: "Find Free Slots", description: "Find available time slots", parameters: ["time_min", "time_max", "calendars"] },
    { name: "GOOGLECALENDAR_DELETE_EVENT", displayName: "Delete Event", description: "Remove an event from calendar", parameters: ["event_id", "calendar_id"] },
    { name: "GOOGLECALENDAR_UPDATE_EVENT", displayName: "Update Event", description: "Modify an existing calendar event", parameters: ["event_id", "summary", "start_datetime", "end_datetime"] },
    { name: "GOOGLECALENDAR_GET_CURRENT_DATE_TIME", displayName: "Get Current DateTime", description: "Get the current date and time", parameters: [] },
    { name: "GOOGLECALENDAR_QUICK_ADD", displayName: "Quick Add Event", description: "Create an event from a text string", parameters: ["text", "calendar_id"] },
  ],
  notion: [
    { name: "NOTION_CREATE_PAGE", displayName: "Create Page", description: "Create a new Notion page", parameters: ["parent_id", "title", "content"] },
    { name: "NOTION_LIST_DATABASES", displayName: "List Databases", description: "Get all databases in the workspace", parameters: [] },
    { name: "NOTION_QUERY_DATABASE", displayName: "Query Database", description: "Query items from a Notion database", parameters: ["database_id", "filter"] },
    { name: "NOTION_ADD_ITEM_TO_DATABASE", displayName: "Add Row", description: "Add a new row to a database", parameters: ["database_id", "properties"] },
    { name: "NOTION_UPDATE_PAGE", displayName: "Update Page", description: "Update properties of a Notion page", parameters: ["page_id", "properties"] },
    { name: "NOTION_SEARCH_NOTION_PAGE", displayName: "Search Pages", description: "Search across Notion workspace", parameters: ["query"] },
  ],
  linear: [
    { name: "LINEAR_CREATE_LINEAR_ISSUE", displayName: "Create Issue", description: "Create a new Linear issue", parameters: ["title", "description", "team_id", "priority"] },
    { name: "LINEAR_LIST_LINEAR_ISSUES", displayName: "List Issues", description: "Get issues assigned to you", parameters: ["team_id", "state"] },
    { name: "LINEAR_UPDATE_LINEAR_ISSUE", displayName: "Update Issue", description: "Update issue status or assignee", parameters: ["issue_id", "state", "assignee_id"] },
    { name: "LINEAR_CREATE_PROJECT", displayName: "Create Project", description: "Create a new Linear project", parameters: ["name", "team_id"] },
    { name: "LINEAR_GET_ISSUE_BY_ID", displayName: "Get Issue", description: "Get a specific issue by ID", parameters: ["issue_id"] },
  ],
  jira: [
    { name: "JIRA_CREATE_ISSUE", displayName: "Create Issue", description: "Create a Jira issue or bug", parameters: ["project", "summary", "issuetype", "description"] },
    { name: "JIRA_SEARCH_USING_JQL", displayName: "Search Issues", description: "Search Jira issues with JQL", parameters: ["jql", "max_results"] },
    { name: "JIRA_EDIT_ISSUE", displayName: "Update Issue", description: "Transition or update a Jira issue", parameters: ["issue_id_or_key", "fields"] },
    { name: "JIRA_ADD_COMMENT", displayName: "Add Comment", description: "Comment on a Jira issue", parameters: ["issue_id_or_key", "body"] },
    { name: "JIRA_GET_ISSUE", displayName: "Get Issue", description: "Get details of a specific Jira issue", parameters: ["issue_id_or_key"] },
  ],
  asana: [
    { name: "ASANA_CREATE_TASK", displayName: "Create Task", description: "Add a task to an Asana project", parameters: ["name", "projects", "due_on", "notes"] },
    { name: "ASANA_GET_TASKS_LIST", displayName: "List Tasks", description: "Get tasks from a project", parameters: ["project_gid", "assignee"] },
    { name: "ASANA_UPDATE_TASK", displayName: "Update Task", description: "Mark task complete or update fields", parameters: ["task_gid", "completed", "name"] },
    { name: "ASANA_CREATE_PROJECT", displayName: "Create Project", description: "Create a new Asana project", parameters: ["name", "team", "workspace"] },
  ],
  trello: [
    { name: "TRELLO_CREATE_CARD", displayName: "Create Card", description: "Add a card to a Trello list", parameters: ["name", "id_list", "desc"] },
    { name: "TRELLO_LIST_BOARDS", displayName: "List Boards", description: "Get all Trello boards for a member", parameters: [] },
    { name: "TRELLO_MOVE_CARD", displayName: "Move Card", description: "Move a card to a different list", parameters: ["id", "id_list"] },
    { name: "TRELLO_ADD_COMMENT_TO_CARD", displayName: "Add Comment", description: "Post a comment on a Trello card", parameters: ["id", "text"] },
  ],
  hubspot: [
    { name: "HUBSPOT_CREATE_CONTACT", displayName: "Create Contact", description: "Add a new contact to HubSpot CRM", parameters: ["email", "firstname", "lastname"] },
    { name: "HUBSPOT_LIST_CONTACTS", displayName: "List Contacts", description: "Get CRM contacts with filters", parameters: ["limit", "properties"] },
    { name: "HUBSPOT_CREATE_DEAL", displayName: "Create Deal", description: "Create a new deal in the pipeline", parameters: ["dealname", "amount", "pipeline"] },
    { name: "HUBSPOT_SEND_EMAIL", displayName: "Send Email", description: "Send a marketing email via HubSpot", parameters: ["to", "subject", "body"] },
  ],
  stripe: [
    { name: "STRIPE_LIST_CUSTOMERS", displayName: "List Customers", description: "Retrieve Stripe customers", parameters: ["limit", "email"] },
    { name: "STRIPE_CREATE_PAYMENT_LINK", displayName: "Create Payment Link", description: "Generate a shareable payment link", parameters: ["price", "quantity"] },
    { name: "STRIPE_LIST_PAYMENTS", displayName: "List Payments", description: "Get recent payment intents", parameters: ["limit"] },
    { name: "STRIPE_GET_BALANCE", displayName: "Get Balance", description: "Retrieve current Stripe balance", parameters: [] },
  ],
  googledrive: [
    { name: "GOOGLEDRIVE_LIST_FILES", displayName: "List Files", description: "Browse files in Google Drive", parameters: ["query", "page_size"] },
    { name: "GOOGLEDRIVE_CREATE_FILE", displayName: "Upload File", description: "Create or upload a file to Drive", parameters: ["name", "content", "mime_type"] },
    { name: "GOOGLEDRIVE_SHARE_FILE", displayName: "Share File", description: "Share a file with a user", parameters: ["file_id", "email", "role"] },
    { name: "GOOGLEDRIVE_FIND_FILE", displayName: "Find File", description: "Search for a file in Drive", parameters: ["name", "query"] },
  ],
  twitter: [
    { name: "TWITTER_CREATION_OF_A_POST", displayName: "Post Tweet", description: "Publish a tweet to Twitter/X", parameters: ["text"] },
    { name: "TWITTER_FETCH_MENTIONS", displayName: "Get Mentions", description: "Fetch your latest mentions", parameters: ["max_results"] },
    { name: "TWITTER_SEARCH_TWITTER", displayName: "Search Tweets", description: "Search Twitter for a keyword", parameters: ["query", "max_results"] },
  ],
  discord: [
    { name: "DISCORD_SENDS_A_MESSAGE_TO_A_DISCORD_CHANNEL", displayName: "Send Message", description: "Post to a Discord channel", parameters: ["channel_id", "content"] },
    { name: "DISCORD_LIST_GUILD_CHANNELS", displayName: "List Channels", description: "List all channels in a server", parameters: ["guild_id"] },
    { name: "DISCORD_GET_MESSAGES_FROM_A_CHANNEL", displayName: "Get Messages", description: "Read messages from a channel", parameters: ["channel_id", "limit"] },
  ],
  zoom: [
    { name: "ZOOM_CREATE_MEETING", displayName: "Create Meeting", description: "Schedule a Zoom meeting", parameters: ["topic", "start_time", "duration"] },
    { name: "ZOOM_LIST_MEETINGS", displayName: "List Meetings", description: "Get upcoming Zoom meetings", parameters: [] },
    { name: "ZOOM_GET_MEETING_DETAILS", displayName: "Get Meeting Details", description: "Get details of a specific meeting", parameters: ["meeting_id"] },
  ],
  shopify: [
    { name: "SHOPIFY_LIST_PRODUCTS", displayName: "List Products", description: "Retrieve Shopify products", parameters: ["limit", "status"] },
    { name: "SHOPIFY_CREATE_PRODUCT", displayName: "Create Product", description: "Add a new product to your store", parameters: ["title", "price", "vendor"] },
    { name: "SHOPIFY_GET_ORDERS", displayName: "Get Orders", description: "List recent store orders", parameters: ["limit", "status"] },
  ],
  outlook: [
    { name: "OUTLOOK_SEND_EMAIL", displayName: "Send Email", description: "Send an email via Outlook", parameters: ["to", "subject", "body"] },
    { name: "OUTLOOK_LIST_EMAILS", displayName: "List Emails", description: "Fetch emails from Outlook inbox", parameters: ["max_results"] },
    { name: "OUTLOOK_GET_CALENDAR_EVENTS", displayName: "List Calendar Events", description: "Get upcoming calendar events", parameters: ["start_date", "end_date"] },
    { name: "OUTLOOK_CREATE_EVENT", displayName: "Create Calendar Event", description: "Create an event in Outlook Calendar", parameters: ["subject", "start", "end"] },
  ],
};

// Flat list of all actions for quick lookup
function findAction(name: string) {
  for (const [appKey, acts] of Object.entries(CURATED_ACTIONS)) {
    const a = acts.find(x => x.name.toLowerCase() === name.toLowerCase());
    if (a) return { ...a, appKey };
  }
  return null;
}

// ─── Apps ─────────────────────────────────────────────────────────────────────

router.get("/apps", async (_req, res: Response) => {
  try {
    const r = await v1("/apps");
    if (!r.ok) { const e = await safeJson(r); res.status(r.status).json(e); return; }
    const data = await safeJson(r);
    res.json(data);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get("/apps/:appName", async (req: Request, res: Response) => {
  try {
    const r = await v1("/apps");
    if (!r.ok) { res.status(r.status).json({ error: "Apps unavailable" }); return; }
    const data = await safeJson(r);
    const app = (data.items || []).find(
      (a: any) => a.key === req.params.appName || a.name === req.params.appName
    );
    if (!app) { res.status(404).json({ error: "App not found" }); return; }
    const actions = CURATED_ACTIONS[app.key] || [];
    res.json({ ...app, actions, actionsCount: actions.length });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── Connections ──────────────────────────────────────────────────────────────

// GET all connections for an entity (v3)
router.get("/connections", async (req: Request, res: Response) => {
  const entityId = (req.query.entityId as string) || "default";
  const appName = req.query.appName as string | undefined;
  try {
    const params = new URLSearchParams({ user_uuid: entityId, limit: "50" });
    if (appName) params.set("toolkit", appName);
    const r = await v3(`/connected_accounts?${params}`);
    if (!r.ok) {
      const p2 = new URLSearchParams({ entityId });
      if (appName) p2.set("appName", appName);
      const r2 = await v1(`/connectedAccounts?${p2}`);
      if (!r2.ok) { res.json({ items: [], total: 0 }); return; }
      res.json(await safeJson(r2));
      return;
    }
    const data = await safeJson(r);
    const items = (data.items || []).map((c: any) => ({
      id: c.id,
      uuid: c.deprecated?.uuid,
      appName: c.toolkit?.slug || c.appName,
      status: c.status,
      entityId: c.user_id || entityId,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
      authScheme: c.authScheme || c.auth_config?.auth_scheme,
    }));
    res.json({ items, total: data.total || items.length });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// GET connection health dashboard — MUST be before /connections/:id
router.get("/connections/health", async (_req: Request, res: Response) => {
  try {
    const r = await v3(`/connected_accounts?limit=100`);
    if (!r.ok) { res.status(500).json({ error: "Could not fetch connections" }); return; }
    const data = await safeJson(r);
    const now = Date.now();
    const items = (data.items || []).map((c: any) => ({
      id: c.id,
      appName: c.toolkit?.slug || "unknown",
      status: c.status,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
      authScheme: c.authScheme,
      ageMinutes: c.created_at ? Math.round((now - new Date(c.created_at).getTime()) / 60000) : null,
    }));
    const byStatus = items.reduce((acc: Record<string, number>, c: any) => {
      acc[c.status] = (acc[c.status] || 0) + 1;
      return acc;
    }, {});
    res.json({
      total: items.length,
      byStatus,
      active: byStatus["ACTIVE"] || 0,
      expired: byStatus["EXPIRED"] || 0,
      initiated: byStatus["INITIATED"] || 0,
      items,
    });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// GET single connection by ID (v3 short ID or UUID)
router.get("/connections/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    // Try v3 first (short ID like ca_XXXXX)
    const r = await v3(`/connected_accounts/${id}`);
    if (r.ok) {
      const data = await safeJson(r);
      res.json({
        id: data.id,
        uuid: data.deprecated?.uuid,
        appName: data.toolkit?.slug,
        status: data.status,
        entityId: data.user_id,
        redirectUrl: data.data?.redirectUrl || data.redirect_url,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      });
      return;
    }
    // Fallback v1
    const r2 = await v1(`/connectedAccounts/${id}`);
    if (!r2.ok) { res.status(r2.status).json({ error: "Connection not found" }); return; }
    res.json(await safeJson(r2));
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// GET connection status — poll for INITIATED → ACTIVE transition
router.get("/connections/:id/status", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const r = await v3(`/connected_accounts/${id}`);
    if (!r.ok) { res.status(r.status).json({ status: "UNKNOWN", error: "Not found" }); return; }
    const data = await safeJson(r);
    res.json({
      id: data.id,
      status: data.status, // INITIATED | ACTIVE | FAILED | EXPIRED
      appName: data.toolkit?.slug,
      entityId: data.user_id,
      isActive: data.status === "ACTIVE",
    });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Normalize toolkit slugs (Composio uses non-obvious slug names for some apps)
const SLUG_MAP: Record<string, string> = {
  onedrive: "one_drive",
  "microsoft-onedrive": "one_drive",
  googledocs: "googledocs",
  "google-docs": "googledocs",
  "google-drive": "googledrive",
  "google-calendar": "googlecalendar",
  "google-sheets": "googlesheets",
  "google-tasks": "googletasks",
  "google-meet": "google_meet",
  googlemeet: "google_meet",
  twitterv2: "twitter",
  "twitter-v2": "twitter",
  whatsapp: "whatsapp_cloud",
  "discord-bot": "discordbot",
};

// Apps that don't support Composio-managed OAuth (need user API key)
const NO_MANAGED_CREDS_APPS = new Set([
  "elevenlabs", "perplexityai", "perplexity", "openai", "anthropic",
  "firecrawl", "exa", "tavily", "serpapi", "sentry", "snowflake",
  "apollo", "klaviyo", "attio", "semrush", "cal", "posthog",
  "mem0", "wrike", "composio_search",
]);

// Apps that don't need any authentication
const NO_AUTH_APPS = new Set(["composio"]);

function normalizeSlug(appName: string): string {
  const lower = appName.toLowerCase();
  return SLUG_MAP[lower] || lower;
}

// POST initiate OAuth connection (v3 flow)
router.post("/connections/initiate", async (req: Request, res: Response) => {
  const { appName, entityId = "default", apiKey: userApiKey } = req.body;
  if (!appName) { res.status(400).json({ error: "appName is required" }); return; }

  const slug = normalizeSlug(appName);

  // Handle no-auth apps (Composio itself, etc.)
  if (NO_AUTH_APPS.has(slug)) {
    res.status(400).json({
      error: `${appName} doesn't require authentication`,
      code: "NO_AUTH_REQUIRED",
      noAuth: true,
    });
    return;
  }

  // Handle apps known to have no managed credentials
  if (NO_MANAGED_CREDS_APPS.has(slug) && !userApiKey) {
    res.status(400).json({
      error: `${appName} requires your own API key`,
      code: "REQUIRES_API_KEY",
      requiresApiKey: true,
      appName: slug,
      hint: `Provide your ${appName} API key to connect`,
    });
    return;
  }

  try {
    // Step 1: find existing ENABLED auth_config for this toolkit
    // NOTE: GET /auth_configs returns ALL configs — must filter by toolkit.slug
    let authConfigId: string | null = null;
    const acRes = await v3(`/auth_configs?limit=50`);
    if (acRes.ok) {
      const acData = await safeJson(acRes);
      const found = (acData.items || []).find(
        (ac: any) =>
          ac.toolkit?.slug?.toLowerCase() === slug &&
          ac.status === "ENABLED" &&
          !ac.deleted
      );
      if (found) authConfigId = found.id;
    }

    // Step 2: create auth_config if none found
    if (!authConfigId) {
      let createBody: Record<string, unknown>;

      if (userApiKey) {
        // User provided their own API key — use custom auth
        createBody = {
          toolkit: { slug },
          type: "use_custom_auth",
          authScheme: "API_KEY",
          credentials: { api_key: userApiKey },
        };
      } else {
        // Use Composio's managed OAuth
        createBody = { toolkit: { slug }, type: "use_composio_auth" };
      }

      const createRes = await v3("/auth_configs", {
        method: "POST",
        body: JSON.stringify(createBody),
      });
      const created = await safeJson(createRes);

      if (!createRes.ok) {
        const errCode = created?.error?.code;
        const errSlug = created?.error?.slug;
        const errMsg = created?.error?.message || "Failed to create auth config";

        // Code 303 = app doesn't need auth
        if (errCode === 303 || errSlug === "Auth_Config_NoAuthApp") {
          res.status(400).json({ error: `${appName} doesn't require authentication`, code: "NO_AUTH_REQUIRED", noAuth: true });
          return;
        }
        // Code 306 = no managed credentials for this toolkit
        if (errCode === 306 || errSlug === "Auth_Config_DefaultAuthConfigNotFound") {
          res.status(400).json({
            error: `${appName} requires your own API key`,
            code: "REQUIRES_API_KEY",
            requiresApiKey: true,
            appName: slug,
            hint: `Composio doesn't manage credentials for ${appName}. Provide your own API key.`,
          });
          return;
        }

        res.status(createRes.status).json({ error: errMsg });
        return;
      }

      // IMPORTANT: ID is at created.auth_config.id, NOT created.id
      authConfigId = created.auth_config?.id || created.id || null;
    }

    if (!authConfigId) {
      res.status(500).json({ error: `Could not find or create auth config for '${slug}'` });
      return;
    }

    // Step 3: create connected_account → initiates OAuth popup
    const connRes = await v3("/connected_accounts", {
      method: "POST",
      body: JSON.stringify({
        auth_config: { id: authConfigId },
        connection: { user_uuid: entityId },
      }),
    });
    const connData = await safeJson(connRes);

    if (!connRes.ok) {
      const errMsg = connData?.error?.message || "Failed to initiate connection";
      res.status(connRes.status).json({ error: errMsg });
      return;
    }

    const redirectUrl = connData.redirect_url || connData.redirectUrl || connData.redirectUri || null;
    res.json({
      ...connData,
      redirectUrl,
      connectionStatus: connData.status || "INITIATED",
    });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// DELETE stale INITIATED connections — MUST be before DELETE /connections/:id
router.delete("/connections/stale/cleanup", async (req: Request, res: Response) => {
  const staleMinutes = parseInt(req.query.staleMinutes as string || "5");
  try {
    const r = await v3(`/connected_accounts?limit=100`);
    if (!r.ok) { res.json({ deleted: 0, error: "Could not list connections" }); return; }
    const data = await safeJson(r);
    const now = Date.now();
    const stale = (data.items || []).filter((c: any) => {
      if (c.status !== "INITIATED") return false;
      const age = (now - new Date(c.created_at).getTime()) / 60000;
      return age > staleMinutes;
    });
    const deleted: string[] = [];
    for (const conn of stale) {
      const dr = await v3(`/connected_accounts/${conn.id}`, { method: "DELETE" });
      if (dr.ok || dr.status === 204) deleted.push(conn.id);
    }
    res.json({ deleted: deleted.length, ids: deleted, scanned: data.items?.length || 0 });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// DELETE single connection by ID — must be AFTER stale/cleanup
router.delete("/connections/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const r = await v3(`/connected_accounts/${id}`, { method: "DELETE" });
    if (r.ok || r.status === 204) { res.status(204).end(); return; }
    const r2 = await v1(`/connectedAccounts/${id}`, { method: "DELETE" });
    if (!r2.ok) { const e = await safeJson(r2); res.status(r2.status).json(e); return; }
    res.status(204).end();
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// GET connection health dashboard — all connections with status breakdown
router.get("/connections/health", async (_req: Request, res: Response) => {
  try {
    const r = await v3(`/connected_accounts?limit=100`);
    if (!r.ok) { res.status(500).json({ error: "Could not fetch connections" }); return; }
    const data = await safeJson(r);
    const now = Date.now();
    const items = (data.items || []).map((c: any) => ({
      id: c.id,
      appName: c.toolkit?.slug || "unknown",
      status: c.status,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
      authScheme: c.authScheme,
      ageMinutes: c.created_at ? Math.round((now - new Date(c.created_at).getTime()) / 60000) : null,
    }));
    const byStatus = items.reduce((acc: Record<string, number>, c: any) => {
      acc[c.status] = (acc[c.status] || 0) + 1;
      return acc;
    }, {});
    res.json({
      total: items.length,
      byStatus,
      active: byStatus["ACTIVE"] || 0,
      expired: byStatus["EXPIRED"] || 0,
      initiated: byStatus["INITIATED"] || 0,
      items,
    });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── Integrations ─────────────────────────────────────────────────────────────

router.get("/integrations", async (req: Request, res: Response) => {
  const { appId, appName, page = "1", limit = "50" } = req.query;
  const params = new URLSearchParams({ page: page as string, limit: limit as string });
  if (appId) params.set("appId", appId as string);
  if (appName) params.set("appName", appName as string);
  try {
    const r = await v1(`/integrations?${params}`);
    if (!r.ok) { const e = await safeJson(r); res.status(r.status).json(e); return; }
    res.json(await safeJson(r));
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── Actions ──────────────────────────────────────────────────────────────────

router.get("/actions", async (req: Request, res: Response) => {
  const { apps, useCase, limit = "100", search } = req.query;
  try {
    let actions: any[] = [];
    if (apps) {
      const appList = (apps as string).split(",").map(s => s.trim().toLowerCase());
      for (const appKey of appList) {
        const acts = CURATED_ACTIONS[appKey] || [];
        actions.push(...acts.map(a => ({ ...a, appName: appKey })));
      }
    } else {
      for (const [appKey, acts] of Object.entries(CURATED_ACTIONS)) {
        actions.push(...acts.map(a => ({ ...a, appName: appKey })));
      }
    }
    if (search) {
      const q = (search as string).toLowerCase();
      actions = actions.filter(a =>
        a.displayName.toLowerCase().includes(q) || a.description.toLowerCase().includes(q) || a.appName.toLowerCase().includes(q)
      );
    }
    if (useCase) {
      const q = (useCase as string).toLowerCase();
      actions = actions.filter(a =>
        a.displayName.toLowerCase().includes(q) || a.description.toLowerCase().includes(q)
      );
    }
    const limitN = parseInt(limit as string, 10) || 100;
    res.json({ items: actions.slice(0, limitN), totalItems: actions.length, totalPages: Math.ceil(actions.length / limitN) });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get("/actions/:actionName", async (req: Request, res: Response) => {
  const found = findAction(req.params.actionName);
  if (!found) { res.status(404).json({ error: "Action not found" }); return; }
  res.json(found);
});

// POST /api/composio/actions/execute
// v3 endpoint: POST /api/v3/tools/execute/{action_slug}
// Body: { connected_account_id, entity_id, version, arguments }
router.post("/actions/execute", async (req: Request, res: Response) => {
  const { actionName, input = {}, entityId = "default", connectedAccountId } = req.body;
  if (!actionName) { res.status(400).json({ error: "actionName is required" }); return; }

  const found = findAction(actionName);
  const appName = found?.appKey || actionName.split("_")[0].toLowerCase();

  try {
    // Resolve connected_account_id (prefer v3 short ca_ ID)
    let resolvedConnId: string | null = connectedAccountId || null;

    if (!resolvedConnId) {
      // Look up active connection for this entity + app
      const lookup = await v3(`/connected_accounts?user_uuid=${entityId}&toolkit=${appName}&status=ACTIVE&limit=5`);
      if (lookup.ok) {
        const ld = await safeJson(lookup);
        const conn = (ld.items || [])[0];
        if (conn) {
          resolvedConnId = conn.id; // Use v3 short ID (ca_XXXX) — v3 tools endpoint accepts it
        } else {
          // Also try without status filter in case INITIATED connections have become ACTIVE
          const lookup2 = await v3(`/connected_accounts?user_uuid=${entityId}&toolkit=${appName}&limit=5`);
          if (lookup2.ok) {
            const ld2 = await safeJson(lookup2);
            const conn2 = (ld2.items || []).find((c: any) => c.status === "ACTIVE");
            if (conn2) {
              resolvedConnId = conn2.id;
            } else {
              res.status(409).json({
                error: `No active ${appName} connection for this user`,
                code: "NO_ACTIVE_CONNECTION",
                appName,
                hint: `Connect ${appName} at /settings/integrations first`,
              });
              return;
            }
          }
        }
      }
    }

    // ── Attempt 1: v3 tools/execute (correct endpoint per v3 docs) ────────────
    const v3Body: Record<string, unknown> = {
      arguments: input,
      version: "latest",
    };
    if (resolvedConnId) v3Body.connected_account_id = resolvedConnId;
    else v3Body.entity_id = entityId;

    const r3 = await v3(`/tools/execute/${actionName}`, {
      method: "POST",
      body: JSON.stringify(v3Body),
    });
    const d3 = await safeJson(r3);

    if (r3.ok) {
      res.json({ ...d3, _engine: "v3" });
      return;
    }

    // ── Attempt 2: v3.1 endpoint ───────────────────────────────────────────────
    const r31 = await fetch(`https://backend.composio.dev/api/v3.1/tools/execute/${actionName}`, {
      method: "POST",
      headers: hdrs(),
      body: JSON.stringify(v3Body),
    });
    const d31 = await safeJson(r31);
    if (r31.ok) {
      res.json({ ...d31, _engine: "v3.1" });
      return;
    }

    // ── Attempt 3: v2 fallback with UUID ──────────────────────────────────────
    let uuid: string | null = null;
    if (resolvedConnId?.startsWith("ca_")) {
      const sr = await v3(`/connected_accounts/${resolvedConnId}`);
      if (sr.ok) { const sd = await safeJson(sr); uuid = sd.deprecated?.uuid || null; }
    } else {
      uuid = resolvedConnId;
    }

    const v2Body: Record<string, unknown> = { input };
    if (uuid) v2Body.connectedAccountId = uuid;
    else { v2Body.entityId = entityId; v2Body.appName = appName; }

    const r2 = await v2(`/actions/${actionName}/execute`, { method: "POST", body: JSON.stringify(v2Body) });
    const d2 = await safeJson(r2);
    if (r2.ok) {
      res.json({ ...d2, _engine: "v2" });
      return;
    }

    // All attempts failed — return best error
    const errDetail = d3?.error?.message || d3?.message || d2?.message || "Action execution failed";
    res.status(r3.status || 400).json({ error: errDetail, details: { v3: d3, v2: d2 } });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── Calendar Events ──────────────────────────────────────────────────────────

function normalizeCalendarEvents(data: any, provider: string): any[] {
  const raw = data?.response_data || data?.data || data || {};
  const items: any[] = raw.items || raw.events || raw.value || raw.calendars || [];
  return items.map((e: any) => ({
    id: e.id || e.iCalUID || String(Math.random()),
    title: e.summary || e.subject || e.title || "Untitled Event",
    startTime: e.start?.dateTime || e.start?.date || e.start || e.startDateTime || e.start_time,
    endTime: e.end?.dateTime || e.end?.date || e.end || e.endDateTime || e.end_time,
    description: e.description || e.bodyPreview || e.body?.content || "",
    location: e.location?.displayName || e.location || "",
    attendees: (e.attendees || []).map((a: any) => a.email || a.emailAddress?.address || a),
    isAllDay: !!(e.start?.date && !e.start?.dateTime),
    status: e.status || "confirmed",
    provider,
  })).filter((e: any) => e.startTime);
}

// GET /api/composio/calendar/events — fetch real events from Google Calendar or Outlook
router.get("/calendar/events", async (req: Request, res: Response) => {
  const entityId = (req.query.entityId as string) || "default";
  const provider = (req.query.provider as string) || "googlecalendar";
  const timeMin = (req.query.timeMin as string) || new Date(Date.now() - 7 * 86400000).toISOString();
  const timeMax = (req.query.timeMax as string) || new Date(Date.now() + 30 * 86400000).toISOString();

  try {
    const lookup = await v3(`/connected_accounts?user_uuid=${entityId}&toolkit=${provider}&status=ACTIVE&limit=5`);
    if (!lookup.ok) { res.json({ events: [], connected: false, error: "Could not check connections" }); return; }
    const ld = await safeJson(lookup);
    const conn = (ld.items || [])[0];
    if (!conn) { res.json({ events: [], connected: false, provider }); return; }

    const connUuid = conn.deprecated?.uuid || conn.id;
    const connShortId = conn.id;

    // Try multiple action names in order of likelihood
    const candidates: Array<{ action: string; input: Record<string, unknown> }> =
      provider === "googlecalendar"
        ? [
            { action: "GOOGLECALENDAR_LIST_EVENTS", input: { calendar_id: "primary", time_min: timeMin, time_max: timeMax, max_results: 50 } },
            { action: "GOOGLECALENDAR_GET_EVENTS", input: { calendar_id: "primary", time_min: timeMin, time_max: timeMax } },
            { action: "GOOGLECALENDAR_FIND_FREE_SLOTS", input: { time_min: timeMin, time_max: timeMax } },
          ]
        : [
            { action: "OUTLOOK_GET_CALENDAR_EVENTS", input: { start_date: timeMin, end_date: timeMax } },
            { action: "OUTLOOK_LIST_CALENDAR_EVENTS", input: { start: timeMin, end: timeMax } },
          ];

    for (const { action, input } of candidates) {
      // Try v3 tools endpoint first
      const r3 = await v3(`/tools/execute/${action}`, {
        method: "POST",
        body: JSON.stringify({ arguments: input, version: "latest", connected_account_id: connShortId }),
      });
      if (r3.ok) {
        const d3 = await safeJson(r3);
        const events = normalizeCalendarEvents(d3, provider);
        if (events.length > 0) { res.json({ events, connected: true, provider, total: events.length, action, engine: "v3" }); return; }
      }
      // v2 fallback with UUID
      const r2 = await v2(`/actions/${action}/execute`, {
        method: "POST",
        body: JSON.stringify({ input, connectedAccountId: connUuid }),
      });
      if (r2.ok) {
        const d2 = await safeJson(r2);
        const events = normalizeCalendarEvents(d2, provider);
        if (events.length > 0) { res.json({ events, connected: true, provider, total: events.length, action, engine: "v2" }); return; }
      }
    }

    res.json({ events: [], connected: true, provider, total: 0, warning: "No events found in the specified date range" });
  } catch (err: any) {
    res.json({ events: [], connected: false, error: err.message });
  }
});

// GET /api/composio/gmail/inbox — fetch emails from Gmail via Composio
router.get("/gmail/inbox", async (req: Request, res: Response) => {
  const entityId = (req.query.entityId as string) || "default";
  const maxResults = parseInt((req.query.maxResults as string) || "25", 10);
  const query = (req.query.q as string) || "in:inbox";
  const pageToken = req.query.pageToken as string | undefined;

  try {
    // Find active Gmail connection
    const lookup = await v3(`/connected_accounts?user_uuid=${entityId}&toolkit=gmail&status=ACTIVE&limit=5`);
    if (!lookup.ok) { res.json({ emails: [], connected: false, error: "Could not check connections" }); return; }
    const ld = await safeJson(lookup);
    const conn = (ld.items || [])[0];
    if (!conn) { res.json({ emails: [], connected: false }); return; }

    const connShortId = conn.id;
    const connUuid = conn.deprecated?.uuid || conn.id;

    // Try action candidates in order
    const candidates = [
      { action: "GMAIL_FETCH_EMAILS", input: { max_results: maxResults, query, include_spam_trash: false, ...(pageToken ? { page_token: pageToken } : {}) } },
      { action: "GMAIL_LIST_EMAILS", input: { max_results: maxResults, query } },
      { action: "GMAIL_GET_EMAILS", input: { max_results: maxResults, q: query } },
    ];

    for (const { action, input } of candidates) {
      // v3 first
      const r3 = await v3(`/tools/execute/${action}`, {
        method: "POST",
        body: JSON.stringify({ arguments: input, version: "latest", connected_account_id: connShortId }),
      });
      if (r3.ok) {
        const d = await safeJson(r3);
        const emails = normalizeEmails(d);
        if (emails.length > 0 || d?.data?.messages !== undefined || d?.response_data?.messages !== undefined) {
          res.json({ emails, connected: true, total: emails.length, action, engine: "v3", nextPageToken: d?.data?.nextPageToken });
          return;
        }
      }
      // v2 fallback
      const r2 = await v2(`/actions/${action}/execute`, {
        method: "POST",
        body: JSON.stringify({ input, connectedAccountId: connUuid }),
      });
      if (r2.ok) {
        const d = await safeJson(r2);
        const emails = normalizeEmails(d);
        if (emails.length > 0) {
          res.json({ emails, connected: true, total: emails.length, action, engine: "v2" });
          return;
        }
      }
    }

    res.json({ emails: [], connected: true, total: 0, warning: "No emails found" });
  } catch (err: any) {
    res.json({ emails: [], connected: false, error: err.message });
  }
});

// POST /api/composio/gmail/send — send an email via Gmail
router.post("/gmail/send", async (req: Request, res: Response) => {
  const { entityId = "default", to, subject, body, cc, bcc } = req.body;
  if (!to || !subject || !body) {
    res.status(400).json({ error: "to, subject, and body are required" }); return;
  }
  try {
    const lookup = await v3(`/connected_accounts?user_uuid=${entityId}&toolkit=gmail&status=ACTIVE&limit=5`);
    if (!lookup.ok) { res.status(503).json({ error: "Could not check Gmail connection" }); return; }
    const ld = await safeJson(lookup);
    const conn = (ld.items || [])[0];
    if (!conn) { res.status(400).json({ error: "No active Gmail connection", code: "NO_ACTIVE_CONNECTION", appName: "gmail" }); return; }

    const connShortId = conn.id;
    const connUuid = conn.deprecated?.uuid || conn.id;
    const input: Record<string, unknown> = { recipient_email: to, subject, body, ...(cc ? { cc } : {}), ...(bcc ? { bcc } : {}) };

    const r3 = await v3(`/tools/execute/GMAIL_SEND_EMAIL`, {
      method: "POST",
      body: JSON.stringify({ arguments: input, version: "latest", connected_account_id: connShortId }),
    });
    if (r3.ok) { const d = await safeJson(r3); res.json({ success: true, data: d, engine: "v3" }); return; }

    const r2 = await v2(`/actions/GMAIL_SEND_EMAIL/execute`, {
      method: "POST",
      body: JSON.stringify({ input: { ...input, recipient_email: to }, connectedAccountId: connUuid }),
    });
    if (r2.ok) { const d = await safeJson(r2); res.json({ success: true, data: d, engine: "v2" }); return; }

    const e = await safeJson(r2);
    res.status(400).json({ error: e.message || "Failed to send email" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Helper — normalize email objects from different Composio action response shapes
// safeStr — coerce any Composio field value to a plain string
function safeStr(val: any, fallback = ""): string {
  if (val == null) return fallback;
  if (typeof val === "string") return val;
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  // Object with a "text" or "plain" or "html" key (Composio nested body shapes)
  if (typeof val === "object") {
    const s =
      val.text ?? val.plain ?? val.html ?? val.body ?? val.content ??
      val.subject ?? val.value ?? val.snippet ?? val.preview ?? null;
    if (s != null) return safeStr(s, fallback);
    // Last resort: JSON stringify (avoids React "Objects are not valid" crash)
    try { return JSON.stringify(val); } catch { return fallback; }
  }
  return fallback;
}

function normalizeEmails(raw: any): Array<{
  id: string; threadId: string; subject: string; from: string; to: string;
  snippet: string; body: string; date: string; read: boolean; starred: boolean; labels: string[];
}> {
  // Unwrap various Composio response envelope shapes
  let data = raw;
  for (const key of ["data", "response_data", "result", "execution_details", "response"]) {
    if (raw?.[key] != null && typeof raw[key] === "object") { data = raw[key]; break; }
  }

  // Find the array of messages across all known shapes
  const messages: any[] = (
    data?.messages ??
    data?.emails ??
    data?.items ??
    data?.threads ??
    data?.messageList ??
    (Array.isArray(data) ? data : null) ??
    []
  );

  return messages.map((m: any, i: number) => {
    const rawBody = m.body ?? m.htmlBody ?? m.textBody ?? m.content ?? m.html ?? m.text ?? m.snippet ?? "";
    const bodyStr = safeStr(rawBody);

    const rawSubject = m.subject ?? m.Subject ?? m.title ?? "";
    const rawFrom = m.from ?? m.From ?? m.sender ?? m.fromEmail ?? m.senderEmail ?? "";
    const rawTo = m.to ?? m.To ?? m.recipient ?? m.recipientEmail ?? "";
    const rawSnippet = m.snippet ?? m.preview ?? m.summary ?? "";

    return {
      id: safeStr(m.id ?? m.messageId ?? m.message_id ?? `msg-${i}`),
      threadId: safeStr(m.threadId ?? m.thread_id ?? m.id ?? `thread-${i}`),
      subject: safeStr(rawSubject) || "(no subject)",
      from: safeStr(rawFrom),
      to: safeStr(rawTo),
      snippet: safeStr(rawSnippet) || bodyStr.slice(0, 150).replace(/<[^>]+>/g, ""),
      body: bodyStr,
      date: safeStr(m.date ?? m.internalDate ?? m.receivedAt ?? m.timestamp ?? m.created_at ?? new Date().toISOString()),
      read: !!(m.read ?? m.isRead ?? m.is_read ?? !(m.labelIds ?? m.labels ?? []).includes?.("UNREAD") ?? true),
      starred: !!(m.starred ?? m.isStarred ?? m.is_starred ?? (m.labelIds ?? m.labels ?? []).includes?.("STARRED") ?? false),
      labels: Array.isArray(m.labelIds) ? m.labelIds : Array.isArray(m.labels) ? m.labels : [],
    };
  });
}

// ─── Agent Context ────────────────────────────────────────────────────────────

// GET /api/composio/agent-context — tool availability context for AI system prompts
router.get("/agent-context", async (req: Request, res: Response) => {
  const entityId = (req.query.entityId as string) || "default";
  try {
    const r = await v3(`/connected_accounts?user_uuid=${entityId}&limit=50`);
    const data = r.ok ? await safeJson(r) : { items: [] };
    const connections: Array<{ appName: string; status: string; id: string }> =
      (data.items || []).map((c: any) => ({
        appName: c.toolkit?.slug,
        status: c.status,
        id: c.id,
      }));

    const active = connections.filter(c => c.status === "ACTIVE");
    const activeApps = active.map(c => c.appName);

    // Build available tools list
    const availableTools: any[] = [];
    for (const [appKey, actions] of Object.entries(CURATED_ACTIONS)) {
      for (const action of actions) {
        availableTools.push({
          name: action.name,
          displayName: action.displayName,
          description: action.description,
          app: appKey,
          connected: activeApps.includes(appKey),
          parameters: action.parameters,
        });
      }
    }

    const connectedTools = availableTools.filter(t => t.connected);

    // System prompt injection
    const systemContext = active.length > 0
      ? `\n\n## Connected Apps & Available Tools\nYou have access to ${connectedTools.length} tools from ${active.length} connected apps:\n${active.map(c => `- **${c.appName}** (connected)`).join("\n")}\n\nWhen a user asks you to perform an action in a connected app, you MUST execute it using the available tools. For example:\n- "Create a GitHub issue" → use GITHUB_CREATE_ISSUE\n- "Send a Slack message" → use SLACK_SENDS_A_MESSAGE_TO_A_SLACK_CHANNEL\n- "List my calendar events" → use GOOGLECALENDAR_FIND_FREE_SLOTS\n\nIf you use a tool, respond with a JSON block like:\n\`\`\`tool_call\n{"action": "ACTION_NAME", "input": {...}}\n\`\`\``
      : `\n\n## Tools Available\nNo apps are connected yet. ${Object.keys(CURATED_ACTIONS).length} apps are available to connect at /settings/integrations. Once connected, you can execute actions like creating issues, sending messages, and managing calendar events.`;

    res.json({
      activeConnections: active,
      totalConnections: connections.length,
      connectedApps: activeApps,
      connectedTools,
      allTools: availableTools,
      systemContext,
    });
  } catch (err: any) {
    res.json({
      activeConnections: [],
      connectedApps: [],
      connectedTools: [],
      systemContext: "\n\n## Tools\nComposio tools are temporarily unavailable.",
    });
  }
});

// ─── Triggers ─────────────────────────────────────────────────────────────────

router.get("/triggers", async (req: Request, res: Response) => {
  const { appNames, limit = "100" } = req.query;
  const params = new URLSearchParams();
  if (appNames) params.set("appNames", appNames as string);
  try {
    const r = await v1(`/triggers?${params}`);
    if (!r.ok) { res.json({ items: [], total: 0 }); return; }
    const raw = await safeJson(r);
    const items: any[] = Array.isArray(raw) ? raw : (raw.items || []);
    const filtered = items.slice(0, parseInt(limit as string, 10));
    res.json({ items: filtered, total: items.length });
  } catch (err: any) { res.json({ items: [], total: 0, error: err.message }); }
});

router.get("/triggers/instances", async (req: Request, res: Response) => {
  const { entityId = "default", connectedAccountId } = req.query;
  const params = new URLSearchParams({ entityId: entityId as string });
  if (connectedAccountId) params.set("connectedAccountId", connectedAccountId as string);
  try {
    const r = await v1(`/triggers/active_triggers?${params}`);
    if (!r.ok) { res.json({ items: [], total: 0 }); return; }
    const raw = await safeJson(r);
    const items: any[] = Array.isArray(raw) ? raw : (raw.triggers || raw.items || []);
    res.json({ items, total: items.length });
  } catch (err: any) { res.json({ items: [], total: 0 }); }
});

router.post("/triggers/subscribe", async (req: Request, res: Response) => {
  const { triggerName, connectedAccountId, config = {}, entityId = "default" } = req.body;
  if (!triggerName || !connectedAccountId) {
    res.status(400).json({ error: "triggerName and connectedAccountId are required" }); return;
  }
  try {
    const r = await v1(`/triggers/${connectedAccountId}/${triggerName}`, {
      method: "POST",
      body: JSON.stringify({ triggerConfig: config }),
    });
    const data = await safeJson(r);
    if (!r.ok) { res.status(r.status).json(data); return; }
    res.json(data);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.delete("/triggers/instances/:id", async (req: Request, res: Response) => {
  try {
    const r = await v1(`/triggers/active_triggers/${req.params.id}`, { method: "DELETE" });
    if (!r.ok) { const e = await safeJson(r); res.status(r.status).json(e); return; }
    res.status(204).end();
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── Webhook ──────────────────────────────────────────────────────────────────

// POST /api/composio/webhook — receives trigger events from Composio
router.post("/webhook", async (req: Request, res: Response) => {
  res.status(200).json({ received: true });

  const body = req.body || {};
  const event = {
    id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    triggerName: body.triggerName || body.trigger_name || body.event || "unknown",
    appName: body.appName || body.app_name || body.metadata?.appName || "unknown",
    entityId: body.entityId || body.entity_id || body.metadata?.entityId || "default",
    payload: body.payload || body.data || body,
    receivedAt: new Date().toISOString(),
  };

  WEBHOOK_EVENTS.unshift(event);
  if (WEBHOOK_EVENTS.length > MAX_WEBHOOK_EVENTS) WEBHOOK_EVENTS.splice(MAX_WEBHOOK_EVENTS);

  // Push to all SSE clients in real-time
  const ssePayload = `data: ${JSON.stringify({ type: "event", event })}\n\n`;
  for (const client of SSE_CLIENTS) {
    try { client.write(ssePayload); } catch { SSE_CLIENTS.delete(client); }
  }
});

// GET /api/composio/webhook/events — serve recent events
router.get("/webhook/events", (_req: Request, res: Response) => {
  res.json({ events: WEBHOOK_EVENTS, total: WEBHOOK_EVENTS.length });
});

// GET /api/composio/webhook/stream — SSE real-time webhook event stream
router.get("/webhook/stream", (req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  // Send current event buffer on connect
  res.write(`data: ${JSON.stringify({ type: "init", events: WEBHOOK_EVENTS.slice(0, 20) })}\n\n`);

  SSE_CLIENTS.add(res);

  // Heartbeat every 20s to keep connection alive
  const hb = setInterval(() => {
    try { res.write(`data: ${JSON.stringify({ type: "heartbeat", ts: Date.now() })}\n\n`); }
    catch { clearInterval(hb); SSE_CLIENTS.delete(res); }
  }, 20000);

  req.on("close", () => { clearInterval(hb); SSE_CLIENTS.delete(res); });
});

// GET /api/composio/webhook/config — instructions for setting up webhook
router.get("/webhook/config", (req: Request, res: Response) => {
  const host = req.headers.host || "your-app.replit.app";
  const protocol = req.headers["x-forwarded-proto"] || "https";
  const webhookUrl = `${protocol}://${host}/api/composio/webhook`;
  res.json({
    webhookUrl,
    instructions: [
      "1. Go to https://app.composio.dev/settings",
      "2. Navigate to Webhooks section",
      `3. Add webhook URL: ${webhookUrl}`,
      "4. Select triggers you want to receive",
      "5. Save and activate",
    ],
    note: "Composio will POST trigger events to this URL. Events are stored in memory (last 100).",
  });
});

// ─── MCP ──────────────────────────────────────────────────────────────────────

router.get("/mcp", (req: Request, res: Response) => {
  const apiKey = process.env.COMPOSIO_API_KEY;
  if (!apiKey) { res.status(503).json({ error: "COMPOSIO_API_KEY not configured" }); return; }
  const entityId = (req.query.entityId as string) || "default";
  res.json({
    name: "Composio",
    url: `https://mcp.composio.dev?apiKey=${apiKey}&entityId=${entityId}`,
    status: "connected",
    tools: 1033,
    description: "1,033 tool integrations with OAuth handling for AI agents",
    version: "v3",
    supportedApps: Object.keys(CURATED_ACTIONS),
    endpoints: {
      sse: `https://mcp.composio.dev/sse?apiKey=${apiKey}`,
      http: `https://mcp.composio.dev?apiKey=${apiKey}`,
    },
  });
});

// ─── Status ───────────────────────────────────────────────────────────────────

router.get("/status", async (_req: Request, res: Response) => {
  const apiKey = process.env.COMPOSIO_API_KEY;
  if (!apiKey) { res.json({ configured: false, error: "COMPOSIO_API_KEY not set" }); return; }
  try {
    const r = await v1("/client/auth/client_info");
    if (!r.ok) { res.json({ configured: true, valid: false, status: r.status }); return; }
    const data = await safeJson(r);
    res.json({ configured: true, valid: true, info: data });
  } catch (err: any) { res.json({ configured: true, valid: false, error: err.message }); }
});

export default router;
