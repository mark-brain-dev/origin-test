import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home, MessageSquare, Calendar, Inbox, Search,
  Plus, Star, Clock, ChevronDown, ChevronRight,
  Sparkles, Moon, Sun, PanelLeftClose, Bot,
  Library, CheckSquare, ShoppingBag, HelpCircle,
  Trash2, Users, Globe, Settings, Plug, Share2, Lock,
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
