import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Search, FileText, Database, BookOpen, Clock, ArrowRight, X, Hash } from "lucide-react";
import { useSearch, useGetRecentPages } from "@workspace/api-client-react";
import { useAppStore } from "@/store/app";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
}

const PAGE_TYPE_ICON: Record<string, typeof FileText> = {
  page: FileText, database: Database, wiki: BookOpen,
};

export default function SearchModal({ open, onClose }: SearchModalProps) {
  const [, navigate] = useLocation();
  const { currentWorkspaceId, setCurrentPage, setSearchOpen, setCmdkOpen } = useAppStore();
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounce(query, 200);

  const { data: searchResults } = useSearch(
    { q: debouncedQuery, workspaceId: currentWorkspaceId || undefined, limit: 20 },
    { query: { enabled: open && debouncedQuery.length > 0 } }
  );

  const { data: recentPages = [] } = useGetRecentPages(
    currentWorkspaceId || "",
    { limit: 8 },
    { query: { enabled: open && !!currentWorkspaceId && !debouncedQuery } }
  );

  const results = debouncedQuery
    ? ((searchResults as any)?.pages || [])
    : (recentPages as any[]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => { setSelectedIdx(0); }, [debouncedQuery]);

  const handleNavigate = (page: any) => {
    setCurrentPage(page.id);
    navigate(`/page/${page.id}`);
    setSearchOpen(false);
    setCmdkOpen(false);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIdx((i) => Math.min(i + 1, results.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIdx((i) => Math.max(i - 1, 0)); }
    if (e.key === "Enter" && results[selectedIdx]) handleNavigate(results[selectedIdx]);
    if (e.key === "Escape") onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ duration: 0.12 }}
            className="fixed top-[20vh] left-1/2 -translate-x-1/2 z-50 w-[580px] max-h-[60vh] flex flex-col"
          >
            <div className="bg-popover border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border/40">
                <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search pages, databases, wikis..."
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                />
                {query && (
                  <button onClick={() => setQuery("")} className="text-muted-foreground hover:text-foreground transition-colors">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <ScrollArea className="flex-1">
                <div className="p-2">
                  {!debouncedQuery && (
                    <div className="px-2 py-1.5 text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wider flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Recent
                    </div>
                  )}
                  {debouncedQuery && (
                    <div className="px-2 py-1.5 text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wider">
                      {results.length} result{results.length !== 1 ? "s" : ""} for "{debouncedQuery}"
                    </div>
                  )}

                  {results.map((page: any, idx: number) => {
                    const Icon = PAGE_TYPE_ICON[page.type] || FileText;
                    return (
                      <button
                        key={page.id}
                        onClick={() => handleNavigate(page)}
                        onMouseEnter={() => setSelectedIdx(idx)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left",
                          idx === selectedIdx ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                        )}
                      >
                        <span className="text-base flex-shrink-0">{page.icon || "📄"}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-foreground truncate">{page.title || "Untitled"}</div>
                          {page.excerpt && (
                            <div className="text-xs text-muted-foreground truncate mt-0.5">{page.excerpt}</div>
                          )}
                        </div>
                        <Badge variant="outline" className="text-[10px] px-1.5 capitalize flex-shrink-0">
                          {page.type}
                        </Badge>
                        <ArrowRight className="h-3.5 w-3.5 flex-shrink-0 opacity-0 group-hover:opacity-100" />
                      </button>
                    );
                  })}

                  {results.length === 0 && debouncedQuery && (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      <Search className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      No results for "{debouncedQuery}"
                    </div>
                  )}
                </div>
              </ScrollArea>

              <div className="px-4 py-2 border-t border-border/40 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px]">↑↓</kbd> navigate</span>
                <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px]">↵</kbd> open</span>
                <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px]">esc</kbd> close</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
