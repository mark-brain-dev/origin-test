import { useLocation } from "wouter";
import { Hash, FileText, ArrowRight } from "lucide-react";
import { useGetPageBacklinks } from "@workspace/api-client-react";
import { useAppStore } from "@/store/app";
import { ScrollArea } from "@/components/ui/scroll-area";

interface BacklinksPanelProps {
  pageId: string;
}

export default function BacklinksPanel({ pageId }: BacklinksPanelProps) {
  const [, navigate] = useLocation();
  const { setCurrentPage } = useAppStore();
  const { data: backlinks = [] } = useGetPageBacklinks(pageId, {
    query: { enabled: !!pageId },
  });

  const handleNavigate = (page: any) => {
    setCurrentPage(page.id);
    navigate(`/page/${page.id}`);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40">
        <Hash className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-semibold text-foreground">Backlinks</span>
        <span className="ml-auto text-xs text-muted-foreground">{(backlinks as any[]).length}</span>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-1">
          {(backlinks as any[]).length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              <Hash className="h-8 w-8 mx-auto mb-2 opacity-30" />
              No pages link here yet
            </div>
          ) : (
            (backlinks as any[]).map((page: any) => (
              <button
                key={page.id}
                onClick={() => handleNavigate(page)}
                className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors text-left group"
              >
                <span className="text-base flex-shrink-0">{page.icon || "📄"}</span>
                <span className="flex-1 truncate">{page.title || "Untitled"}</span>
                <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
