import { useState } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import {
  BookOpen, Star, Clock, FileText, Database, Grid3x3,
  FolderOpen, Hash, Search, TrendingUp, Sparkles, Plus,
  ChevronRight, LayoutGrid, List, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useGetRecentPages, useListTemplates } from "@workspace/api-client-react";
import { useAppStore } from "@/store/app";

const FEATURED_TEMPLATES = [
  { id: "t1", name: "Meeting Notes", icon: "📝", category: "Meetings", description: "Structured template for meeting agendas and action items" },
  { id: "t2", name: "Project Plan", icon: "📋", category: "Projects", description: "Full project planning with milestones and tasks" },
  { id: "t3", name: "Weekly Review", icon: "🗓️", category: "Productivity", description: "Weekly retrospective and planning template" },
  { id: "t4", name: "OKR Tracker", icon: "🎯", category: "Strategy", description: "Objectives and Key Results tracking database" },
  { id: "t5", name: "Bug Report", icon: "🐛", category: "Engineering", description: "Bug tracking and reproduction steps template" },
  { id: "t6", name: "Research Notes", icon: "🔬", category: "Research", description: "Structured research documentation template" },
  { id: "t7", name: "Product Spec", icon: "📐", category: "Product", description: "Product requirements document template" },
  { id: "t8", name: "1-on-1 Notes", icon: "👥", category: "Meetings", description: "One-on-one meeting notes and feedback template" },
];

const COLLECTIONS = [
  { name: "Getting Started", emoji: "🚀", count: 3, color: "from-violet-500/20 to-indigo-500/20 border-violet-500/20" },
  { name: "Team Docs", emoji: "📚", count: 12, color: "from-blue-500/20 to-cyan-500/20 border-blue-500/20" },
  { name: "Projects", emoji: "📁", count: 7, color: "from-emerald-500/20 to-teal-500/20 border-emerald-500/20" },
  { name: "Archive", emoji: "🗄️", count: 24, color: "from-amber-500/20 to-orange-500/20 border-amber-500/20" },
];

export default function LibraryView() {
  const [, navigate] = useLocation();
  const { currentWorkspaceId, setCurrentPage, setActiveView } = useAppStore();
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [activeTab, setActiveTab] = useState<"recent" | "starred" | "templates">("recent");

  const { data: recentPages = [] } = useGetRecentPages(
    currentWorkspaceId || "demo",
    { limit: "20" },
    { query: { enabled: !!currentWorkspaceId } }
  ) as { data: any[] };

  const { data: templates = [] } = useListTemplates(undefined, {
    query: { enabled: true },
  }) as { data: any[] };

  const allTemplates = templates.length > 0 ? templates : FEATURED_TEMPLATES;

  const filteredRecent = recentPages.filter((p: any) =>
    !search || (p.title || "").toLowerCase().includes(search.toLowerCase())
  );

  const openPage = (page: any) => {
    setCurrentPage(page.id);
    setActiveView("page");
    navigate(`/page/${page.id}`);
  };

  const PAGE_TYPE_ICON: Record<string, string> = {
    page: "📄", project: "📁", wiki: "📚", meeting: "📅",
    task: "✅", database: "🗃️", note: "📝",
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border/40">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <BookOpen className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold text-foreground">Library</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-muted/40 rounded-lg p-0.5">
              <button onClick={() => setViewMode("grid")} className={cn("p-1 rounded-md transition-all", viewMode === "grid" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground")}>
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => setViewMode("list")} className={cn("p-1 rounded-md transition-all", viewMode === "list" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground")}>
                <List className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search pages and templates..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm bg-muted/40 border-border/40"
            />
          </div>
          <div className="flex bg-muted/40 rounded-lg p-0.5">
            {(["recent", "starred", "templates"] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-3 py-1 rounded-md text-xs font-medium transition-all capitalize",
                  activeTab === tab ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                )}>
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-6 py-4 max-w-5xl mx-auto">

          {activeTab === "recent" && (
            <div className="space-y-6">
              {/* Collections */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Collections</h2>
                  <Button size="sm" variant="ghost" className="h-6 text-xs text-muted-foreground gap-1">
                    <Plus className="h-3 w-3" /> New
                  </Button>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {COLLECTIONS.map((col, i) => (
                    <motion.button
                      key={col.name}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className={cn("p-4 rounded-xl border bg-gradient-to-br text-left transition-all hover:scale-[1.02]", col.color)}
                    >
                      <div className="text-2xl mb-2">{col.emoji}</div>
                      <div className="font-semibold text-sm text-foreground">{col.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{col.count} pages</div>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Recent pages */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recently Visited</h2>
                </div>
                {filteredRecent.length === 0 && (
                  <div className="text-center py-10 text-muted-foreground">
                    <FileText className="h-10 w-10 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">No recent pages yet</p>
                  </div>
                )}
                {viewMode === "grid" ? (
                  <div className="grid grid-cols-3 gap-3">
                    {filteredRecent.slice(0, 9).map((page: any, i: number) => (
                      <motion.button
                        key={page.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        onClick={() => openPage(page)}
                        className="flex flex-col gap-2 p-4 rounded-xl border border-border/60 bg-card hover:border-border transition-all text-left group"
                      >
                        <div className="flex items-start justify-between">
                          <span className="text-2xl">{page.icon || PAGE_TYPE_ICON[page.type] || "📄"}</span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground opacity-0 group-hover:opacity-100 transition-all" />
                        </div>
                        <div>
                          <div className="font-semibold text-sm text-foreground line-clamp-2">{page.title || "Untitled"}</div>
                          {page.excerpt && (
                            <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{page.excerpt}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-auto pt-1">
                          <Badge variant="secondary" className="text-[10px] px-1.5 h-4 capitalize">{page.type || "page"}</Badge>
                          <span className="text-[10px] text-muted-foreground/40 ml-auto">
                            {page.updatedAt ? new Date(page.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}
                          </span>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filteredRecent.slice(0, 15).map((page: any, i: number) => (
                      <motion.button
                        key={page.id}
                        initial={{ opacity: 0, x: -4 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.02 }}
                        onClick={() => openPage(page)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent/50 transition-colors text-left"
                      >
                        <span className="text-lg flex-shrink-0">{page.icon || PAGE_TYPE_ICON[page.type] || "📄"}</span>
                        <span className="flex-1 text-sm font-medium text-foreground truncate">{page.title || "Untitled"}</span>
                        <Badge variant="secondary" className="text-[10px] px-1.5 h-4 capitalize flex-shrink-0">{page.type || "page"}</Badge>
                        <span className="text-xs text-muted-foreground/40 flex-shrink-0">
                          {page.updatedAt ? new Date(page.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/30 flex-shrink-0" />
                      </motion.button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "starred" && (
            <div className="text-center py-20">
              <Star className="h-12 w-12 mx-auto mb-3 opacity-20 text-yellow-400" />
              <h3 className="font-semibold text-foreground mb-1">No starred pages yet</h3>
              <p className="text-sm text-muted-foreground mb-4">Star pages to quickly find them here</p>
              <Button size="sm" variant="outline" onClick={() => setActiveTab("recent")}>Browse recent pages</Button>
            </div>
          )}

          {activeTab === "templates" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Templates · {allTemplates.length} available
                </h2>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5">
                  <Plus className="h-3 w-3" /> Create template
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {allTemplates.map((tpl: any, i: number) => (
                  <motion.button
                    key={tpl.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={() => toast.info(`Creating page from "${tpl.name}" template...`)}
                    className="flex flex-col gap-3 p-4 rounded-xl border border-border/60 bg-card hover:border-primary/40 hover:bg-primary/5 transition-all text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{tpl.icon || "📄"}</span>
                      <div>
                        <div className="font-semibold text-sm text-foreground">{tpl.name}</div>
                        <div className="text-[10px] text-muted-foreground/60 capitalize">{tpl.category}</div>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{tpl.description}</p>
                    <div className="flex items-center justify-between mt-auto pt-1">
                      {tpl.isBuiltIn && (
                        <Badge variant="outline" className="text-[10px] px-1.5 h-4 border-primary/30 text-primary">Built-in</Badge>
                      )}
                      <span className="ml-auto text-xs text-primary opacity-0 group-hover:opacity-100 transition-all font-medium">Use →</span>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
