import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Table, LayoutGrid, Columns, Calendar, List, Plus, Settings2,
  MoreHorizontal, Trash2, Edit2, ChevronDown, GripVertical
} from "lucide-react";
import { useGetDatabase, useGetDatabaseRows, useCreateDatabaseRow, useUpdateDatabaseRow, useDeleteDatabaseRow } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface DatabaseViewProps {
  databaseId: string;
}

type ViewType = "table" | "kanban" | "gallery" | "list";

const VIEW_ICONS = {
  table: <Table className="h-3.5 w-3.5" />,
  kanban: <Columns className="h-3.5 w-3.5" />,
  gallery: <LayoutGrid className="h-3.5 w-3.5" />,
  list: <List className="h-3.5 w-3.5" />,
};

const PROPERTY_COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#6366f1", "#a855f7", "#ec4899"];

export default function DatabaseView({ databaseId }: DatabaseViewProps) {
  const qc = useQueryClient();
  const [activeView, setActiveView] = useState<ViewType>("table");
  const [editingCell, setEditingCell] = useState<{ rowId: string; propId: string } | null>(null);

  const { data: database } = useGetDatabase(databaseId, { query: { enabled: !!databaseId } });
  const { data: rowsData } = useGetDatabaseRows(databaseId, undefined, { query: { enabled: !!databaseId } });

  const { mutate: createRow } = useCreateDatabaseRow({
    mutation: {
      onSuccess: () => qc.invalidateQueries({ queryKey: ["databases", databaseId, "rows"] }),
    },
  });

  const { mutate: updateRow } = useUpdateDatabaseRow({
    mutation: {
      onSuccess: () => qc.invalidateQueries({ queryKey: ["databases", databaseId, "rows"] }),
    },
  });

  const { mutate: deleteRow } = useDeleteDatabaseRow({
    mutation: {
      onSuccess: () => { qc.invalidateQueries({ queryKey: ["databases", databaseId, "rows"] }); toast.success("Row deleted"); },
    },
  });

  const db = database as any;
  const rows = ((rowsData as any)?.rows || []);
  const properties = db?.properties || [
    { id: "name", name: "Name", type: "text" },
    { id: "status", name: "Status", type: "select", options: [
      { value: "Todo", color: "#6366f1" },
      { value: "In Progress", color: "#f59e0b" },
      { value: "Done", color: "#10b981" },
    ]},
    { id: "priority", name: "Priority", type: "select", options: [
      { value: "Low", color: "#10b981" },
      { value: "Medium", color: "#f59e0b" },
      { value: "High", color: "#ef4444" },
    ]},
    { id: "due_date", name: "Due Date", type: "date" },
  ];

  const handleAddRow = () => {
    const defaultProps: Record<string, any> = {};
    properties.forEach((p: any) => { defaultProps[p.id] = ""; });
    createRow({ databaseId, data: { properties: defaultProps } } as any);
  };

  const handleCellUpdate = (rowId: string, propId: string, value: any) => {
    const row = rows.find((r: any) => r.id === rowId);
    if (!row) return;
    updateRow({ databaseId, rowId, data: { properties: { ...(row.properties || {}), [propId]: value } } } as any);
    setEditingCell(null);
  };

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border/40 flex-shrink-0">
        <h1 className="text-sm font-semibold text-foreground">{db?.name || "Database"}</h1>
        <div className="flex-1" />
        <div className="flex items-center gap-0.5 bg-muted/60 rounded-lg p-0.5">
          {(Object.keys(VIEW_ICONS) as ViewType[]).map((view) => (
            <Button
              key={view}
              variant="ghost"
              size="sm"
              className={cn(
                "h-7 gap-1.5 px-2.5 text-xs capitalize",
                activeView === view ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
              )}
              onClick={() => setActiveView(view)}
            >
              {VIEW_ICONS[view]}
              {view}
            </Button>
          ))}
        </div>
        <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs text-muted-foreground">
          <Settings2 className="h-3.5 w-3.5" />
          Filter
        </Button>
      </div>

      <div className="flex-1 overflow-hidden">
        {activeView === "table" && (
          <TableView
            properties={properties}
            rows={rows}
            editingCell={editingCell}
            onCellEdit={(rowId, propId) => setEditingCell({ rowId, propId })}
            onCellUpdate={handleCellUpdate}
            onDeleteRow={(rowId) => deleteRow({ databaseId, rowId } as any)}
            onAddRow={handleAddRow}
          />
        )}
        {activeView === "kanban" && (
          <KanbanView properties={properties} rows={rows} onAddRow={handleAddRow} />
        )}
        {(activeView === "gallery" || activeView === "list") && (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              {VIEW_ICONS[activeView]}
              <div className="mt-2 font-medium capitalize">{activeView} View</div>
              <div className="text-sm mt-1">Coming soon</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TableView({ properties, rows, editingCell, onCellEdit, onCellUpdate, onDeleteRow, onAddRow }: any) {
  return (
    <ScrollArea className="h-full">
      <div className="min-w-full">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-background z-10">
            <tr className="border-b border-border/40">
              <th className="w-8 px-2 py-2" />
              {properties.map((prop: any) => (
                <th key={prop.id} className="text-left px-3 py-2 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                  <div className="flex items-center gap-1.5">
                    <PropTypeIcon type={prop.type} />
                    {prop.name}
                  </div>
                </th>
              ))}
              <th className="w-8 px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row: any, rowIdx: number) => (
              <tr
                key={row.id}
                className="border-b border-border/20 hover:bg-muted/20 group transition-colors"
              >
                <td className="px-2 py-1.5 text-center">
                  <span className="text-xs text-muted-foreground/40 group-hover:block">{rowIdx + 1}</span>
                </td>
                {properties.map((prop: any) => {
                  const isEditing = editingCell?.rowId === row.id && editingCell?.propId === prop.id;
                  const value = (row.properties || {})[prop.id] || "";
                  return (
                    <td key={prop.id} className="px-3 py-1.5" onClick={() => onCellEdit(row.id, prop.id)}>
                      {isEditing ? (
                        <CellEditor
                          prop={prop}
                          value={value}
                          onSave={(v) => onCellUpdate(row.id, prop.id, v)}
                          onCancel={() => onCellEdit(null, null)}
                        />
                      ) : (
                        <CellDisplay prop={prop} value={value} />
                      )}
                    </td>
                  );
                })}
                <td className="px-2 py-1.5">
                  <button
                    onClick={() => onDeleteRow(row.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          onClick={onAddRow}
          className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors w-full border-b border-border/20"
        >
          <Plus className="h-4 w-4" />
          New row
        </button>
      </div>
    </ScrollArea>
  );
}

function CellEditor({ prop, value, onSave, onCancel }: any) {
  const [v, setV] = useState(value);

  if (prop.type === "select" && prop.options) {
    return (
      <div className="flex flex-wrap gap-1">
        {prop.options.map((opt: any) => (
          <button
            key={opt.value}
            onClick={() => onSave(opt.value)}
            className="text-xs px-2 py-0.5 rounded-full transition-all"
            style={{ background: opt.color + "30", color: opt.color, border: `1px solid ${opt.color}` }}
          >
            {opt.value}
          </button>
        ))}
      </div>
    );
  }

  return (
    <input
      autoFocus
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => onSave(v)}
      onKeyDown={(e) => { if (e.key === "Enter") onSave(v); if (e.key === "Escape") onCancel(); }}
      className="w-full bg-transparent text-sm text-foreground outline-none border-b border-primary"
      type={prop.type === "date" ? "date" : "text"}
    />
  );
}

function CellDisplay({ prop, value }: any) {
  if (!value) return <span className="text-muted-foreground/30 text-xs">Empty</span>;

  if (prop.type === "select" && prop.options) {
    const option = prop.options.find((o: any) => o.value === value);
    if (option) {
      return (
        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: option.color + "30", color: option.color }}>
          {value}
        </span>
      );
    }
  }

  if (prop.type === "checkbox") return value ? <span className="text-green-500">✓</span> : <span className="text-muted-foreground">○</span>;

  return <span className="text-sm text-foreground truncate max-w-[200px] inline-block">{value}</span>;
}

function PropTypeIcon({ type }: { type: string }) {
  const icons: Record<string, string> = {
    text: "T", number: "#", select: "◉", multi_select: "◎", date: "📅",
    checkbox: "☑", url: "🔗", email: "✉", phone: "📞",
  };
  return <span className="text-[10px] text-muted-foreground/60 font-mono">{icons[type] || "T"}</span>;
}

function KanbanView({ properties, rows, onAddRow }: any) {
  const statusProp = properties.find((p: any) => p.type === "select" && p.id === "status") || properties.find((p: any) => p.type === "select");
  const columns = statusProp?.options || [{ value: "Todo", color: "#6366f1" }, { value: "Done", color: "#10b981" }];

  return (
    <ScrollArea orientation="horizontal" className="h-full">
      <div className="flex gap-3 p-4 h-full min-w-max">
        {columns.map((col: any) => {
          const colRows = rows.filter((r: any) => (r.properties || {})[statusProp?.id] === col.value);
          return (
            <div key={col.value} className="w-64 flex flex-col gap-2 flex-shrink-0">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: col.color }} />
                  <span className="text-sm font-medium text-foreground">{col.value}</span>
                  <span className="text-xs text-muted-foreground">{colRows.length}</span>
                </div>
                <button className="text-muted-foreground hover:text-foreground" onClick={onAddRow}>
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
              <ScrollArea className="flex-1">
                <div className="space-y-2">
                  {colRows.map((row: any) => (
                    <div
                      key={row.id}
                      className="bg-card border border-border rounded-xl p-3 hover:border-primary/40 transition-all cursor-pointer shadow-sm hover:shadow-md"
                    >
                      <div className="text-sm font-medium text-foreground">
                        {(row.properties || {}).name || "Untitled"}
                      </div>
                      {(row.properties || {}).due_date && (
                        <div className="text-xs text-muted-foreground mt-1.5">
                          📅 {(row.properties || {}).due_date}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
