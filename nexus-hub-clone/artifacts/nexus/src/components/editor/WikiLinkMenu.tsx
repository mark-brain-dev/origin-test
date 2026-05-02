import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { FileText, BookOpen, Database, GitBranch } from "lucide-react";
import { cn } from "@/lib/utils";

const PAGE_ICONS: Record<string, any> = {
  page: FileText,
  wiki: BookOpen,
  database: Database,
  project: GitBranch,
};

export interface WikiLinkItem {
  id: string;
  title: string;
  type: string;
  icon: string;
}

interface WikiLinkMenuProps {
  items: WikiLinkItem[];
  command: (item: WikiLinkItem) => void;
}

export interface WikiLinkMenuRef {
  onKeyDown: (event: KeyboardEvent) => boolean;
}

const WikiLinkMenu = forwardRef<WikiLinkMenuRef, WikiLinkMenuProps>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => {
      setSelectedIndex(0);
    }, [items]);

    useImperativeHandle(ref, () => ({
      onKeyDown(event: KeyboardEvent) {
        if (event.key === "ArrowUp") {
          setSelectedIndex((i) => (i - 1 + Math.max(items.length, 1)) % Math.max(items.length, 1));
          return true;
        }
        if (event.key === "ArrowDown") {
          setSelectedIndex((i) => (i + 1) % Math.max(items.length, 1));
          return true;
        }
        if (event.key === "Enter") {
          const item = items[selectedIndex];
          if (item) command(item);
          return true;
        }
        return false;
      },
    }));

    if (items.length === 0) {
      return (
        <div className="z-50 rounded-xl border border-border bg-popover p-2 shadow-xl">
          <p className="text-xs text-muted-foreground px-2 py-1">No pages found</p>
        </div>
      );
    }

    return (
      <div className="z-50 overflow-hidden rounded-xl border border-border bg-popover p-1.5 shadow-xl min-w-[220px] max-h-[280px] overflow-y-auto">
        <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
          Link to page
        </p>
        {items.map((item, idx) => (
          <button
            key={item.id}
            onClick={() => command(item)}
            onMouseEnter={() => setSelectedIndex(idx)}
            className={cn(
              "w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm transition-colors text-left",
              idx === selectedIndex
                ? "bg-accent text-accent-foreground"
                : "text-popover-foreground hover:bg-accent/50"
            )}
          >
            <span className="text-base flex-shrink-0">{item.icon || "📄"}</span>
            <span className="flex-1 truncate font-medium text-xs">{item.title}</span>
            <span className="text-[10px] text-muted-foreground capitalize">{item.type}</span>
          </button>
        ))}
      </div>
    );
  }
);

WikiLinkMenu.displayName = "WikiLinkMenu";
export default WikiLinkMenu;
