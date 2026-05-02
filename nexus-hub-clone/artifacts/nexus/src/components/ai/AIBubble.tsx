import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Command } from "cmdk";
import {
  Sparkles, Send, X, Minimize2, Search, FileText, Hash,
  Brain, Zap, Settings, GitBranch, Plus, Star, Clock,
  ChevronRight, Lightbulb, MessageSquare, RefreshCw, Database,
  Copy, Check
} from "lucide-react";
import { useAiChat, useListSkills, useRunSkill, useListAiProviders } from "@workspace/api-client-react";
import { useAppStore } from "@/store/app";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useLocation } from "wouter";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function AIBubble() {
  const [, navigate] = useLocation();
  const { cmdkOpen, setCmdkOpen, currentPageId, currentWorkspaceId, setCurrentPage, setActiveView } = useAppStore();
  const [mode, setMode] = useState<"command" | "chat">("command");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: skills = [] } = useListSkills(undefined, { query: { enabled: cmdkOpen } });
  const { data: providers = [] } = useListAiProviders({ query: { enabled: cmdkOpen } });
  const { mutateAsync: aiChat } = useAiChat();
  const { mutateAsync: runSkill } = useRunSkill();

  useEffect(() => {
    if (cmdkOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
    if (cmdkOpen) {
      setInput("");
      if (messages.length === 0) setMode("command");
    }
  }, [cmdkOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return;
    const userMessage: Message = { id: Date.now().toString(), role: "user", content: input.trim(), timestamp: new Date() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setMode("chat");

    try {
      const response = await aiChat({
        data: {
          messages: [...messages, userMessage].map((m) => ({ role: m.role, content: m.content })),
          pageId: currentPageId || undefined,
          workspaceId: currentWorkspaceId || undefined,
          useMemory: true,
        },
      } as any);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: (response as any).content || "I processed your request.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      toast.error("AI request failed. Check your provider settings.");
    } finally {
      setIsLoading(false);
    }
  }, [input, messages, isLoading, aiChat, currentPageId, currentWorkspaceId]);

  const handleRunSkill = useCallback(async (skillId: string, skillName: string) => {
    setIsLoading(true);
    setMode("chat");
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: `Run skill: ${skillName}`, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    try {
      const result = await runSkill({ skillId, data: { input: "Current page context", pageId: currentPageId || undefined } } as any);
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: (result as any).output || "Skill executed successfully.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      toast.error("Skill execution failed");
    } finally {
      setIsLoading(false);
    }
  }, [runSkill, currentPageId]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
    toast.success("Copied to clipboard");
  };

  const filteredSkills = (skills as any[]).filter((s: any) =>
    !input || s.name.toLowerCase().includes(input.toLowerCase()) || s.description.toLowerCase().includes(input.toLowerCase())
  ).slice(0, 6);

  const quickActions = [
    { icon: <FileText className="h-4 w-4" />, label: "New Page", action: () => { setCmdkOpen(false); /* create page */ } },
    { icon: <GitBranch className="h-4 w-4" />, label: "Graph View", action: () => { setCmdkOpen(false); setActiveView("graph"); navigate("/graph"); } },
    { icon: <Settings className="h-4 w-4" />, label: "Settings", action: () => { setCmdkOpen(false); setActiveView("settings"); navigate("/settings"); } },
    { icon: <Database className="h-4 w-4" />, label: "AI Providers", action: () => { setCmdkOpen(false); setActiveView("settings"); navigate("/settings/providers"); } },
  ];

  return (
    <AnimatePresence>
      {cmdkOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40"
            onClick={() => setCmdkOpen(false)}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="fixed top-[15vh] left-1/2 -translate-x-1/2 z-50 w-[640px] max-h-[70vh] flex flex-col"
          >
            <div className="bg-popover border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border/60">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && input.trim()) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                    if (e.key === "Escape") setCmdkOpen(false);
                  }}
                  placeholder={mode === "chat" ? "Ask AI anything..." : "Search pages, run AI skills, navigate..."}
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                />
                <div className="flex items-center gap-1">
                  {mode === "chat" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground"
                      onClick={() => { setMode("command"); setMessages([]); }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground"
                    onClick={() => setCmdkOpen(false)}
                  >
                    <Minimize2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <ScrollArea className="flex-1 max-h-[calc(70vh-120px)]">
                {mode === "chat" ? (
                  <div className="p-4 space-y-4">
                    {messages.map((msg) => (
                      <div key={msg.id} className={cn("flex gap-3", msg.role === "user" ? "justify-end" : "justify-start")}>
                        {msg.role === "assistant" && (
                          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Sparkles className="h-3.5 w-3.5 text-white" />
                          </div>
                        )}
                        <div
                          className={cn(
                            "max-w-[80%] rounded-xl px-3.5 py-2.5 text-sm",
                            msg.role === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-foreground"
                          )}
                        >
                          <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                          {msg.role === "assistant" && (
                            <div className="flex items-center gap-1 mt-2 pt-2 border-t border-border/30">
                              <button
                                onClick={() => handleCopy(msg.content, msg.id)}
                                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                              >
                                {copied === msg.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                {copied === msg.id ? "Copied" : "Copy"}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {isLoading && (
                      <div className="flex gap-3">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                          <Sparkles className="h-3.5 w-3.5 text-white animate-pulse" />
                        </div>
                        <div className="bg-muted rounded-xl px-3.5 py-2.5">
                          <div className="flex gap-1 items-center h-5">
                            <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                            <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                            <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "300ms" }} />
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                ) : (
                  <div className="p-2">
                    {!input && (
                      <>
                        <div className="px-2 py-1.5 text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wider">
                          Quick Actions
                        </div>
                        <div className="grid grid-cols-2 gap-1 mb-3">
                          {quickActions.map((action) => (
                            <button
                              key={action.label}
                              onClick={action.action}
                              className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors text-left"
                            >
                              <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                                {action.icon}
                              </div>
                              {action.label}
                            </button>
                          ))}
                        </div>
                        <Separator className="my-2" />
                      </>
                    )}

                    {filteredSkills.length > 0 && (
                      <>
                        <div className="px-2 py-1.5 text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wider">
                          AI Skills
                        </div>
                        {filteredSkills.map((skill: any) => (
                          <button
                            key={skill.id}
                            onClick={() => handleRunSkill(skill.id, skill.name)}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                          >
                            <span className="text-lg">{skill.icon || "⚡"}</span>
                            <div className="flex-1 text-left">
                              <div className="font-medium text-foreground">{skill.name}</div>
                              <div className="text-xs text-muted-foreground">{skill.description}</div>
                            </div>
                            <Badge variant="outline" className="text-[10px] px-1.5">{skill.category}</Badge>
                          </button>
                        ))}
                      </>
                    )}

                    {input && (
                      <button
                        onClick={handleSendMessage}
                        className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors mt-1"
                      >
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                          <Sparkles className="h-4 w-4 text-white" />
                        </div>
                        <div className="flex-1 text-left">
                          <div className="font-medium text-foreground">Ask AI: "{input.slice(0, 40)}{input.length > 40 ? "..." : ""}"</div>
                          <div className="text-xs text-muted-foreground">Chat with your AI assistant</div>
                        </div>
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                )}
              </ScrollArea>

              {mode === "chat" && (
                <div className="px-4 py-3 border-t border-border/60 flex items-center gap-2">
                  <Button
                    onClick={handleSendMessage}
                    disabled={!input.trim() || isLoading}
                    size="sm"
                    className="gap-1.5 bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white border-0"
                  >
                    <Send className="h-3.5 w-3.5" />
                    Send
                  </Button>
                  <span className="text-xs text-muted-foreground">Enter to send · Esc to close</span>
                  {(providers as any[]).length === 0 && (
                    <button
                      onClick={() => { setCmdkOpen(false); navigate("/settings/providers"); }}
                      className="ml-auto text-xs text-violet-400 hover:text-violet-300 transition-colors"
                    >
                      Configure AI →
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
