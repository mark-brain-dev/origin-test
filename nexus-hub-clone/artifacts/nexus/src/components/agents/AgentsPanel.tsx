import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot, Plus, Play, Square, RefreshCw, Trash2, Settings2,
  Sparkles, Brain, Zap, Globe, Code, FileText, Database,
  ChevronRight, CheckCircle, Clock, AlertCircle, Cpu,
  MessageSquare, Layers, Link, Terminal, BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAppStore } from "@/store/app";

interface Agent {
  id: string;
  name: string;
  description: string;
  model: string;
  status: "idle" | "running" | "completed" | "error";
  capabilities: string[];
  icon: string;
  lastRun?: string;
  totalRuns: number;
}

const DEFAULT_AGENTS: Agent[] = [
  {
    id: "research-agent",
    name: "Research Agent",
    description: "Browses the web and synthesizes information into structured notes",
    model: "claude-opus-4",
    status: "idle",
    capabilities: ["web-search", "summarize", "create-pages"],
    icon: "🔍",
    totalRuns: 12,
  },
  {
    id: "writing-agent",
    name: "Writing Agent",
    description: "Drafts, edits, and improves documents across your workspace",
    model: "gpt-5",
    status: "idle",
    capabilities: ["edit-pages", "create-pages", "rewrite"],
    icon: "✍️",
    totalRuns: 34,
  },
  {
    id: "data-agent",
    name: "Data Agent",
    description: "Analyzes databases, creates summaries and insights from your data",
    model: "gemini-2.5-pro",
    status: "idle",
    capabilities: ["read-databases", "analyze", "create-charts"],
    icon: "📊",
    totalRuns: 8,
  },
  {
    id: "automation-agent",
    name: "Automation Agent",
    description: "Monitors pages for triggers and executes workflows automatically",
    model: "claude-sonnet-4",
    status: "idle",
    capabilities: ["monitor", "webhook", "create-tasks"],
    icon: "⚡",
    totalRuns: 56,
  },
];

const CAPABILITY_ICONS: Record<string, React.ReactNode> = {
  "web-search": <Globe className="h-3 w-3" />,
  "summarize": <FileText className="h-3 w-3" />,
  "create-pages": <Plus className="h-3 w-3" />,
  "edit-pages": <Code className="h-3 w-3" />,
  "rewrite": <RefreshCw className="h-3 w-3" />,
  "read-databases": <Database className="h-3 w-3" />,
  "analyze": <Brain className="h-3 w-3" />,
  "create-charts": <Layers className="h-3 w-3" />,
  "monitor": <CheckCircle className="h-3 w-3" />,
  "webhook": <Link className="h-3 w-3" />,
  "create-tasks": <Terminal className="h-3 w-3" />,
};

const STATUS_CONFIG = {
  idle: { label: "Idle", color: "text-muted-foreground", bg: "bg-muted/50", icon: <Clock className="h-3 w-3" /> },
  running: { label: "Running", color: "text-blue-400", bg: "bg-blue-500/10", icon: <RefreshCw className="h-3 w-3 animate-spin" /> },
  completed: { label: "Done", color: "text-green-400", bg: "bg-green-500/10", icon: <CheckCircle className="h-3 w-3" /> },
  error: { label: "Error", color: "text-red-400", bg: "bg-red-500/10", icon: <AlertCircle className="h-3 w-3" /> },
};

export default function AgentsPanel() {
  const { setCmdkOpen } = useAppStore();
  const [agents, setAgents] = useState<Agent[]>(DEFAULT_AGENTS);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [showNewAgent, setShowNewAgent] = useState(false);
  const [newAgentName, setNewAgentName] = useState("");
  const [newAgentDesc, setNewAgentDesc] = useState("");
  const [prompt, setPrompt] = useState("");
  const [agentLog, setAgentLog] = useState<string[]>([]);

  const runAgent = (agent: Agent) => {
    setAgents((prev) => prev.map((a) => a.id === agent.id ? { ...a, status: "running" } : a));
    setAgentLog([]);
    const steps = [
      `[${new Date().toLocaleTimeString()}] Agent "${agent.name}" started`,
      `[${new Date().toLocaleTimeString()}] Loading context from workspace...`,
      `[${new Date().toLocaleTimeString()}] Initializing model ${agent.model}...`,
      `[${new Date().toLocaleTimeString()}] Executing task with ${agent.capabilities.length} tools enabled`,
      `[${new Date().toLocaleTimeString()}] Processing...`,
    ];
    steps.forEach((step, i) => {
      setTimeout(() => setAgentLog((prev) => [...prev, step]), i * 800);
    });
    setTimeout(() => {
      setAgents((prev) => prev.map((a) =>
        a.id === agent.id ? { ...a, status: "completed", totalRuns: a.totalRuns + 1, lastRun: new Date().toISOString() } : a
      ));
      setAgentLog((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ✓ Agent completed successfully`]);
      toast.success(`${agent.name} completed successfully`);
    }, steps.length * 800);
  };

  const stopAgent = (agentId: string) => {
    setAgents((prev) => prev.map((a) => a.id === agentId ? { ...a, status: "idle" } : a));
    toast.info("Agent stopped");
  };

  const createAgent = () => {
    if (!newAgentName.trim()) return;
    const agent: Agent = {
      id: `custom-${Date.now()}`,
      name: newAgentName,
      description: newAgentDesc || "Custom agent",
      model: "gpt-5",
      status: "idle",
      capabilities: ["create-pages"],
      icon: "🤖",
      totalRuns: 0,
    };
    setAgents((prev) => [...prev, agent]);
    setShowNewAgent(false);
    setNewAgentName("");
    setNewAgentDesc("");
    toast.success("Agent created");
  };

  return (
    <div className="flex h-full">
      <div className="w-72 flex-shrink-0 border-r border-border/40 flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">AI Agents</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 h-4 bg-primary/15 text-primary border-0">Beta</Badge>
          </div>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setShowNewAgent(true)}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {agents.map((agent) => {
              const status = STATUS_CONFIG[agent.status];
              return (
                <button
                  key={agent.id}
                  onClick={() => setSelectedAgent(agent)}
                  className={cn(
                    "w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all",
                    selectedAgent?.id === agent.id
                      ? "bg-accent text-foreground"
                      : "hover:bg-accent/50 text-muted-foreground hover:text-foreground"
                  )}
                >
                  <div className="text-2xl flex-shrink-0 mt-0.5">{agent.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-medium text-sm text-foreground truncate">{agent.name}</span>
                      <span className={cn("text-[10px] flex items-center gap-0.5 flex-shrink-0", status.color)}>
                        {status.icon}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{agent.description}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] text-muted-foreground/50">{agent.model}</span>
                      <span className="text-muted-foreground/30">·</span>
                      <span className="text-[10px] text-muted-foreground/50">{agent.totalRuns} runs</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollArea>

        {showNewAgent && (
          <div className="border-t border-border/40 p-3 space-y-2">
            <input
              autoFocus
              placeholder="Agent name..."
              value={newAgentName}
              onChange={(e) => setNewAgentName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") createAgent(); if (e.key === "Escape") setShowNewAgent(false); }}
              className="w-full text-sm bg-muted/50 rounded-lg px-3 py-2 outline-none border border-border/40 focus:border-primary/50"
            />
            <input
              placeholder="Description (optional)..."
              value={newAgentDesc}
              onChange={(e) => setNewAgentDesc(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") createAgent(); }}
              className="w-full text-sm bg-muted/50 rounded-lg px-3 py-2 outline-none border border-border/40 focus:border-primary/50"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={createAgent} className="flex-1 h-7 text-xs">Create</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowNewAgent(false)} className="h-7 text-xs">Cancel</Button>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {selectedAgent ? (
          <>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/40">
              <div className="flex items-center gap-3">
                <div className="text-3xl">{selectedAgent.icon}</div>
                <div>
                  <h2 className="font-bold text-lg text-foreground">{selectedAgent.name}</h2>
                  <p className="text-sm text-muted-foreground">{selectedAgent.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {selectedAgent.status === "running" ? (
                  <Button variant="destructive" size="sm" onClick={() => stopAgent(selectedAgent.id)} className="gap-1.5">
                    <Square className="h-3.5 w-3.5" /> Stop
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => runAgent(selectedAgent)} className="gap-1.5 bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white border-0">
                    <Play className="h-3.5 w-3.5" /> Run Agent
                  </Button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Status", value: STATUS_CONFIG[selectedAgent.status].label, color: STATUS_CONFIG[selectedAgent.status].color },
                  { label: "Model", value: selectedAgent.model, color: "text-primary" },
                  { label: "Total Runs", value: String(selectedAgent.totalRuns), color: "text-foreground" },
                ].map((stat) => (
                  <div key={stat.label} className="bg-card border border-border rounded-xl p-4">
                    <div className="text-xs text-muted-foreground mb-1">{stat.label}</div>
                    <div className={cn("font-semibold text-sm", stat.color)}>{stat.value}</div>
                  </div>
                ))}
              </div>

              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">Capabilities</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedAgent.capabilities.map((cap) => (
                    <div key={cap} className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/50 rounded-lg text-xs text-muted-foreground border border-border/40">
                      {CAPABILITY_ICONS[cap]}
                      {cap.replace(/-/g, " ")}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">Send a task</h3>
                <div className="flex gap-2">
                  <input
                    placeholder={`Tell ${selectedAgent.name} what to do...`}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && prompt.trim()) { runAgent(selectedAgent); setPrompt(""); } }}
                    className="flex-1 bg-muted/40 rounded-xl px-4 py-2.5 text-sm outline-none border border-border/40 focus:border-primary/50 transition-colors"
                  />
                  <Button
                    size="sm"
                    disabled={!prompt.trim() || selectedAgent.status === "running"}
                    onClick={() => { runAgent(selectedAgent); setPrompt(""); }}
                    className="bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white border-0 px-4"
                  >
                    <Sparkles className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {agentLog.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3">Activity Log</h3>
                  <div className="bg-card/50 border border-border/40 rounded-xl p-4 font-mono text-xs space-y-1.5">
                    {agentLog.map((log, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-muted-foreground"
                      >
                        {log}
                      </motion.div>
                    ))}
                    {selectedAgent.status === "running" && (
                      <div className="text-primary animate-pulse">▋</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 flex items-center justify-center mb-4 border border-primary/20">
              <Cpu className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-bold text-lg text-foreground mb-2">AI Agents</h3>
            <p className="text-sm text-muted-foreground max-w-xs leading-relaxed mb-6">
              Sub-agents that work autonomously on your workspace — research, write, analyze and automate tasks.
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setSelectedAgent(agents[0])}>
                Select an agent
              </Button>
              <Button size="sm" onClick={() => setShowNewAgent(true)} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" /> New Agent
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
