import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings, Brain, Zap, Key, Plus, Trash2, Check, X, ExternalLink,
  RefreshCw, Shield, User, Palette, Database, Globe, Star, ChevronRight,
  Eye, EyeOff, TestTube2, CheckCircle, XCircle, Loader2, Hash,
  Bell, Mail, Plug, Users, Download, Upload, Cpu, Lock, ChevronDown,
  Sparkles, BookOpen, LayoutGrid, Code, Bot, Search, Activity,
  Copy, Radio, ChevronUp, AlertCircle, Wifi,
} from "lucide-react";
import {
  useListAiProviders, useGetAiProviderCatalog, useCreateAiProvider,
  useDeleteAiProvider, useUpdateAiProvider, useTestAiProvider,
  useListMemories, useCreateMemory, useDeleteMemory, useListSkills,
} from "@workspace/api-client-react";
import { useAppStore } from "@/store/app";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface SettingsPageProps {
  section?: string;
}

const NAV_GROUPS = [
  {
    label: "Account",
    items: [
      { id: "profile", label: "My profile", icon: <User className="h-4 w-4" /> },
      { id: "preferences", label: "Preferences", icon: <Settings className="h-4 w-4" /> },
      { id: "notifications", label: "Notifications", icon: <Bell className="h-4 w-4" /> },
      { id: "integrations", label: "Integrations", icon: <Plug className="h-4 w-4" /> },
    ],
  },
  {
    label: "Workspace",
    items: [
      { id: "general", label: "General", icon: <LayoutGrid className="h-4 w-4" /> },
      { id: "people", label: "People", icon: <Users className="h-4 w-4" /> },
      { id: "import", label: "Import", icon: <Download className="h-4 w-4" /> },
    ],
  },
  {
    label: "Features",
    items: [
      { id: "providers", label: "AI Providers", icon: <Brain className="h-4 w-4" /> },
      { id: "memory", label: "AI Memory", icon: <Hash className="h-4 w-4" /> },
      { id: "skills", label: "AI Skills", icon: <Zap className="h-4 w-4" /> },
      { id: "mcp", label: "MCP Integrations", icon: <Code className="h-4 w-4" /> },
      { id: "triggers", label: "Triggers", icon: <Zap className="h-4 w-4" /> },
      { id: "agents", label: "Agents", icon: <Bot className="h-4 w-4" /> },
    ],
  },
  {
    label: "Workspace Settings",
    items: [
      { id: "appearance", label: "Appearance", icon: <Palette className="h-4 w-4" /> },
      { id: "security", label: "Security & Privacy", icon: <Shield className="h-4 w-4" /> },
    ],
  },
];

export default function SettingsPage({ section }: SettingsPageProps) {
  const [activeSection, setActiveSection] = useState(section || "profile");

  return (
    <div className="flex h-full">
      {/* Left nav */}
      <div className="w-56 flex-shrink-0 border-r border-border/40 bg-sidebar flex flex-col">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40">
          <Settings className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold text-sm">Settings</span>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-4">
            {NAV_GROUPS.map((group) => (
              <div key={group.label}>
                <div className="px-2 py-1 text-[11px] font-semibold text-muted-foreground/50 uppercase tracking-wider">{group.label}</div>
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors text-left",
                      activeSection === item.id
                        ? "bg-accent text-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                    )}
                  >
                    <span className={cn("flex-shrink-0", activeSection === item.id && "text-primary")}>{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.15 }}
            className="h-full overflow-hidden"
          >
            {activeSection === "profile" && <ProfileSection />}
            {activeSection === "preferences" && <PreferencesSection />}
            {activeSection === "notifications" && <NotificationsSection />}
            {activeSection === "integrations" && <IntegrationsSection />}
            {activeSection === "general" && <GeneralSection />}
            {activeSection === "people" && <PeopleSection />}
            {activeSection === "import" && <ImportSection />}
            {activeSection === "providers" && <ProvidersSection />}
            {activeSection === "memory" && <MemorySection />}
            {activeSection === "skills" && <SkillsSection />}
            {activeSection === "mcp" && <MCPSection />}
            {activeSection === "triggers" && <TriggersSection />}
            {activeSection === "agents" && <AgentsSettingsSection />}
            {activeSection === "appearance" && <AppearanceSection />}
            {activeSection === "security" && <SecuritySection />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ─────────────────────────── PROFILE ─────────────────────────── */
function ProfileSection() {
  return (
    <ScrollArea className="h-full">
      <div className="p-8 max-w-2xl mx-auto space-y-8">
        <div>
          <h2 className="text-xl font-bold text-foreground">My profile</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage your personal information</p>
        </div>
        <div className="flex items-center gap-5">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-violet-500 to-indigo-600 text-white">N</AvatarFallback>
          </Avatar>
          <div>
            <Button variant="outline" size="sm">Upload photo</Button>
            <p className="text-xs text-muted-foreground mt-1.5">Recommended: 256×256px, PNG or JPG</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[["Display name", "Nexus User"], ["Email", "user@nexusos.app"]].map(([label, placeholder]) => (
            <div key={label}>
              <Label className="text-xs text-muted-foreground">{label}</Label>
              <Input defaultValue={placeholder} className="mt-1.5 h-9" />
            </div>
          ))}
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Bio</Label>
          <Textarea placeholder="Write a short bio..." className="mt-1.5 resize-none h-20 text-sm" />
        </div>
        <Button className="bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white border-0">
          Save changes
        </Button>
      </div>
    </ScrollArea>
  );
}

/* ─────────────────────────── PREFERENCES ─────────────────────────── */
function PreferencesSection() {
  const [weekStart, setWeekStart] = useState("monday");
  const [language, setLanguage] = useState("en");

  const prefs = [
    { label: "Show desktop notifications", description: "Get alerts when someone mentions you" },
    { label: "Focus mode by default", description: "Hide sidebar on page open" },
    { label: "Open links in new tab", description: "External links open in a new browser tab" },
    { label: "Spellcheck", description: "Highlight spelling errors while typing" },
    { label: "Enable vim keybindings", description: "Use vim motions in the editor" },
  ];
  const [prefs_state, setPrefsState] = useState<Record<string, boolean>>({});

  return (
    <ScrollArea className="h-full">
      <div className="p-8 max-w-2xl mx-auto space-y-8">
        <div>
          <h2 className="text-xl font-bold">Preferences</h2>
          <p className="text-sm text-muted-foreground mt-1">Customize your Nexus OS experience</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground">Language</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="mt-1.5 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[["en", "English"], ["es", "Spanish"], ["fr", "French"], ["de", "German"], ["ja", "Japanese"], ["zh", "Chinese"]].map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Week starts on</Label>
            <Select value={weekStart} onValueChange={setWeekStart}>
              <SelectTrigger className="mt-1.5 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sunday">Sunday</SelectItem>
                <SelectItem value="monday">Monday</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1">
          {prefs.map((p) => (
            <div key={p.label} className="flex items-center justify-between py-3 border-b border-border/40 last:border-0">
              <div>
                <div className="text-sm font-medium text-foreground">{p.label}</div>
                <div className="text-xs text-muted-foreground">{p.description}</div>
              </div>
              <Switch
                checked={prefs_state[p.label] ?? false}
                onCheckedChange={(v) => setPrefsState((s) => ({ ...s, [p.label]: v }))}
              />
            </div>
          ))}
        </div>
      </div>
    </ScrollArea>
  );
}

/* ─────────────────────────── NOTIFICATIONS ─────────────────────────── */
function NotificationsSection() {
  const [state, setState] = useState<Record<string, boolean>>({
    page_comments: true, page_mentions: true, agent_completed: true, weekly_digest: false,
  });

  const groups = [
    {
      label: "Activity",
      items: [
        { id: "page_comments", label: "Comments on pages", description: "When someone comments on a page you own" },
        { id: "page_mentions", label: "Mentions", description: "When you're @mentioned anywhere" },
      ],
    },
    {
      label: "AI Agents",
      items: [
        { id: "agent_completed", label: "Agent completed", description: "When an agent finishes a task" },
        { id: "agent_error", label: "Agent errors", description: "When an agent encounters an error" },
      ],
    },
    {
      label: "Digest",
      items: [
        { id: "weekly_digest", label: "Weekly digest", description: "Weekly summary of workspace activity" },
        { id: "changelog", label: "Product updates", description: "New features and improvements" },
      ],
    },
  ];

  return (
    <ScrollArea className="h-full">
      <div className="p-8 max-w-2xl mx-auto space-y-8">
        <div>
          <h2 className="text-xl font-bold">Notifications</h2>
          <p className="text-sm text-muted-foreground mt-1">Control when and how you get notified</p>
        </div>
        {groups.map((group) => (
          <div key={group.label}>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{group.label}</h3>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-3 border-b border-border/40 last:border-0">
                  <div>
                    <div className="text-sm font-medium">{item.label}</div>
                    <div className="text-xs text-muted-foreground">{item.description}</div>
                  </div>
                  <Switch
                    checked={state[item.id] ?? false}
                    onCheckedChange={(v) => setState((s) => ({ ...s, [item.id]: v }))}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

/* ─────────────────────────── INTEGRATIONS ─────────────────────────── */
const APP_LOGOS: Record<string, string> = {
  github: "🐙", slack: "💬", gmail: "📧", googlecalendar: "📅",
  notion: "📋", linear: "📐", jira: "🔵", asana: "⚙️", trello: "📊",
  hubspot: "🟠", salesforce: "☁️", stripe: "💳", twitter: "🐦",
  discord: "💜", zoom: "📹", dropbox: "📦", googledrive: "📁",
  figma: "🎨", airtable: "📊", supabase: "⚡", openai: "🤖",
  serpapi: "🔍", clickup: "🟣", one_drive: "☁️", outlook: "📬",
  elevenlabs: "🎙️", perplexityai: "🔮", googledocs: "📄",
  googlesheets: "📊", googletasks: "✅", youtube: "▶️",
};

function formatAge(minutes: number | null): string {
  if (minutes === null) return "—";
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.round(minutes / 60)}h ago`;
  return `${Math.round(minutes / 1440)}d ago`;
}

function StatusBadge({ status }: { status: string }) {
  const cfg = {
    ACTIVE: { cls: "bg-green-500/15 text-green-400 border-green-500/30", dot: "bg-green-400" },
    EXPIRED: { cls: "bg-red-500/15 text-red-400 border-red-500/30", dot: "bg-red-400" },
    INITIATED: { cls: "bg-amber-500/15 text-amber-400 border-amber-500/30", dot: "bg-amber-400 animate-pulse" },
    FAILED: { cls: "bg-red-500/15 text-red-400 border-red-500/30", dot: "bg-red-400" },
  }[status] || { cls: "bg-muted text-muted-foreground border-border", dot: "bg-muted-foreground" };
  return (
    <span className={cn("flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium", cfg.cls)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

function IntegrationsSection() {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [reconnecting, setReconnecting] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "ACTIVE" | "EXPIRED" | "INITIATED">("all");
  const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");

  const fetchHealth = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const r = await fetch(`${BASE_URL}/api/composio/connections/health`);
      if (r.ok) setHealth(await r.json());
    } catch { /* ignore */ }
    setLoading(false);
    setRefreshing(false);
  }, [BASE_URL]);

  const cleanStale = useCallback(async () => {
    setCleaning(true);
    try {
      const r = await fetch(`${BASE_URL}/api/composio/connections/stale/cleanup`, { method: "DELETE" });
      if (r.ok) {
        const d = await r.json();
        toast.success(`Cleaned up ${d.deleted} stale connection${d.deleted !== 1 ? "s" : ""}`);
        await fetchHealth(true);
      }
    } catch { toast.error("Cleanup failed"); }
    setCleaning(false);
  }, [BASE_URL, fetchHealth]);

  useEffect(() => {
    cleanStale().then(() => fetchHealth());
  }, [cleanStale, fetchHealth]);

  const handleReconnect = async (conn: any) => {
    setReconnecting(conn.id);
    try {
      const r = await fetch(`${BASE_URL}/api/composio/connections/initiate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appName: conn.appName, entityId: "default" }),
      });
      const data = await r.json();
      if (!r.ok) {
        if (data.noAuth) {
          toast.info(`${conn.appName} doesn't need authorization`);
        } else {
          toast.error(data.error || "Failed to reconnect");
        }
        return;
      }
      if (data.redirectUrl) {
        const popup = window.open(data.redirectUrl, `reconnect_${conn.appName}`, "width=600,height=700,scrollbars=yes");
        toast.info(`Reconnecting ${conn.appName}…`, { description: "Complete authorization in the popup", duration: 8000 });
        const poll = setInterval(async () => {
          if (!popup || popup.closed) {
            clearInterval(poll);
            await fetchHealth(true);
          }
        }, 1000);
      }
    } catch (err: any) {
      toast.error(err.message);
    }
    setReconnecting(null);
  };

  const handleDisconnect = async (conn: any) => {
    setDisconnecting(conn.id);
    try {
      const r = await fetch(`${BASE_URL}/api/composio/connections/${conn.id}`, { method: "DELETE" });
      if (r.ok || r.status === 204) {
        toast.success(`${conn.appName} disconnected`);
        await fetchHealth(true);
      } else {
        toast.error("Failed to disconnect");
      }
    } catch { toast.error("Failed to disconnect"); }
    setDisconnecting(null);
  };

  const items: any[] = health?.items || [];
  const filtered = statusFilter === "all" ? items : items.filter((c: any) => c.status === statusFilter);

  return (
    <ScrollArea className="h-full">
      <div className="p-8 max-w-3xl mx-auto space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold">Connection Health</h2>
            <p className="text-sm text-muted-foreground mt-1">Monitor and manage all your Composio connections</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={cleanStale} disabled={cleaning}>
              {cleaning ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
              Clean Stale
            </Button>
            <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => fetchHealth(true)} disabled={refreshing}>
              <RefreshCw className={cn("h-3 w-3", refreshing && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto mb-3" />
              <p className="text-xs text-muted-foreground">Fetching connection health…</p>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: "Total", value: health?.total ?? 0, color: "text-foreground" },
                { label: "Active", value: health?.active ?? 0, color: "text-green-400" },
                { label: "Expired", value: health?.expired ?? 0, color: "text-red-400" },
                { label: "Pending", value: health?.initiated ?? 0, color: "text-amber-400" },
              ].map((s) => (
                <div key={s.label} className="p-4 rounded-xl border border-border/60 bg-card text-center">
                  <div className={cn("text-2xl font-bold", s.color)}>{s.value}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {(["all", "ACTIVE", "EXPIRED", "INITIATED"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={cn(
                    "text-xs px-3 py-1.5 rounded-lg border transition-colors capitalize",
                    statusFilter === f
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border/60 text-muted-foreground hover:text-foreground"
                  )}
                >
                  {f === "all" ? "All" : f === "INITIATED" ? "Pending" : f.charAt(0) + f.slice(1).toLowerCase()}
                  {f !== "all" && health?.byStatus?.[f] != null && (
                    <span className="ml-1 opacity-60">({health.byStatus[f]})</span>
                  )}
                </button>
              ))}
            </div>

            {filtered.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <Activity className="h-8 w-8 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No connections found</p>
                <p className="text-xs mt-1">Go to Marketplace to connect apps</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map((conn: any) => {
                  const logo = APP_LOGOS[conn.appName] || "🔗";
                  const isReconnecting = reconnecting === conn.id;
                  const isDisconnecting = disconnecting === conn.id;
                  return (
                    <motion.div
                      key={conn.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "flex items-center gap-3 p-3.5 rounded-xl border transition-all",
                        conn.status === "ACTIVE" ? "border-green-500/20 bg-green-500/5"
                        : conn.status === "EXPIRED" ? "border-red-500/20 bg-red-500/5"
                        : conn.status === "INITIATED" ? "border-amber-500/20 bg-amber-500/5"
                        : "border-border/60 bg-card"
                      )}
                    >
                      <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-lg flex-shrink-0">
                        {logo}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-foreground capitalize">
                            {conn.appName?.replace(/_/g, " ") || "Unknown"}
                          </span>
                          <StatusBadge status={conn.status} />
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-[11px] text-muted-foreground font-mono">
                            {conn.id}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {formatAge(conn.ageMinutes)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {conn.status !== "ACTIVE" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1 text-violet-400 border-violet-500/30 hover:bg-violet-500/10"
                            disabled={isReconnecting || isDisconnecting}
                            onClick={() => handleReconnect(conn)}
                          >
                            {isReconnecting ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                            Reconnect
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-muted-foreground hover:text-destructive"
                          disabled={isDisconnecting || isReconnecting}
                          onClick={() => handleDisconnect(conn)}
                        >
                          {isDisconnecting ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                        </Button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            <div className="rounded-xl border border-border/40 bg-muted/20 p-4">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Connections are secured through <strong>Composio OAuth</strong>. Expired connections must be re-authorized.
                Stale pending connections (older than 5 min) are auto-removed on page load.
                Visit <strong>Marketplace</strong> to add 250+ new integrations.
              </p>
            </div>
          </>
        )}
      </div>
    </ScrollArea>
  );
}

/* ─────────────────────────── GENERAL ─────────────────────────── */
function GeneralSection() {
  return (
    <ScrollArea className="h-full">
      <div className="p-8 max-w-2xl mx-auto space-y-8">
        <div>
          <h2 className="text-xl font-bold">Workspace General</h2>
          <p className="text-sm text-muted-foreground mt-1">Configure your workspace settings</p>
        </div>
        <div className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground">Workspace name</Label>
            <Input defaultValue="My Nexus Workspace" className="mt-1.5 h-9" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Workspace icon</Label>
            <div className="flex items-center gap-3 mt-1.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-xl">⚡</div>
              <Button variant="outline" size="sm">Change icon</Button>
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Domain</Label>
            <div className="flex items-center gap-2 mt-1.5">
              <Input defaultValue="my-workspace" className="h-9 flex-1" />
              <span className="text-sm text-muted-foreground">.nexusos.app</span>
            </div>
          </div>
        </div>
        <div className="pt-4 border-t border-border/40">
          <h3 className="text-sm font-semibold text-destructive mb-2">Danger Zone</h3>
          <Button variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:border-destructive">
            Delete workspace
          </Button>
        </div>
      </div>
    </ScrollArea>
  );
}

/* ─────────────────────────── PEOPLE ─────────────────────────── */
function PeopleSection() {
  const members = [
    { name: "Nexus Admin", email: "admin@nexusos.app", role: "Owner", avatar: "N" },
  ];
  return (
    <ScrollArea className="h-full">
      <div className="p-8 max-w-2xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">People</h2>
            <p className="text-sm text-muted-foreground mt-1">Manage workspace members and permissions</p>
          </div>
          <Button size="sm" className="gap-1.5 bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white border-0">
            <Plus className="h-3.5 w-3.5" /> Invite
          </Button>
        </div>
        <div>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Members · {members.length}</div>
          {members.map((m) => (
            <div key={m.email} className="flex items-center gap-3 py-3 border-b border-border/40 last:border-0">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs font-bold bg-gradient-to-br from-violet-500 to-indigo-600 text-white">{m.avatar}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="text-sm font-medium">{m.name}</div>
                <div className="text-xs text-muted-foreground">{m.email}</div>
              </div>
              <Badge variant="outline" className="text-xs border-primary/30 text-primary">{m.role}</Badge>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-dashed border-border/60 p-6 text-center">
          <Users className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Invite teammates to collaborate</p>
          <Button variant="outline" size="sm" className="mt-3">Send invite link</Button>
        </div>
      </div>
    </ScrollArea>
  );
}

/* ─────────────────────────── IMPORT ─────────────────────────── */
function ImportSection() {
  const sources = [
    { name: "Notion", desc: "Import pages, databases, and workspace structure", icon: "📋", format: ".zip export" },
    { name: "Obsidian", desc: "Import vault with Markdown and wiki links", icon: "🔮", format: ".md files" },
    { name: "Confluence", desc: "Import spaces and pages", icon: "🌊", format: ".xml export" },
    { name: "Markdown", desc: "Import any Markdown files or folder", icon: "📝", format: ".md, .mdx" },
    { name: "HTML", desc: "Import HTML files or exported websites", icon: "🌐", format: ".html files" },
    { name: "CSV / Excel", desc: "Import spreadsheets as databases", icon: "📊", format: ".csv, .xlsx" },
  ];

  return (
    <ScrollArea className="h-full">
      <div className="p-8 max-w-2xl mx-auto space-y-8">
        <div>
          <h2 className="text-xl font-bold">Import</h2>
          <p className="text-sm text-muted-foreground mt-1">Bring your content into Nexus OS</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {sources.map((src) => (
            <button
              key={src.name}
              onClick={() => toast.info(`Import from ${src.name} coming soon`)}
              className="flex items-start gap-3 p-4 rounded-xl border border-border/60 bg-card hover:border-border transition-colors text-left group"
            >
              <div className="text-2xl">{src.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-foreground">{src.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{src.desc}</div>
                <Badge variant="secondary" className="mt-2 text-[10px] h-4 px-1.5">{src.format}</Badge>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/30 flex-shrink-0 mt-0.5 group-hover:text-muted-foreground transition-colors" />
            </button>
          ))}
        </div>
      </div>
    </ScrollArea>
  );
}

/* ─────────────────────────── AI PROVIDERS ─────────────────────────── */
function ProvidersSection() {
  const qc = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedCatalog, setSelectedCatalog] = useState<any>(null);
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [model, setModel] = useState("");
  const [name, setName] = useState("");
  const [testResults, setTestResults] = useState<Record<string, "loading" | "ok" | "fail">>({});

  const { data: providers = [] } = useListAiProviders();
  const { data: catalog = [] } = useGetAiProviderCatalog();

  const { mutate: addProvider } = useCreateAiProvider({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ["providers"] });
        setShowAddForm(false);
        setSelectedCatalog(null);
        setApiKey(""); setModel(""); setName("");
        toast.success("Provider added!");
      },
    },
  });

  const { mutate: deleteProvider } = useDeleteAiProvider({
    mutation: { onSuccess: () => { qc.invalidateQueries({ queryKey: ["providers"] }); toast.success("Provider removed"); } },
  });

  const { mutate: updateProvider } = useUpdateAiProvider({
    mutation: { onSuccess: () => qc.invalidateQueries({ queryKey: ["providers"] }) },
  });

  const { mutateAsync: testProvider } = useTestAiProvider();

  const handleTest = async (providerId: string) => {
    setTestResults((prev) => ({ ...prev, [providerId]: "loading" }));
    try {
      await testProvider({ providerId } as any);
      setTestResults((prev) => ({ ...prev, [providerId]: "ok" }));
      toast.success("Connection successful!");
    } catch {
      setTestResults((prev) => ({ ...prev, [providerId]: "fail" }));
      toast.error("Connection failed");
    }
  };

  const handleAdd = () => {
    if (!selectedCatalog) return;
    addProvider({
      data: {
        name: name || selectedCatalog.name,
        provider: selectedCatalog.id,
        baseUrl: selectedCatalog.baseUrl,
        model: model || selectedCatalog.defaultModels?.[0],
        authType: selectedCatalog.authTypes?.[0] || "api_key",
        apiKey: apiKey,
        isDefault: (providers as any[]).length === 0,
      },
    } as any);
  };

  const groupedCatalog = (catalog as any[]).reduce((acc: any, item: any) => {
    const cat = item.category || "cloud";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  const categoryLabels: Record<string, string> = {
    cloud: "☁️ Cloud APIs", local: "💻 Local Models", session: "🍪 Session Auth",
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-8 max-w-2xl mx-auto space-y-6">
        <div>
          <h2 className="text-xl font-bold">AI Providers</h2>
          <p className="text-sm text-muted-foreground mt-1">Connect 25+ AI providers with API keys or session cookies</p>
        </div>

        {(providers as any[]).length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Connected Providers</h3>
            {(providers as any[]).map((provider: any) => {
              const isSessionAuth = provider.authType === "session";
              return (
                <div key={provider.id} className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border">
                  <div className="w-10 h-10 rounded-xl bg-muted/60 flex items-center justify-center text-xl flex-shrink-0">
                    {providerEmoji(provider.provider)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-foreground">{provider.name}</span>
                      {provider.isDefault && (
                        <Badge variant="outline" className="text-[10px] px-1.5 text-yellow-500 border-yellow-500/30">Default</Badge>
                      )}
                      {isSessionAuth && (
                        <Badge variant="outline" className="text-[10px] px-1.5 text-blue-400 border-blue-400/30">Session</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">{provider.model || "default model"}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    {!isSessionAuth && (
                      <>
                        {testResults[provider.id] === "loading" && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                        {testResults[provider.id] === "ok" && <CheckCircle className="h-4 w-4 text-green-500" />}
                        {testResults[provider.id] === "fail" && <XCircle className="h-4 w-4 text-destructive" />}
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleTest(provider.id)}>
                          <TestTube2 className="h-3 w-3 mr-1" />Test
                        </Button>
                      </>
                    )}
                    <Button
                      variant="ghost" size="sm" className="h-7 text-xs"
                      onClick={() => updateProvider({ providerId: provider.id, data: { isDefault: true } } as any)}
                      disabled={provider.isDefault}
                    >
                      {provider.isDefault ? <Star className="h-3 w-3 text-yellow-500" /> : "Set default"}
                    </Button>
                    <Button
                      variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteProvider({ providerId: provider.id } as any)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {showAddForm ? (
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Add AI Provider</h3>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowAddForm(false)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>

            {!selectedCatalog ? (
              <div className="space-y-3">
                {Object.entries(groupedCatalog).map(([cat, items]: any) => (
                  <div key={cat}>
                    <div className="text-xs text-muted-foreground font-medium mb-2">{categoryLabels[cat] || cat}</div>
                    <div className="grid grid-cols-2 gap-2">
                      {items.map((item: any) => (
                        <button
                          key={item.id}
                          onClick={() => { setSelectedCatalog(item); setName(item.name); setModel(item.defaultModels?.[0] || ""); }}
                          className="flex items-center gap-2 p-2.5 rounded-lg border border-border hover:border-primary/50 hover:bg-accent/30 transition-all text-left"
                        >
                          <span className="text-lg">{providerEmoji(item.id)}</span>
                          <div>
                            <div className="text-xs font-medium text-foreground">{item.name}</div>
                            <div className="text-[10px] text-muted-foreground capitalize">{item.authTypes?.join(", ")}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40">
                  <span className="text-2xl">{providerEmoji(selectedCatalog.id)}</span>
                  <div>
                    <div className="font-medium text-sm">{selectedCatalog.name}</div>
                    <div className="text-xs text-muted-foreground">{selectedCatalog.baseUrl}</div>
                  </div>
                  <Button variant="ghost" size="sm" className="ml-auto text-xs" onClick={() => setSelectedCatalog(null)}>Change</Button>
                </div>

                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Display Name</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={selectedCatalog.name} className="mt-1 h-8 text-sm" />
                  </div>

                  {selectedCatalog.authTypes?.includes("api_key") && (
                    <div>
                      <Label className="text-xs text-muted-foreground">API Key</Label>
                      <div className="relative mt-1">
                        <Input
                          value={apiKey} onChange={(e) => setApiKey(e.target.value)}
                          type={showKey ? "text" : "password"}
                          placeholder={`${selectedCatalog.name} API Key`}
                          className="h-8 text-sm pr-8 font-mono"
                        />
                        <button className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowKey(!showKey)}>
                          {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>
                  )}

                  {selectedCatalog.authTypes?.includes("session") && !selectedCatalog.authTypes?.includes("api_key") && (
                    <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <p className="text-xs text-blue-400">
                        This provider uses session-based auth. Open the provider in your browser and log in, then this integration will use your browser session automatically.
                      </p>
                    </div>
                  )}

                  <div>
                    <Label className="text-xs text-muted-foreground">Model</Label>
                    <Select value={model} onValueChange={setModel}>
                      <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="Select model" /></SelectTrigger>
                      <SelectContent>
                        {selectedCatalog.defaultModels?.map((m: string) => (
                          <SelectItem key={m} value={m} className="text-sm font-mono">{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button onClick={handleAdd} size="sm" className="w-full bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white border-0">
                  <Plus className="h-3.5 w-3.5 mr-1" />Add Provider
                </Button>
              </div>
            )}
          </div>
        ) : (
          <Button onClick={() => setShowAddForm(true)} variant="outline" className="w-full h-10 gap-2 border-dashed hover:border-primary/50">
            <Plus className="h-4 w-4" />Add AI Provider
          </Button>
        )}
      </div>
    </ScrollArea>
  );
}

/* ─────────────────────────── MEMORY ─────────────────────────── */
function MemorySection() {
  const qc = useQueryClient();
  const [newMemory, setNewMemory] = useState("");
  const [memType, setMemType] = useState("long_term");

  const { data: memories = [] } = useListMemories(undefined, {});
  const { mutate: createMemory } = useCreateMemory({
    mutation: { onSuccess: () => { qc.invalidateQueries({ queryKey: ["memory"] }); setNewMemory(""); toast.success("Memory saved"); } },
  });
  const { mutate: deleteMemory } = useDeleteMemory({
    mutation: { onSuccess: () => { qc.invalidateQueries({ queryKey: ["memory"] }); toast.success("Memory deleted"); } },
  });

  const TYPE_COLORS: Record<string, string> = {
    short_term: "#f59e0b", long_term: "#6366f1", skill: "#10b981", preference: "#ec4899",
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-8 max-w-2xl mx-auto space-y-6">
        <div>
          <h2 className="text-xl font-bold">AI Memory</h2>
          <p className="text-sm text-muted-foreground mt-1">What Nexus AI knows about you and your work</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <Textarea
            value={newMemory} onChange={(e) => setNewMemory(e.target.value)}
            placeholder="Add a memory... (e.g., 'I prefer bullet points over paragraphs')"
            className="text-sm min-h-20 resize-none"
          />
          <div className="flex items-center gap-2">
            <Select value={memType} onValueChange={setMemType}>
              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="short_term">Short-term</SelectItem>
                <SelectItem value="long_term">Long-term</SelectItem>
                <SelectItem value="skill">Skill</SelectItem>
                <SelectItem value="preference">Preference</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm" className="h-8"
              onClick={() => newMemory.trim() && createMemory({ data: { content: newMemory, type: memType as any, importance: 5 } } as any)}
              disabled={!newMemory.trim()}
            >
              Save Memory
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          {(memories as any[]).map((mem: any) => (
            <div key={mem.id} className="flex items-start gap-3 p-3 rounded-xl bg-card border border-border group">
              <div className="w-1.5 h-full min-h-[40px] rounded-full flex-shrink-0 mt-1" style={{ background: TYPE_COLORS[mem.type] || "#6366f1" }} />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-foreground leading-relaxed">{mem.content}</div>
                <div className="flex items-center gap-2 mt-1.5">
                  <Badge variant="outline" className="text-[10px] px-1.5 capitalize" style={{ color: TYPE_COLORS[mem.type], borderColor: TYPE_COLORS[mem.type] + "40" }}>
                    {mem.type?.replace("_", " ")}
                  </Badge>
                  <span className="text-xs text-muted-foreground">Importance: {mem.importance}/10</span>
                </div>
              </div>
              <button
                onClick={() => deleteMemory({ memoryId: mem.id } as any)}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all flex-shrink-0"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {(memories as any[]).length === 0 && (
            <div className="text-center py-8 text-sm text-muted-foreground">
              <Hash className="h-8 w-8 mx-auto mb-2 opacity-30" />
              No memories yet. AI will learn from your conversations.
            </div>
          )}
        </div>
      </div>
    </ScrollArea>
  );
}

/* ─────────────────────────── SKILLS ─────────────────────────── */
function SkillsSection() {
  const { data: skills = [] } = useListSkills(undefined, {});
  const CATEGORY_COLORS: Record<string, string> = {
    writing: "#6366f1", productivity: "#10b981", creative: "#f59e0b",
    learning: "#3b82f6", coding: "#ec4899",
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-8 max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">AI Skills</h2>
            <p className="text-sm text-muted-foreground mt-1">Built-in and custom AI actions</p>
          </div>
          <Button size="sm" variant="outline" className="gap-1.5"><Plus className="h-3.5 w-3.5" /> Custom Skill</Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {(skills as any[]).map((skill: any) => (
            <div key={skill.id} className="p-4 rounded-xl bg-card border border-border hover:border-border/80 transition-all">
              <div className="flex items-start gap-3">
                <span className="text-2xl">{skill.icon || "⚡"}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{skill.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{skill.description}</div>
                  <Badge variant="outline" className="text-[10px] px-1.5 mt-2 capitalize"
                    style={{ color: CATEGORY_COLORS[skill.category], borderColor: CATEGORY_COLORS[skill.category] + "40" }}>
                    {skill.category}
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ScrollArea>
  );
}

/* ─────────────────────────── MCP ─────────────────────────── */
const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");

interface MCPServer {
  id: string;
  name: string;
  url: string;
  status: "connected" | "error" | "pending";
  tools?: number;
  description?: string;
  isBuiltIn?: boolean;
}

function MCPSection() {
  const [endpoint, setEndpoint] = useState("");
  const [mcpName, setMcpName] = useState("");
  const [composioMCP, setComposioMCP] = useState<MCPServer | null>(null);
  const [composioStatus, setComposioStatus] = useState<"loading" | "ok" | "error">("loading");
  const [customServers, setCustomServers] = useState<MCPServer[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("nexus_mcp_servers") || "[]");
    } catch { return []; }
  });
  const [addingServer, setAddingServer] = useState(false);

  useEffect(() => {
    fetch(`${BASE_URL}/api/composio/mcp`)
      .then(async (r) => {
        if (!r.ok) throw new Error("unavailable");
        const data = await r.json();
        setComposioMCP({
          id: "composio",
          name: "Composio",
          url: data.url,
          status: "connected",
          tools: data.tools,
          description: data.description,
          isBuiltIn: true,
        });
        setComposioStatus("ok");
      })
      .catch(() => {
        setComposioMCP({
          id: "composio",
          name: "Composio",
          url: "https://mcp.composio.dev",
          status: "error",
          tools: 250,
          description: "250+ tool integrations — add COMPOSIO_API_KEY to enable",
          isBuiltIn: true,
        });
        setComposioStatus("error");
      });
  }, []);

  const saveCustomServers = (servers: MCPServer[]) => {
    setCustomServers(servers);
    localStorage.setItem("nexus_mcp_servers", JSON.stringify(servers));
  };

  const addServer = () => {
    if (!endpoint.trim() || !mcpName.trim()) return;
    const server: MCPServer = {
      id: `custom-${Date.now()}`,
      name: mcpName,
      url: endpoint,
      status: "pending",
    };
    saveCustomServers([...customServers, server]);
    setEndpoint("");
    setMcpName("");
    setAddingServer(false);
    toast.success(`${mcpName} added as MCP server`);
    setTimeout(() => {
      saveCustomServers(
        [...customServers, server].map((s) =>
          s.id === server.id ? { ...s, status: "connected" } : s
        )
      );
    }, 1500);
  };

  const removeServer = (id: string) => {
    saveCustomServers(customServers.filter((s) => s.id !== id));
    toast.success("MCP server removed");
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-8 max-w-2xl mx-auto space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold">MCP Integrations</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Connect Model Context Protocol servers to extend AI capabilities
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs"
            onClick={() => setAddingServer((v) => !v)}
          >
            <Plus className="h-3.5 w-3.5" />
            Add Server
          </Button>
        </div>

        {/* Composio status card */}
        <div className={cn(
          "rounded-xl border p-4 flex items-start gap-4",
          composioStatus === "ok"
            ? "border-violet-500/30 bg-violet-500/5"
            : composioStatus === "error"
            ? "border-yellow-500/30 bg-yellow-500/5"
            : "border-border bg-card"
        )}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-xl flex-shrink-0">
            🔗
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-semibold text-sm">Composio</span>
              <Badge
                className={cn(
                  "text-[9px] px-1.5 h-3.5 border",
                  composioStatus === "ok"
                    ? "bg-green-500/15 text-green-400 border-green-500/30"
                    : composioStatus === "error"
                    ? "bg-yellow-500/15 text-yellow-400 border-yellow-500/30"
                    : "bg-muted text-muted-foreground border-border"
                )}
              >
                {composioStatus === "loading" ? "Checking…" : composioStatus === "ok" ? "Live" : "Not configured"}
              </Badge>
              <Badge variant="outline" className="text-[9px] px-1.5 h-3.5 border-primary/30 text-primary">
                Built-in
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              250+ tool integrations with OAuth handling for AI agents · GitHub, Slack, Gmail, Linear, Jira &amp; more
            </p>
            {composioStatus === "ok" && composioMCP && (
              <div className="flex items-center gap-2">
                <code className="text-[10px] bg-muted/60 px-2 py-0.5 rounded font-mono text-muted-foreground truncate max-w-xs">
                  {composioMCP.url.replace(/apiKey=[^&]+/, "apiKey=***")}
                </code>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-5 px-1.5 text-[10px] text-muted-foreground"
                  onClick={() => {
                    if (composioMCP?.url) {
                      navigator.clipboard.writeText(composioMCP.url);
                      toast.success("MCP URL copied");
                    }
                  }}
                >
                  Copy
                </Button>
              </div>
            )}
            {composioStatus === "error" && (
              <p className="text-[10px] text-yellow-400">
                Add <code className="font-mono">COMPOSIO_API_KEY</code> to Secrets to activate live tools
              </p>
            )}
          </div>
          <div className="flex-shrink-0">
            <div className={cn(
              "w-2 h-2 rounded-full mt-1",
              composioStatus === "ok" ? "bg-green-400 animate-pulse" :
              composioStatus === "error" ? "bg-yellow-400" : "bg-muted"
            )} />
          </div>
        </div>

        {/* Add custom server form */}
        <AnimatePresence>
          {addingServer && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="rounded-xl border border-border bg-card p-5 space-y-4 overflow-hidden"
            >
              <h3 className="font-semibold text-sm">Add Custom MCP Server</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Server name</Label>
                  <Input
                    value={mcpName}
                    onChange={(e) => setMcpName(e.target.value)}
                    placeholder="Brave Search"
                    className="mt-1 h-8 text-sm"
                    onKeyDown={(e) => e.key === "Enter" && addServer()}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Endpoint URL</Label>
                  <Input
                    value={endpoint}
                    onChange={(e) => setEndpoint(e.target.value)}
                    placeholder="https://mcp.example.com"
                    className="mt-1 h-8 text-sm"
                    onKeyDown={(e) => e.key === "Enter" && addServer()}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={addServer}
                  disabled={!endpoint.trim() || !mcpName.trim()}
                  className="bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white border-0"
                >
                  Connect Server
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setAddingServer(false)}>
                  Cancel
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* All MCP servers list */}
        {customServers.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Custom Servers · {customServers.length}
            </h3>
            <div className="space-y-2">
              {customServers.map((c) => (
                <div key={c.id} className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card">
                  <div className={cn(
                    "w-2 h-2 rounded-full flex-shrink-0",
                    c.status === "connected" ? "bg-green-400" :
                    c.status === "pending" ? "bg-yellow-400 animate-pulse" : "bg-red-400"
                  )} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{c.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{c.url}</div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-muted-foreground hover:text-destructive"
                    onClick={() => removeServer(c.id)}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MCP protocol info */}
        <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Code className="h-4 w-4 text-primary" />
            About Model Context Protocol
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            MCP is an open standard for connecting AI systems to external tools and data sources.
            When you add an MCP server, your AI agents in Nexus gain access to all of its tools — enabling actions like
            searching the web, reading emails, creating GitHub issues, and more.
          </p>
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1.5"
              onClick={() => window.open("https://modelcontextprotocol.io", "_blank")}
            >
              <ExternalLink className="h-3 w-3" />
              MCP Spec
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1.5"
              onClick={() => window.open("https://composio.dev/mcp", "_blank")}
            >
              <ExternalLink className="h-3 w-3" />
              Composio MCP Docs
            </Button>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}

/* ─────────────────────────── AGENTS SETTINGS ─────────────────────────── */
function AgentsSettingsSection() {
  const [autoRun, setAutoRun] = useState(false);
  const [maxConcurrent, setMaxConcurrent] = useState("3");
  const [allowWebSearch, setAllowWebSearch] = useState(true);
  const [allowPageCreate, setAllowPageCreate] = useState(true);

  return (
    <ScrollArea className="h-full">
      <div className="p-8 max-w-2xl mx-auto space-y-8">
        <div>
          <h2 className="text-xl font-bold">Agents</h2>
          <p className="text-sm text-muted-foreground mt-1">Configure AI agent behavior and permissions</p>
        </div>

        <div className="space-y-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Behavior</h3>
          {[
            { label: "Auto-run on triggers", desc: "Allow agents to run automatically on page changes", value: autoRun, onChange: setAutoRun },
            { label: "Allow web search", desc: "Agents can browse the web to gather information", value: allowWebSearch, onChange: setAllowWebSearch },
            { label: "Allow page creation", desc: "Agents can create new pages in your workspace", value: allowPageCreate, onChange: setAllowPageCreate },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between py-3 border-b border-border/40 last:border-0">
              <div>
                <div className="text-sm font-medium">{item.label}</div>
                <div className="text-xs text-muted-foreground">{item.desc}</div>
              </div>
              <Switch checked={item.value} onCheckedChange={item.onChange} />
            </div>
          ))}
        </div>

        <div>
          <Label className="text-xs text-muted-foreground">Max concurrent agents</Label>
          <Select value={maxConcurrent} onValueChange={setMaxConcurrent}>
            <SelectTrigger className="mt-1.5 h-9 w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["1", "2", "3", "5", "10"].map((v) => <SelectItem key={v} value={v}>{v} agent{v !== "1" ? "s" : ""}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
    </ScrollArea>
  );
}

/* ─────────────────────────── APPEARANCE ─────────────────────────── */
function AppearanceSection() {
  const { theme, setTheme } = useAppStore();

  const themes = [
    { id: "dark", label: "Dark", emoji: "🌑", desc: "Easy on the eyes" },
    { id: "light", label: "Light", emoji: "☀️", desc: "Classic and clean" },
    { id: "system", label: "System", emoji: "💻", desc: "Follows your OS" },
  ];

  const fonts = ["Default (Inter)", "Serif (Georgia)", "Mono (JetBrains Mono)"];
  const [font, setFont] = useState(fonts[0]);

  return (
    <ScrollArea className="h-full">
      <div className="p-8 max-w-2xl mx-auto space-y-8">
        <div>
          <h2 className="text-xl font-bold">Appearance</h2>
          <p className="text-sm text-muted-foreground mt-1">Customize how Nexus OS looks</p>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-3">Theme</h3>
          <div className="grid grid-cols-3 gap-3">
            {themes.map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id as any)}
                className={cn(
                  "p-4 rounded-xl border-2 transition-all text-center",
                  theme === t.id ? "border-primary bg-primary/10" : "border-border bg-card hover:border-border/80"
                )}
              >
                <div className="text-3xl mb-2">{t.emoji}</div>
                <div className="text-sm font-medium">{t.label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{t.desc}</div>
                {theme === t.id && <div className="h-1 w-6 bg-primary rounded-full mx-auto mt-2" />}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-3">Font</h3>
          <div className="space-y-2">
            {fonts.map((f) => (
              <button
                key={f}
                onClick={() => setFont(f)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left",
                  font === f ? "border-primary bg-primary/5" : "border-border hover:border-border/80"
                )}
              >
                <div className={cn("flex-1 text-sm", f.includes("Mono") && "font-mono", f.includes("Serif") && "font-serif")}>{f}</div>
                {font === f && <CheckCircle className="h-4 w-4 text-primary" />}
              </button>
            ))}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}

/* ─────────────────────────── SECURITY ─────────────────────────── */
function SecuritySection() {
  return (
    <ScrollArea className="h-full">
      <div className="p-8 max-w-2xl mx-auto space-y-8">
        <div>
          <h2 className="text-xl font-bold">Security & Privacy</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage your security settings</p>
        </div>

        <div className="space-y-2">
          {[
            { label: "Two-factor authentication", desc: "Add an extra layer of security", done: false },
            { label: "Active sessions", desc: "Manage where you're logged in", done: true },
            { label: "API access tokens", desc: "Generate tokens for external access", done: false },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card">
              <div className="flex-1">
                <div className="font-medium text-sm">{item.label}</div>
                <div className="text-xs text-muted-foreground">{item.desc}</div>
              </div>
              <Button size="sm" variant={item.done ? "outline" : "default"} className={cn("h-8 text-xs", !item.done && "bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white border-0")}>
                {item.done ? "Manage" : "Set up"}
              </Button>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-border/40 bg-muted/20 p-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Data & Privacy</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Nexus OS stores all your data locally. AI requests are sent directly to your configured providers. No data is shared with Nexus OS servers unless explicitly exported.
          </p>
        </div>
      </div>
    </ScrollArea>
  );
}

/* ─────────────────────────── TRIGGERS ─────────────────────────── */
interface WebhookEvent {
  id: string;
  triggerName: string;
  appName: string;
  entityId: string;
  payload: Record<string, unknown>;
  receivedAt: string;
}

const APP_EMOJI: Record<string, string> = {
  github: "🐙", slack: "💬", gmail: "📧", googlecalendar: "📅",
  notion: "📋", linear: "🔷", jira: "🟦", discord: "🎮",
  zoom: "📹", asana: "✅", trello: "🗂️", hubspot: "🟠",
  stripe: "💳", outlook: "🟦", twitter: "𝕏", shopify: "🛍️",
};

function TriggersSection() {
  const [triggers, setTriggers] = useState<any[]>([]);
  const [instances, setInstances] = useState<any[]>([]);
  const [connections, setConnections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [appFilter, setAppFilter] = useState("all");
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [unsubscribing, setUnsubscribing] = useState<string | null>(null);

  // Webhook event log state
  const [webhookEvents, setWebhookEvents] = useState<WebhookEvent[]>([]);
  const [webhookUrl, setWebhookUrl] = useState<string>("");
  const [webhookExpanded, setWebhookExpanded] = useState(true);
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [liveStreaming, setLiveStreaming] = useState(true);
  const sseRef = useRef<EventSource | null>(null);

  // Fetch webhook URL on mount
  useEffect(() => {
    fetch(`${BASE_URL}/api/composio/webhook/config`).then(r => r.ok ? r.json() : null).then(d => {
      if (d?.webhookUrl) setWebhookUrl(d.webhookUrl);
    }).catch(() => {});
  }, [BASE_URL]);

  // SSE stream for real-time webhook events
  useEffect(() => {
    if (!liveStreaming) { sseRef.current?.close(); sseRef.current = null; return; }

    const es = new EventSource(`${BASE_URL}/api/composio/webhook/stream`);
    sseRef.current = es;

    es.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "init") {
          setWebhookEvents(msg.events || []);
        } else if (msg.type === "event" && msg.event) {
          setWebhookEvents(prev => {
            const exists = prev.some(x => x.id === msg.event.id);
            if (exists) return prev;
            return [msg.event, ...prev].slice(0, 100);
          });
        }
      } catch { /* ignore malformed */ }
    };

    es.onerror = () => {
      // On error, fall back to polling once
      es.close();
      fetch(`${BASE_URL}/api/composio/webhook/events`).then(r => r.ok ? r.json() : null).then(d => {
        if (d?.events) setWebhookEvents(d.events);
      }).catch(() => {});
    };

    return () => { es.close(); sseRef.current = null; };
  }, [liveStreaming, BASE_URL]);

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl).then(() => toast.success("Webhook URL copied!"));
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [trigRes, instRes, connRes] = await Promise.all([
        fetch(`${BASE_URL}/api/composio/triggers?limit=100`),
        fetch(`${BASE_URL}/api/composio/triggers/instances`),
        fetch(`${BASE_URL}/api/composio/connections?entityId=default`),
      ]);
      if (trigRes.ok) {
        const d = await trigRes.json();
        setTriggers(d.items || []);
      }
      if (instRes.ok) {
        const d = await instRes.json();
        setInstances(d.items || []);
      }
      if (connRes.ok) {
        const d = await connRes.json();
        setConnections(d.items || []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const isSubscribed = (triggerName: string) =>
    instances.some((i: any) => i.triggerName === triggerName || i.type === triggerName);

  const getInstanceId = (triggerName: string) =>
    instances.find((i: any) => i.triggerName === triggerName || i.type === triggerName)?.id;

  const handleSubscribe = async (trigger: any) => {
    // Find a connected account for this trigger's app
    const appKey = trigger.appKey || trigger.appId || (trigger.name || "").split("_")[0]?.toLowerCase();
    const conn = connections.find((c: any) =>
      c.appName?.toLowerCase() === appKey?.toLowerCase() && c.status === "ACTIVE"
    );
    if (!conn) {
      toast.error(`Connect ${appKey || "the app"} first via Marketplace → Connect Apps`);
      return;
    }
    setSubscribing(trigger.name);
    try {
      const r = await fetch(`${BASE_URL}/api/composio/triggers/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          triggerName: trigger.name,
          connectedAccountId: conn.id,
          entityId: "default",
          config: {},
        }),
      });
      if (r.ok || r.status === 200) {
        toast.success(`Subscribed to "${trigger.display_name || trigger.name}"`);
        await fetchAll();
      } else {
        const e = await r.json().catch(() => ({}));
        toast.error(e.error || "Failed to subscribe");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to subscribe");
    }
    setSubscribing(null);
  };

  const handleUnsubscribe = async (trigger: any) => {
    const instanceId = getInstanceId(trigger.name);
    if (!instanceId) return;
    setUnsubscribing(trigger.name);
    try {
      const r = await fetch(`${BASE_URL}/api/composio/triggers/instances/${instanceId}`, {
        method: "DELETE",
      });
      if (r.ok || r.status === 204) {
        setInstances((prev) => prev.filter((i: any) => i.id !== instanceId));
        toast.success(`Unsubscribed from "${trigger.display_name || trigger.name}"`);
      } else {
        toast.error("Failed to unsubscribe");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to unsubscribe");
    }
    setUnsubscribing(null);
  };

  // Get unique app names from triggers
  const appNames = Array.from(new Set(
    triggers.map((t: any) => {
      const raw = t.appKey || (t.name || "").split("_")[0]?.toLowerCase() || "unknown";
      return raw;
    })
  )).sort();

  const filtered = triggers.filter((t: any) => {
    const name = (t.display_name || t.name || "").toLowerCase();
    const desc = (t.description || "").toLowerCase();
    const matchSearch = !search || name.includes(search.toLowerCase()) || desc.includes(search.toLowerCase());
    const trigApp = (t.appKey || (t.name || "").split("_")[0]?.toLowerCase() || "");
    const matchApp = appFilter === "all" || trigApp === appFilter;
    return matchSearch && matchApp;
  });

  return (
    <ScrollArea className="h-full">
      <div className="p-8 max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold">Triggers & Webhooks</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Subscribe to real-time events from your connected apps. {triggers.length} triggers available.
            </p>
          </div>
          <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => { fetchAll(); }}>
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>

        {/* ── Webhook Event Log ───────────────────────────────────────────────── */}
        <div className="rounded-xl border border-border/60 overflow-hidden">
          {/* Collapsible header */}
          <button
            onClick={() => setWebhookExpanded(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 bg-card hover:bg-accent/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-violet-500/10 flex items-center justify-center">
                <Radio className="h-3.5 w-3.5 text-violet-400" />
              </div>
              <div className="text-left">
                <div className="text-sm font-semibold text-foreground flex items-center gap-2">
                  Webhook Event Log
                  {webhookEvents.length > 0 && (
                    <span className="text-[10px] bg-violet-500/20 text-violet-400 px-1.5 py-0.5 rounded-full font-medium">
                      {webhookEvents.length} events
                    </span>
                  )}
                  {liveStreaming && (
                    <span className="flex items-center gap-1 text-[10px] text-green-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                      live
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-muted-foreground">Real-time trigger events received by this app</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); setLiveStreaming(v => !v); }}
                className={cn(
                  "text-[10px] px-2 py-0.5 rounded-full border transition-colors",
                  liveStreaming
                    ? "border-green-500/30 text-green-400 bg-green-500/10"
                    : "border-border/60 text-muted-foreground"
                )}
              >
                {liveStreaming ? "● Live" : "○ Paused"}
              </button>
              {webhookExpanded
                ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </div>
          </button>

          <AnimatePresence>
            {webhookExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden"
              >
                {/* Webhook URL */}
                <div className="px-4 py-3 border-t border-border/40 bg-muted/20">
                  <div className="flex items-center gap-2 mb-1">
                    <Wifi className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Your Webhook URL</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-[11px] font-mono bg-black/20 rounded-lg px-3 py-2 text-muted-foreground truncate border border-border/30">
                      {webhookUrl || "Loading…"}
                    </code>
                    <Button size="icon" variant="outline" className="h-8 w-8 flex-shrink-0" onClick={copyWebhookUrl}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground/60 mt-1.5">
                    Add this URL in{" "}
                    <a href="https://app.composio.dev/settings" target="_blank" rel="noopener noreferrer"
                      className="text-primary underline">app.composio.dev → Webhooks</a>
                    {" "}to receive real-time trigger events.
                  </p>
                </div>

                {/* Events */}
                <div className="border-t border-border/40 divide-y divide-border/20">
                  {webhookEvents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                      <div className="w-10 h-10 rounded-xl bg-muted/40 flex items-center justify-center mb-3">
                        <Activity className="h-5 w-5 text-muted-foreground/30" />
                      </div>
                      <p className="text-sm font-medium text-muted-foreground">No events received yet</p>
                      <p className="text-xs text-muted-foreground/60 mt-1 max-w-xs leading-relaxed">
                        Once you add the webhook URL to Composio and subscribe to triggers,
                        events will appear here in real-time.
                      </p>
                    </div>
                  ) : (
                    <div className="max-h-80 overflow-y-auto">
                      {webhookEvents.map((evt) => {
                        const isExpanded = expandedEvent === evt.id;
                        const emoji = APP_EMOJI[evt.appName?.toLowerCase()] || "⚡";
                        const relTime = (() => {
                          const diff = Date.now() - new Date(evt.receivedAt).getTime();
                          if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
                          if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
                          return new Date(evt.receivedAt).toLocaleTimeString();
                        })();

                        return (
                          <motion.div
                            key={evt.id}
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="px-4 py-3 hover:bg-accent/20 transition-colors cursor-pointer"
                            onClick={() => setExpandedEvent(isExpanded ? null : evt.id)}
                          >
                            <div className="flex items-center gap-3">
                              <div className="text-base flex-shrink-0">{emoji}</div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-semibold text-foreground font-mono truncate">
                                    {evt.triggerName}
                                  </span>
                                  <Badge variant="outline" className="text-[9px] px-1 h-3.5 border-border/40 text-muted-foreground capitalize flex-shrink-0">
                                    {evt.appName}
                                  </Badge>
                                </div>
                                {!isExpanded && (
                                  <div className="text-[10px] text-muted-foreground truncate mt-0.5">
                                    {JSON.stringify(evt.payload).slice(0, 80)}…
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="text-[10px] text-muted-foreground/50">{relTime}</span>
                                <div className="w-5 h-5 rounded-full bg-green-500/10 flex items-center justify-center">
                                  <CheckCircle className="h-3 w-3 text-green-400" />
                                </div>
                                {isExpanded
                                  ? <ChevronUp className="h-3 w-3 text-muted-foreground" />
                                  : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
                              </div>
                            </div>
                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="mt-3 overflow-hidden"
                                >
                                  <pre className="text-[10px] font-mono bg-black/20 rounded-lg p-3 overflow-x-auto text-muted-foreground border border-border/30 max-h-40">
                                    {JSON.stringify(evt.payload, null, 2)}
                                  </pre>
                                  <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground/50">
                                    <span>entity: {evt.entityId}</span>
                                    <span>·</span>
                                    <span>{new Date(evt.receivedAt).toLocaleString()}</span>
                                    <span>·</span>
                                    <span className="font-mono text-muted-foreground/30">{evt.id}</span>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Active subscriptions */}
        {instances.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Active Subscriptions · {instances.length}
            </h3>
            {instances.map((inst: any) => (
              <div key={inst.id} className="flex items-center gap-3 p-3 rounded-xl border border-green-500/30 bg-green-500/5">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-foreground truncate">
                    {inst.triggerName || inst.type || inst.name || inst.id}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {inst.connectedAccountId ? `Account: ${inst.connectedAccountId?.slice(0, 12)}…` : "Active"}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs text-muted-foreground hover:text-destructive flex-shrink-0"
                  onClick={() => handleUnsubscribe({ name: inst.triggerName || inst.type })}
                  disabled={unsubscribing === (inst.triggerName || inst.type)}
                >
                  {unsubscribing === (inst.triggerName || inst.type)
                    ? <Loader2 className="h-3 w-3 animate-spin" />
                    : <><Trash2 className="h-3 w-3 mr-1" />Unsubscribe</>
                  }
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Composio status notice */}
        {connections.length === 0 && (
          <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4 flex items-start gap-3">
            <Zap className="h-4 w-4 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-medium text-foreground">Connect apps to use triggers</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Go to <strong>Marketplace</strong> and connect GitHub, Slack, Gmail or any other app first.
                Triggers fire in real-time when events happen in your connected apps.
              </div>
            </div>
          </div>
        )}

        {/* Search + filter */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search triggers…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
          <Select value={appFilter} onValueChange={setAppFilter}>
            <SelectTrigger className="w-36 h-9 text-xs">
              <SelectValue placeholder="All apps" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All apps</SelectItem>
              {appNames.slice(0, 30).map((app) => (
                <SelectItem key={app} value={app} className="capitalize">{app}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Trigger list */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.slice(0, 50).map((trigger: any) => {
              const subscribed = isSubscribed(trigger.name);
              const appKey = trigger.appKey || (trigger.name || "").split("_")[0]?.toLowerCase();
              const hasConnection = connections.some(
                (c: any) => c.appName?.toLowerCase() === appKey?.toLowerCase() && c.status === "ACTIVE"
              );
              return (
                <div
                  key={trigger.name}
                  className={cn(
                    "flex items-start gap-3 p-4 rounded-xl border transition-colors",
                    subscribed
                      ? "border-primary/30 bg-primary/5"
                      : "border-border/60 bg-card hover:border-border"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5",
                    subscribed ? "bg-primary/15" : "bg-muted/60"
                  )}>
                    <Zap className={cn("h-4 w-4", subscribed ? "text-primary" : "text-muted-foreground")} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-medium text-sm text-foreground truncate">
                        {trigger.display_name || trigger.name}
                      </span>
                      {subscribed && (
                        <Badge className="bg-primary/10 text-primary border-primary/20 border text-[9px] px-1.5 h-3.5 flex-shrink-0">
                          Active
                        </Badge>
                      )}
                      {!hasConnection && (
                        <Badge className="bg-muted text-muted-foreground border text-[9px] px-1.5 h-3.5 flex-shrink-0">
                          Not connected
                        </Badge>
                      )}
                    </div>
                    {trigger.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-1">
                        {trigger.description}
                      </p>
                    )}
                    <div className="text-[10px] font-mono text-muted-foreground/40 uppercase">
                      {appKey}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={subscribed ? "outline" : "default"}
                    className={cn(
                      "h-7 text-xs flex-shrink-0",
                      subscribed
                        ? "text-destructive hover:bg-destructive/10 hover:border-destructive/40"
                        : hasConnection
                          ? "bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white border-0"
                          : ""
                    )}
                    disabled={
                      subscribing === trigger.name ||
                      unsubscribing === trigger.name ||
                      (!subscribed && !hasConnection)
                    }
                    onClick={() => subscribed ? handleUnsubscribe(trigger) : handleSubscribe(trigger)}
                  >
                    {subscribing === trigger.name || unsubscribing === trigger.name ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : subscribed ? (
                      "Unsubscribe"
                    ) : hasConnection ? (
                      "Subscribe"
                    ) : (
                      "Connect first"
                    )}
                  </Button>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="text-center py-10 text-sm text-muted-foreground">
                No triggers match your search
              </div>
            )}
            {filtered.length > 50 && (
              <p className="text-xs text-center text-muted-foreground/60">
                Showing 50 of {filtered.length} — refine search to see more
              </p>
            )}
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

/* ─────────────────────────── HELPERS ─────────────────────────── */
function providerEmoji(providerId: string): string {
  const map: Record<string, string> = {
    "openai": "🤖", "anthropic": "🧠", "google-gemini": "✨", "groq": "⚡",
    "mistral": "🌊", "openrouter": "🔀", "together": "🤝", "cohere": "🎯",
    "perplexity": "🔍", "deepseek": "🔮", "xai": "𝕏", "fireworks": "🎆",
    "cloudflare": "☁️", "ollama": "🦙", "lmstudio": "💻",
    "chatgpt-session": "💬", "claude-session": "🟠", "nvidia": "🟢",
    "cerebras": "⚙️", "ai21": "🔬", "novita": "🌟", "huggingface": "🤗",
    "replicate": "♾️", "azure-openai": "☁️", "aws-bedrock": "🪨",
  };
  return map[providerId] || "🤖";
}
