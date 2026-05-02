import { Router } from "express";

const router = Router();

const COMPOSIO_BASE = "https://backend.composio.dev/api/v1";

async function composioFetch(path: string, init?: RequestInit): Promise<Response> {
  const apiKey = process.env.COMPOSIO_API_KEY;
  if (!apiKey) {
    throw new Error("COMPOSIO_API_KEY environment variable is not set");
  }
  return fetch(`${COMPOSIO_BASE}${path}`, {
    ...init,
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}

// GET /api/composio/apps
// Returns all apps available in Composio (250+)
router.get("/apps", async (req, res) => {
  try {
    const r = await composioFetch("/apps");
    if (!r.ok) {
      const err = await r.text();
      return res.status(r.status).json({ error: err });
    }
    const data = await r.json();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch apps" });
  }
});

// GET /api/composio/apps/:appName
// Returns a single app's details
router.get("/apps/:appName", async (req, res) => {
  try {
    const r = await composioFetch(`/apps/${req.params.appName}`);
    if (!r.ok) return res.status(r.status).json({ error: "App not found" });
    const data = await r.json();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch app" });
  }
});

// GET /api/composio/connections?entityId=
// Lists all connected accounts for an entity (user)
router.get("/connections", async (req, res) => {
  const entityId = (req.query.entityId as string) || "default";
  const appName = req.query.appName as string | undefined;
  try {
    const params = new URLSearchParams({ entityId });
    if (appName) params.set("appName", appName);
    const r = await composioFetch(`/connectedAccounts?${params.toString()}`);
    if (!r.ok) {
      const err = await r.text();
      return res.status(r.status).json({ error: err });
    }
    const data = await r.json();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch connections" });
  }
});

// GET /api/composio/connections/:id
// Get a single connected account
router.get("/connections/:id", async (req, res) => {
  try {
    const r = await composioFetch(`/connectedAccounts/${req.params.id}`);
    if (!r.ok) return res.status(r.status).json({ error: "Connection not found" });
    const data = await r.json();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch connection" });
  }
});

// POST /api/composio/connections/initiate
// Starts the OAuth flow for an integration
router.post("/connections/initiate", async (req, res) => {
  const { integrationId, entityId, redirectUri } = req.body;
  if (!integrationId) {
    return res.status(400).json({ error: "integrationId is required" });
  }
  try {
    const body: Record<string, string> = {
      integrationId,
      entityId: entityId || "default",
    };
    if (redirectUri) body.redirectUri = redirectUri;

    const r = await composioFetch("/connectedAccounts", {
      method: "POST",
      body: JSON.stringify(body),
    });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json(data);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to initiate connection" });
  }
});

// DELETE /api/composio/connections/:id
// Disconnects / deletes a connected account
router.delete("/connections/:id", async (req, res) => {
  try {
    const r = await composioFetch(`/connectedAccounts/${req.params.id}`, {
      method: "DELETE",
    });
    if (!r.ok) {
      const err = await r.text();
      return res.status(r.status).json({ error: err });
    }
    res.status(204).end();
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to delete connection" });
  }
});

// GET /api/composio/integrations
// Lists integrations (connector configurations) — needed to get integrationId for OAuth
router.get("/integrations", async (req, res) => {
  const { appId, appName, page = "1", limit = "50" } = req.query;
  const params = new URLSearchParams({ page: page as string, limit: limit as string });
  if (appId) params.set("appId", appId as string);
  if (appName) params.set("appName", appName as string);
  try {
    const r = await composioFetch(`/integrations?${params.toString()}`);
    if (!r.ok) {
      const err = await r.text();
      return res.status(r.status).json({ error: err });
    }
    const data = await r.json();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch integrations" });
  }
});

// GET /api/composio/actions
// Lists available actions across apps
router.get("/actions", async (req, res) => {
  const { apps, useCase, limit = "20", tags, filterImportantActions, showAll } = req.query;
  const params = new URLSearchParams();
  if (apps) params.set("apps", apps as string);
  if (useCase) params.set("useCase", useCase as string);
  if (limit) params.set("limit", limit as string);
  if (tags) params.set("tags", tags as string);
  if (filterImportantActions) params.set("filterImportantActions", filterImportantActions as string);
  if (showAll) params.set("showAll", showAll as string);
  try {
    const r = await composioFetch(`/actions?${params.toString()}`);
    if (!r.ok) {
      const err = await r.text();
      return res.status(r.status).json({ error: err });
    }
    const data = await r.json();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch actions" });
  }
});

// GET /api/composio/actions/:actionName
// Get details of a single action
router.get("/actions/:actionName", async (req, res) => {
  try {
    const r = await composioFetch(`/actions/${req.params.actionName}`);
    if (!r.ok) return res.status(r.status).json({ error: "Action not found" });
    const data = await r.json();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch action" });
  }
});

// POST /api/composio/actions/execute
// Execute a Composio action
router.post("/actions/execute", async (req, res) => {
  const { actionName, input, connectedAccountId, entityId } = req.body;
  if (!actionName) {
    return res.status(400).json({ error: "actionName is required" });
  }
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
    if (!r.ok) return res.status(r.status).json(data);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to execute action" });
  }
});

// GET /api/composio/triggers
// Lists available triggers across apps
router.get("/triggers", async (req, res) => {
  const { appNames, showEnabledOnly } = req.query;
  const params = new URLSearchParams();
  if (appNames) params.set("appNames", appNames as string);
  if (showEnabledOnly) params.set("showEnabledOnly", showEnabledOnly as string);
  try {
    const r = await composioFetch(`/triggers?${params.toString()}`);
    if (!r.ok) {
      const err = await r.text();
      return res.status(r.status).json({ error: err });
    }
    const data = await r.json();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch triggers" });
  }
});

// GET /api/composio/mcp
// Returns the Composio MCP server configuration
router.get("/mcp", (req, res) => {
  const apiKey = process.env.COMPOSIO_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: "COMPOSIO_API_KEY not configured" });
  }
  const entityId = (req.query.entityId as string) || "default";
  res.json({
    name: "Composio",
    url: `https://mcp.composio.dev?apiKey=${apiKey}&entityId=${entityId}`,
    status: "connected",
    tools: 250,
    description: "250+ tool integrations with OAuth handling for AI agents",
    version: "v3",
    supportedApps: [
      "github", "slack", "linear", "gmail", "google-calendar",
      "notion", "jira", "asana", "trello", "hubspot", "salesforce",
      "stripe", "twitter", "discord", "figma", "dropbox", "zoom",
    ],
  });
});

// GET /api/composio/status
// Quick health check — validates that the API key works
router.get("/status", async (req, res) => {
  const apiKey = process.env.COMPOSIO_API_KEY;
  if (!apiKey) {
    return res.json({ configured: false, error: "COMPOSIO_API_KEY not set" });
  }
  try {
    const r = await composioFetch("/client/auth/client_info");
    if (!r.ok) {
      return res.json({ configured: true, valid: false, status: r.status });
    }
    const data = await r.json();
    res.json({ configured: true, valid: true, info: data });
  } catch (err: any) {
    res.json({ configured: true, valid: false, error: err.message });
  }
});

export default router;
