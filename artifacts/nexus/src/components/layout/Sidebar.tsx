import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home, MessageSquare, Calendar, Inbox, Search,
  Plus, Star, Clock, ChevronDown, ChevronRight,
  Sparkles, Moon, Sun, PanelLeftClose, Bot,
  Library, CheckSquare, ShoppingBag, HelpCircle,
  Trash2, Users, Globe, Settings, Plug, Share2, Lock,
  Bell, X, Activity, CheckCircle, Zap,
} from "lucide-react";
import {
  useGetPageTree, useGetRecentPages, useCreatePage,
} from "@workspace/api-client-react";
import { useAppStore } from "@/store/app";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import PageTreeItem from "./PageTreeItem";
import WorkspaceSwitcher from "./WorkspaceSwitcher";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const APP_EMOJI: Record<string, string> = {
  github: "🐙", slack: "💬", gmail: "📧", googlecalendar: "📅",
  notion: "📋", linear: "🔷", jira: "🟦", discord: "🎮",
  zoom: "📹", asana: "✅", trello: "🗂️", hubspot: "🟠",
  stripe: "💳", outlook: "🟦", twitter: "𝕏", shopify: "🛍️",
};

interface LiveEvent {
  id: string;
  triggerName: string;
  appName: string;
  entityId?: string;
  payload?: Record<string, unknown>;
  receivedAt: string;
  read: boolean;
}

// ─── Notification Bell ────────────────────────────────────────────────────────
function NotificationBell() {
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [open, setOpen] = useState(false);
  const [, navigate] = useLocation();
  const { setActiveView } = useAppStore();
  const panelRef = useRef<HTMLDivElement>(null);
  const sseRef = useRef<EventSource | null>(null);

  const unread = events.filter(e => !e.read).length;

  // SSE stream — real-time events from all connected apps
  useEffect(() => {
    const connect = () => {
      const es = new EventSource(`${BASE}/api/composio/webhook/stream`);
      sseRef.current = es;

      es.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === "init" && Array.isArray(msg.events)) {
            setEvents(msg.events.slice(0, 30).map((ev: any) => ({ ...ev, read: true })));
          } else if (msg.type === "event" && msg.event) {
            const ev: LiveEvent = { ...msg.event, read: false };
            setEvents(prev => {
              if (prev.some(x => x.id === ev.id)) return prev;
              return [ev, ...prev].slice(0, 50);
            });
            // Show brief toast for any incoming event
            const app = (ev.appName || "").toLowerCase();
            const emoji = APP_EMOJI[app] || "⚡";
            const label = ev.triggerName?.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()) || "Event";
            toast.info(`${emoji} ${label}`, {
              description: ev.appName ? `From ${ev.appName}` : undefined,
              duration: 3500,
            });
          }
        } catch { /* ignore */ }
      };

      es.onerror = () => {
        es.close();
        // Reconnect after 5 seconds
        setTimeout(connect, 5000);
      };
    };
    connect();
    return () => { sseRef.current?.close(); sseRef.current = null; };
  }, []);

  // Close panel on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const markAllRead = () => {
    setEvents(prev => prev.map(e => ({ ...e, read: true })));
  };

  const clearAll = () => {
    setEvents([]);
    setOpen(false);
  };

  const goToTriggers = () => {
    setOpen(false);
    setActiveView("settings");
    navigate("/settings");
  };

  const relTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="relative" ref={panelRef}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-7 w-7 text-muted-foreground hover:text-foreground relative",
              unread > 0 && "text-foreground"
            )}
            onClick={() => { setOpen(v => !v); if (!open) markAllRead(); }}
          >
            <Bell className="h-3.5 w-3.5" />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-violet-500 text-[8px] font-bold text-white flex items-center justify-center leading-none">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>Notifications {unread > 0 ? `(${unread} new)` : ""}</TooltipContent>
      </Tooltip>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.12 }}
            className="absolute left-0 top-9 z-50 w-80 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
            style={{ maxHeight: "420px" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-muted/30">
              <div className="flex items-center gap-2">
                <Bell className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">Live Events</span>
                {events.length > 0 && (
                  <span className="text-[10px] bg-violet-500/15 text-violet-400 px-1.5 py-0.5 rounded-full font-medium">
                    {events.length}
                  </span>
                )}
                <span className="flex items-center gap-1 text-[10px] text-green-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  live
                </span>
              </div>
              <div className="flex items-center gap-1">
                {events.length > 0 && (
                  <button onClick={clearAll} className="text-[10px] text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded">
                    Clear
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground p-0.5 rounded">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Event list */}
            <div className="overflow-y-auto" style={{ maxHeight: "320px" }}>
              {events.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                  <div className="w-10 h-10 rounded-xl bg-muted/40 flex items-center justify-center mb-3">
                    <Activity className="h-5 w-5 text-muted-foreground/30" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">No events yet</p>
                  <p className="text-xs text-muted-foreground/50 mt-1 leading-relaxed">
                    Subscribe to triggers in Settings to see live events here.
                  </p>
                  <button
                    onClick={goToTriggers}
                    className="mt-3 text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    <Zap className="h-3 w-3" /> Go to Triggers
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-border/20">
                  {events.map(evt => {
                    const app = (evt.appName || "").toLowerCase();
                    const emoji = APP_EMOJI[app] || "⚡";
                    const label = evt.triggerName?.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()) || "Event";
                    return (
                      <motion.div
                        key={evt.id}
                        initial={{ opacity: 0, x: -4 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={cn(
                          "flex items-start gap-3 px-4 py-3 hover:bg-accent/30 transition-colors cursor-pointer",
                          !evt.read && "bg-violet-500/5"
                        )}
                      >
                        <div className="text-base flex-shrink-0 mt-0.5">{emoji}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-foreground truncate">{label}</span>
                            {!evt.read && (
                              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0" />
                            )}
                          </div>
                          <div className="text-[10px] text-muted-foreground truncate mt-0.5">
                            {evt.appName} · {relTime(evt.receivedAt)}
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          <CheckCircle className="h-3.5 w-3.5 text-green-400/60" />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-border/40 px-4 py-2 flex items-center justify-between bg-muted/20">
              <button
                onClick={goToTriggers}
                className="text-[11px] text-primary hover:underline"
              >
                View all in Settings →
              </button>
              <div className="text-[10px] text-muted-foreground/40">SSE · real-time</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Sidebar() {
  const [, navigate] = useLocation();
  const [location] = useLocation();
  const qc = useQueryClient();

  const {
    currentWorkspaceId, setCurrentPage,
    setSidebarOpen, setActiveView, activeView,
    setCmdkOpen, theme, setTheme, setSearchOpen,
  } = useAppStore();

  const [sharedOpen, setSharedOpen] = useState(true);
  const [privateOpen, setPrivateOpen] = useState(true);

  const { data: tree = [] } = useGetPageTree(currentWorkspaceId || "", {
    query: { enabled: !!currentWorkspaceId },
  });

  const { data: recentPages = [] } = useGetRecentPages(currentWorkspaceId || "", undefined, {
    query: { enabled: !!currentWorkspaceId },
  });

  const { mutate: createPage } = useCreatePage({
    mutation: {
      onSuccess: (page: any) => {
        qc.invalidateQueries({ queryKey: ["pages"] });
        setCurrentPage(page.id);
        navigate(`/page/${page.id}`);
      },
    },
  });

  const handleCreatePage = () => {
    if (!currentWorkspaceId) return;
    createPage({ workspaceId: currentWorkspaceId, data: { title: "Untitled", type: "page" } } as any);
  };

  const goTo = (view: Parameters<typeof setActiveView>[0], path: string) => {
    setActiveView(view);
    navigate(path);
  };

  const isHome = activeView === "home";
  const sharedPages = (tree as any[]).filter((p: any) => p.isShared);
  const privatePages = (tree as any[]).filter((p: any) => !p.isShared);
  const favPages = (tree as any[]).filter((p: any) => p.isFavorite);

  return (
    <div className="flex flex-col h-full w-full bg-sidebar select-none overflow-hidden">
      {/* Workspace header */}
      <div className="flex items-center justify-between px-3 py-2 h-11 flex-shrink-0">
        <WorkspaceSwitcher />
        <div className="flex items-center gap-0.5">
          <NotificationBell />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={() => setSearchOpen(true)}>
                <Search className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Search (⌘P)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={handleCreatePage}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>New page</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={() => setSidebarOpen(false)}>
                <PanelLeftClose className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Close sidebar</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Primary nav */}
      <div className="flex flex-col gap-0.5 px-2 py-1 flex-shrink-0">
        <SidebarItem icon={<Home className="h-4 w-4" />} label="Home"
          active={isHome}
          onClick={() => { useAppStore.getState().goHome(); navigate("/"); }} />
        <SidebarItem icon={<Sparkles className="h-4 w-4" />} label="AI Assistant"
          shortcut="⌘K" badge="AI"
          onClick={() => setCmdkOpen(true)} />
        <SidebarItem icon={<Bot className="h-4 w-4" />} label="Agents"
          badge="Beta"
          active={activeView === "agents"}
          onClick={() => goTo("agents", "/agents")} />
        <SidebarItem icon={<Calendar className="h-4 w-4" />} label="Meetings"
          active={activeView === "meetings"}
          onClick={() => goTo("meetings", "/meetings")} />
        <SidebarItem icon={<Settings className="h-4 w-4" />} label="Settings"
          active={activeView === "settings"}
          onClick={() => goTo("settings", "/settings")} />
      </div>

      <Separator className="mx-2 my-1 opacity-40 flex-shrink-0" />

      {/* Scrollable tree */}
      <ScrollArea className="flex-1 min-h-0 px-2">
        <div className="py-1 space-y-0.5">

          {/* Recent */}
          {(recentPages as any[]).length > 0 && (
            <div className="mb-1">
              <div className="flex items-center gap-1 px-1 py-1 text-[11px] font-medium text-muted-foreground/50 uppercase tracking-wider">
                <Clock className="h-3 w-3" /> Recent
              </div>
              {(recentPages as any[]).slice(0, 3).map((page: any) => (
                <PageTreeItem key={page.id} page={page} depth={0} />
              ))}
            </div>
          )}

          {/* Favorites */}
          {favPages.length > 0 && (
            <SidebarSection label="Favorites" icon={<Star className="h-3 w-3" />}>
              {favPages.map((p: any) => <PageTreeItem key={p.id} page={p} depth={0} />)}
            </SidebarSection>
          )}

          {/* Shared */}
          {sharedPages.length > 0 && (
            <SidebarSection label="Shared" icon={<Share2 className="h-3 w-3" />}
              open={sharedOpen} onToggle={() => setSharedOpen(!sharedOpen)}
              action={
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon"
                      className="h-5 w-5 text-muted-foreground/50 hover:text-foreground opacity-0 group-hover/section:opacity-100 transition-opacity"
                      onClick={(e) => { e.stopPropagation(); handleCreatePage(); }}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Add to shared</TooltipContent>
                </Tooltip>
              }
            >
              {sharedPages.map((p: any) => <PageTreeItem key={p.id} page={p} depth={0} />)}
            </SidebarSection>
          )}

          {/* Private */}
          <SidebarSection label="Private" icon={<Lock className="h-3 w-3" />}
            open={privateOpen} onToggle={() => setPrivateOpen(!privateOpen)}
            action={
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon"
                    className="h-5 w-5 text-muted-foreground/50 hover:text-foreground opacity-0 group-hover/section:opacity-100 transition-opacity"
                    onClick={(e) => { e.stopPropagation(); handleCreatePage(); }}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>New private page</TooltipContent>
              </Tooltip>
            }
          >
            {privatePages.map((p: any) => <PageTreeItem key={p.id} page={p} depth={0} />)}
            {privatePages.length === 0 && (
              <div className="px-3 py-2 text-xs text-muted-foreground/40 italic">No private pages</div>
            )}
          </SidebarSection>
        </div>
      </ScrollArea>

      {/* Nexus Apps section */}
      <div className="flex-shrink-0 border-t border-sidebar-border/60">
        <div className="px-2 py-1.5">
          <div className="text-[11px] font-medium text-muted-foreground/40 px-1 py-1 uppercase tracking-wider">Nexus apps</div>
          <div className="space-y-0.5">
            <SidebarItem icon={<Inbox className="h-4 w-4" />} label="Inbox"
              active={activeView === "inbox"}
              onClick={() => goTo("inbox", "/inbox")} />
            <SidebarItem icon={<Library className="h-4 w-4" />} label="Library"
              active={activeView === "library"}
              onClick={() => goTo("library", "/library")} />
            <SidebarItem icon={<CheckSquare className="h-4 w-4" />} label="My Tasks"
              active={activeView === "tasks"}
              onClick={() => goTo("tasks", "/tasks")} />
            <SidebarItem icon={<Plug className="h-4 w-4" />} label="Marketplace"
              active={activeView === "marketplace"}
              onClick={() => goTo("marketplace", "/marketplace")} />
            <SidebarItem icon={<HelpCircle className="h-4 w-4" />} label="Help & Support"
              onClick={() => window.open("https://github.com", "_blank")} />
            <SidebarItem icon={<Trash2 className="h-4 w-4" />} label="Trash"
              active={activeView === "trash"}
              onClick={() => goTo("trash", "/trash")} />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 border-t border-sidebar-border/60">
        <div className="flex items-center justify-between px-3 py-2">
          <Button
            variant="ghost"
            className="flex-1 justify-start gap-2 h-8 text-sm text-muted-foreground hover:text-foreground px-2 font-normal"
            onClick={handleCreatePage}
          >
            <Plus className="h-4 w-4" />
            New Page
          </Button>

          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
                  {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Toggle theme</TooltipContent>
            </Tooltip>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 pb-2">
          <Avatar className="h-6 w-6">
            <AvatarFallback className="text-[10px] font-bold bg-gradient-to-br from-violet-500 to-indigo-600 text-white">N</AvatarFallback>
          </Avatar>
          <span className="text-xs text-muted-foreground truncate">Nexus OS</span>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-6 px-2 text-[11px] text-muted-foreground/60 hover:text-foreground"
            onClick={() => { goTo("people", "/settings/people"); }}
          >
            <Users className="h-3 w-3 mr-1" />
            Invite
          </Button>
        </div>
      </div>
    </div>
  );
}

function SidebarItem({
  icon, label, onClick, active, shortcut, badge,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  active?: boolean;
  shortcut?: string;
  badge?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm transition-colors group",
        active
          ? "bg-accent text-foreground font-medium"
          : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
      )}
    >
      <span className={cn("flex-shrink-0", active && "text-primary")}>{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      {badge && (
        <Badge variant="secondary" className="h-4 px-1.5 text-[10px] bg-primary/15 text-primary border-0 font-medium">{badge}</Badge>
      )}
      {shortcut && !badge && (
        <span className="text-[11px] text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity">{shortcut}</span>
      )}
    </button>
  );
}

function SidebarSection({
  label, icon, open, onToggle, children, action,
}: {
  label: string;
  icon?: React.ReactNode;
  open?: boolean;
  onToggle?: () => void;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  const isControlled = open !== undefined;
  const [localOpen, setLocalOpen] = useState(true);
  const isOpen = isControlled ? open : localOpen;
  const toggle = onToggle || (() => setLocalOpen(!localOpen));

  return (
    <div className="group/section">
      <div className="flex items-center gap-1 px-1 py-1 text-[11px] font-medium text-muted-foreground/50 uppercase tracking-wider">
        <button onClick={toggle} className="flex items-center gap-1 flex-1 text-left min-w-0 hover:text-muted-foreground transition-colors">
          {isOpen ? <ChevronDown className="h-3 w-3 flex-shrink-0" /> : <ChevronRight className="h-3 w-3 flex-shrink-0" />}
          {icon && <span>{icon}</span>}
          <span className="truncate">{label}</span>
        </button>
        {action}
      </div>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="space-y-0.5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
