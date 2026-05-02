import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ActiveView =
  | "home" | "page" | "settings" | "database" | "ai"
  | "agents" | "marketplace" | "connections" | "library"
  | "tasks" | "trash" | "chat" | "meetings" | "import"
  | "teamspaces" | "people" | "inbox";

interface AppState {
  currentWorkspaceId: string | null;
  currentPageId: string | null;
  sidebarOpen: boolean;
  sidebarWidth: number;
  theme: "dark" | "light" | "system";
  activeView: ActiveView;
  aiPanelOpen: boolean;
  searchOpen: boolean;
  cmdkOpen: boolean;
  expandedPages: Set<string>;

  setCurrentWorkspace: (id: string | null) => void;
  setCurrentPage: (id: string | null) => void;
  setSidebarOpen: (open: boolean) => void;
  setSidebarWidth: (width: number) => void;
  setTheme: (theme: "dark" | "light" | "system") => void;
  setActiveView: (view: ActiveView) => void;
  goHome: () => void;
  setAiPanelOpen: (open: boolean) => void;
  setSearchOpen: (open: boolean) => void;
  setCmdkOpen: (open: boolean) => void;
  togglePageExpanded: (pageId: string) => void;
  isPageExpanded: (pageId: string) => boolean;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentWorkspaceId: null,
      currentPageId: null,
      sidebarOpen: true,
      sidebarWidth: 260,
      theme: "dark",
      activeView: "home",
      aiPanelOpen: false,
      searchOpen: false,
      cmdkOpen: false,
      expandedPages: new Set(),

      setCurrentWorkspace: (id) => set({ currentWorkspaceId: id }),
      setCurrentPage: (id) => set({ currentPageId: id, activeView: "page" }),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setSidebarWidth: (width) => set({ sidebarWidth: width }),
      setTheme: (theme) => set({ theme }),
      setActiveView: (view) => set({ activeView: view }),
      goHome: () => set({ activeView: "home" }),
      setAiPanelOpen: (open) => set({ aiPanelOpen: open }),
      setSearchOpen: (open) => set({ searchOpen: open }),
      setCmdkOpen: (open) => set({ cmdkOpen: open }),
      togglePageExpanded: (pageId) => {
        const expanded = new Set(get().expandedPages);
        if (expanded.has(pageId)) expanded.delete(pageId);
        else expanded.add(pageId);
        set({ expandedPages: expanded });
      },
      isPageExpanded: (pageId) => get().expandedPages.has(pageId),
    }),
    {
      name: "nexus-app-state",
      partialize: (state) => ({
        currentWorkspaceId: state.currentWorkspaceId,
        currentPageId: state.currentPageId,
        sidebarOpen: state.sidebarOpen,
        sidebarWidth: state.sidebarWidth,
        theme: state.theme,
        expandedPages: Array.from(state.expandedPages),
      }),
      merge: (persisted: any, current) => ({
        ...current,
        ...persisted,
        expandedPages: new Set(persisted?.expandedPages || []),
      }),
    }
  )
);
