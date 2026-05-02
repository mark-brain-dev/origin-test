import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot, Plus, Play, Square, RefreshCw, Trash2, Settings2,
  Sparkles, Brain, Zap, Globe, Code, FileText, Database,
  ChevronRight, CheckCircle, Clock, AlertCircle, Cpu,
  MessageSquare, Layers, Link, Terminal, BookOpen, Send,
  User, Loader2, ChevronDown, Star, Wrench, Link2,
  ChevronLeft, Search, ExternalLink, CheckSquare, XCircle,
  Activity, ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAppStore } from "@/store/app";
import { useListAiProviders } from "@workspace/api-client-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

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
  systemPrompt: string;
}

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  toolCall?: { action: string; input: Record<string, unknown>; result?: unknown; status?: "pending" | "success" | "error" };
  isStreaming?: boolean;
}

interface ComposioConnection {
  id: string;
  appName: string;
  status: string;
  entityId?: string;
}

interface ComposioAction {
  name: string;
  displayName?: string;
  description?: string;
  appName?: string;
  parameters?: string[];
}

interface AgentContext {
  activeConnections: Array<{ appName: string; status: string; id: string }>;
  connectedApps: string[];
  connectedTools: ComposioAction[];
  allTools: ComposioAction[];
  systemContext: string;
}

const DEFAULT_AGENTS: Agent[] = [
  {
    id: "research-agent",
    name: "Research Agent",
    description: "Browses and synthesizes information into structured notes",
    model: "auto",
    status: "idle",
    capabilities: ["web-search", "summarize", "create-pages"],
    icon: "🔍",
    totalRuns: 12,
    systemPrompt: "You are a Research Agent inside Nexus OS. When given a topic, you research it thoroughly, synthesize findings into structured notes, and provide actionable insights. Format your responses with clear headers, bullet points, and citations when possible. Be direct and comprehensive.",
  },
  {
    id: "writing-agent",
    name: "Writing Agent",
    description: "Drafts, edits, and improves documents across your workspace",
    model: "auto",
    status: "idle",
    capabilities: ["edit-pages", "create-pages", "rewrite"],
    icon: "✍️",
    totalRuns: 34,
    systemPrompt: "You are a Writing Agent inside Nexus OS. You help draft, edit, improve, and transform documents. You adapt your writing style to the context, maintaining clarity and engagement. Provide high-quality, polished content. Be concise when asked, detailed when needed.",
  },
  {
    id: "data-agent",
    name: "Data Agent",
    description: "Analyzes databases, creates summaries and insights from your data",
    model: "auto",
    status: "idle",
    capabilities: ["read-databases", "analyze", "create-charts"],
    icon: "📊",
    totalRuns: 8,
    systemPrompt: "You are a Data Analysis Agent inside Nexus OS. You analyze data, identify patterns and trends, create summaries, and provide actionable insights. Use structured formats like tables and bullet points to present findings clearly.",
  },
  {
    id: "automation-agent",
    name: "Automation Agent",
    description: "Executes actions across connected apps via Composio",
    model: "auto",
    status: "idle",
    capabilities: ["monitor", "webhook", "create-tasks"],
    icon: "⚡",
    totalRuns: 56,
    systemPrompt: "You are an Automation Agent inside Nexus OS. You execute actions across connected apps (GitHub, Slack, Gmail, etc.) via Composio tools. When asked to perform an action in a connected app, execute it immediately using the available tools. Be precise and efficient.",
  },
  {
    id: "nexus-assistant",
    name: "Nexus Assistant",
    description: "General-purpose AI assistant with full workspace context and tool access",
    model: "auto",
    status: "idle",
    capabilities: ["create-pages", "summarize", "analyze", "web-search"],
    icon: "🧠",
    totalRuns: 204,
    systemPrompt: "You are Nexus Assistant, a powerful AI embedded in Nexus OS — a world-class workspace combining Notion, Obsidian, and ClickUp with 250+ app integrations. Help users with any task: writing, research, analysis, coding, planning, and executing actions in connected apps. Be concise, helpful, and proactive.",
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

// Detect if a message is requesting a Composio tool call
function detectToolCallIntent(message: string, availableTools: ComposioAction[]): ComposioAction | null {
  const lower = message.toLowerCase();
  // Direct match: "create github issue", "send slack message", etc.
  for (const tool of availableTools) {
    const actionLower = (tool.displayName || tool.name).toLowerCase();
    const appLower = (tool.appName || "").toLowerCase();
    if (lower.includes(actionLower) || (lower.includes(appLower) && lower.includes("create")) ||
        (lower.includes(appLower) && lower.includes("send")) ||
        (lower.includes(appLower) && lower.includes("list")) ||
        (lower.includes(appLower) && lower.includes("get"))) {
      return tool;
    }
  }
  return null;
}

// Parse tool_call from LLM response
function parseToolCall(content: string): { action: string; input: Record<string, unknown> } | null {
  const match = content.match(/```tool_call\n([\s\S]*?)```/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

// Strip tool_call blocks from display content
function stripToolCall(content: string): string {
  return content.replace(/```tool_call\n[\s\S]*?```/g, "").trim();
}

export default function AgentsPanel() {
  useAppStore();
  const [agents, setAgents] = useState<Agent[]>(DEFAULT_AGENTS);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(DEFAULT_AGENTS[4]);
  const [showNewAgent, setShowNewAgent] = useState(false);
  const [newAgentName, setNewAgentName] = useState("");
  const [newAgentDesc, setNewAgentDesc] = useState("");
  const [prompt, setPrompt] = useState("");
  const [conversations, setConversations] = useState<Record<string, ChatMessage[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [activeView, setActiveView] = useState<"chat" | "tools">("chat");
  const [composioConnections, setComposioConnections] = useState<ComposioConnection[]>([]);
  const [composioActions, setComposioActions] = useState<ComposioAction[]>([]);
  const [agentContext, setAgentContext] = useState<AgentContext | null>(null);
  const [toolsLoading, setToolsLoading] = useState(false);
  const [selectedApp, setSelectedApp] = useState<string | null>(null);
  const [toolSearch, setToolSearch] = useState("");
  const [executingTool, setExecutingTool] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fetchComposioData = useCallback(async () => {
    setToolsLoading(true);
    try {
      const [connRes, actRes, ctxRes] = await Promise.all([
        fetch(`${BASE}/api/composio/connections?entityId=default`),
        fetch(`${BASE}/api/composio/actions?limit=100`),
        fetch(`${BASE}/api/composio/agent-context?entityId=default`),
      ]);
      if (connRes.ok) {
        const d = await connRes.json();
        setComposioConnections(d.items || []);
      }
      if (actRes.ok) {
        const d = await actRes.json();
        setComposioActions(d.items || []);
      }
      if (ctxRes.ok) {
        const d = await ctxRes.json();
        setAgentContext(d);
      }
    } catch { /* silently ignore */ }
    setToolsLoading(false);
  }, []);

  // Always fetch context on mount (needed for system prompt injection)
  useEffect(() => {
    fetchComposioData();
  }, [fetchComposioData]);

  useEffect(() => {
    if (activeView === "tools") fetchComposioData();
  }, [activeView, fetchComposioData]);

  const { data: providers = [] } = useListAiProviders() as { data: any[] };
  const defaultProvider = providers.find((p: any) => p.isDefault) || providers[0];

  const currentMessages = selectedAgent ? (conversations[selectedAgent.id] || []) : [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentMessages, isLoading]);

  // Execute a Composio tool action
  const executeToolAction = useCallback(async (
    agentId: string,
    action: string,
    input: Record<string, unknown>,
    messageIndex: number
  ) => {
    setExecutingTool(action);
    try {
      const r = await fetch(`${BASE}/api/composio/actions/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionName: action, input, entityId: "default" }),
      });
      const data = await r.json();

      setConversations(prev => {
        const msgs = [...(prev[agentId] || [])];
        if (msgs[messageIndex]?.toolCall) {
          msgs[messageIndex] = {
            ...msgs[messageIndex],
            toolCall: {
              ...msgs[messageIndex].toolCall!,
              result: data,
              status: r.ok ? "success" : "error",
            },
          };
        }
        return { ...prev, [agentId]: msgs };
      });

      if (!r.ok) {
        if (data.code === "NO_ACTIVE_CONNECTION") {
          toast.error(`No active ${data.appName} connection`, {
            description: "Connect this app in Settings → Integrations first.",
            action: { label: "Connect", onClick: () => window.history.pushState(null, "", "/settings/integrations") },
          });
        } else {
          toast.error("Tool execution failed: " + (data.error || data.message || "Unknown"));
        }
      } else {
        toast.success(`${action} executed successfully`);
      }
    } catch (err: any) {
      setConversations(prev => {
        const msgs = [...(prev[agentId] || [])];
        if (msgs[messageIndex]?.toolCall) {
          msgs[messageIndex] = {
            ...msgs[messageIndex],
            toolCall: { ...msgs[messageIndex].toolCall!, result: { error: err.message }, status: "error" },
          };
        }
        return { ...prev, [agentId]: msgs };
      });
      toast.error("Tool execution error: " + err.message);
    }
    setExecutingTool(null);
  }, []);

  const sendMessage = async () => {
    if (!prompt.trim() || !selectedAgent || isLoading) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: prompt,
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...currentMessages, userMessage];
    setConversations(prev => ({ ...prev, [selectedAgent.id]: updatedMessages }));
    setPrompt("");
    setIsLoading(true);
    setAgents(prev => prev.map(a => a.id === selectedAgent.id ? { ...a, status: "running" } : a));

    try {
      // Build context-aware system prompt with tool availability
      let enrichedSystemPrompt = selectedAgent.systemPrompt;
      if (agentContext) {
        enrichedSystemPrompt += agentContext.systemContext;
      }

      const apiMessages = [
        { role: "system", content: enrichedSystemPrompt },
        ...updatedMessages.map(m => ({ role: m.role === "system" ? "assistant" : m.role, content: m.content })),
      ];

      const response = await fetch(`${BASE}/api/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages,
          providerId: defaultProvider?.id,
          useMemory: true,
        }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      const rawContent = data.content || data.message || data.choices?.[0]?.message?.content || "No response";

      // Parse tool call from LLM response
      const toolCall = parseToolCall(rawContent);
      const displayContent = toolCall ? stripToolCall(rawContent) : rawContent;

      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: displayContent || (toolCall ? `Executing ${toolCall.action}…` : rawContent),
        timestamp: new Date().toISOString(),
        ...(toolCall ? { toolCall: { action: toolCall.action, input: toolCall.input, status: "pending" } } : {}),
      };

      const newMessages = [...updatedMessages, assistantMessage];
      setConversations(prev => ({ ...prev, [selectedAgent.id]: newMessages }));
      setAgents(prev => prev.map(a => a.id === selectedAgent.id
        ? { ...a, status: "completed", totalRuns: a.totalRuns + 1, lastRun: new Date().toISOString() }
        : a
      ));

      // Auto-execute tool if LLM emitted a tool_call block
      if (toolCall && agentContext?.connectedApps.some(
        app => toolCall.action.toLowerCase().startsWith(app.toLowerCase())
      )) {
        const msgIdx = newMessages.length - 1;
        await executeToolAction(selectedAgent.id, toolCall.action, toolCall.input, msgIdx);
      } else if (toolCall) {
        // Tool call detected but app not connected
        const appName = toolCall.action.split("_")[0].toLowerCase();
        toast.warning(`${appName} not connected`, {
          description: `Connect ${appName} in Settings → Integrations to execute this action.`,
          duration: 6000,
        });
        setConversations(prev => {
          const msgs = [...(prev[selectedAgent.id] || [])];
          const last = msgs[msgs.length - 1];
          if (last?.toolCall) {
            msgs[msgs.length - 1] = { ...last, toolCall: { ...last.toolCall, status: "error" } };
          }
          return { ...prev, [selectedAgent.id]: msgs };
        });
      }

    } catch (err: any) {
      const errMsg = err.message || "Failed to reach AI provider";
      const errorMessage: ChatMessage = {
        role: "assistant",
        content: `⚠️ ${errMsg}\n\nMake sure you have an AI provider configured in Settings → AI Providers.`,
        timestamp: new Date().toISOString(),
      };
      setConversations(prev => ({
        ...prev,
        [selectedAgent.id]: [...updatedMessages, errorMessage],
      }));
      setAgents(prev => prev.map(a => a.id === selectedAgent.id ? { ...a, status: "error" } : a));
      toast.error("Agent error: " + errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const clearConversation = () => {
    if (!selectedAgent) return;
    setConversations(prev => ({ ...prev, [selectedAgent.id]: [] }));
    setAgents(prev => prev.map(a => a.id === selectedAgent.id ? { ...a, status: "idle" } : a));
  };

  const createAgent = () => {
    if (!newAgentName.trim()) return;
    const agent: Agent = {
      id: `custom-${Date.now()}`,
      name: newAgentName,
      description: newAgentDesc || "Custom AI agent",
      model: "auto",
      status: "idle",
      capabilities: ["create-pages", "summarize"],
      icon: "🤖",
      totalRuns: 0,
      systemPrompt: `You are ${newAgentName}. ${newAgentDesc}`,
    };
    setAgents(prev => [...prev, agent]);
    setSelectedAgent(agent);
    setShowNewAgent(false);
    setNewAgentName("");
    setNewAgentDesc("");
    toast.success("Agent created");
  };

  const activeConnections = composioConnections.filter(c => c.status === "ACTIVE");

  const QUICK_PROMPTS = agentContext?.connectedApps?.length
    ? [
        `List my recent ${agentContext.connectedApps[0]} activity`,
        "What should I focus on today?",
        "Create a weekly planning template",
        `Send a message via ${agentContext.connectedApps.find(a => a.includes("slack")) || agentContext.connectedApps[0]}`,
      ]
    : [
        "Summarize the key themes in my workspace",
        "What should I focus on today?",
        "Create a weekly planning template",
        "Draft an executive summary of my notes",
      ];

  return (
    <div className="flex h-full">
      {/* Agent list sidebar */}
      <div className="w-64 flex-shrink-0 border-r border-border/40 flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">AI Agents</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 h-4 bg-primary/15 text-primary border-0">
              {providers.length > 0 ? "Live" : "Demo"}
            </Badge>
          </div>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setShowNewAgent(true)}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {providers.length === 0 && (
          <div className="mx-2 mt-2 p-2.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <p className="text-[10px] text-yellow-400 leading-relaxed">
              No AI provider configured. Add one in <strong>Settings → AI Providers</strong> for real responses.
            </p>
          </div>
        )}

        {/* Tool connectivity status */}
        {agentContext && (
          <div className="mx-2 mt-2 p-2 rounded-lg bg-muted/30 border border-border/30">
            <div className="flex items-center justify-between">
              <div className="text-[10px] text-muted-foreground">
                <span className={cn(
                  "inline-block w-1.5 h-1.5 rounded-full mr-1.5",
                  agentContext.connectedApps.length > 0 ? "bg-green-400" : "bg-muted-foreground/30"
                )} />
                {agentContext.connectedApps.length > 0
                  ? `${agentContext.connectedApps.length} apps connected`
                  : "No apps connected"}
              </div>
              <button onClick={fetchComposioData} className="text-[9px] text-muted-foreground/50 hover:text-muted-foreground">
                <RefreshCw className="h-2.5 w-2.5" />
              </button>
            </div>
            {agentContext.connectedApps.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {agentContext.connectedApps.slice(0, 4).map(app => (
                  <span key={app} className="text-[9px] px-1.5 py-0.5 bg-green-500/10 text-green-400 rounded-full capitalize">{app}</span>
                ))}
                {agentContext.connectedApps.length > 4 && (
                  <span className="text-[9px] text-muted-foreground/50">+{agentContext.connectedApps.length - 4}</span>
                )}
              </div>
            )}
          </div>
        )}

        <ScrollArea className="flex-1 mt-1">
          <div className="p-2 space-y-0.5">
            {agents.map((agent) => {
              const status = STATUS_CONFIG[agent.status];
              const msgCount = (conversations[agent.id] || []).filter(m => m.role === "assistant").length;
              return (
                <button
                  key={agent.id}
                  onClick={() => setSelectedAgent(agent)}
                  className={cn(
                    "w-full flex items-start gap-2.5 p-2.5 rounded-xl text-left transition-all",
                    selectedAgent?.id === agent.id
                      ? "bg-accent text-foreground"
                      : "hover:bg-accent/50 text-muted-foreground hover:text-foreground"
                  )}
                >
                  <div className="text-xl flex-shrink-0 mt-0.5">{agent.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="font-medium text-sm text-foreground truncate">{agent.name}</span>
                      <span className={cn("flex-shrink-0", status.color)}>{status.icon}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-1">{agent.description}</p>
                    {msgCount > 0 && (
                      <span className="text-[10px] text-primary/60 mt-0.5 block">{msgCount} response{msgCount !== 1 ? "s" : ""}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollArea>

        {showNewAgent && (
          <div className="border-t border-border/40 p-3 space-y-2">
            <input autoFocus placeholder="Agent name..."
              value={newAgentName}
              onChange={(e) => setNewAgentName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") createAgent(); if (e.key === "Escape") setShowNewAgent(false); }}
              className="w-full text-sm bg-muted/50 rounded-lg px-3 py-2 outline-none border border-border/40 focus:border-primary/50"
            />
            <input placeholder="Description (optional)..."
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

      {/* Main panel */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {selectedAgent ? (
          <>
            {/* Agent header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-border/40 bg-background/80">
              <div className="flex items-center gap-3">
                <div className="text-2xl">{selectedAgent.icon}</div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-foreground">{selectedAgent.name}</h2>
                    <Badge variant="outline" className={cn("text-[10px] px-1.5 h-4", STATUS_CONFIG[selectedAgent.status].color, "border-current/30")}>
                      {STATUS_CONFIG[selectedAgent.status].label}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{selectedAgent.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-0.5 bg-muted/60 rounded-lg p-0.5">
                  <button onClick={() => setActiveView("chat")}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all",
                      activeView === "chat" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}>
                    <MessageSquare className="h-3 w-3" /> Chat
                  </button>
                  <button onClick={() => setActiveView("tools")}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all",
                      activeView === "tools" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}>
                    <Wrench className="h-3 w-3" /> Tools
                    {activeConnections.length > 0 && (
                      <span className="ml-0.5 bg-green-500 text-white text-[9px] px-1 rounded-full">
                        {activeConnections.length}
                      </span>
                    )}
                  </button>
                </div>
                {defaultProvider && activeView === "chat" && (
                  <div className="text-xs text-muted-foreground/60 bg-muted/40 px-2 py-1 rounded-lg">
                    via {defaultProvider.name}
                  </div>
                )}
                {currentMessages.length > 0 && activeView === "chat" && (
                  <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={clearConversation}>
                    <Trash2 className="h-3 w-3 mr-1" /> Clear
                  </Button>
                )}
              </div>
            </div>

            {/* Capabilities bar */}
            {activeView === "chat" && (
              <div className="flex items-center gap-1.5 px-5 py-2 border-b border-border/20 overflow-x-auto scrollbar-none">
                {selectedAgent.capabilities.map(cap => (
                  <div key={cap} className="flex items-center gap-1 px-2 py-0.5 bg-muted/40 rounded-full text-[10px] text-muted-foreground flex-shrink-0">
                    {CAPABILITY_ICONS[cap]}
                    {cap.replace(/-/g, " ")}
                  </div>
                ))}
                {agentContext && agentContext.connectedApps.length > 0 && (
                  <div className="flex items-center gap-1 px-2 py-0.5 bg-green-500/10 rounded-full text-[10px] text-green-400 flex-shrink-0 border border-green-500/20">
                    <Zap className="h-3 w-3" />
                    {agentContext.connectedTools.length} tools ready
                  </div>
                )}
                <div className="text-[10px] text-muted-foreground/40 ml-2 flex-shrink-0">
                  · {selectedAgent.totalRuns} runs
                </div>
              </div>
            )}

            {/* Tools panel */}
            {activeView === "tools" && (
              <div className="flex-1 overflow-hidden flex flex-col">
                <div className="px-5 py-3 border-b border-border/20 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-foreground">Composio Tools</p>
                    <p className="text-[10px] text-muted-foreground">
                      {agentContext?.connectedApps.length
                        ? `${agentContext.connectedTools.length} tools ready · ${agentContext.connectedApps.length} apps connected`
                        : "Connect apps to give this agent superpowers"}
                    </p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={fetchComposioData} className="h-7 text-xs gap-1 text-muted-foreground">
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-5 space-y-5">
                    {toolsLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto mb-2" />
                      </div>
                    ) : (
                      <>
                        {/* Connected Apps */}
                        {activeConnections.length > 0 && (
                          <div>
                            <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                              Connected · {activeConnections.length} active
                            </h3>
                            <div className="flex flex-wrap gap-1.5 mb-1">
                              <button onClick={() => setSelectedApp(null)}
                                className={cn(
                                  "flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs transition-all",
                                  !selectedApp ? "border-primary/40 bg-primary/10 text-primary" : "border-border/60 text-muted-foreground hover:border-border"
                                )}>
                                All tools
                              </button>
                              {activeConnections.map(conn => (
                                <button key={conn.id}
                                  onClick={() => setSelectedApp(selectedApp === conn.appName ? null : conn.appName)}
                                  className={cn(
                                    "flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs transition-all capitalize",
                                    selectedApp === conn.appName ? "border-green-400/40 bg-green-500/10 text-green-400" : "border-border/60 text-muted-foreground hover:border-border"
                                  )}>
                                  <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                                  {conn.appName}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Actions list */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                              Available Actions · {composioActions.filter(a =>
                                !selectedApp || a.appName?.toLowerCase() === selectedApp?.toLowerCase()
                              ).filter(a =>
                                !toolSearch || (a.displayName || a.name).toLowerCase().includes(toolSearch.toLowerCase())
                              ).length}
                            </h3>
                            {selectedApp && (
                              <button onClick={() => setSelectedApp(null)}
                                className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5">
                                <ChevronLeft className="h-3 w-3" /> All
                              </button>
                            )}
                          </div>
                          <div className="relative mb-3">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                            <input value={toolSearch} onChange={e => setToolSearch(e.target.value)}
                              placeholder="Search actions…"
                              className="w-full bg-muted/40 rounded-lg pl-7 pr-3 py-1.5 text-xs border border-border/40 focus:border-primary/50 outline-none" />
                          </div>

                          <div className="space-y-1.5">
                            {composioActions
                              .filter(a => !selectedApp || a.appName?.toLowerCase() === selectedApp?.toLowerCase())
                              .filter(a => !toolSearch || (a.displayName || a.name).toLowerCase().includes(toolSearch.toLowerCase()))
                              .slice(0, 40)
                              .map((action) => {
                                const isConnected = agentContext?.connectedApps.includes(action.appName || "");
                                return (
                                  <div key={action.name}
                                    className="flex items-start gap-3 p-2.5 rounded-lg border border-border/40 bg-card hover:border-border/60 transition-colors group">
                                    <div className={cn(
                                      "w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5",
                                      isConnected ? "bg-green-500/10" : "bg-violet-500/10"
                                    )}>
                                      <Zap className={cn("h-3 w-3", isConnected ? "text-green-400" : "text-violet-400")} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-xs font-medium text-foreground truncate">
                                          {action.displayName || action.name}
                                        </span>
                                        <span className="text-[9px] text-muted-foreground/40 font-mono flex-shrink-0 capitalize">
                                          {action.appName}
                                        </span>
                                        {isConnected && (
                                          <span className="text-[9px] text-green-400 flex-shrink-0">● live</span>
                                        )}
                                      </div>
                                      {action.description && (
                                        <div className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                                          {action.description}
                                        </div>
                                      )}
                                    </div>
                                    <Button size="sm" variant="ghost"
                                      className="h-6 px-2 text-[10px] text-primary opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                                      onClick={() => {
                                        setPrompt(`Use the ${action.displayName || action.name} action from ${action.appName}`);
                                        setActiveView("chat");
                                        textareaRef.current?.focus();
                                      }}>
                                      Use
                                    </Button>
                                  </div>
                                );
                              })}
                          </div>
                        </div>

                        {/* No connections CTA */}
                        {activeConnections.length === 0 && (
                          <div className="rounded-xl border border-dashed border-border/60 p-4 text-center">
                            <Link2 className="h-5 w-5 text-muted-foreground/30 mx-auto mb-2" />
                            <p className="text-[10px] text-muted-foreground mb-2">
                              Connect apps to activate live tools for this agent
                            </p>
                            <Button size="sm" variant="outline" className="h-6 text-xs gap-1"
                              onClick={() => { window.history.pushState(null, "", "/settings/integrations"); window.dispatchEvent(new PopStateEvent("popstate")); }}>
                              <Link2 className="h-3 w-3" /> Connect Apps
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Chat messages */}
            {activeView === "chat" && (
              <ScrollArea className="flex-1 px-5">
                <div className="py-4 space-y-4 max-w-3xl mx-auto">
                  {currentMessages.length === 0 && (
                    <div className="py-10 text-center">
                      <div className="text-4xl mb-3">{selectedAgent.icon}</div>
                      <h3 className="font-semibold text-foreground mb-1">{selectedAgent.name}</h3>
                      <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">{selectedAgent.description}</p>
                      {agentContext && agentContext.connectedApps.length > 0 && (
                        <div className="mb-4 text-xs text-green-400 flex items-center justify-center gap-1.5">
                          <Zap className="h-3.5 w-3.5" />
                          {agentContext.connectedTools.length} tools ready from {agentContext.connectedApps.join(", ")}
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-2 max-w-sm mx-auto">
                        {QUICK_PROMPTS.map(qp => (
                          <button key={qp}
                            onClick={() => { setPrompt(qp); textareaRef.current?.focus(); }}
                            className="text-left p-3 rounded-xl border border-border/60 hover:border-primary/40 hover:bg-primary/5 text-xs text-muted-foreground hover:text-foreground transition-all">
                            {qp}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {currentMessages.map((msg, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      className={cn("flex gap-3", msg.role === "user" && "justify-end")}>
                      {msg.role === "assistant" && (
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500/20 to-indigo-500/20 border border-primary/20 flex items-center justify-center flex-shrink-0 mt-1 text-sm">
                          {selectedAgent.icon}
                        </div>
                      )}
                      <div className={cn(
                        "max-w-[80%] space-y-2",
                        msg.role === "user" ? "ml-auto" : ""
                      )}>
                        {msg.content && (
                          <div className={cn(
                            "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                            msg.role === "user"
                              ? "bg-primary text-primary-foreground rounded-tr-sm"
                              : "bg-card border border-border/60 rounded-tl-sm"
                          )}>
                            {msg.role === "assistant" ? (
                              <div className="whitespace-pre-wrap">
                                {msg.content.split("\n").map((line, li) => (
                                  <span key={li}>
                                    {line.startsWith("**") && line.endsWith("**") ? (
                                      <strong>{line.slice(2, -2)}</strong>
                                    ) : line.startsWith("• ") || line.startsWith("- ") ? (
                                      <span className="block pl-1">• {line.slice(2)}</span>
                                    ) : line.startsWith("# ") ? (
                                      <strong className="text-base block mb-1">{line.slice(2)}</strong>
                                    ) : line.startsWith("## ") ? (
                                      <strong className="block mb-0.5">{line.slice(3)}</strong>
                                    ) : line}
                                    {li < msg.content.split("\n").length - 1 && <br />}
                                  </span>
                                ))}
                              </div>
                            ) : msg.content}
                          </div>
                        )}

                        {/* Tool call display */}
                        {msg.toolCall && (
                          <div className={cn(
                            "rounded-xl border px-3 py-2.5 text-xs",
                            msg.toolCall.status === "success"
                              ? "border-green-500/30 bg-green-500/5"
                              : msg.toolCall.status === "error"
                                ? "border-red-500/30 bg-red-500/5"
                                : "border-violet-500/30 bg-violet-500/5"
                          )}>
                            <div className="flex items-center gap-2 mb-1.5">
                              {msg.toolCall.status === "pending" && <Loader2 className="h-3 w-3 animate-spin text-violet-400" />}
                              {msg.toolCall.status === "success" && <CheckCircle className="h-3 w-3 text-green-400" />}
                              {msg.toolCall.status === "error" && <XCircle className="h-3 w-3 text-red-400" />}
                              <span className={cn(
                                "font-mono font-semibold",
                                msg.toolCall.status === "success" ? "text-green-400" :
                                  msg.toolCall.status === "error" ? "text-red-400" : "text-violet-400"
                              )}>
                                {msg.toolCall.action}
                              </span>
                              <span className="text-muted-foreground/50 ml-auto capitalize">
                                {msg.toolCall.status}
                              </span>
                            </div>
                            {Object.keys(msg.toolCall.input).length > 0 && (
                              <div className="text-muted-foreground/60 font-mono text-[10px] bg-black/10 rounded p-1.5 mb-1.5">
                                {JSON.stringify(msg.toolCall.input, null, 2).slice(0, 200)}
                              </div>
                            )}
                            {msg.toolCall.result != null && (
                              <div className="text-muted-foreground/70 font-mono text-[10px] bg-black/10 rounded p-1.5 max-h-20 overflow-auto">
                                Result: {JSON.stringify(msg.toolCall.result as Record<string, unknown>).slice(0, 200)}
                              </div>
                            )}
                            {/* Manual execute button for pending/unconnected tools */}
                            {msg.toolCall.status === "pending" && (
                              <Button size="sm" variant="outline"
                                className="mt-2 h-6 text-[10px] gap-1 border-violet-500/40 text-violet-400"
                                disabled={!!executingTool}
                                onClick={() => executeToolAction(selectedAgent.id, msg.toolCall!.action, msg.toolCall!.input, i)}>
                                {executingTool === msg.toolCall.action
                                  ? <Loader2 className="h-2.5 w-2.5 animate-spin" />
                                  : <Play className="h-2.5 w-2.5" />}
                                Execute
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                      {msg.role === "user" && (
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0 mt-1">
                          <User className="h-3.5 w-3.5 text-white" />
                        </div>
                      )}
                    </motion.div>
                  ))}

                  {isLoading && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500/20 to-indigo-500/20 border border-primary/20 flex items-center justify-center flex-shrink-0 mt-1 text-sm">
                        {selectedAgent.icon}
                      </div>
                      <div className="bg-card border border-border/60 rounded-2xl rounded-tl-sm px-4 py-3">
                        <div className="flex gap-1 items-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                          <div className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                          <div className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                      </div>
                    </motion.div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
            )}

            {/* Input area */}
            {activeView === "chat" && (
              <div className="px-5 pb-5 pt-3 border-t border-border/20">
                <div className="max-w-3xl mx-auto">
                  <div className="relative flex items-end gap-2 bg-card border border-border/60 rounded-2xl p-2 focus-within:border-primary/50 transition-colors">
                    <Textarea
                      ref={textareaRef}
                      placeholder={agentContext?.connectedApps.length
                        ? `Message ${selectedAgent.name}… (tools: ${agentContext.connectedApps.slice(0, 3).join(", ")}${agentContext.connectedApps.length > 3 ? "…" : ""})`
                        : `Message ${selectedAgent.name}...`}
                      value={prompt}
                      onChange={e => setPrompt(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
                      }}
                      rows={1}
                      className="flex-1 border-0 bg-transparent resize-none focus-visible:ring-0 focus-visible:ring-offset-0 text-sm min-h-0 py-1 px-2 max-h-32"
                      style={{ scrollbarWidth: "none" }}
                    />
                    <Button size="icon"
                      className={cn(
                        "h-8 w-8 rounded-xl flex-shrink-0 transition-all",
                        prompt.trim() && !isLoading
                          ? "bg-gradient-to-br from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white"
                          : "bg-muted text-muted-foreground"
                      )}
                      disabled={!prompt.trim() || isLoading}
                      onClick={sendMessage}>
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground/40 text-center mt-1.5">
                    Enter to send · Shift+Enter for new line
                    {agentContext?.connectedApps.length ? ` · ${agentContext.connectedApps.length} apps connected` : ""}
                  </p>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 flex items-center justify-center mb-4 border border-primary/20">
              <Cpu className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-bold text-lg text-foreground mb-2">AI Agents</h3>
            <p className="text-sm text-muted-foreground max-w-xs leading-relaxed mb-6">
              Select an agent from the left to start a conversation, or create a custom agent.
            </p>
            <Button size="sm" onClick={() => setShowNewAgent(true)} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> New Agent
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
