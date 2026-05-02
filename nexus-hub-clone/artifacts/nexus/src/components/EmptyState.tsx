import { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Plus, Paperclip, Mic, AtSign, Send,
  ChevronDown, FileText, Calendar, Search, Lightbulb,
  BarChart3, ClipboardList, BookOpen, Zap, ArrowRight,
} from "lucide-react";
import { useCreatePage, useGetRecentPages, useGetWorkspaceStats, useListAiProviders } from "@workspace/api-client-react";
import { useAppStore } from "@/store/app";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface EmptyStateProps {
  workspaceId: string;
}

const MODELS = [
  { id: "auto", label: "Auto" },
  { id: "claude-sonnet-4", label: "Sonnet 4.6", badge: "Beta" },
  { id: "claude-opus-4", label: "Opus 4.7", badge: "Beta" },
  { id: "gpt-5", label: "GPT-5", badge: "Beta" },
  { id: "gpt-5-5", label: "GPT-5.5", badge: "Beta" },
  { id: "gemini-3-1-pro", label: "Gemini 3.1 Pro", badge: "Beta" },
  { id: "gemini-2-5-flash", label: "Gemini 2.5 Flash" },
];

const CONNECTOR_ICONS = ["📄", "📊", "✅", "🗓️", "📬", "📁", "🔗", "⚡", "🧠", "🎨", "📝", "🔍", "💬", "🌐"];

const GET_STARTED = [
  { icon: <Zap className="h-5 w-5 text-yellow-400" />, label: "What's new in Nexus", description: "See recent features", action: "whats-new" },
  { icon: <ClipboardList className="h-5 w-5 text-blue-400" />, label: "Write meeting agenda", description: "AI-drafted agenda", action: "meeting" },
  { icon: <BarChart3 className="h-5 w-5 text-purple-400" />, label: "Analyze PDFs or images", description: "Extract insights", action: "analyze" },
  { icon: <BookOpen className="h-5 w-5 text-green-400" />, label: "Create a task tracker", description: "Notion-style database", action: "tasks" },
];

export default function EmptyState({ workspaceId }: EmptyStateProps) {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { setCmdkOpen, setActiveView, currentWorkspaceId } = useAppStore();
  const [aiInput, setAiInput] = useState("");
  const [selectedModel, setSelectedModel] = useState("auto");
  const [showModelPicker, setShowModelPicker] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { data: stats } = useGetWorkspaceStats(workspaceId, { query: { enabled: !!workspaceId } });
  const { data: recentPages = [] } = useGetRecentPages(workspaceId, undefined, { query: { enabled: !!workspaceId } });
  const { data: providers = [] } = useListAiProviders({ query: { enabled: !!workspaceId } });

  const { mutate: createPage } = useCreatePage({
    mutation: {
      onSuccess: (page: any) => {
        qc.invalidateQueries({ queryKey: ["pages"] });
        useAppStore.getState().setCurrentPage(page.id);
        navigate(`/page/${page.id}`);
      },
    },
  });

  const handleAiSubmit = () => {
    if (!aiInput.trim()) return;
    setCmdkOpen(true);
    setAiInput("");
  };

  const handleGetStarted = (action: string) => {
    if (action === "tasks") {
      createPage({ workspaceId, data: { title: "Task Tracker", type: "database" } } as any);
    } else if (action === "meeting") {
      createPage({ workspaceId, data: { title: "Meeting Agenda", type: "page", icon: "📋" } } as any);
    } else if (action === "analyze") {
      setCmdkOpen(true);
    } else {
      setCmdkOpen(true);
    }
  };

  const currentModel = MODELS.find((m) => m.id === selectedModel) || MODELS[0];
  const workspaceName = (stats as any)?.workspaceName || "Nexus OS";

  return (
    <div className="h-full overflow-y-auto flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 min-h-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
          className="w-full max-w-2xl"
        >
          {/* Emoji + Heading */}
          <div className="text-center mb-8">
            <div className="text-5xl mb-4 select-none">⚡</div>
            <h1 className="text-2xl font-bold text-foreground">
              What's our quest today?
            </h1>
          </div>

          {/* AI Input Box */}
          <div className="relative bg-card border border-border/60 rounded-2xl shadow-lg overflow-hidden mb-4">
            <div className="flex items-start gap-2 p-4 pb-2">
              <textarea
                ref={inputRef}
                rows={2}
                placeholder="Do anything with AI..."
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleAiSubmit();
                  }
                }}
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 outline-none resize-none leading-relaxed"
              />
            </div>

            <div className="flex items-center gap-2 px-4 pb-3">
              <button className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent/50 transition-colors">
                <Plus className="h-4 w-4" />
              </button>
              <button className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent/50 transition-colors">
                <Paperclip className="h-4 w-4" />
              </button>

              <div className="flex-1" />

              {/* Model Selector */}
              <div className="relative">
                <button
                  onClick={() => setShowModelPicker(!showModelPicker)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-accent/60 text-xs font-medium text-foreground hover:bg-accent transition-colors"
                >
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  {currentModel.label}
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </button>

                <AnimatePresence>
                  {showModelPicker && (
                    <motion.div
                      initial={{ opacity: 0, y: 4, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.97 }}
                      transition={{ duration: 0.12 }}
                      className="absolute bottom-full right-0 mb-2 w-52 bg-popover border border-border rounded-xl shadow-2xl overflow-hidden z-50"
                    >
                      <div className="p-1">
                        {MODELS.map((model) => (
                          <button
                            key={model.id}
                            onClick={() => { setSelectedModel(model.id); setShowModelPicker(false); }}
                            className={cn(
                              "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition-colors",
                              selectedModel === model.id ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                            )}
                          >
                            <Sparkles className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                            <span className="flex-1">{model.label}</span>
                            {model.badge && (
                              <Badge variant="secondary" className="text-[9px] h-4 px-1.5 bg-primary/10 text-primary border-0">{model.badge}</Badge>
                            )}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent/50 transition-colors">
                <Mic className="h-4 w-4" />
              </button>

              <button
                onClick={handleAiSubmit}
                className={cn(
                  "p-1.5 rounded-lg transition-colors",
                  aiInput.trim()
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "text-muted-foreground/40"
                )}
              >
                <Send className="h-4 w-4" />
              </button>
            </div>

            {/* App connectors row */}
            <div className="flex items-center gap-2 px-4 py-2.5 border-t border-border/40 bg-muted/20">
              <span className="text-[11px] text-muted-foreground/60 flex-shrink-0">Get better answers from your apps</span>
              <div className="flex items-center gap-1 overflow-hidden">
                {CONNECTOR_ICONS.map((icon, i) => (
                  <button key={i} className="text-sm hover:scale-110 transition-transform flex-shrink-0" title="Connect app">
                    {icon}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Get started section */}
          <div className="bg-card border border-border/40 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Get started</span>
              <button className="text-muted-foreground/60 hover:text-foreground transition-colors">
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-4 divide-x divide-border/40">
              {GET_STARTED.map((item) => (
                <button
                  key={item.action}
                  onClick={() => handleGetStarted(item.action)}
                  className="flex flex-col items-start gap-2 p-4 text-left hover:bg-accent/30 transition-colors group"
                >
                  <div className="w-9 h-9 rounded-xl bg-muted/60 flex items-center justify-center group-hover:scale-105 transition-transform">
                    {item.icon}
                  </div>
                  <div>
                    <div className="text-xs font-medium text-foreground leading-snug">{item.label}</div>
                    <div className="text-[11px] text-muted-foreground/60 mt-0.5">{item.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Recent pages */}
          {(recentPages as any[]).length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mt-6"
            >
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Recent</div>
              <div className="space-y-1">
                {(recentPages as any[]).slice(0, 4).map((page: any) => (
                  <button
                    key={page.id}
                    onClick={() => { useAppStore.getState().setCurrentPage(page.id); navigate(`/page/${page.id}`); }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-accent/40 transition-colors text-left group"
                  >
                    <span className="text-base">{page.icon || "📄"}</span>
                    <span className="text-sm text-foreground/80 group-hover:text-foreground transition-colors">{page.title || "Untitled"}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/30 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
