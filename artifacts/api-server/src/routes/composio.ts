import { Router } from "express";

const router = Router();

const COMPOSIO_BASE = "https://backend.composio.dev/api/v1";

async function composioFetch(path: string, init?: RequestInit): Promise<Response> {
  const apiKey = process.env.COMPOSIO_API_KEY;
  if (!apiKey) throw new Error("COMPOSIO_API_KEY not set");
  return fetch(`${COMPOSIO_BASE}${path}`, {
    ...init,
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}

// Curated action catalog (since v1 /actions is deprecated)
const CURATED_ACTIONS: Record<string, Array<{ name: string; displayName: string; description: string; parameters: string[] }>> = {
  github: [
    { name: "GITHUB_CREATE_ISSUE", displayName: "Create Issue", description: "Create a new issue in a repository", parameters: ["owner", "repo", "title", "body"] },
    { name: "GITHUB_LIST_ISSUES", displayName: "List Issues", description: "List open issues in a repository", parameters: ["owner", "repo", "state"] },
    { name: "GITHUB_CREATE_PULL_REQUEST", displayName: "Create Pull Request", description: "Open a pull request between two branches", parameters: ["owner", "repo", "title", "head", "base"] },
    { name: "GITHUB_LIST_REPOS", displayName: "List Repositories", description: "List repositories for a user or org", parameters: ["username"] },
    { name: "GITHUB_CREATE_COMMENT", displayName: "Add Comment", description: "Comment on an issue or PR", parameters: ["owner", "repo", "issue_number", "body"] },
    { name: "GITHUB_STAR_REPO", displayName: "Star Repository", description: "Star a GitHub repository", parameters: ["owner", "repo"] },
  ],
  slack: [
    { name: "SLACK_SEND_MESSAGE", displayName: "Send Message", description: "Post a message to a Slack channel", parameters: ["channel", "text"] },
    { name: "SLACK_LIST_CHANNELS", displayName: "List Channels", description: "Get a list of public channels", parameters: [] },
    { name: "SLACK_GET_MESSAGES", displayName: "Get Messages", description: "Retrieve messages from a channel", parameters: ["channel", "limit"] },
    { name: "SLACK_CREATE_CHANNEL", displayName: "Create Channel", description: "Create a new Slack channel", parameters: ["name", "is_private"] },
    { name: "SLACK_SEND_DM", displayName: "Send Direct Message", description: "Send a direct message to a user", parameters: ["user", "text"] },
  ],
  gmail: [
    { name: "GMAIL_SEND_EMAIL", displayName: "Send Email", description: "Compose and send an email", parameters: ["to", "subject", "body"] },
    { name: "GMAIL_LIST_EMAILS", displayName: "List Emails", description: "Fetch recent emails from inbox", parameters: ["maxResults", "q"] },
    { name: "GMAIL_READ_EMAIL", displayName: "Read Email", description: "Read a specific email by ID", parameters: ["messageId"] },
    { name: "GMAIL_REPLY_TO_THREAD", displayName: "Reply to Thread", description: "Reply to an existing email thread", parameters: ["threadId", "body"] },
    { name: "GMAIL_SEARCH_EMAILS", displayName: "Search Emails", description: "Search emails with Gmail query syntax", parameters: ["query", "maxResults"] },
    { name: "GMAIL_CREATE_DRAFT", displayName: "Create Draft", description: "Save an email as a draft", parameters: ["to", "subject", "body"] },
  ],
  googlecalendar: [
    { name: "GOOGLECALENDAR_CREATE_EVENT", displayName: "Create Event", description: "Create a calendar event", parameters: ["summary", "start", "end", "description"] },
    { name: "GOOGLECALENDAR_LIST_EVENTS", displayName: "List Events", description: "List upcoming calendar events", parameters: ["timeMin", "timeMax", "maxResults"] },
    { name: "GOOGLECALENDAR_DELETE_EVENT", displayName: "Delete Event", description: "Remove an event from calendar", parameters: ["eventId"] },
    { name: "GOOGLECALENDAR_UPDATE_EVENT", displayName: "Update Event", description: "Modify an existing calendar event", parameters: ["eventId", "summary", "start", "end"] },
  ],
  notion: [
    { name: "NOTION_CREATE_PAGE", displayName: "Create Page", description: "Create a new Notion page", parameters: ["parent_id", "title", "content"] },
    { name: "NOTION_LIST_DATABASES", displayName: "List Databases", description: "Get all databases in the workspace", parameters: [] },
    { name: "NOTION_QUERY_DATABASE", displayName: "Query Database", description: "Query items from a Notion database", parameters: ["database_id", "filter"] },
    { name: "NOTION_ADD_DATABASE_ROW", displayName: "Add Row", description: "Add a new row to a database", parameters: ["database_id", "properties"] },
    { name: "NOTION_UPDATE_PAGE", displayName: "Update Page", description: "Update properties of a Notion page", parameters: ["page_id", "properties"] },
  ],
  linear: [
    { name: "LINEAR_CREATE_ISSUE", displayName: "Create Issue", description: "Create a new Linear issue", parameters: ["title", "description", "teamId", "priority"] },
    { name: "LINEAR_LIST_ISSUES", displayName: "List Issues", description: "Get issues assigned to you", parameters: ["teamId", "state"] },
    { name: "LINEAR_UPDATE_ISSUE", displayName: "Update Issue", description: "Update issue status or assignee", parameters: ["issueId", "state", "assigneeId"] },
    { name: "LINEAR_CREATE_PROJECT", displayName: "Create Project", description: "Create a new Linear project", parameters: ["name", "teamId"] },
  ],
  jira: [
    { name: "JIRA_CREATE_ISSUE", displayName: "Create Issue", description: "Create a Jira issue or bug", parameters: ["project", "summary", "issuetype", "description"] },
    { name: "JIRA_LIST_ISSUES", displayName: "List Issues", description: "Search Jira issues with JQL", parameters: ["jql", "maxResults"] },
    { name: "JIRA_UPDATE_ISSUE", displayName: "Update Issue", description: "Transition or update a Jira issue", parameters: ["issueIdOrKey", "fields"] },
    { name: "JIRA_ADD_COMMENT", displayName: "Add Comment", description: "Comment on a Jira issue", parameters: ["issueIdOrKey", "body"] },
  ],
  asana: [
    { name: "ASANA_CREATE_TASK", displayName: "Create Task", description: "Add a task to an Asana project", parameters: ["name", "projects", "due_on", "notes"] },
    { name: "ASANA_LIST_TASKS", displayName: "List Tasks", description: "Get tasks from a project", parameters: ["project", "assignee"] },
    { name: "ASANA_UPDATE_TASK", displayName: "Update Task", description: "Mark task complete or update fields", parameters: ["task_gid", "completed", "name"] },
    { name: "ASANA_CREATE_PROJECT", displayName: "Create Project", description: "Create a new Asana project", parameters: ["name", "team", "workspace"] },
  ],
  trello: [
    { name: "TRELLO_CREATE_CARD", displayName: "Create Card", description: "Add a card to a Trello list", parameters: ["name", "idList", "desc"] },
    { name: "TRELLO_LIST_BOARDS", displayName: "List Boards", description: "Get all Trello boards for a member", parameters: [] },
    { name: "TRELLO_MOVE_CARD", displayName: "Move Card", description: "Move a card to a different list", parameters: ["id", "idList"] },
    { name: "TRELLO_ADD_COMMENT", displayName: "Add Comment", description: "Post a comment on a Trello card", parameters: ["id", "text"] },
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
    { name: "GOOGLEDRIVE_LIST_FILES", displayName: "List Files", description: "Browse files in Google Drive", parameters: ["query", "pageSize"] },
    { name: "GOOGLEDRIVE_CREATE_FILE", displayName: "Upload File", description: "Create or upload a file to Drive", parameters: ["name", "content", "mimeType"] },
    { name: "GOOGLEDRIVE_SHARE_FILE", displayName: "Share File", description: "Share a file with a user", parameters: ["fileId", "email", "role"] },
  ],
  twitter: [
    { name: "TWITTER_CREATE_TWEET", displayName: "Post Tweet", description: "Publish a tweet to Twitter/X", parameters: ["text"] },
    { name: "TWITTER_GET_MENTIONS", displayName: "Get Mentions", description: "Fetch your latest mentions", parameters: ["max_results"] },
    { name: "TWITTER_SEARCH_TWEETS", displayName: "Search Tweets", description: "Search Twitter for a keyword", parameters: ["query", "max_results"] },
  ],
  discord: [
    { name: "DISCORD_SEND_MESSAGE", displayName: "Send Message", description: "Post to a Discord channel", parameters: ["channel_id", "content"] },
    { name: "DISCORD_GET_MESSAGES", displayName: "Get Messages", description: "Read messages from a channel", parameters: ["channel_id", "limit"] },
  ],
  zoom: [
    { name: "ZOOM_CREATE_MEETING", displayName: "Create Meeting", description: "Schedule a Zoom meeting", parameters: ["topic", "start_time", "duration"] },
    { name: "ZOOM_LIST_MEETINGS", displayName: "List Meetings", description: "Get upcoming Zoom meetings", parameters: [] },
  ],
  shopify: [
    { name: "SHOPIFY_LIST_PRODUCTS", displayName: "List Products", description: "Retrieve Shopify products", parameters: ["limit", "status"] },
    { name: "SHOPIFY_CREATE_PRODUCT", displayName: "Create Product", description: "Add a new product to your store", parameters: ["title", "price", "vendor"] },
    { name: "SHOPIFY_GET_ORDERS", displayName: "Get Orders", description: "List recent store orders", parameters: ["limit", "status"] },
  ],
};

// ─── Apps ────────────────────────────────────────────────────────────────────

router.get("/apps", async (_req, res) => {
  try {
    const r = await composioFetch("/apps");
    if (!r.ok) { const e = await r.text(); res.status(r.status).json({ error: e }); return; }
    const data = await r.json();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/apps/:appName", async (req, res) => {
  try {
    // Search the app in the full list
    const r = await composioFetch("/apps");
    if (!r.ok) { res.status(r.status).json({ error: "Apps unavailable" }); return; }
    const data = await r.json();
    const app = (data.items || []).find(
      (a: any) => a.key === req.params.appName || a.name === req.params.appName
    );
    if (!app) { res.status(404).json({ error: "App not found" }); return; }
    // Attach curated actions
    const actions = CURATED_ACTIONS[app.key] || [];
    res.json({ ...app, actions, actionsCount: actions.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Connections ─────────────────────────────────────────────────────────────

router.get("/connections", async (req, res) => {
  const entityId = (req.query.entityId as string) || "default";
  const appName = req.query.appName as string | undefined;
  try {
    const params = new URLSearchParams({ entityId });
    if (appName) params.set("appName", appName);
    const r = await composioFetch(`/connectedAccounts?${params}`);
    if (!r.ok) { const e = await r.text(); res.status(r.status).json({ error: e }); return; }
    const data = await r.json();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/connections/:id", async (req, res) => {
  try {
    const r = await composioFetch(`/connectedAccounts/${req.params.id}`);
    if (!r.ok) { res.status(r.status).json({ error: "Connection not found" }); return; }
    const data = await r.json();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/composio/connections/initiate
// Full v3 API flow: find/create auth_config → create connected_account → return redirectUrl
router.post("/connections/initiate", async (req, res) => {
  const { appName, entityId = "default" } = req.body;
  if (!appName) { res.status(400).json({ error: "appName is required" }); return; }

  const apiKey = process.env.COMPOSIO_API_KEY;
  if (!apiKey) { res.status(503).json({ error: "COMPOSIO_API_KEY not configured" }); return; }

  const v3Base = "https://backend.composio.dev/api/v3";
  const v3Headers = { "x-api-key": apiKey, "Content-Type": "application/json" };

  const v3Get = (path: string) =>
    fetch(`${v3Base}${path}`, { headers: v3Headers });
  const v3Post = (path: string, body: Record<string, unknown>) =>
    fetch(`${v3Base}${path}`, { method: "POST", headers: v3Headers, body: JSON.stringify(body) });

  try {
    // ── Step 1: Find existing v3 auth_config for this app ─────────────────────
    let authConfigId: string | null = null;

    const acListRes = await v3Get(`/auth_configs?app_name=${encodeURIComponent(appName)}&limit=20`);
    if (acListRes.ok) {
      const acData = await acListRes.json().catch(() => ({}));
      const found = (acData.items || []).find(
        (ac: any) =>
          (ac.toolkit?.slug?.toLowerCase() === appName.toLowerCase() ||
           ac.app_name?.toLowerCase() === appName.toLowerCase()) &&
          ac.status !== "DISABLED" && !ac.deleted
      );
      if (found) authConfigId = found.id;  // e.g. "ac_V8jiZteAG4gA"
    }

    // ── Step 2: Create auth_config if none found ───────────────────────────────
    if (!authConfigId) {
      const createAcRes = await v3Post("/auth_configs", {
        toolkit: { slug: appName },
        type: "use_composio_auth",
      });
      if (createAcRes.ok) {
        const created = await createAcRes.json().catch(() => ({}));
        authConfigId = created.id || null;
      } else {
        const e = await createAcRes.json().catch(() => ({}));
        res.status(createAcRes.status).json({ error: e?.error?.message || "Failed to create auth config" });
        return;
      }
    }

    if (!authConfigId) {
      res.status(500).json({ error: `No auth config available for '${appName}'` });
      return;
    }

    // ── Step 3: Create connected account (initiates OAuth) ────────────────────
    const connRes = await v3Post("/connected_accounts", {
      auth_config: { id: authConfigId },
      connection: { user_uuid: entityId },
    });
    const connData = await connRes.json().catch(() => ({}));

    if (!connRes.ok) {
      res.status(connRes.status).json({ error: connData?.error?.message || "Failed to initiate connection" });
      return;
    }

    // Normalize response — v3 uses redirect_url (snake_case), frontend expects redirectUrl
    const redirectUrl = connData.redirect_url || connData.redirectUrl || connData.redirectUri || null;
    res.json({
      ...connData,
      redirectUrl,
      connectionStatus: connData.status || connData.connectionStatus,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/connections/:id", async (req, res) => {
  try {
    const r = await composioFetch(`/connectedAccounts/${req.params.id}`, { method: "DELETE" });
    if (!r.ok) { const e = await r.text(); res.status(r.status).json({ error: e }); return; }
    res.status(204).end();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Integrations ─────────────────────────────────────────────────────────────

router.get("/integrations", async (req, res) => {
  const { appId, appName, page = "1", limit = "50" } = req.query;
  const params = new URLSearchParams({ page: page as string, limit: limit as string });
  if (appId) params.set("appId", appId as string);
  if (appName) params.set("appName", appName as string);
  try {
    const r = await composioFetch(`/integrations?${params}`);
    if (!r.ok) { const e = await r.text(); res.status(r.status).json({ error: e }); return; }
    const data = await r.json();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Actions (curated catalog + live fallback) ────────────────────────────────

router.get("/actions", async (req, res) => {
  const { apps, useCase, limit = "20", search } = req.query;

  try {
    // Build from curated catalog
    let actions: any[] = [];

    if (apps) {
      const appList = (apps as string).split(",").map(s => s.trim().toLowerCase());
      for (const appKey of appList) {
        const appActions = CURATED_ACTIONS[appKey] || [];
        actions.push(...appActions.map(a => ({ ...a, appName: appKey })));
      }
    } else {
      // Return all curated actions
      for (const [appKey, appActions] of Object.entries(CURATED_ACTIONS)) {
        actions.push(...appActions.map(a => ({ ...a, appName: appKey })));
      }
    }

    // Apply search filter
    if (search) {
      const q = (search as string).toLowerCase();
      actions = actions.filter(a =>
        a.displayName.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.appName.toLowerCase().includes(q)
      );
    }

    // Apply useCase filter (basic keyword match)
    if (useCase) {
      const q = (useCase as string).toLowerCase();
      actions = actions.filter(a =>
        a.displayName.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q)
      );
    }

    const limitN = parseInt(limit as string, 10) || 20;
    const paged = actions.slice(0, limitN);

    res.json({ items: paged, totalItems: actions.length, totalPages: Math.ceil(actions.length / limitN) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/actions/:actionName", async (req, res) => {
  const { actionName } = req.params;
  for (const [appKey, actions] of Object.entries(CURATED_ACTIONS)) {
    const action = actions.find(a => a.name === actionName);
    if (action) {
      res.json({ ...action, appName: appKey });
      return;
    }
  }
  res.status(404).json({ error: "Action not found" });
});

// POST /api/composio/actions/execute
router.post("/actions/execute", async (req, res) => {
  const { actionName, input, connectedAccountId, entityId } = req.body;
  if (!actionName) { res.status(400).json({ error: "actionName is required" }); return; }
  try {
    const r = await composioFetch(`/actions/${actionName}/execute`, {
      method: "POST",
      body: JSON.stringify({
        input: input || {},
        ...(connectedAccountId && { connectedAccountId }),
        entityId: entityId || "default",
      }),
    });
    const data = await r.json();
    if (!r.ok) { res.status(r.status).json(data); return; }
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Triggers ─────────────────────────────────────────────────────────────────

// GET /api/composio/triggers — available trigger types
router.get("/triggers", async (req, res) => {
  const { appNames, limit = "50" } = req.query;
  const params = new URLSearchParams();
  if (appNames) params.set("appNames", appNames as string);
  try {
    const r = await composioFetch(`/triggers?${params}`);
    if (!r.ok) { const e = await r.text(); res.status(r.status).json({ error: e }); return; }
    const raw = await r.json();
    // v1 returns a raw array — normalize to {items, total}
    const items: any[] = Array.isArray(raw) ? raw : (raw.items || []);
    const filtered = limit ? items.slice(0, parseInt(limit as string, 10)) : items;
    res.json({ items: filtered, total: items.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/composio/triggers/instances — active trigger subscriptions
router.get("/triggers/instances", async (req, res) => {
  const { entityId = "default", connectedAccountId } = req.query;
  const params = new URLSearchParams({ entityId: entityId as string });
  if (connectedAccountId) params.set("connectedAccountId", connectedAccountId as string);
  try {
    const r = await composioFetch(`/triggers/active_triggers?${params}`);
    if (!r.ok) {
      // Fallback: return empty list if endpoint is not available
      res.json({ items: [], total: 0 });
      return;
    }
    const raw = await r.json();
    const items: any[] = Array.isArray(raw) ? raw : (raw.triggers || raw.items || []);
    res.json({ items, total: items.length });
  } catch (err: any) {
    res.json({ items: [], total: 0 });
  }
});

// POST /api/composio/triggers/subscribe — subscribe to a trigger
router.post("/triggers/subscribe", async (req, res) => {
  const { triggerName, connectedAccountId, config = {}, entityId = "default" } = req.body;
  if (!triggerName || !connectedAccountId) {
    res.status(400).json({ error: "triggerName and connectedAccountId are required" });
    return;
  }
  try {
    const r = await composioFetch(`/triggers/${connectedAccountId}/${triggerName}`, {
      method: "POST",
      body: JSON.stringify({ triggerConfig: config }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) { res.status(r.status).json(data); return; }
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/composio/triggers/instances/:id — unsubscribe a trigger
router.delete("/triggers/instances/:id", async (req, res) => {
  try {
    const r = await composioFetch(`/triggers/active_triggers/${req.params.id}`, {
      method: "DELETE",
    });
    if (!r.ok) { const e = await r.text(); res.status(r.status).json({ error: e }); return; }
    res.status(204).end();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── MCP ─────────────────────────────────────────────────────────────────────

router.get("/mcp", (req, res) => {
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
  });
});

// ─── Status ───────────────────────────────────────────────────────────────────

router.get("/status", async (_req, res) => {
  const apiKey = process.env.COMPOSIO_API_KEY;
  if (!apiKey) { res.json({ configured: false, error: "COMPOSIO_API_KEY not set" }); return; }
  try {
    const r = await composioFetch("/client/auth/client_info");
    if (!r.ok) { res.json({ configured: true, valid: false, status: r.status }); return; }
    const data = await r.json();
    res.json({ configured: true, valid: true, info: data });
  } catch (err: any) {
    res.json({ configured: true, valid: false, error: err.message });
  }
});

export default router;
