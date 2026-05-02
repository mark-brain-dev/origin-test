import { useEffect, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { PanelLeft } from "lucide-react";
import { useListWorkspaces } from "@workspace/api-client-react";
import { useAppStore } from "@/store/app";
import { Button } from "@/components/ui/button";
import Sidebar from "./Sidebar";
import PageEditor from "@/components/editor/PageEditor";
import SettingsPage from "@/pages/SettingsPage";
import DatabaseView from "@/components/database/DatabaseView";
import SearchModal from "@/components/search/SearchModal";
import AIBubble from "@/components/ai/AIBubble";
import EmptyState from "@/components/EmptyState";
import AgentsPanel from "@/components/agents/AgentsPanel";
import MarketplacePage from "@/components/marketplace/MarketplacePage";
import MeetingsView from "@/components/meetings/MeetingsView";
import TasksView from "@/components/tasks/TasksView";
import LibraryView from "@/components/library/LibraryView";
import TrashView from "@/components/trash/TrashView";
import GmailInboxView from "@/components/inbox/GmailInboxView";

export default function AppShell() {
  const params = useParams<{ pageId?: string; section?: string; databaseId?: string }>();
  const [location] = useLocation();

  const {
    currentWorkspaceId, currentPageId, sidebarOpen, activeView,
    setCurrentWorkspace, setCurrentPage, setActiveView,
    setCmdkOpen, searchOpen, setSearchOpen, setSidebarOpen,
  } = useAppStore();

  const { data: workspaces = [] } = useListWorkspaces({ query: { refetchOnMount: true } });

  useEffect(() => {
    if (workspaces.length > 0 && !currentWorkspaceId) {
      setCurrentWorkspace((workspaces[0] as any).id);
    }
  }, [workspaces, currentWorkspaceId, setCurrentWorkspace]);

  useEffect(() => {
    if (params.pageId) {
      setCurrentPage(params.pageId);
    }
  }, [params.pageId, setCurrentPage]);

  useEffect(() => {
    if (location.startsWith("/settings")) setActiveView("settings");
    else if (location.startsWith("/database")) setActiveView("database");
    else if (location.startsWith("/page")) setActiveView("page");
    else if (location.startsWith("/agents")) setActiveView("agents");
    else if (location.startsWith("/marketplace")) setActiveView("marketplace");
    else if (location.startsWith("/library")) setActiveView("library");
    else if (location.startsWith("/tasks")) setActiveView("tasks");
    else if (location.startsWith("/trash")) setActiveView("trash");
    else if (location.startsWith("/meetings")) setActiveView("meetings");
    else if (location.startsWith("/connections")) setActiveView("connections");
    else if (location.startsWith("/inbox")) setActiveView("inbox");
    else if (location === "/" || location === "") {
      if (activeView === "page") {
        // keep showing page if we navigated back
      }
    }
  }, [location, setActiveView]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setCmdkOpen(true); }
    if ((e.metaKey || e.ctrlKey) && e.key === "p") { e.preventDefault(); setSearchOpen(true); }
    if (e.key === "Escape") { setCmdkOpen(false); setSearchOpen(false); }
  }, [setCmdkOpen, setSearchOpen]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  function renderContent() {
    if (activeView === "home") return <EmptyState workspaceId={currentWorkspaceId || ""} />;
    if (activeView === "settings") return <SettingsPage section={params.section} />;
    if (activeView === "database" && params.databaseId) return <DatabaseView databaseId={params.databaseId} />;
    if (activeView === "page" && currentPageId) return <PageEditor key={currentPageId} pageId={currentPageId} />;
    if (activeView === "agents") return <AgentsPanel />;
    if (activeView === "marketplace") return <MarketplacePage />;
    if (activeView === "library") return <LibraryView />;
    if (activeView === "tasks") return <TasksView />;
    if (activeView === "trash") return <TrashView />;
    if (activeView === "meetings") return <MeetingsView />;
    if (activeView === "connections") return <MarketplacePage />;
    if (activeView === "inbox") return <GmailInboxView />;
    return <EmptyState workspaceId={currentWorkspaceId || ""} />;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <AnimatePresence mode="wait">
        {sidebarOpen && (
          <motion.div
            key="sidebar"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 260, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="h-full flex-shrink-0 overflow-hidden border-r border-border"
          >
            <Sidebar />
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 h-full overflow-hidden flex flex-col min-w-0 relative">
        {!sidebarOpen && (
          <div className="absolute top-3 left-3 z-10">
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => setSidebarOpen(true)}>
              <PanelLeft className="h-4 w-4" />
            </Button>
          </div>
        )}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeView + (currentPageId || "")}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
            className="flex-1 h-full overflow-hidden"
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
      <AIBubble />
    </div>
  );
}
