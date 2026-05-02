import { useState, useEffect, useCallback, useRef } from "react";
import {
  Mail, Send, Star, StarOff, RefreshCw, Search, Inbox,
  Loader2, AlertCircle, ChevronLeft, Reply, Forward,
  Trash2, Archive, MoreHorizontal, PenSquare, X, CheckCircle,
  Plug, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Email {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to: string;
  snippet: string;
  body: string;
  date: string;
  read: boolean;
  starred: boolean;
  labels: string[];
}

const FOLDERS = [
  { id: "in:inbox", label: "Inbox", icon: Inbox },
  { id: "is:starred", label: "Starred", icon: Star },
  { id: "is:sent", label: "Sent", icon: Send },
  { id: "is:unread", label: "Unread", icon: Mail },
];

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function extractName(fromStr: string) {
  const match = fromStr.match(/^([^<]+)</);
  if (match) return match[1].trim();
  return fromStr.split("@")[0] || fromStr;
}

function extractEmail(fromStr: string) {
  const match = fromStr.match(/<([^>]+)>/);
  if (match) return match[1];
  return fromStr;
}

function avatarChar(fromStr: string) {
  return (extractName(fromStr)[0] || "?").toUpperCase();
}

function avatarColor(fromStr: string) {
  const colors = [
    "from-violet-500 to-indigo-600",
    "from-blue-500 to-cyan-500",
    "from-emerald-500 to-teal-500",
    "from-orange-500 to-rose-500",
    "from-pink-500 to-fuchsia-500",
    "from-amber-500 to-orange-500",
  ];
  let hash = 0;
  for (const c of fromStr) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffff;
  return colors[hash % colors.length];
}

export default function GmailInboxView() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [selected, setSelected] = useState<Email | null>(null);
  const [folder, setFolder] = useState("in:inbox");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [composing, setComposing] = useState(false);
  const [composeData, setComposeData] = useState({ to: "", subject: "", body: "" });
  const [sending, setSending] = useState(false);
  const [starred, setStarred] = useState<Set<string>>(new Set());
  const [read, setRead] = useState<Set<string>>(new Set());
  const refreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchEmails = useCallback(async (q?: string) => {
    setLoading(true);
    try {
      const query = q ?? folder;
      const r = await fetch(`${BASE}/api/composio/gmail/inbox?entityId=default&maxResults=30&q=${encodeURIComponent(query)}`);
      const d = await r.json();
      setConnected(d.connected ?? false);
      const fetched: Email[] = d.emails || [];
      setEmails(fetched);
      // Persist read/star state
      setRead(prev => {
        const next = new Set(prev);
        fetched.filter(e => e.read).forEach(e => next.add(e.id));
        return next;
      });
      setStarred(prev => {
        const next = new Set(prev);
        fetched.filter(e => e.starred).forEach(e => next.add(e.id));
        return next;
      });
    } catch { setConnected(false); }
    setLoading(false);
  }, [folder]);

  useEffect(() => {
    fetchEmails();
    refreshRef.current = setInterval(() => fetchEmails(), 60000);
    return () => { if (refreshRef.current) clearInterval(refreshRef.current); };
  }, [fetchEmails]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setSearch(searchInput.trim());
      fetchEmails(searchInput.trim());
    } else {
      setSearch("");
      fetchEmails(folder);
    }
  };

  const handleFolderChange = (f: string) => {
    setFolder(f);
    setSearch("");
    setSearchInput("");
    setSelected(null);
  };

  const toggleStar = (id: string) => {
    setStarred(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const markRead = (email: Email) => {
    setRead(prev => { const next = new Set(prev); next.add(email.id); return next; });
    setSelected(email);
  };

  const sendEmail = async () => {
    if (!composeData.to || !composeData.subject || !composeData.body) {
      toast.error("To, subject, and body are required"); return;
    }
    setSending(true);
    try {
      const r = await fetch(`${BASE}/api/composio/gmail/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...composeData, entityId: "default" }),
      });
      const d = await r.json();
      if (r.ok && d.success) {
        toast.success("Email sent!");
        setComposing(false);
        setComposeData({ to: "", subject: "", body: "" });
      } else {
        toast.error(d.error || "Failed to send email");
      }
    } catch (err: any) {
      toast.error("Send failed: " + err.message);
    }
    setSending(false);
  };

  const filteredEmails = emails.filter(e => {
    if (!search) return true;
    const q = search.toLowerCase();
    return e.subject.toLowerCase().includes(q) || e.from.toLowerCase().includes(q) || e.snippet.toLowerCase().includes(q);
  });

  const unreadCount = emails.filter(e => !read.has(e.id)).length;

  if (connected === false && !loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 text-center px-8">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center">
          <Mail className="h-8 w-8 text-red-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold mb-2">Gmail not connected</h2>
          <p className="text-sm text-muted-foreground max-w-sm">
            Connect your Gmail account via Composio to read, search, and send emails directly from Nexus OS.
          </p>
        </div>
        <Button onClick={() => window.location.href = "/marketplace"} className="gap-2">
          <Plug className="h-4 w-4" />
          Connect Gmail in Marketplace
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden bg-background">
      {/* Left sidebar — folders */}
      <div className="w-52 flex-shrink-0 border-r border-border/60 flex flex-col">
        <div className="p-4 border-b border-border/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
              <Mail className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-semibold text-sm">Gmail</span>
          </div>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setComposing(true)}>
            <PenSquare className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="p-2 space-y-0.5">
          {FOLDERS.map(f => (
            <button
              key={f.id}
              onClick={() => handleFolderChange(f.id)}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left",
                folder === f.id ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <f.icon className="h-4 w-4 flex-shrink-0" />
              <span className="flex-1 truncate">{f.label}</span>
              {f.id === "in:inbox" && unreadCount > 0 && (
                <Badge variant="secondary" className="h-4 min-w-4 text-[10px] px-1 bg-primary/20 text-primary border-0">
                  {unreadCount}
                </Badge>
              )}
            </button>
          ))}
        </div>

        <div className="mt-auto p-3 border-t border-border/60">
          <Button
            variant="ghost"
            size="sm"
            className="w-full gap-2 text-xs text-muted-foreground justify-start"
            onClick={() => fetchEmails()}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Email list */}
      <div className={cn("flex flex-col border-r border-border/60 transition-all duration-200", selected ? "w-72 flex-shrink-0" : "flex-1")}>
        {/* Search bar */}
        <div className="p-3 border-b border-border/60">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Search mail..."
              className="pl-8 h-8 text-sm bg-muted/40 border-border/60"
            />
            {searchInput && (
              <button type="button" className="absolute right-2.5 top-1/2 -translate-y-1/2"
                onClick={() => { setSearchInput(""); setSearch(""); fetchEmails(folder); }}>
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            )}
          </form>
        </div>

        {/* Email count header */}
        <div className="px-3 py-2 border-b border-border/40 flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
            {search ? `Results for "${search}"` : FOLDERS.find(f => f.id === folder)?.label}
          </span>
          <span className="text-[11px] text-muted-foreground">{filteredEmails.length} emails</span>
        </div>

        <ScrollArea className="flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-primary/60" />
              <span className="text-sm">Loading emails…</span>
            </div>
          ) : filteredEmails.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
              <Inbox className="h-8 w-8 opacity-30" />
              <span className="text-sm">No emails found</span>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {filteredEmails.map(email => {
                const isRead = read.has(email.id);
                const isStarred = starred.has(email.id);
                const isSelected = selected?.id === email.id;
                return (
                  <button
                    key={email.id}
                    onClick={() => markRead(email)}
                    className={cn(
                      "w-full text-left px-3 py-3 hover:bg-accent/50 transition-colors group relative",
                      isSelected && "bg-primary/5 border-l-2 border-primary",
                      !isRead && "bg-blue-500/[0.03]"
                    )}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className={cn("w-7 h-7 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5", avatarColor(email.from))}>
                        {avatarChar(email.from)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className={cn("text-[13px] truncate", !isRead ? "font-semibold text-foreground" : "font-medium text-foreground/80")}>
                            {extractName(email.from) || "Unknown"}
                          </span>
                          <span className="text-[10px] text-muted-foreground flex-shrink-0">{formatDate(email.date)}</span>
                        </div>
                        <div className={cn("text-xs truncate mb-0.5", !isRead ? "font-medium text-foreground/90" : "text-foreground/70")}>
                          {email.subject}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate">{email.snippet}</div>
                      </div>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); toggleStar(email.id); }}
                      className={cn("absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded", isStarred && "opacity-100 text-amber-400")}
                    >
                      {isStarred ? <Star className="h-3.5 w-3.5 fill-current" /> : <StarOff className="h-3.5 w-3.5 text-muted-foreground/50" />}
                    </button>
                    {!isRead && <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-blue-500" />}
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Email detail panel */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex-1 flex flex-col overflow-hidden"
          >
            {/* Detail header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border/60">
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setSelected(null)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-sm truncate">{selected.subject}</h2>
              </div>
              <div className="flex items-center gap-1">
                <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={() => setComposeData({ to: extractEmail(selected.from), subject: `Re: ${selected.subject}`, body: `\n\n---\nOn ${new Date(selected.date).toLocaleDateString()}, ${selected.from} wrote:\n${selected.snippet}` })}>
                  <Reply className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={() => { setComposeData({ to: "", subject: `Fwd: ${selected.subject}`, body: `\n\n---\n${selected.snippet}` }); setComposing(true); }}>
                  <Forward className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={() => toggleStar(selected.id)}>
                  {starred.has(selected.id)
                    ? <Star className="h-4 w-4 text-amber-400 fill-current" />
                    : <StarOff className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-6">
                {/* From / To metadata */}
                <div className="mb-6">
                  <div className="flex items-start gap-3">
                    <div className={cn("w-10 h-10 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-bold text-sm flex-shrink-0", avatarColor(selected.from))}>
                      {avatarChar(selected.from)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-semibold text-sm">{extractName(selected.from)}</span>
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {new Date(selected.date).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        <span>{extractEmail(selected.from)}</span>
                        {selected.to && <span className="ml-2">→ {selected.to.split(",").join(", ")}</span>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Email body */}
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  {selected.body ? (
                    <div
                      className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap break-words"
                      dangerouslySetInnerHTML={{
                        __html: selected.body.includes("<")
                          ? selected.body
                          : selected.body.replace(/\n/g, "<br/>"),
                      }}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground italic">{selected.snippet || "No content"}</p>
                  )}
                </div>

                {/* Labels */}
                {selected.labels.length > 0 && (
                  <div className="mt-6 flex flex-wrap gap-1.5">
                    {selected.labels.filter(l => !["INBOX", "UNREAD"].includes(l)).map(label => (
                      <Badge key={label} variant="secondary" className="text-[10px] h-4 px-1.5 font-normal">
                        {label.toLowerCase()}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Quick reply */}
                <div className="mt-8 border border-border/60 rounded-xl p-4 bg-muted/20">
                  <p className="text-xs text-muted-foreground mb-2 font-medium">Quick Reply</p>
                  <Textarea
                    placeholder={`Reply to ${extractName(selected.from)}...`}
                    className="min-h-[80px] text-sm resize-none bg-transparent border-0 p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                    value={composeData.to === extractEmail(selected.from) ? composeData.body : ""}
                    onChange={e => setComposeData({ to: extractEmail(selected.from), subject: `Re: ${selected.subject}`, body: e.target.value })}
                  />
                  <div className="flex justify-end mt-2">
                    <Button
                      size="sm"
                      className="gap-1.5"
                      disabled={sending || !composeData.body.trim()}
                      onClick={() => {
                        if (!composeData.body.trim()) return;
                        setComposeData(prev => ({ ...prev, to: extractEmail(selected.from), subject: `Re: ${selected.subject}` }));
                        sendEmail();
                      }}
                    >
                      {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                      Send Reply
                    </Button>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Compose modal */}
      <AnimatePresence>
        {composing && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            className="fixed bottom-4 right-4 w-[480px] bg-popover border border-border rounded-xl shadow-2xl z-50 overflow-hidden"
          >
            {/* Compose header */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-muted/40 border-b border-border/60">
              <span className="text-sm font-semibold">New Message</span>
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setComposing(false)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="p-4 space-y-3">
              <div className="flex items-center gap-2 border-b border-border/40 pb-2">
                <span className="text-xs text-muted-foreground w-10 flex-shrink-0">To</span>
                <Input
                  value={composeData.to}
                  onChange={e => setComposeData(p => ({ ...p, to: e.target.value }))}
                  placeholder="recipient@example.com"
                  className="h-7 border-0 bg-transparent p-0 text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
              <div className="flex items-center gap-2 border-b border-border/40 pb-2">
                <span className="text-xs text-muted-foreground w-10 flex-shrink-0">Subject</span>
                <Input
                  value={composeData.subject}
                  onChange={e => setComposeData(p => ({ ...p, subject: e.target.value }))}
                  placeholder="Subject"
                  className="h-7 border-0 bg-transparent p-0 text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
              <Textarea
                value={composeData.body}
                onChange={e => setComposeData(p => ({ ...p, body: e.target.value }))}
                placeholder="Write your message…"
                className="min-h-[140px] text-sm resize-none bg-transparent border-0 p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>

            <div className="flex items-center justify-between px-4 pb-4">
              <Button
                onClick={sendEmail}
                disabled={sending || !composeData.to || !composeData.subject || !composeData.body}
                className="gap-2"
                size="sm"
              >
                {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Send
              </Button>
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => { setComposing(false); setComposeData({ to: "", subject: "", body: "" }); }}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
