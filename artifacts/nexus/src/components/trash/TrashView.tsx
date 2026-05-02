import { useState } from "react";
import { Trash2, RotateCcw, Search, FileText, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface DeletedPage {
  id: string;
  title: string;
  type: string;
  icon?: string;
  deletedAt: string;
  deletedBy: string;
}

const DEMO_DELETED: DeletedPage[] = [
  { id: "1", title: "Old Project Plan", type: "project", icon: "📁", deletedAt: new Date(Date.now() - 3 * 86400000).toISOString(), deletedBy: "You" },
  { id: "2", title: "Draft: Q1 Report", type: "page", icon: "📄", deletedAt: new Date(Date.now() - 7 * 86400000).toISOString(), deletedBy: "You" },
  { id: "3", title: "Archived Notes", type: "note", icon: "📝", deletedAt: new Date(Date.now() - 14 * 86400000).toISOString(), deletedBy: "You" },
];

export default function TrashView() {
  const [deleted, setDeleted] = useState<DeletedPage[]>(DEMO_DELETED);
  const [search, setSearch] = useState("");

  const filtered = deleted.filter(p => !search || p.title.toLowerCase().includes(search.toLowerCase()));

  const restore = (id: string, title: string) => {
    setDeleted(prev => prev.filter(p => p.id !== id));
    toast.success(`"${title}" restored`);
  };

  const permanentlyDelete = (id: string, title: string) => {
    setDeleted(prev => prev.filter(p => p.id !== id));
    toast.success(`"${title}" permanently deleted`);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 border-b border-border/40">
        <div className="flex items-center gap-3 mb-4">
          <Trash2 className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-xl font-bold text-foreground">Trash</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Search deleted pages..." value={search} onChange={e => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm bg-muted/40 border-border/40" />
          </div>
          {deleted.length > 0 && (
            <Button size="sm" variant="outline" className="h-8 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={() => { setDeleted([]); toast.success("Trash emptied"); }}>
              Empty Trash
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1 px-6 py-4">
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Trash2 className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <h3 className="font-semibold text-foreground mb-1">Trash is empty</h3>
            <p className="text-sm">Deleted pages will appear here for 30 days</p>
          </div>
        ) : (
          <div className="space-y-1 max-w-2xl mx-auto">
            <div className="flex items-center gap-2 mb-3 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
              <AlertTriangle className="h-4 w-4 text-yellow-400 flex-shrink-0" />
              <p className="text-xs text-yellow-400">Pages in trash are permanently deleted after 30 days.</p>
            </div>
            {filtered.map(page => (
              <div key={page.id} className="flex items-center gap-3 p-3 rounded-xl border border-border/40 bg-card hover:bg-accent/20 transition-all group">
                <span className="text-xl">{page.icon || "📄"}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-foreground/70 line-through">{page.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Deleted {new Date(page.deletedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })} by {page.deletedBy}
                  </div>
                </div>
                <Badge variant="secondary" className="text-[10px] capitalize flex-shrink-0">{page.type}</Badge>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                  <Button size="sm" variant="ghost" className="h-7 text-xs gap-1.5 text-green-400 hover:text-green-300 hover:bg-green-500/10"
                    onClick={() => restore(page.id, page.title)}>
                    <RotateCcw className="h-3 w-3" /> Restore
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:bg-destructive/10"
                    onClick={() => permanentlyDelete(page.id, page.title)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
