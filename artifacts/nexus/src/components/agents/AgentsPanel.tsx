import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot, Plus, Play, Square, RefreshCw, Trash2, Settings2,
  Sparkles, Brain, Zap, Globe, Code, FileText, Database,
  ChevronRight, CheckCircle, Clock, AlertCircle, Cpu,
  MessageSquare, Layers, Link, Terminal, BookOpen, Send,
  User, Loader2, ChevronDown, Star,
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
  isStreaming?: boolean;
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
    systemPrompt: "You are a Research Agent. When given a topic, you research it thoroughly, synthesize findings into structured notes, and provide actionable insights. Format your responses with clear headers, bullet points, and citations when possible.",
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
    systemPrompt: "You are a Writing Agent. You help draft, edit, improve, and transform documents. You adapt your writing style to the context, maintaining clarity and engagement. Provide high-quality, polished content.",
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
    systemPrompt: "You are a Data Analysis Agent. You analyze data, identify patterns and trends, create summaries, and provide actionable insights. Use structured formats like tables and bullet points to present findings clearly.",
  },
  {
    id: "automation-agent",
    name: "Automation Agent",
    description: "Monitors pages for triggers and executes workflows automatically",
    model: "auto",
    status: "idle",
    capabilities: ["monitor", "webhook", "create-tasks"],
    icon: "⚡",
    totalRuns: 56,
    systemPrompt: "You are an Automation Agent. You help design and implement automated workflows, create triggers, and execute repetitive tasks efficiently. Provide clear step-by-step automation plans.",
  },
  {
    id: "nexus-assistant",
    name: "Nexus Assistant",
    description: "General-purpose AI assistant with full workspace context",
    model: "auto",
    status: "idle",
    capabilities: ["create-pages", "summarize", "analyze", "web-search"],
    icon: "🧠",
    totalRuns: 204,
    systemPrompt: "You are Nexus Assistant, a helpful AI embedded in Nexus OS — a world-class workspace combining Notion, Obsidian, and ClickUp. Help users with any task: writing, research, analysis, coding, planning, and more. Be concise, helpful, and proactive.",
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
  const { currentWorkspaceId } = useAppStore();
  const [agents, setAgents] = useState<Agent[]>(DEFAULT_AGENTS);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(DEFAULT_AGENTS[4]);
  const [showNewAgent, setShowNewAgent] = useState(false);
  const [newAgentName, setNewAgentName] = useState("");
  const [newAgentDesc, setNewAgentDesc] = useState("");
  const [prompt, setPrompt] = useState("");
  const [conversations, setConversations] = useState<Record<string, ChatMessage[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: providers = [] } = useListAiProviders() as { data: any[] };
  const defaultProvider = providers.find((p: any) => p.isDefault) || providers[0];

  const currentMessages = selectedAgent ? (conversations[selectedAgent.id] || []) : [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentMessages]);

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

    setAgents(prev => prev.map(a => a.id === selectedAgent.id
      ? { ...a, status: "running" }
      : a
    ));

    try {
      const apiMessages = [
        { role: "system", content: selectedAgent.systemPrompt },
        ...updatedMessages.map(m => ({ role: m.role, content: m.content })),
      ];

      const response = await fetch(`${BASE}/api/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages,
          providerId: defaultProvider?.id,
          workspaceId: currentWorkspaceId,
          useMemory: true,
        }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      const content = data.content || data.message || data.choices?.[0]?.message?.content || "No response";

      const assistantMessage: ChatMessage = {
        role: "assistant",
        content,
        timestamp: new Date().toISOString(),
      };

      setConversations(prev => ({
        ...prev,
        [selectedAgent.id]: [...updatedMessages, assistantMessage],
      }));

      setAgents(prev => prev.map(a => a.id === selectedAgent.id
        ? { ...a, status: "completed", totalRuns: a.totalRuns + 1, lastRun: new Date().toISOString() }
        : a
      ));
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

  const QUICK_PROMPTS = [
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

        <ScrollArea className="flex-1">
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
                      <span className="text-[10px] text-primary/60 mt-0.5 block">{msgCount} response{msgCount > 1 ? "s" : ""}</span>
                    )}
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

      {/* Chat / agent detail panel */}
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
                {defaultProvider && (
                  <div className="text-xs text-muted-foreground/60 bg-muted/40 px-2 py-1 rounded-lg">
                    via {defaultProvider.name}
                  </div>
                )}
                {currentMessages.length > 0 && (
                  <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={clearConversation}>
                    <Trash2 className="h-3 w-3 mr-1" /> Clear
                  </Button>
                )}
              </div>
            </div>

            {/* Capabilities bar */}
            <div className="flex items-center gap-1.5 px-5 py-2 border-b border-border/20 overflow-x-auto scrollbar-none">
              {selectedAgent.capabilities.map(cap => (
                <div key={cap} className="flex items-center gap-1 px-2 py-0.5 bg-muted/40 rounded-full text-[10px] text-muted-foreground flex-shrink-0">
                  {CAPABILITY_ICONS[cap]}
                  {cap.replace(/-/g, " ")}
                </div>
              ))}
              <div className="text-[10px] text-muted-foreground/40 ml-2 flex-shrink-0">
                · {selectedAgent.totalRuns} runs
              </div>
            </div>

            {/* Chat messages */}
            <ScrollArea className="flex-1 px-5">
              <div className="py-4 space-y-4 max-w-3xl mx-auto">
                {currentMessages.length === 0 && (
                  <div className="py-10 text-center">
                    <div className="text-4xl mb-3">{selectedAgent.icon}</div>
                    <h3 className="font-semibold text-foreground mb-1">{selectedAgent.name}</h3>
                    <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">{selectedAgent.description}</p>
                    <div className="grid grid-cols-2 gap-2 max-w-sm mx-auto">
                      {QUICK_PROMPTS.map(qp => (
                        <button
                          key={qp}
                          onClick={() => { setPrompt(qp); textareaRef.current?.focus(); }}
                          className="text-left p-3 rounded-xl border border-border/60 hover:border-primary/40 hover:bg-primary/5 text-xs text-muted-foreground hover:text-foreground transition-all"
                        >
                          {qp}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {currentMessages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn("flex gap-3", msg.role === "user" && "justify-end")}
                  >
                    {msg.role === "assistant" && (
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500/20 to-indigo-500/20 border border-primary/20 flex items-center justify-center flex-shrink-0 mt-1 text-sm">
                        {selectedAgent.icon}
                      </div>
                    )}
                    <div className={cn(
                      "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground ml-auto rounded-tr-sm"
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
                              ) : (
                                line
                              )}
                              {li < msg.content.split("\n").length - 1 && <br />}
                            </span>
                          ))}
                        </div>
                      ) : (
                        msg.content
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

            {/* Input area */}
            <div className="px-5 pb-5 pt-3 border-t border-border/20">
              <div className="max-w-3xl mx-auto">
                <div className="relative flex items-end gap-2 bg-card border border-border/60 rounded-2xl p-2 focus-within:border-primary/50 transition-colors">
                  <Textarea
                    ref={textareaRef}
                    placeholder={`Message ${selectedAgent.name}...`}
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    rows={1}
                    className="flex-1 border-0 bg-transparent resize-none focus-visible:ring-0 focus-visible:ring-offset-0 text-sm min-h-0 py-1 px-2 max-h-32"
                    style={{ scrollbarWidth: "none" }}
                  />
                  <Button
                    size="icon"
                    className={cn(
                      "h-8 w-8 rounded-xl flex-shrink-0 transition-all",
                      prompt.trim() && !isLoading
                        ? "bg-gradient-to-br from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white"
                        : "bg-muted text-muted-foreground"
                    )}
                    disabled={!prompt.trim() || isLoading}
                    onClick={sendMessage}
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground/40 text-center mt-1.5">
                  Press Enter to send · Shift+Enter for new line
                </p>
              </div>
            </div>
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
