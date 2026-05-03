import { useState, useEffect, useCallback, useRef } from "react";
import {
  Mail, Send, Star, StarOff, RefreshCw, Search, Inbox,
  Loader2, ChevronLeft, Reply, Forward,
  Trash2, PenSquare, X, Plug, ChevronDown,
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

// ── Safety guard: always convert any value to a plain string before rendering ──
function s(val: unknown, fallback = ""): string {
  if (val == null) return fallback;
  if (typeof val === "string") return val;
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  if (typeof val === "object") {
    const o = val as Record<string, unknown>;
    const inner =
      o.text ?? o.plain ?? o.html ?? o.body ?? o.content ??
      o.subject ?? o.value ?? o.snippet ?? o.preview ?? null;
    if (inner != null) return s(inner, fallback);
    try { return JSON.stringify(val); } catch { return fallback; }
  }
  return fallback;
}

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

function formatDate(dateStr: string): string {
  const raw = s(dateStr);
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function extractName(fromStr: unknown): string {
  const str = s(fromStr);
  const match = str.match(/^([^<]+)</);
  if (match) return match[1].trim();
  return str.split("@")[0] || str;
}

function extractEmail(fromStr: unknown): string {
  const str = s(fromStr);
  const match = str.match(/<([^>]+)>/);
  if (match) return match[1];
  return str;
}

function avatarChar(fromStr: unknown): string {
  return (s(fromStr)[0] || "?").toUpperCase();
}

function avatarColor(fromStr: unknown): string {
  const colors = [
    "from-violet-500 to-indigo-600",
    "from-blue-500 to-cyan-500",
    "from-emerald-500 to-teal-500",
    "from-orange-500 to-rose-500",
    "from-pink-500 to-fuchsia-500",
    "from-amber-500 to-orange-500",
  ];
  const str = s(fromStr);
  let hash = 0;
  for (const c of str) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffff;
  return colors[hash % colors.length];
}

const CACHE_KEY = "nexus_gmail_inbox_cache";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function loadCache(): { emails: Email[]; ts: number } | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function saveCache(emails: Email[]) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ emails, ts: Date.now() })); } catch { /* ignore */ }
}

export default function GmailInboxView() {
  const cached = loadCache();
  const [emails, setEmails] = useState<Email[]>(cached?.emails ?? []);
  // Only show the full-page spinner on the very first load (no cache)
  const [loading, setLoading] = useState(cached === null);
  const [backgroundRefreshing, setBackgroundRefreshing] = useState(cached !== null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [connected, setConnected] = useState<boolean | null>(cached !== null ? true : null);
  const [selected, setSelected] = useState<Email | null>(null);
  const [folder, setFolder] = useState("in:inbox");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [composing, setComposing] = useState(false);
  const [composeData, setComposeData] = useState({ to: "", subject: "", body: "" });
  const [sending, setSending] = useState(false);
  const [starred, setStarred] = useState<Set<string>>(new Set());
  const [read, setRead] = useState<Set<string>>(new Set());
  const [nextPageToken, setNextPageToken] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(false);
  const refreshRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchEmails = useCallback(async (q?: string, pageToken?: string, append = false) => {
    // Cancel any in-flight primary fetch
    if (!append) {
      abortRef.current?.abort();
      abortRef.current = new AbortController();
    }
    if (append) setLoadingMore(true);
    else setLoading(true);

    try {
      const query = q ?? folder;
      const params = new URLSearchParams({
        entityId: "default",
        maxResults: "50",
        q: query,
      });
      if (pageToken) params.set("pageToken", pageToken);

      const r = await fetch(`${BASE}/api/composio/gmail/inbox?${params}`, {
        signal: append ? undefined : abortRef.current?.signal,
      });
      if (!r.ok && r.status !== 200) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      setConnected(d.connected ?? false);
      setBackgroundRefreshing(false);

      const fetched: Email[] = (d.emails || []).map((e: unknown) => {
        const m = e as Record<string, unknown>;
        return {
          id: s(m.id || m.messageId, `msg-${Math.random()}`),
          threadId: s(m.threadId || m.thread_id || m.id, ""),
          subject: s(m.subject || m.Subject) || "(no subject)",
          from: s(m.from || m.From || m.sender || ""),
          to: s(m.to || m.To || m.recipient || ""),
          snippet: s(m.snippet || m.preview || ""),
          body: s(m.body || m.htmlBody || m.textBody || m.content || m.snippet || ""),
          date: s(m.date || m.internalDate || m.receivedAt || new Date().toISOString()),
          read: !!(m.read ?? m.isRead ?? true),
          starred: !!(m.starred ?? m.isStarred ?? false),
          labels: Array.isArray(m.labels) ? (m.labels as unknown[]).map(l => s(l)) :
                  Array.isArray(m.labelIds) ? (m.labelIds as unknown[]).map(l => s(l)) : [],
        } as Email;
      });

      if (append) {
        setEmails(prev => {
          const ids = new Set(prev.map(e => e.id));
          const merged = [...prev, ...fetched.filter(e => !ids.has(e.id))];
          saveCache(merged);
          return merged;
        });
      } else {
        setEmails(fetched);
        saveCache(fetched);
      }

      const token = s(d.nextPageToken || "");
      setNextPageToken(token || undefined);
      setHasMore(!!token && fetched.length > 0);

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
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return; // Stale fetch — ignore
      setConnected(false);
      setBackgroundRefreshing(false);
    }

    if (append) setLoadingMore(false);
    else setLoading(false);
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
    setNextPageToken(undefined);
    setHasMore(false);
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
        toast.error(s(d.error) || "Failed to send email");
      }
    } catch (err: unknown) {
      toast.error("Send failed: " + s(err instanceof Error ? err.message : err));
    }
    setSending(false);
  };

  const filteredEmails = emails.filter(e => {
    if (!search) return true;
    const q = search.toLowerCase();
    return s(e.subject).toLowerCase().includes(q)
      || s(e.from).toLowerCase().includes(q)
      || s(e.snippet).toLowerCase().includes(q);
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

  // Safe body renderer — always ensures a string reaches dangerouslySetInnerHTML
  function renderBody(email: Email) {
    const bodyStr = s(email.body) || s(email.snippet) || "";
    if (!bodyStr) return <p className="text-sm text-muted-foreground italic">No content</p>;
    const isHtml = bodyStr.includes("<") && (bodyStr.includes("</") || bodyStr.includes("/>"));
    return (
      <div
        className="text-sm text-foreground/90 leading-relaxed break-words"
        dangerouslySetInnerHTML={{
          __html: isHtml ? bodyStr : bodyStr.replace(/\n/g, "<br/>"),
        }}
      />
    );
  }

  return (
    <div className="flex h-full overflow-hidden bg-background">

      {/* ── Folder sidebar ── */}
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
            onClick={() => { setNextPageToken(undefined); fetchEmails(); }}
            disabled={loading}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* ── Email list ── */}
      <div className={cn("flex flex-col border-r border-border/60 transition-all duration-200", selected ? "w-72 flex-shrink-0" : "flex-1")}>
        <div className="p-3 border-b border-border/60">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Search mail…"
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

        <div className="px-3 py-2 border-b border-border/40 flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
            {search ? `"${search}"` : FOLDERS.find(f => f.id === folder)?.label}
          </span>
          <div className="flex items-center gap-1.5">
            {backgroundRefreshing && (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground/50">
                <RefreshCw className="h-2.5 w-2.5 animate-spin" />
                Syncing
              </span>
            )}
            <span className="text-[11px] text-muted-foreground">{filteredEmails.length} emails</span>
          </div>
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
              <p className="text-xs opacity-60 text-center max-w-[180px]">
                Your Gmail connection is active. Try refreshing or checking a different folder.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {filteredEmails.map(email => {
                const isRead = read.has(email.id);
                const isStarred = starred.has(email.id);
                const isSelected = selected?.id === email.id;
                return (
                  <div
                    key={email.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => markRead(email)}
                    onKeyDown={e => { if (e.key === "Enter" || e.key === " ") markRead(email); }}
                    className={cn(
                      "w-full text-left px-3 py-3 hover:bg-accent/50 transition-colors group relative cursor-pointer",
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
                          {s(email.subject) || "(no subject)"}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate">{s(email.snippet)}</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); toggleStar(email.id); }}
                      className={cn("absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded", isStarred && "opacity-100 text-amber-400")}
                    >
                      {isStarred ? <Star className="h-3.5 w-3.5 fill-current" /> : <StarOff className="h-3.5 w-3.5 text-muted-foreground/50" />}
                    </button>
                    {!isRead && <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-blue-500" />}
                  </div>
                );
              })}

              {/* Load More older emails */}
              {hasMore && (
                <div className="px-3 py-3 flex justify-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-xs text-muted-foreground"
                    disabled={loadingMore}
                    onClick={() => fetchEmails(search || folder, nextPageToken, true)}
                  >
                    {loadingMore
                      ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Loading older emails…</>
                      : <><ChevronDown className="h-3.5 w-3.5" />Load older emails</>
                    }
                  </Button>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* ── Email detail panel ── */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border/60">
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setSelected(null)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-sm truncate">{s(selected.subject) || "(no subject)"}</h2>
              </div>
              <div className="flex items-center gap-1">
                <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setComposeData({
                      to: extractEmail(selected.from),
                      subject: `Re: ${s(selected.subject)}`,
                      body: `\n\n---\nOn ${new Date(s(selected.date)).toLocaleDateString()}, ${s(selected.from)} wrote:\n${s(selected.snippet)}`,
                    });
                    setComposing(true);
                  }}>
                  <Reply className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setComposeData({ to: "", subject: `Fwd: ${s(selected.subject)}`, body: `\n\n---\n${s(selected.snippet)}` });
                    setComposing(true);
                  }}>
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
                <div className="mb-6">
                  <div className="flex items-start gap-3">
                    <div className={cn("w-10 h-10 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-bold text-sm flex-shrink-0", avatarColor(selected.from))}>
                      {avatarChar(selected.from)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-semibold text-sm">{extractName(selected.from)}</span>
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {(() => {
                            try {
                              return new Date(s(selected.date)).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
                            } catch {
                              return s(selected.date);
                            }
                          })()}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        <span>{extractEmail(selected.from)}</span>
                        {s(selected.to) && (
                          <span className="ml-2">→ {s(selected.to).split(",").join(", ")}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="prose prose-sm dark:prose-invert max-w-none">
                  {renderBody(selected)}
                </div>

                {selected.labels.length > 0 && (
                  <div className="mt-6 flex flex-wrap gap-1.5">
                    {selected.labels
                      .map(l => s(l))
                      .filter(l => !["INBOX", "UNREAD"].includes(l))
                      .map(label => (
                        <Badge key={label} variant="secondary" className="text-[10px] h-4 px-1.5 font-normal">
                          {label.toLowerCase()}
                        </Badge>
                      ))}
                  </div>
                )}

                <div className="mt-8 border border-border/60 rounded-xl p-4 bg-muted/20">
                  <p className="text-xs text-muted-foreground mb-2 font-medium">Quick Reply</p>
                  <Textarea
                    placeholder={`Reply to ${extractName(selected.from)}…`}
                    className="min-h-[80px] text-sm resize-none bg-transparent border-0 p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                    value={composeData.to === extractEmail(selected.from) ? composeData.body : ""}
                    onChange={e => setComposeData({
                      to: extractEmail(selected.from),
                      subject: `Re: ${s(selected.subject)}`,
                      body: e.target.value,
                    })}
                  />
                  <div className="flex justify-end mt-2">
                    <Button
                      size="sm"
                      className="gap-1.5"
                      disabled={sending || !composeData.body.trim()}
                      onClick={sendEmail}
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

      {/* ── Compose modal ── */}
      <AnimatePresence>
        {composing && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            className="fixed bottom-4 right-4 w-[480px] bg-popover border border-border rounded-xl shadow-2xl z-50 overflow-hidden"
          >
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
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => { setComposing(false); setComposeData({ to: "", subject: "", body: "" }); }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
