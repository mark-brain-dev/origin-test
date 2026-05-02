import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Check, Plug, RefreshCw, AlertCircle, Link2, Unlink,
  Loader2, Key, X, Eye, EyeOff, Info, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface ComposioApp {
  name?: string;
  key: string;
  displayName?: string;
  description?: string;
  logo?: string;
  categories?: string[];
  enabled?: boolean;
  no_auth?: boolean;
  auth_schemes?: string[];
}

interface ComposioConnection {
  id: string;
  appName: string;
  status: string;
  entityId: string;
  appUniqueId?: string;
  enabled?: boolean;
}

interface ApiKeyModalState {
  app: ComposioApp;
  hint: string;
}

const FALLBACK_APPS = [
  { key: "github", displayName: "GitHub", description: "Connect repositories, issues, and pull requests", logo: "🐙", categories: ["Dev"] },
  { key: "slack", displayName: "Slack", description: "Import Slack conversations and create pages from threads", logo: "💬", categories: ["Communication"] },
  { key: "gmail", displayName: "Gmail", description: "Read, send, and manage emails from your workspace", logo: "📧", categories: ["Communication"] },
  { key: "googlecalendar", displayName: "Google Calendar", description: "Sync events and meetings with Nexus", logo: "📅", categories: ["Productivity"] },
  { key: "notion", displayName: "Notion", description: "Import and sync your Notion workspace", logo: "📋", categories: ["Productivity"] },
  { key: "linear", displayName: "Linear", description: "Sync issues and projects with Nexus databases", logo: "📐", categories: ["PM"] },
  { key: "jira", displayName: "Jira", description: "Import Jira issues and epics as database rows", logo: "🔵", categories: ["PM"] },
  { key: "asana", displayName: "Asana", description: "Sync tasks and projects between Asana and Nexus", logo: "⚙️", categories: ["PM"] },
  { key: "trello", displayName: "Trello", description: "Import Trello boards and cards as databases", logo: "📊", categories: ["PM"] },
  { key: "hubspot", displayName: "HubSpot", description: "CRM data directly in your knowledge workspace", logo: "🟠", categories: ["CRM"] },
  { key: "salesforce", displayName: "Salesforce", description: "Connect Salesforce records to Nexus pages", logo: "☁️", categories: ["CRM"] },
  { key: "stripe", displayName: "Stripe", description: "Monitor payments and customers in Nexus", logo: "💳", categories: ["Finance"] },
  { key: "twitter", displayName: "Twitter / X", description: "Schedule tweets and track mentions", logo: "🐦", categories: ["Social"] },
  { key: "discord", displayName: "Discord", description: "Send messages and read channels from Nexus", logo: "💜", categories: ["Communication"] },
  { key: "zoom", displayName: "Zoom", description: "Schedule and manage Zoom meetings", logo: "📹", categories: ["Productivity"] },
  { key: "dropbox", displayName: "Dropbox", description: "Browse and attach Dropbox files in Nexus", logo: "📦", categories: ["Storage"] },
  { key: "googledrive", displayName: "Google Drive", description: "Attach and embed Drive files in pages", logo: "📁", categories: ["Storage"] },
  { key: "figma", displayName: "Figma", description: "Embed Figma designs directly in Nexus pages", logo: "🎨", categories: ["Design"] },
  { key: "airtable", displayName: "Airtable", description: "Import Airtable bases as Nexus databases", logo: "📊", categories: ["Data"] },
  { key: "supabase", displayName: "Supabase", description: "Connect your Supabase databases to Nexus", logo: "⚡", categories: ["DB"] },
  { key: "openai", displayName: "OpenAI", description: "Direct OpenAI API integration for agents", logo: "🤖", categories: ["AI"] },
  { key: "serpapi", displayName: "SerpAPI", description: "Web search results for AI agents", logo: "🔍", categories: ["Search"] },
  { key: "elevenlabs", displayName: "ElevenLabs", description: "AI voice synthesis for Nexus agents", logo: "🎙️", categories: ["AI"] },
  { key: "one_drive", displayName: "OneDrive", description: "Microsoft OneDrive file storage integration", logo: "☁️", categories: ["Storage"] },
];

const APP_CATEGORIES = ["All", "Dev", "Communication", "Productivity", "PM", "CRM", "Finance", "Social", "Storage", "Design", "Data", "DB", "AI", "Search"];

function getAppLogo(app: ComposioApp): string {
  if (app.logo && app.logo.startsWith("http")) return app.logo;
  if (app.logo && !app.logo.startsWith("http")) return app.logo;
  const logoMap: Record<string, string> = {
    github: "🐙", slack: "💬", gmail: "📧", googlecalendar: "📅",
    notion: "📋", linear: "📐", jira: "🔵", asana: "⚙️", trello: "📊",
    hubspot: "🟠", salesforce: "☁️", stripe: "💳", twitter: "🐦",
    discord: "💜", zoom: "📹", dropbox: "📦", googledrive: "📁",
    figma: "🎨", airtable: "📊", supabase: "⚡", openai: "🤖",
    serpapi: "🔍", clickup: "🟣", monday: "🔴", todoist: "✅",
    zendesk: "🎫", intercom: "💬", sendgrid: "📨", twilio: "📱",
    shopify: "🛍️", webflow: "🌊", wordpress: "📝", medium: "📰",
    elevenlabs: "🎙️", one_drive: "☁️", microsoftteams: "💼", outlook: "📬",
    perplexityai: "🔮", firecrawl: "🕷️", tavily: "🧭", exa: "🔎",
    apollo: "🚀", hubspot_crm: "🟠", calendly: "📆", googlesheets: "📊",
    googledocs: "📄", googletasks: "✅", youtube: "▶️",
  };
  return logoMap[app.key] || "🔗";
}

function getAppCategory(app: ComposioApp): string {
  if (app.categories && app.categories.length > 0) {
    const cat = app.categories[0].toLowerCase();
    if (cat.includes("dev") || cat.includes("code")) return "Dev";
    if (cat.includes("comm") || cat.includes("chat") || cat.includes("email")) return "Communication";
    if (cat.includes("product") || cat.includes("task") || cat.includes("calendar")) return "Productivity";
    if (cat.includes("project") || cat.includes("issue")) return "PM";
    if (cat.includes("crm") || cat.includes("sales") || cat.includes("market")) return "CRM";
    if (cat.includes("finance") || cat.includes("payment")) return "Finance";
    if (cat.includes("social")) return "Social";
    if (cat.includes("storage") || cat.includes("file") || cat.includes("drive")) return "Storage";
    if (cat.includes("design")) return "Design";
    if (cat.includes("data") || cat.includes("analytics")) return "Data";
    if (cat.includes("database") || cat.includes("db")) return "DB";
    if (cat.includes("ai") || cat.includes("ml")) return "AI";
    if (cat.includes("search")) return "Search";
  }
  return "Tools";
}

function ApiKeyModal({
  state,
  onClose,
  onSubmit,
}: {
  state: ApiKeyModalState;
  onClose: () => void;
  onSubmit: (app: ComposioApp, apiKey: string) => void;
}) {
  const [apiKey, setApiKey] = useState("");
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!apiKey.trim()) return;
    setSubmitting(true);
    await onSubmit(state.app, apiKey.trim());
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md mx-4 bg-card border border-border rounded-2xl shadow-2xl p-6"
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
              <Key className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">
                {state.app.displayName || state.app.key} API Key
              </h3>
              <p className="text-xs text-muted-foreground">Custom credentials required</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 mb-4">
          <Info className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-300/90 leading-relaxed">
            {state.hint || `${state.app.displayName || state.app.key} requires your own API key. Composio does not manage credentials for this service.`}
          </p>
        </div>

        <div className="space-y-3">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            API Key
          </label>
          <div className="relative">
            <input
              type={show ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder={`Paste your ${state.app.displayName || state.app.key} API key…`}
              className="w-full bg-muted/60 border border-border/60 rounded-xl px-4 py-2.5 text-sm pr-10 font-mono focus:border-primary/50 outline-none transition-colors"
            />
            <button
              onClick={() => setShow(!show)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-5">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            className="flex-1 bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white border-0"
            onClick={handleSubmit}
            disabled={!apiKey.trim() || submitting}
          >
            {submitting ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />Connecting…</>
            ) : (
              <><Zap className="h-3.5 w-3.5 mr-2" />Connect</>
            )}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

export default function MarketplacePage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [activeTab, setActiveTab] = useState<"discover" | "manage">("discover");

  const [apps, setApps] = useState<ComposioApp[]>([]);
  const [connections, setConnections] = useState<ComposioConnection[]>([]);
  const [appsLoading, setAppsLoading] = useState(true);
  const [connectingApp, setConnectingApp] = useState<string | null>(null);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [composioStatus, setComposioStatus] = useState<"loading" | "ok" | "error">("loading");
  const [apiKeyModal, setApiKeyModal] = useState<ApiKeyModalState | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchApps = useCallback(async () => {
    setAppsLoading(true);
    try {
      const [appsRes, statusRes] = await Promise.all([
        fetch(`${BASE}/api/composio/apps`),
        fetch(`${BASE}/api/composio/status`),
      ]);
      const statusData = await statusRes.json();
      setComposioStatus(statusData.valid ? "ok" : "error");

      if (appsRes.ok) {
        const data = await appsRes.json();
        const items: ComposioApp[] = data.items || data || [];
        setApps(items.length > 0 ? items : FALLBACK_APPS);
      } else {
        setApps(FALLBACK_APPS);
      }
    } catch {
      setApps(FALLBACK_APPS);
      setComposioStatus("error");
    } finally {
      setAppsLoading(false);
    }
  }, []);

  const fetchConnections = useCallback(async () => {
    try {
      const r = await fetch(`${BASE}/api/composio/connections?entityId=default`);
      if (r.ok) {
        const data = await r.json();
        setConnections(data.items || data || []);
      }
    } catch {
      // silently fail
    }
  }, []);

  // On mount: clean up stale INITIATED connections first, then fetch
  const cleanupStale = useCallback(async () => {
    try {
      await fetch(`${BASE}/api/composio/connections/stale/cleanup`, { method: "DELETE" });
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    cleanupStale().then(() => {
      fetchApps();
      fetchConnections();
    });
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [fetchApps, fetchConnections, cleanupStale]);

  const isConnected = (appKey: string) =>
    connections.some(
      (c) => c.appName?.toLowerCase() === appKey.toLowerCase() && c.status === "ACTIVE"
    );

  const isPending = (appKey: string) =>
    connections.some(
      (c) => c.appName?.toLowerCase() === appKey.toLowerCase() && c.status === "INITIATED"
    );

  const getConnectionId = (appKey: string) =>
    connections.find(
      (c) => c.appName?.toLowerCase() === appKey.toLowerCase() && c.status === "ACTIVE"
    )?.id;

  // Poll connections until the given appKey becomes ACTIVE (up to 60s)
  const pollUntilActive = useCallback((appKey: string, displayName: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    let elapsed = 0;
    pollingRef.current = setInterval(async () => {
      elapsed += 2000;
      await fetchConnections();
      // Check directly from API to avoid stale closure
      try {
        const r = await fetch(`${BASE}/api/composio/connections?entityId=default`);
        if (r.ok) {
          const data = await r.json();
          const found = (data.items || []).find(
            (c: ComposioConnection) =>
              c.appName?.toLowerCase() === appKey.toLowerCase() && c.status === "ACTIVE"
          );
          if (found) {
            clearInterval(pollingRef.current!);
            setConnections(data.items || []);
            toast.success(`${displayName} connected successfully!`, {
              description: "You can now use it in your AI agents.",
            });
            return;
          }
        }
      } catch { /* ignore */ }
      if (elapsed >= 60000) {
        clearInterval(pollingRef.current!);
        toast.info(`Still connecting ${displayName}…`, {
          description: "Check back in a moment — authorization may still be in progress.",
        });
      }
    }, 2000);
  }, [fetchConnections]);

  const doInitiate = async (app: ComposioApp, apiKey?: string) => {
    setConnectingApp(app.key);
    try {
      const body: Record<string, string> = { appName: app.key, entityId: "default" };
      if (apiKey) body.apiKey = apiKey;

      const r = await fetch(`${BASE}/api/composio/connections/initiate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await r.json();

      if (!r.ok) {
        // API key required — show modal
        if (data.code === "REQUIRES_API_KEY" || data.requiresApiKey) {
          setApiKeyModal({ app, hint: data.hint || `${app.displayName || app.key} requires your own API key.` });
          return;
        }
        // No auth needed — treat as "already available"
        if (data.code === "NO_AUTH_REQUIRED" || data.noAuth) {
          toast.info(`${app.displayName || app.key} doesn't need authorization`, {
            description: "This toolkit is available without a connection.",
          });
          return;
        }
        throw new Error(data.error || "Failed to connect");
      }

      setApiKeyModal(null);

      if (data.redirectUrl) {
        const popup = window.open(
          data.redirectUrl,
          `composio_oauth_${app.key}`,
          "width=600,height=700,scrollbars=yes,resizable=yes"
        );
        toast.info(`Authorizing ${app.displayName || app.key}…`, {
          description: "Complete the sign-in in the popup window.",
          duration: 10000,
        });
        // Poll connections every 2s for up to 60s after popup opens
        pollUntilActive(app.key, app.displayName || app.key);
        // Also watch for popup close
        const popupCheck = setInterval(() => {
          if (!popup || popup.closed) clearInterval(popupCheck);
        }, 1000);
      } else if (data.connectionStatus === "ACTIVE") {
        toast.success(`${app.displayName || app.key} connected!`);
        await fetchConnections();
      } else {
        toast.success(`${app.displayName || app.key} connection initiated`, {
          description: "Polling for active status…",
        });
        pollUntilActive(app.key, app.displayName || app.key);
      }
    } catch (err: any) {
      toast.error(`Failed to connect ${app.displayName || app.key}`, {
        description: err.message,
      });
    } finally {
      setConnectingApp(null);
    }
  };

  const handleConnect = async (app: ComposioApp) => doInitiate(app);

  const handleApiKeySubmit = async (app: ComposioApp, apiKey: string) => {
    await doInitiate(app, apiKey);
  };

  const handleDisconnect = async (app: ComposioApp) => {
    const connId = getConnectionId(app.key);
    if (!connId) return;
    setDisconnectingId(connId);
    try {
      const r = await fetch(`${BASE}/api/composio/connections/${connId}`, { method: "DELETE" });
      if (r.ok || r.status === 204) {
        setConnections((prev) => prev.filter((c) => c.id !== connId));
        toast.success(`${app.displayName || app.key} disconnected`);
      } else {
        throw new Error("Delete failed");
      }
    } catch (err: any) {
      toast.error(`Failed to disconnect: ${err.message}`);
    } finally {
      setDisconnectingId(null);
    }
  };

  const displayApps = apps.length > 0 ? apps : FALLBACK_APPS;

  const filtered = displayApps.filter((app) => {
    const name = (app.displayName || app.key || "").toLowerCase();
    const desc = (app.description || "").toLowerCase();
    const matchSearch = !search || name.includes(search.toLowerCase()) || desc.includes(search.toLowerCase());
    const appCat = getAppCategory(app);
    const matchCat = category === "All" || appCat === category;
    return matchSearch && matchCat;
  });

  const connectedApps = displayApps.filter((app) => isConnected(app.key));

  return (
    <div className="h-full flex flex-col">
      <AnimatePresence>
        {apiKeyModal && (
          <ApiKeyModal
            state={apiKeyModal}
            onClose={() => setApiKeyModal(null)}
            onSubmit={handleApiKeySubmit}
          />
        )}
      </AnimatePresence>

      <div className="px-8 py-6 border-b border-border/40">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <Plug className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold text-foreground">MCP & Connections</h1>
            {composioStatus === "ok" && (
              <Badge className="bg-green-500/15 text-green-400 border-green-500/30 border text-[10px] px-1.5 h-4">
                Composio Live
              </Badge>
            )}
            {composioStatus === "error" && (
              <Badge className="bg-yellow-500/15 text-yellow-400 border-yellow-500/30 border text-[10px] px-1.5 h-4">
                Offline Mode
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Connect 250+ tools and AI clients to Nexus OS via Composio and Model Context Protocol
          </p>

          <div className="flex items-center gap-4 mt-5">
            {(["discover", "manage"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "text-sm font-medium pb-2 border-b-2 transition-colors capitalize",
                  activeTab === tab
                    ? "text-foreground border-primary"
                    : "text-muted-foreground border-transparent hover:text-foreground"
                )}
              >
                {tab}
                {tab === "manage" && connectedApps.length > 0 && (
                  <Badge variant="secondary" className="ml-2 h-4 px-1.5 text-[10px]">
                    {connectedApps.length}
                  </Badge>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {activeTab === "discover" ? (
        <ScrollArea className="flex-1">
          <div className="px-8 py-6 max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  placeholder="Search 250+ apps and integrations..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-muted/40 rounded-xl pl-9 pr-4 py-2.5 text-sm border border-border/40 focus:border-primary/50 outline-none transition-colors"
                />
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { fetchApps(); fetchConnections(); }}
                className="h-9 px-3 text-muted-foreground"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {APP_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={cn(
                    "text-xs px-3 py-1.5 rounded-lg border transition-colors",
                    category === cat
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border/60 text-muted-foreground hover:text-foreground hover:border-border"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>

            {appsLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Loading integrations from Composio…</p>
                </div>
              </div>
            ) : (
              <div>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                  {category === "All" ? "All Integrations" : category} · {filtered.length} available
                </h2>
                <div className="grid grid-cols-3 gap-4">
                  {filtered.map((app, i) => {
                    const connected = isConnected(app.key);
                    const pending = isPending(app.key);
                    const isConnecting = connectingApp === app.key;
                    const logo = getAppLogo(app);
                    const catLabel = getAppCategory(app);
                    return (
                      <motion.div
                        key={app.key}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.01 }}
                        className={cn(
                          "group flex flex-col gap-3 p-4 rounded-xl border bg-card hover:border-border transition-all",
                          connected ? "border-green-500/30 bg-green-500/5"
                          : pending ? "border-amber-500/30 bg-amber-500/5"
                          : "border-border/60"
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            {logo.startsWith("http") ? (
                              <img
                                src={logo}
                                alt={app.displayName || app.key}
                                className="w-10 h-10 rounded-xl object-contain bg-muted p-1"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = "none";
                                }}
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-xl">
                                {logo}
                              </div>
                            )}
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-sm text-foreground">
                                  {app.displayName || app.key}
                                </span>
                                {connected && (
                                  <div className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
                                )}
                                {pending && !connected && (
                                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />
                                )}
                              </div>
                              <div className="text-[11px] text-muted-foreground/60">{catLabel}</div>
                            </div>
                          </div>
                        </div>

                        <p className="text-xs text-muted-foreground leading-relaxed flex-1 line-clamp-2">
                          {app.description || `Connect ${app.displayName || app.key} to Nexus OS via Composio`}
                        </p>

                        <div className="flex items-center justify-between">
                          <div className="text-[10px] text-muted-foreground/40 font-mono">
                            via composio
                          </div>
                          <Button
                            size="sm"
                            variant={connected ? "outline" : "default"}
                            className={cn(
                              "h-7 text-xs gap-1.5",
                              !connected && !pending && "bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white border-0",
                              pending && !connected && "bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30"
                            )}
                            disabled={isConnecting || pending}
                            onClick={() => connected ? handleDisconnect(app) : handleConnect(app)}
                          >
                            {isConnecting ? (
                              <><Loader2 className="h-3 w-3 animate-spin" />Connecting…</>
                            ) : connected ? (
                              <><Check className="h-3 w-3" />Connected</>
                            ) : pending ? (
                              <><Loader2 className="h-3 w-3 animate-spin" />Pending…</>
                            ) : (
                              <><Link2 className="h-3 w-3" />Connect</>
                            )}
                          </Button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      ) : (
        <ScrollArea className="flex-1">
          <div className="px-8 py-6 max-w-4xl mx-auto">
            {connectedApps.length === 0 ? (
              <div className="text-center py-20">
                <Plug className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="font-semibold text-foreground mb-2">No active connections</h3>
                <p className="text-sm text-muted-foreground mb-1">
                  Connect apps from the Discover tab to give your agents superpowers
                </p>
                {composioStatus === "error" && (
                  <p className="text-xs text-yellow-400 mb-4">
                    Composio API unavailable — add COMPOSIO_API_KEY to enable live connections
                  </p>
                )}
                <Button size="sm" variant="outline" className="mt-4" onClick={() => setActiveTab("discover")}>
                  Browse integrations
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Connected · {connectedApps.length}
                  </h2>
                  <Button size="sm" variant="ghost" onClick={fetchConnections} className="h-7 text-xs gap-1 text-muted-foreground">
                    <RefreshCw className="h-3 w-3" /> Refresh
                  </Button>
                </div>
                {connectedApps.map((app) => {
                  const logo = getAppLogo(app);
                  const connId = getConnectionId(app.key);
                  const isDisconnecting = disconnectingId === connId;
                  return (
                    <motion.div
                      key={app.key}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-4 p-4 rounded-xl border border-green-500/20 bg-green-500/5"
                    >
                      {logo.startsWith("http") ? (
                        <img src={logo} alt={app.displayName || app.key}
                          className="w-10 h-10 rounded-xl object-contain bg-muted p-1" />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-xl">
                          {logo}
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="font-medium text-sm text-foreground">
                          {app.displayName || app.key}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {app.description || `Connected via Composio`}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 text-xs text-green-400">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                          Active
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-muted-foreground hover:text-destructive"
                          disabled={isDisconnecting}
                          onClick={() => handleDisconnect(app)}
                        >
                          {isDisconnecting ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <><Unlink className="h-3 w-3 mr-1" />Disconnect</>
                          )}
                        </Button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
