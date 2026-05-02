import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings, Brain, Zap, Key, Plus, Trash2, Check, X, ExternalLink,
  RefreshCw, Shield, User, Palette, Database, Globe, Star, ChevronRight,
  Eye, EyeOff, TestTube2, CheckCircle, XCircle, Loader2, Hash,
  Bell, Mail, Plug, Users, Download, Upload, Cpu, Lock, ChevronDown,
  Sparkles, BookOpen, LayoutGrid, Code, Bot,
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
function IntegrationsSection() {
  const apps = [
    { name: "Google Calendar", desc: "Sync meetings to your workspace", icon: "📅", connected: false },
    { name: "Slack", desc: "Get notifications and share pages", icon: "💬", connected: false },
    { name: "GitHub", desc: "Link commits and PRs to pages", icon: "🐙", connected: false },
    { name: "Linear", desc: "Sync issues as database rows", icon: "📐", connected: false },
    { name: "Figma", desc: "Embed designs in pages", icon: "🎨", connected: false },
  ];
  const [connected, setConnected] = useState<Set<string>>(new Set());

  return (
    <ScrollArea className="h-full">
      <div className="p-8 max-w-2xl mx-auto space-y-8">
        <div>
          <h2 className="text-xl font-bold">Integrations</h2>
          <p className="text-sm text-muted-foreground mt-1">Connect your favorite tools to Nexus OS</p>
        </div>
        <div className="space-y-2">
          {apps.map((app) => (
            <div key={app.name} className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card">
              <div className="text-2xl">{app.icon}</div>
              <div className="flex-1">
                <div className="font-medium text-sm">{app.name}</div>
                <div className="text-xs text-muted-foreground">{app.desc}</div>
              </div>
              <Button
                size="sm"
                variant={connected.has(app.name) ? "outline" : "default"}
                className={cn("h-8 text-xs gap-1.5", !connected.has(app.name) && "bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white border-0")}
                onClick={() => {
                  setConnected((prev) => { const n = new Set(prev); n.has(app.name) ? n.delete(app.name) : n.add(app.name); return n; });
                  toast.success(connected.has(app.name) ? `${app.name} disconnected` : `${app.name} connected`);
                }}
              >
                {connected.has(app.name) ? <><Check className="h-3 w-3" />Connected</> : "Connect"}
              </Button>
            </div>
          ))}
        </div>
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
function MCPSection() {
  const [endpoint, setEndpoint] = useState("");
  const [name, setName] = useState("");
  const connections = [
    { name: "Composio", url: "https://mcp.composio.dev", status: "connected", tools: 240 },
    { name: "Brave Search", url: "https://mcp.brave.com", status: "connected", tools: 3 },
  ];

  return (
    <ScrollArea className="h-full">
      <div className="p-8 max-w-2xl mx-auto space-y-6">
        <div>
          <h2 className="text-xl font-bold">MCP Integrations</h2>
          <p className="text-sm text-muted-foreground mt-1">Connect Model Context Protocol servers to extend AI capabilities</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h3 className="font-semibold text-sm">Add MCP Server</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Server name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="My MCP Server" className="mt-1 h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Endpoint URL</Label>
              <Input value={endpoint} onChange={(e) => setEndpoint(e.target.value)} placeholder="https://mcp.example.com" className="mt-1 h-8 text-sm" />
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => { if (endpoint && name) { toast.success(`${name} connected via MCP`); setEndpoint(""); setName(""); } }}
            className="bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white border-0"
          >
            Connect Server
          </Button>
        </div>

        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Active Connections</h3>
          <div className="space-y-2">
            {connections.map((c) => (
              <div key={c.name} className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card">
                <div className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                <div className="flex-1">
                  <div className="font-medium text-sm">{c.name}</div>
                  <div className="text-xs text-muted-foreground">{c.url} · {c.tools} tools available</div>
                </div>
                <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground">Disconnect</Button>
              </div>
            ))}
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
