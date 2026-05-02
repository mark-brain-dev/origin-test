import { useState } from "react";
import { motion } from "framer-motion";
import {
  Search, ExternalLink, Check, Plug, Globe, Code,
  Star, Download, Filter, ChevronRight, Sparkles, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface MCPApp {
  id: string;
  name: string;
  description: string;
  logo: string;
  category: string;
  isInstalled: boolean;
  stars?: number;
  isOfficial?: boolean;
}

const MCP_APPS: MCPApp[] = [
  { id: "chatgpt", name: "ChatGPT", description: "Connect ChatGPT as an MCP client to Nexus OS", logo: "🤖", category: "AI", isInstalled: false, isOfficial: true },
  { id: "claude", name: "Claude", description: "Anthropic's Claude AI with full MCP support", logo: "🟠", category: "AI", isInstalled: false, isOfficial: true },
  { id: "composio", name: "Composio", description: "250+ tool integrations with OAuth handling for AI agents", logo: "🔗", category: "Tools", isInstalled: false, isOfficial: true, stars: 12400 },
  { id: "cursor", name: "Cursor", description: "AI-powered code editor — connect your codebase to Nexus", logo: "◎", category: "Dev", isInstalled: false, isOfficial: true },
  { id: "devin", name: "Devin", description: "Autonomous AI software engineer", logo: "🤖", category: "AI", isInstalled: false },
  { id: "figma", name: "Figma Make", description: "Generate UI from Nexus pages with Figma", logo: "🎨", category: "Design", isInstalled: false },
  { id: "github", name: "GitHub", description: "Connect repositories, issues, and pull requests", logo: "🐙", category: "Dev", isInstalled: false, stars: 8900 },
  { id: "hubspot", name: "HubSpot", description: "CRM data directly in your knowledge workspace", logo: "🟠", category: "CRM", isInstalled: false },
  { id: "make", name: "Make", description: "No-code automation workflows triggered from Nexus", logo: "⚙️", category: "Automation", isInstalled: false },
  { id: "mistral", name: "Mistral", description: "Mistral AI models via MCP protocol", logo: "🌪️", category: "AI", isInstalled: false },
  { id: "poke", name: "Poke", description: "Browser automation and web scraping agent", logo: "👉", category: "Tools", isInstalled: false },
  { id: "vscode", name: "VS Code", description: "VS Code extension for Nexus OS integration", logo: "💙", category: "Dev", isInstalled: false, stars: 22100 },
  { id: "notion-import", name: "Notion Import", description: "Migrate your entire Notion workspace to Nexus OS", logo: "📋", category: "Import", isInstalled: false },
  { id: "obsidian", name: "Obsidian Sync", description: "Two-way sync with your Obsidian vault", logo: "🔮", category: "Import", isInstalled: false },
  { id: "slack", name: "Slack", description: "Import Slack conversations and create pages from threads", logo: "💬", category: "Communication", isInstalled: false },
  { id: "linear", name: "Linear", description: "Sync issues and projects with Nexus databases", logo: "📐", category: "PM", isInstalled: false, stars: 6700 },
  { id: "jira", name: "Jira", description: "Import Jira issues and epics as database rows", logo: "🔵", category: "PM", isInstalled: false },
  { id: "litellm", name: "LiteLLM", description: "Route 100+ LLM providers through a unified YAML config", logo: "🌐", category: "AI", isInstalled: false, stars: 15800 },
  { id: "anythingllm", name: "AnythingLLM", description: "Local LLM with full session-based auth support", logo: "🦙", category: "AI", isInstalled: false, stars: 32000 },
  { id: "brave-search", name: "Brave Search", description: "Privacy-first web search for AI agents", logo: "🦁", category: "Search", isInstalled: false },
  { id: "exa", name: "Exa", description: "Semantic web search API for AI research agents", logo: "🔭", category: "Search", isInstalled: false },
  { id: "playwright", name: "Playwright", description: "Browser automation and testing via MCP", logo: "🎭", category: "Dev", isInstalled: false },
  { id: "supabase", name: "Supabase", description: "Connect your Supabase databases to Nexus", logo: "⚡", category: "DB", isInstalled: false },
  { id: "airtable", name: "Airtable", description: "Import Airtable bases as Nexus databases", logo: "📊", category: "Data", isInstalled: false },
];

const CATEGORIES = ["All", "AI", "Dev", "Tools", "PM", "Import", "Communication", "Design", "CRM", "Automation", "Search", "Data", "DB"];

export default function MarketplacePage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [activeTab, setActiveTab] = useState<"discover" | "manage">("discover");
  const [installed, setInstalled] = useState<Set<string>>(new Set());

  const filtered = MCP_APPS.filter((app) => {
    const matchSearch = app.name.toLowerCase().includes(search.toLowerCase()) ||
      app.description.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === "All" || app.category === category;
    return matchSearch && matchCat;
  });

  const installedApps = MCP_APPS.filter((app) => installed.has(app.id));

  const handleInstall = (app: MCPApp) => {
    setInstalled((prev) => {
      const next = new Set(prev);
      if (next.has(app.id)) {
        next.delete(app.id);
        toast.success(`${app.name} disconnected`);
      } else {
        next.add(app.id);
        toast.success(`${app.name} connected successfully`);
      }
      return next;
    });
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-8 py-6 border-b border-border/40">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <Plug className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold text-foreground">MCP & Connections</h1>
          </div>
          <p className="text-sm text-muted-foreground">Connect your favorite tools and AI clients to Nexus OS via Model Context Protocol</p>

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
                {tab === "manage" && installed.size > 0 && (
                  <Badge variant="secondary" className="ml-2 h-4 px-1.5 text-[10px]">{installed.size}</Badge>
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
                  placeholder="Search apps and integrations..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-muted/40 rounded-xl pl-9 pr-4 py-2.5 text-sm border border-border/40 focus:border-primary/50 outline-none transition-colors"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {CATEGORIES.map((cat) => (
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

            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                {category === "All" ? "All Integrations" : category} · {filtered.length} available
              </h2>
              <div className="grid grid-cols-3 gap-4">
                {filtered.map((app, i) => (
                  <motion.div
                    key={app.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="group flex flex-col gap-3 p-4 rounded-xl border border-border/60 bg-card hover:border-border transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-xl">{app.logo}</div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-sm text-foreground">{app.name}</span>
                            {app.isOfficial && (
                              <Badge variant="outline" className="text-[9px] px-1 h-3.5 border-primary/30 text-primary">Official</Badge>
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground/60">{app.category}</div>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed flex-1">{app.description}</p>
                    <div className="flex items-center justify-between">
                      {app.stars && (
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground/50">
                          <Star className="h-3 w-3" />
                          {(app.stars / 1000).toFixed(1)}k
                        </div>
                      )}
                      <div className="ml-auto">
                        <Button
                          size="sm"
                          variant={installed.has(app.id) ? "outline" : "default"}
                          className={cn(
                            "h-7 text-xs gap-1.5",
                            !installed.has(app.id) && "bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white border-0"
                          )}
                          onClick={() => handleInstall(app)}
                        >
                          {installed.has(app.id) ? (
                            <><Check className="h-3 w-3" />Connected</>
                          ) : (
                            <><Download className="h-3 w-3" />Connect</>
                          )}
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>
      ) : (
        <ScrollArea className="flex-1">
          <div className="px-8 py-6 max-w-4xl mx-auto">
            {installedApps.length === 0 ? (
              <div className="text-center py-20">
                <Plug className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="font-semibold text-foreground mb-2">No connections yet</h3>
                <p className="text-sm text-muted-foreground">Connect apps from the Discover tab to get started</p>
                <Button size="sm" variant="outline" className="mt-4" onClick={() => setActiveTab("discover")}>
                  Browse integrations
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Connected · {installedApps.length}</h2>
                {installedApps.map((app) => (
                  <div key={app.id} className="flex items-center gap-4 p-4 rounded-xl border border-border/60 bg-card">
                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-xl">{app.logo}</div>
                    <div className="flex-1">
                      <div className="font-medium text-sm text-foreground">{app.name}</div>
                      <div className="text-xs text-muted-foreground">{app.description}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 text-xs text-green-400">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                        Connected
                      </div>
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={() => handleInstall(app)}>
                        Disconnect
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
