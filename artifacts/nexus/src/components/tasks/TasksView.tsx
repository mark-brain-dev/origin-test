import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckSquare, Square, Plus, Filter, ChevronDown, MoreHorizontal,
  Calendar, Flag, User, Tag, Search, Trash2, ArrowUpDown, Circle,
  CheckCircle2, Clock, AlertCircle, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Task {
  id: string;
  title: string;
  status: "todo" | "in_progress" | "done" | "cancelled";
  priority: "low" | "medium" | "high" | "urgent";
  dueDate?: string;
  assignee?: string;
  tags: string[];
  project?: string;
  createdAt: string;
}

const PRIORITY_CONFIG = {
  low: { label: "Low", color: "text-slate-400", bg: "bg-slate-400/10", icon: "–" },
  medium: { label: "Medium", color: "text-yellow-400", bg: "bg-yellow-400/10", icon: "!" },
  high: { label: "High", color: "text-orange-400", bg: "bg-orange-400/10", icon: "!!" },
  urgent: { label: "Urgent", color: "text-red-400", bg: "bg-red-400/10", icon: "!!!" },
};

const STATUS_CONFIG = {
  todo: { label: "To do", icon: <Circle className="h-3.5 w-3.5 text-muted-foreground" />, color: "text-muted-foreground" },
  in_progress: { label: "In Progress", icon: <Clock className="h-3.5 w-3.5 text-blue-400" />, color: "text-blue-400" },
  done: { label: "Done", icon: <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />, color: "text-green-400" },
  cancelled: { label: "Cancelled", icon: <AlertCircle className="h-3.5 w-3.5 text-muted-foreground/40" />, color: "text-muted-foreground/40" },
};

const DEFAULT_TASKS: Task[] = [
  { id: "1", title: "Set up AI provider in settings", status: "in_progress", priority: "high", dueDate: new Date(Date.now() + 86400000).toISOString().split("T")[0], tags: ["setup"], project: "Onboarding", createdAt: new Date().toISOString() },
  { id: "2", title: "Create first knowledge base page", status: "todo", priority: "medium", tags: ["docs"], project: "Docs", createdAt: new Date().toISOString() },
  { id: "3", title: "Invite team members to workspace", status: "todo", priority: "medium", dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0], tags: ["team"], project: "Onboarding", createdAt: new Date().toISOString() },
  { id: "4", title: "Review getting started guide", status: "done", priority: "low", tags: ["docs"], createdAt: new Date().toISOString() },
  { id: "5", title: "Connect calendar for meetings", status: "todo", priority: "high", tags: ["calendar"], project: "Integrations", createdAt: new Date().toISOString() },
  { id: "6", title: "Install VS Code extension", status: "todo", priority: "low", tags: ["dev"], project: "Integrations", createdAt: new Date().toISOString() },
];

export default function TasksView() {
  const [tasks, setTasks] = useState<Task[]>(DEFAULT_TASKS);
  const [filter, setFilter] = useState<"all" | "todo" | "in_progress" | "done">("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"priority" | "dueDate" | "created">("priority");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [showNewTask, setShowNewTask] = useState(false);
  const [newPriority, setNewPriority] = useState<Task["priority"]>("medium");

  const filteredTasks = tasks
    .filter(t => {
      if (filter !== "all" && t.status !== filter) return false;
      if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "priority") {
        const order = { urgent: 0, high: 1, medium: 2, low: 3 };
        return order[a.priority] - order[b.priority];
      }
      if (sortBy === "dueDate") {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const stats = {
    total: tasks.length,
    done: tasks.filter(t => t.status === "done").length,
    inProgress: tasks.filter(t => t.status === "in_progress").length,
    overdue: tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "done").length,
  };

  const toggleStatus = (id: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== id) return t;
      const nextStatus = t.status === "done" ? "todo" : t.status === "todo" ? "in_progress" : "done";
      return { ...t, status: nextStatus };
    }));
  };

  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    toast.success("Task deleted");
  };

  const createTask = () => {
    if (!newTaskTitle.trim()) return;
    const task: Task = {
      id: `task-${Date.now()}`,
      title: newTaskTitle,
      status: "todo",
      priority: newPriority,
      tags: [],
      createdAt: new Date().toISOString(),
    };
    setTasks(prev => [task, ...prev]);
    setNewTaskTitle("");
    setShowNewTask(false);
    toast.success("Task created");
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border/40">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <CheckSquare className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold text-foreground">My Tasks</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-muted-foreground"
              onClick={() => setSortBy(sortBy === "priority" ? "dueDate" : sortBy === "dueDate" ? "created" : "priority")}>
              <ArrowUpDown className="h-3 w-3" />
              Sort: {sortBy === "priority" ? "Priority" : sortBy === "dueDate" ? "Due date" : "Created"}
            </Button>
            <Button size="sm" onClick={() => setShowNewTask(true)}
              className="gap-1.5 bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white border-0 h-7 text-xs">
              <Plus className="h-3.5 w-3.5" /> New Task
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          {[
            { label: "Total", value: stats.total, color: "text-foreground" },
            { label: "In Progress", value: stats.inProgress, color: "text-blue-400" },
            { label: "Completed", value: stats.done, color: "text-green-400" },
            { label: "Overdue", value: stats.overdue, color: "text-red-400" },
          ].map(s => (
            <div key={s.label} className="bg-card border border-border rounded-xl px-3 py-2">
              <div className="text-xs text-muted-foreground">{s.label}</div>
              <div className={cn("text-xl font-bold mt-0.5", s.color)}>{s.value}</div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm bg-muted/40 border-border/40"
            />
          </div>
          <div className="flex bg-muted/40 rounded-lg p-0.5">
            {(["all", "todo", "in_progress", "done"] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs font-medium transition-all",
                  filter === f ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                )}>
                {f === "all" ? "All" : f === "in_progress" ? "In Progress" : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-6 py-3 max-w-3xl mx-auto">
          {/* New task input */}
          <AnimatePresence>
            {showNewTask && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-3 flex items-center gap-2 p-3 rounded-xl border border-primary/40 bg-primary/5"
              >
                <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <Input
                  autoFocus
                  placeholder="New task title..."
                  value={newTaskTitle}
                  onChange={e => setNewTaskTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") createTask(); if (e.key === "Escape") setShowNewTask(false); }}
                  className="flex-1 h-7 text-sm border-0 bg-transparent p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                <select
                  value={newPriority}
                  onChange={e => setNewPriority(e.target.value as Task["priority"])}
                  className="text-xs bg-transparent text-muted-foreground border border-border/40 rounded px-1.5 py-1 outline-none"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
                <Button size="sm" className="h-7 text-xs" onClick={createTask}>Add</Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowNewTask(false)}>Cancel</Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Task list */}
          {filteredTasks.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <CheckSquare className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">No tasks found</p>
              <Button size="sm" className="mt-4" onClick={() => setShowNewTask(true)}>Create a task</Button>
            </div>
          )}

          <div className="space-y-1">
            {filteredTasks.map((task) => {
              const priority = PRIORITY_CONFIG[task.priority];
              const status = STATUS_CONFIG[task.status];
              const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "done";

              return (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className={cn(
                    "group flex items-center gap-3 p-3 rounded-xl border transition-all hover:border-border/80",
                    task.status === "done"
                      ? "border-border/20 bg-card/40 opacity-60"
                      : "border-border/40 bg-card hover:bg-accent/20"
                  )}
                >
                  <button onClick={() => toggleStatus(task.id)} className="flex-shrink-0">
                    {status.icon}
                  </button>

                  <div className="flex-1 min-w-0">
                    <span className={cn(
                      "text-sm font-medium",
                      task.status === "done" ? "line-through text-muted-foreground" : "text-foreground"
                    )}>
                      {task.title}
                    </span>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {task.project && (
                        <span className="text-[10px] text-muted-foreground/60 bg-muted/40 px-1.5 py-0.5 rounded">
                          {task.project}
                        </span>
                      )}
                      {task.tags.map(tag => (
                        <span key={tag} className="text-[10px] text-primary/60 bg-primary/10 px-1.5 py-0.5 rounded">#{tag}</span>
                      ))}
                      {task.dueDate && (
                        <span className={cn(
                          "text-[10px] flex items-center gap-0.5",
                          isOverdue ? "text-red-400" : "text-muted-foreground/60"
                        )}>
                          <Calendar className="h-2.5 w-2.5" />
                          {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded font-semibold flex-shrink-0",
                    priority.color, priority.bg
                  )}>
                    {priority.icon}
                  </div>

                  <Button
                    size="icon" variant="ghost"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive flex-shrink-0"
                    onClick={() => deleteTask(task.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </motion.div>
              );
            })}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
