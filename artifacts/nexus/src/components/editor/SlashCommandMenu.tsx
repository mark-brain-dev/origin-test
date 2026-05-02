import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { cn } from "@/lib/utils";

export interface SlashCommandItem {
  label: string;
  description: string;
  icon: string;
  command: string;
  group: string;
}

interface SlashCommandMenuProps {
  items: SlashCommandItem[];
  command: (item: SlashCommandItem) => void;
}

export interface SlashCommandMenuRef {
  onKeyDown: (event: KeyboardEvent) => boolean;
}

const SlashCommandMenu = forwardRef<SlashCommandMenuRef, SlashCommandMenuProps>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => {
      setSelectedIndex(0);
    }, [items]);

    useImperativeHandle(ref, () => ({
      onKeyDown(event: KeyboardEvent) {
        if (event.key === "ArrowUp") {
          setSelectedIndex((i) => (i - 1 + items.length) % items.length);
          return true;
        }
        if (event.key === "ArrowDown") {
          setSelectedIndex((i) => (i + 1) % items.length);
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
        <div className="z-50 overflow-hidden rounded-xl border border-border bg-popover p-2 shadow-xl">
          <p className="text-xs text-muted-foreground px-2 py-1">No results</p>
        </div>
      );
    }

    const grouped: Record<string, SlashCommandItem[]> = {};
    for (const item of items) {
      if (!grouped[item.group]) grouped[item.group] = [];
      grouped[item.group].push(item);
    }

    let globalIndex = 0;
    return (
      <div className="z-50 overflow-hidden rounded-xl border border-border bg-popover p-1.5 shadow-xl min-w-[240px] max-h-[360px] overflow-y-auto">
        {Object.entries(grouped).map(([group, groupItems]) => (
          <div key={group}>
            <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              {group}
            </p>
            {groupItems.map((item) => {
              const idx = globalIndex++;
              return (
                <button
                  key={item.command}
                  onClick={() => command(item)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm transition-colors text-left",
                    idx === selectedIndex
                      ? "bg-accent text-accent-foreground"
                      : "text-popover-foreground hover:bg-accent/50"
                  )}
                  onMouseEnter={() => setSelectedIndex(idx)}
                >
                  <span className="flex-shrink-0 w-7 h-7 rounded-md bg-muted flex items-center justify-center text-sm font-mono leading-none">
                    {item.icon}
                  </span>
                  <div>
                    <div className="font-medium text-xs">{item.label}</div>
                    <div className="text-[10px] text-muted-foreground">{item.description}</div>
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    );
  }
);

SlashCommandMenu.displayName = "SlashCommandMenu";
export default SlashCommandMenu;
