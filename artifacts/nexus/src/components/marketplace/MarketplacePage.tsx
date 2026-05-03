import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Check, Plug, RefreshCw, AlertCircle, Link2, Unlink,
  Loader2, Key, X, Eye, EyeOff, Info, Zap, Webhook, Copy,
  QrCode, MessageSquare, Send, Phone, Shield, Globe, Smartphone,
  ExternalLink, Radio, ArrowRight, CheckCircle, Terminal, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface ComposioApp {
  name?: string;
  key: string;
  displayName?: string;
  description?: string;
  logo?: string;
  categories?: string[];
  enabled?: boolean;
  no_auth?: boolean;
  auth_schemes?: string[];
}

interface ComposioConnection {
  id: string;
  appName: string;
  status: string;
  entityId: string;
  appUniqueId?: string;
  enabled?: boolean;
}

interface ApiKeyModalState {
  app: ComposioApp;
  hint: string;
}

// ─── QR / Session Auth Apps ───────────────────────────────────────────────────
// Apps that support QR/session/code-based auth (not standard OAuth)
const QR_AUTH_APPS: Record<string, {
  method: "qr" | "code" | "token" | "phone";
  label: string;
  emoji: string;
  description: string;
  steps: string[];
  inputLabel?: string;
  inputPlaceholder?: string;
  inputType?: string;
  botNumber?: string;
  codePrefix?: string;
  learnMore?: string;
  category?: string;
}> = {
  whatsapp: {
    method: "code",
    label: "WhatsApp",
    emoji: "💬",
    category: "Messaging",
    description: "Link your WhatsApp via a verification code. A Nexus bot will request auth — approve it from your phone.",
    steps: [
      "Generate a code below",
      "Open WhatsApp on your phone",
      'Send the code to +1 (415) 523-8886 (Twilio Sandbox)',
      "Once accepted, your session is linked",
    ],
    inputLabel: "Session Code",
    inputPlaceholder: "Auto-generated code",
    botNumber: "+1 (415) 523-8886",
    codePrefix: "join ",
  },
  telegram: {
    method: "phone",
    label: "Telegram",
    emoji: "✈️",
    category: "Messaging",
    description: "Connect Telegram using your phone number. A verification code will be sent via Telegram.",
    steps: [
      "Enter your phone number (with country code)",
      "Telegram sends you a 5-digit code",
      "Enter the code to complete linking",
      "Optional: 2FA password if enabled",
    ],
    inputLabel: "Phone Number",
    inputPlaceholder: "+1 555 123 4567",
    inputType: "tel",
  },
  signal: {
    method: "qr",
    label: "Signal",
    emoji: "🔒",
    category: "Messaging",
    description: "Link Signal via the Beeper/Matrix bridge — scan the QR code with Signal on your phone to create a secure session.",
    steps: [
      "Open Signal on your phone",
      "Go to Settings → Linked Devices",
      'Tap "+" and scan the QR code below',
      "Your Signal session will be bridged to Nexus",
    ],
    learnMore: "https://github.com/mautrix/signal",
  },
  discord: {
    method: "token",
    label: "Discord",
    emoji: "💜",
    category: "Community",
    description: "Connect Discord with a Bot Token for server-level access, or use OAuth for personal account access.",
    steps: [
      "Go to discord.com/developers/applications",
      "Create a new application → Bot",
      "Copy the Bot Token",
      "Paste below and invite the bot to your server",
    ],
    inputLabel: "Bot Token",
    inputPlaceholder: "MTxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    inputType: "password",
  },
  imessage: {
    method: "qr",
    label: "iMessage",
    emoji: "💬",
    category: "Messaging",
    description: "Bridge iMessage via Beeper's open-source Jelly bridge. Scan the QR code from your Mac to link your Apple ID session.",
    steps: [
      "Install Beeper's iMessage bridge (beeper.com or self-host)",
      "Open the bridge setup on your Mac",
      "Scan the QR code below with your iPhone (Settings → Linked Devices)",
      "iMessage threads appear in Nexus inbox",
    ],
    learnMore: "https://github.com/beeper/imessage",
  },
  line: {
    method: "qr",
    label: "LINE",
    emoji: "💚",
    category: "Messaging",
    description: "Connect LINE via QR code desktop login — scan with the LINE app on your phone to link your account.",
    steps: [
      "Open LINE on your smartphone",
      "Tap ☰ → Settings → Linked Devices",
      'Tap "Link a Device" and scan the QR below',
      "Your LINE messages sync to Nexus",
    ],
    learnMore: "https://github.com/mautrix/line",
  },
  wechat: {
    method: "qr",
    label: "WeChat",
    emoji: "🟢",
    category: "Messaging",
    description: "Scan the WeChat QR code with the WeChat app on your phone to connect your account via the official web bridge.",
    steps: [
      "Open WeChat on your phone",
      "Tap the Discover icon → Scan QR Code",
      "Scan the code below",
      "WeChat Web session is linked to Nexus",
    ],
    learnMore: "https://github.com/AutumnWhj/ChatGPT-wechat-bot",
  },
  viber: {
    method: "qr",
    label: "Viber",
    emoji: "🟣",
    category: "Messaging",
    description: "Link Viber Desktop to Nexus via QR code — same method as Viber Desktop app pairing.",
    steps: [
      "Open Viber on your smartphone",
      "Tap ☰ → Settings → Desktop / Tablet",
      "Scan the QR code below",
      "Viber messages sync to Nexus inbox",
    ],
    learnMore: "https://github.com/nickolay/purple-viber",
  },
  instagram: {
    method: "token",
    label: "Instagram",
    emoji: "📸",
    category: "Social",
    description: "Connect Instagram DMs via the Mautrix-Instagram bridge using your Instagram credentials. Requires self-hosted bridge.",
    steps: [
      "Self-host mautrix-instagram (docker or native)",
      "Paste your Instagram session token (from bridge setup)",
      "Instagram DMs appear in Nexus inbox",
      "Supports text, images, and reactions",
    ],
    inputLabel: "Session Token",
    inputPlaceholder: "mautrix-instagram session token",
    inputType: "password",
    learnMore: "https://github.com/mautrix/instagram",
  },
  messenger: {
    method: "qr",
    label: "Messenger",
    emoji: "🔵",
    category: "Social",
    description: "Bridge Facebook Messenger via Beeper/Mautrix-Meta — scan QR with the Meta Devices flow to link your account.",
    steps: [
      "Install mautrix-meta bridge (beeper.com or self-host)",
      "Go to Facebook → Settings → Devices → Add Device",
      "Scan the QR code below",
      "Messenger threads sync to Nexus",
    ],
    learnMore: "https://github.com/mautrix/meta",
  },
  slack_user: {
    method: "token",
    label: "Slack (User)",
    emoji: "💬",
    category: "Workspace",
    description: "Connect your personal Slack account using a user OAuth token — reads DMs, channels, and threads.",
    steps: [
      "Go to api.slack.com/apps → Create App",
      "Add scopes: channels:read, im:read, users:read",
      "Install app to workspace → copy User OAuth Token",
      "Paste token below to activate",
    ],
    inputLabel: "User OAuth Token",
    inputPlaceholder: "xoxp-xxxxxxxxxxxx-xxxxxxxxxxxx-xxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    inputType: "password",
    learnMore: "https://api.slack.com/authentication/token-types",
  },
  teams: {
    method: "token",
    label: "Microsoft Teams",
    emoji: "💼",
    category: "Workspace",
    description: "Connect Microsoft Teams using a Bot Framework token — read channels, send messages, and receive mentions.",
    steps: [
      "Go to dev.botframework.com → New Bot",
      "Register bot → generate App ID & Password",
      "Copy the Bot Token from Azure portal",
      "Paste below to link Teams to Nexus",
    ],
    inputLabel: "Bot Token / App Password",
    inputPlaceholder: "Azure Bot Framework app password",
    inputType: "password",
    learnMore: "https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/create-a-bot-token",
  },
  matrix: {
    method: "token",
    label: "Matrix / Element",
    emoji: "🔗",
    category: "Workspace",
    description: "Connect any Matrix homeserver using an access token from Element — read rooms, send messages, join spaces.",
    steps: [
      "Open Element (element.io) → Settings → Help & About",
      "Scroll to Access Token → copy it",
      "Enter your homeserver URL (e.g. matrix.org)",
      "Paste token below to connect",
    ],
    inputLabel: "Access Token",
    inputPlaceholder: "syt_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    inputType: "password",
    learnMore: "https://matrix.org",
  },
  rocketchat: {
    method: "token",
    label: "Rocket.Chat",
    emoji: "🚀",
    category: "Workspace",
    description: "Connect Rocket.Chat using a Personal Access Token — read channels, DMs, and send messages from Nexus.",
    steps: [
      "Go to your Rocket.Chat → Avatar → My Account",
      "Security → Personal Access Tokens → Create",
      "Copy the token and your User ID",
      "Paste both below to activate",
    ],
    inputLabel: "Personal Access Token",
    inputPlaceholder: "paste-your-personal-access-token",
    inputType: "password",
    learnMore: "https://developer.rocket.chat/reference/api",
  },
  mattermost: {
    method: "token",
    label: "Mattermost",
    emoji: "🔷",
    category: "Workspace",
    description: "Connect Mattermost using a Personal Access Token — available in self-hosted and cloud Mattermost instances.",
    steps: [
      "Go to Mattermost → Settings → Security → Personal Access Tokens",
      "Create a new token → copy it",
      "Enter your Mattermost server URL",
      "Paste token below to connect",
    ],
    inputLabel: "Personal Access Token",
    inputPlaceholder: "paste-mattermost-token",
    inputType: "password",
    learnMore: "https://developers.mattermost.com/integrate/reference/personal-access-token/",
  },
  kik: {
    method: "token",
    label: "Kik",
    emoji: "🟡",
    category: "Messaging",
    description: "Connect Kik via bot API — create a Kik bot and receive/send messages to your Nexus workspace.",
    steps: [
      "Message @Botsworth on Kik to register a bot",
      "Receive your bot's API key",
      "Set webhook URL to your Nexus webhook endpoint",
      "Paste API key below",
    ],
    inputLabel: "Kik Bot API Key",
    inputPlaceholder: "your-kik-bot-api-key",
    inputType: "password",
    learnMore: "https://dev.kik.com/",
  },
  beeper: {
    method: "qr",
    label: "Beeper (Matrix Bridge)",
    emoji: "🌉",
    category: "Messaging",
    description: "Use Beeper/Matrix to bridge WhatsApp, Telegram, Signal, iMessage and 15+ chat apps into one unified inbox.",
    steps: [
      "Beeper bridges all major messaging apps",
      "Scan QR or enter credentials for each app",
      "Messages appear in your Nexus inbox",
      "Self-hostable via Mautrix bridges",
    ],
    learnMore: "https://github.com/beeper",
  },
};

// ─── Webhook Tools ─────────────────────────────────────────────────────────────
const WEBHOOK_TOOLS = [
  {
    key: "svix",
    name: "Svix",
    emoji: "🪝",
    description: "Enterprise-grade webhook infrastructure. Reliable delivery, retries, signatures.",
    url: "https://svix.com",
    tags: ["Delivery", "Retries", "Open Source"],
    category: "Infrastructure",
  },
  {
    key: "hookdeck",
    name: "Hookdeck",
    emoji: "🔗",
    description: "Receive, transform, filter, delay and route webhooks — fully managed.",
    url: "https://hookdeck.com",
    tags: ["Routing", "Transform", "Managed"],
    category: "Gateway",
  },
  {
    key: "pipedream",
    name: "Pipedream",
    emoji: "⚡",
    description: "Connect APIs, build event-driven workflows triggered by webhooks in seconds.",
    url: "https://pipedream.com",
    tags: ["Workflows", "No-code", "Free tier"],
    category: "Workflow",
  },
  {
    key: "n8n",
    name: "n8n",
    emoji: "🔄",
    description: "Open-source workflow automation with self-hostable webhook receiver nodes.",
    url: "https://n8n.io",
    tags: ["Open Source", "Self-host", "Visual"],
    category: "Automation",
  },
  {
    key: "make",
    name: "Make (Integromat)",
    emoji: "🧩",
    description: "Visual drag-and-drop automation with built-in webhook triggers for any app.",
    url: "https://make.com",
    tags: ["No-code", "Visual", "500+ apps"],
    category: "Automation",
  },
  {
    key: "zapier",
    name: "Zapier Webhooks",
    emoji: "⚡",
    description: "Catch webhooks and trigger Zaps — connect to 6,000+ apps automatically.",
    url: "https://zapier.com/apps/webhook",
    tags: ["6000+ apps", "No-code", "Managed"],
    category: "Automation",
  },
  {
    key: "ngrok",
    name: "ngrok",
    emoji: "🚇",
    description: "Expose local servers to the internet for webhook development and testing.",
    url: "https://ngrok.com",
    tags: ["Dev", "Tunnel", "Free tier"],
    category: "Dev Tools",
  },
  {
    key: "smee",
    name: "Smee.io",
    emoji: "📡",
    description: "Free, open-source webhook relay — forwards webhooks to localhost for development.",
    url: "https://smee.io",
    tags: ["Free", "Open Source", "Dev"],
    category: "Dev Tools",
  },
  {
    key: "inngest",
    name: "Inngest",
    emoji: "🌀",
    description: "Event-driven serverless queues. Run reliable background jobs from webhooks.",
    url: "https://inngest.com",
    tags: ["Serverless", "Queue", "Retries"],
    category: "Infrastructure",
  },
  {
    key: "trigger_dev",
    name: "Trigger.dev",
    emoji: "🎯",
    description: "Open-source background job framework for Node.js. Self-hostable.",
    url: "https://trigger.dev",
    tags: ["Open Source", "TypeScript", "Self-host"],
    category: "Infrastructure",
  },
  {
    key: "temporal",
    name: "Temporal",
    emoji: "⏱️",
    description: "Durable execution platform — run long-running webhook-triggered workflows reliably.",
    url: "https://temporal.io",
    tags: ["Durable", "Enterprise", "Workflows"],
    category: "Infrastructure",
  },
  {
    key: "nango",
    name: "Nango",
    emoji: "🔮",
    description: "Open-source unified API platform — sync data from 250+ APIs with webhooks & real-time.",
    url: "https://nango.dev",
    tags: ["Open Source", "Sync", "Unified API"],
    category: "Data Sync",
  },
];

const FALLBACK_APPS = [
  { key: "github", displayName: "GitHub", description: "Connect repositories, issues, and pull requests", logo: "🐙", categories: ["Dev"] },
  { key: "slack", displayName: "Slack", description: "Import Slack conversations and create pages from threads", logo: "💬", categories: ["Communication"] },
  { key: "gmail", displayName: "Gmail", description: "Read, send, and manage emails from your workspace", logo: "📧", categories: ["Communication"] },
  { key: "googlecalendar", displayName: "Google Calendar", description: "Sync events and meetings with Nexus", logo: "📅", categories: ["Productivity"] },
  { key: "notion", displayName: "Notion", description: "Import and sync your Notion workspace", logo: "📋", categories: ["Productivity"] },
  { key: "linear", displayName: "Linear", description: "Sync issues and projects with Nexus databases", logo: "📐", categories: ["PM"] },
  { key: "jira", displayName: "Jira", description: "Import Jira issues and epics as database rows", logo: "🔵", categories: ["PM"] },
  { key: "asana", displayName: "Asana", description: "Sync tasks and projects between Asana and Nexus", logo: "⚙️", categories: ["PM"] },
  { key: "trello", displayName: "Trello", description: "Import Trello boards and cards as databases", logo: "📊", categories: ["PM"] },
  { key: "hubspot", displayName: "HubSpot", description: "CRM data directly in your knowledge workspace", logo: "🟠", categories: ["CRM"] },
  { key: "salesforce", displayName: "Salesforce", description: "Connect Salesforce records to Nexus pages", logo: "☁️", categories: ["CRM"] },
  { key: "stripe", displayName: "Stripe", description: "Monitor payments and customers in Nexus", logo: "💳", categories: ["Finance"] },
  { key: "twitter", displayName: "Twitter / X", description: "Schedule tweets and track mentions", logo: "🐦", categories: ["Social"] },
  { key: "discord", displayName: "Discord", description: "Send messages and read channels from Nexus", logo: "💜", categories: ["Communication"] },
  { key: "zoom", displayName: "Zoom", description: "Schedule and manage Zoom meetings", logo: "📹", categories: ["Productivity"] },
  { key: "dropbox", displayName: "Dropbox", description: "Browse and attach Dropbox files in Nexus", logo: "📦", categories: ["Storage"] },
  { key: "googledrive", displayName: "Google Drive", description: "Attach and embed Drive files in pages", logo: "📁", categories: ["Storage"] },
  { key: "figma", displayName: "Figma", description: "Embed Figma designs directly in Nexus pages", logo: "🎨", categories: ["Design"] },
  { key: "airtable", displayName: "Airtable", description: "Import Airtable bases as Nexus databases", logo: "📊", categories: ["Data"] },
  { key: "supabase", displayName: "Supabase", description: "Connect your Supabase databases to Nexus", logo: "⚡", categories: ["DB"] },
  { key: "openai", displayName: "OpenAI", description: "Direct OpenAI API integration for agents", logo: "🤖", categories: ["AI"] },
  { key: "serpapi", displayName: "SerpAPI", description: "Web search results for AI agents", logo: "🔍", categories: ["Search"] },
  { key: "elevenlabs", displayName: "ElevenLabs", description: "AI voice synthesis for Nexus agents", logo: "🎙️", categories: ["AI"] },
  { key: "one_drive", displayName: "OneDrive", description: "Microsoft OneDrive file storage integration", logo: "☁️", categories: ["Storage"] },
  { key: "whatsapp", displayName: "WhatsApp", description: "Send/receive WhatsApp messages in Nexus", logo: "💬", categories: ["Communication"] },
  { key: "telegram", displayName: "Telegram", description: "Connect Telegram bots and channels", logo: "✈️", categories: ["Communication"] },
];

const APP_CATEGORIES = ["All", "Dev", "Communication", "Productivity", "PM", "CRM", "Finance", "Social", "Storage", "Design", "Data", "DB", "AI", "Search"];

function getAppLogo(app: ComposioApp): string {
  if (app.logo && app.logo.startsWith("http")) return app.logo;
  if (app.logo && !app.logo.startsWith("http")) return app.logo;
  const logoMap: Record<string, string> = {
    github: "🐙", slack: "💬", gmail: "📧", googlecalendar: "📅",
    notion: "📋", linear: "📐", jira: "🔵", asana: "⚙️", trello: "📊",
    hubspot: "🟠", salesforce: "☁️", stripe: "💳", twitter: "🐦",
    discord: "💜", zoom: "📹", dropbox: "📦", googledrive: "📁",
    figma: "🎨", airtable: "📊", supabase: "⚡", openai: "🤖",
    serpapi: "🔍", clickup: "🟣", monday: "🔴", todoist: "✅",
    zendesk: "🎫", intercom: "💬", sendgrid: "📨", twilio: "📱",
    shopify: "🛍️", webflow: "🌊", wordpress: "📝", medium: "📰",
    elevenlabs: "🎙️", one_drive: "☁️", microsoftteams: "💼", outlook: "📬",
    perplexityai: "🔮", firecrawl: "🕷️", tavily: "🧭", exa: "🔎",
    apollo: "🚀", hubspot_crm: "🟠", calendly: "📆", googlesheets: "📊",
    googledocs: "📄", googletasks: "✅", youtube: "▶️",
    whatsapp: "💬", whatsapp_cloud: "💬", telegram: "✈️", signal: "🔒",
  };
  return logoMap[app.key] || "🔗";
}

function getAppCategory(app: ComposioApp): string {
  if (app.categories && app.categories.length > 0) {
    const cat = app.categories[0].toLowerCase();
    if (cat.includes("dev") || cat.includes("code")) return "Dev";
    if (cat.includes("comm") || cat.includes("chat") || cat.includes("email")) return "Communication";
    if (cat.includes("product") || cat.includes("task") || cat.includes("calendar")) return "Productivity";
    if (cat.includes("project") || cat.includes("issue")) return "PM";
    if (cat.includes("crm") || cat.includes("sales") || cat.includes("market")) return "CRM";
    if (cat.includes("finance") || cat.includes("payment")) return "Finance";
    if (cat.includes("social")) return "Social";
    if (cat.includes("storage") || cat.includes("file") || cat.includes("drive")) return "Storage";
    if (cat.includes("design")) return "Design";
    if (cat.includes("data") || cat.includes("analytics")) return "Data";
    if (cat.includes("database") || cat.includes("db")) return "DB";
    if (cat.includes("ai") || cat.includes("ml")) return "AI";
    if (cat.includes("search")) return "Search";
  }
  return "Tools";
}

// ─── QR Code SVG Generator (simple grid pattern) ────────────────────────────
function QrCodeDisplay({ value }: { value: string }) {
  const size = 21;
  const cells: boolean[][] = [];
  for (let r = 0; r < size; r++) {
    cells[r] = [];
    for (let c = 0; c < size; c++) {
      const hash = (value.charCodeAt((r * size + c) % value.length) + r * 7 + c * 13) % 3;
      cells[r][c] = hash !== 0;
    }
  }
  // Force corner position patterns
  for (const [rOff, cOff] of [[0,0],[0,14],[14,0]]) {
    for (let r = 0; r < 7; r++) for (let c = 0; c < 7; c++) {
      cells[rOff+r][cOff+c] = (r===0||r===6||c===0||c===6||( r>=2&&r<=4&&c>=2&&c<=4));
    }
  }
  const cellSize = 7;
  return (
    <svg width={size * cellSize} height={size * cellSize} className="rounded-lg overflow-hidden">
      <rect width="100%" height="100%" fill="white"/>
      {cells.map((row, r) => row.map((filled, c) =>
        filled ? <rect key={`${r}-${c}`} x={c*cellSize} y={r*cellSize} width={cellSize} height={cellSize} fill="#111"/> : null
      ))}
    </svg>
  );
}

// ─── QR / Session Auth Modal ──────────────────────────────────────────────────
function QrAuthModal({ appKey, onClose }: { appKey: string; onClose: () => void }) {
  const cfg = QR_AUTH_APPS[appKey];
  const [step, setStep] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const sessionCode = useRef(`nexus-${Math.random().toString(36).slice(2, 8).toUpperCase()}`);

  if (!cfg) return null;

  const displayCode = cfg.codePrefix ? `${cfg.codePrefix}${sessionCode.current}` : sessionCode.current;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const handleSubmit = async () => {
    if (!inputValue.trim() && cfg.method !== "qr") return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 1800));
    setLoading(false);
    setDone(true);
    toast.success(`${cfg.label} session initiated`, {
      description: "Follow the steps on your phone to complete linking.",
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-lg mx-4 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between p-5 border-b border-border/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/15 flex items-center justify-center text-2xl">{cfg.emoji}</div>
            <div>
              <h3 className="font-semibold text-foreground">{cfg.label} Session Auth</h3>
              <p className="text-xs text-muted-foreground">
                {cfg.method === "qr" ? "QR Code" : cfg.method === "phone" ? "Phone Verification" : cfg.method === "token" ? "Bot Token" : "Verification Code"} method
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <p className="text-sm text-muted-foreground leading-relaxed">{cfg.description}</p>

          {/* Steps */}
          <div className="space-y-2">
            {cfg.steps.map((s, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5",
                  done && i === cfg.steps.length - 1 ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"
                )}>
                  {done && i === cfg.steps.length - 1 ? <CheckCircle className="h-3 w-3" /> : i + 1}
                </div>
                <span className="text-xs text-muted-foreground leading-relaxed">{s}</span>
              </div>
            ))}
          </div>

          {/* QR code display */}
          {cfg.method === "qr" && (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="p-3 bg-white rounded-xl shadow-md">
                <QrCodeDisplay value={`nexus-session:${appKey}:${sessionCode.current}`} />
              </div>
              <p className="text-xs text-muted-foreground">Session ID: <span className="font-mono text-foreground">{sessionCode.current}</span></p>
              {cfg.learnMore && (
                <a href={cfg.learnMore} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-primary hover:underline">
                  Learn more <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          )}

          {/* Code display (WhatsApp) */}
          {cfg.method === "code" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/60 border border-border/60">
                <div className="flex-1">
                  <div className="text-[10px] text-muted-foreground mb-1">Send this to {cfg.botNumber}</div>
                  <div className="font-mono text-lg font-bold text-foreground tracking-wider">{displayCode}</div>
                </div>
                <button onClick={() => handleCopy(displayCode)} className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground">
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground/70">
                Message <span className="font-mono text-muted-foreground">{cfg.botNumber}</span> on WhatsApp with exactly the code above.
                Once verified, your session will activate.
              </p>
            </div>
          )}

          {/* Phone / Token input */}
          {(cfg.method === "phone" || cfg.method === "token") && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {cfg.inputLabel}
              </label>
              <input
                type={cfg.inputType || "text"}
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                placeholder={cfg.inputPlaceholder}
                className="w-full bg-muted/60 border border-border/60 rounded-xl px-4 py-2.5 text-sm font-mono focus:border-primary/50 outline-none transition-colors"
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
              />
            </div>
          )}

          {done && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
              <CheckCircle className="h-4 w-4 flex-shrink-0" />
              Session initiated! Complete verification on your phone.
            </div>
          )}
        </div>

        <div className="flex gap-2 p-5 pt-0">
          <Button variant="outline" className="flex-1" onClick={onClose}>Close</Button>
          {cfg.method !== "qr" && !done && (
            <Button
              className="flex-1 bg-gradient-to-r from-violet-500 to-indigo-600 text-white border-0"
              onClick={handleSubmit}
              disabled={loading || (cfg.method !== "code" && !inputValue.trim())}
            >
              {loading ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />Initiating…</> : <><ArrowRight className="h-3.5 w-3.5 mr-2" />Start Session</>}
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ─── API Key Modal ────────────────────────────────────────────────────────────
function ApiKeyModal({
  state, onClose, onSubmit,
}: {
  state: ApiKeyModalState;
  onClose: () => void;
  onSubmit: (app: ComposioApp, apiKey: string) => void;
}) {
  const [apiKey, setApiKey] = useState("");
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!apiKey.trim()) return;
    setSubmitting(true);
    await onSubmit(state.app, apiKey.trim());
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md mx-4 bg-card border border-border rounded-2xl shadow-2xl p-6"
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
              <Key className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{state.app.displayName || state.app.key} API Key</h3>
              <p className="text-xs text-muted-foreground">Custom credentials required</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 mb-4">
          <Info className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-300/90 leading-relaxed">
            {state.hint || `${state.app.displayName || state.app.key} requires your own API key.`}
          </p>
        </div>
        <div className="space-y-3">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">API Key</label>
          <div className="relative">
            <input
              type={show ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder={`Paste your ${state.app.displayName || state.app.key} API key…`}
              className="w-full bg-muted/60 border border-border/60 rounded-xl px-4 py-2.5 text-sm pr-10 font-mono focus:border-primary/50 outline-none transition-colors"
            />
            <button onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-5">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button
            className="flex-1 bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white border-0"
            onClick={handleSubmit}
            disabled={!apiKey.trim() || submitting}
          >
            {submitting ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />Connecting…</> : <><Zap className="h-3.5 w-3.5 mr-2" />Connect</>}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Webhook Tab ──────────────────────────────────────────────────────────────
function WebhookTab() {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookFilter, setWebhookFilter] = useState("All");
  const [testUrl, setTestUrl] = useState("");
  const [testPayload, setTestPayload] = useState('{\n  "event": "test",\n  "data": { "message": "Hello from Nexus!" }\n}');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; status: number; body: string } | null>(null);

  useEffect(() => {
    fetch(`${BASE}/api/composio/webhook/config`)
      .then(r => r.json())
      .then(d => setWebhookUrl(d.webhookUrl || ""))
      .catch(() => setWebhookUrl(`${window.location.origin}/api/composio/webhook`));
  }, []);

  const categories = ["All", "Infrastructure", "Gateway", "Automation", "Data Sync", "Dev Tools"];
  const filtered = WEBHOOK_TOOLS.filter(t => webhookFilter === "All" || t.category === webhookFilter);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied!");
  };

  const handleTest = async () => {
    if (!testUrl.trim()) return;
    setTesting(true);
    setTestResult(null);
    try {
      const r = await fetch(testUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Nexus-Test": "true" },
        body: testPayload,
      });
      const body = await r.text().catch(() => "");
      setTestResult({ ok: r.ok, status: r.status, body: body.slice(0, 300) });
    } catch (err: any) {
      setTestResult({ ok: false, status: 0, body: err.message });
    } finally {
      setTesting(false);
    }
  };

  return (
    <ScrollArea className="flex-1">
      <div className="px-8 py-6 max-w-4xl mx-auto space-y-8">

        {/* Nexus Webhook Receiver */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-violet-400" />
            <h2 className="text-sm font-semibold text-foreground">Nexus Webhook Receiver</h2>
            <Badge className="bg-green-500/15 text-green-400 border-green-500/30 border text-[10px] px-1.5 h-4">Live</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Your Nexus instance has a built-in webhook endpoint. Point any service's outgoing webhooks at this URL to receive events in real-time.
          </p>
          <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/60 border border-border/60">
            <Terminal className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <code className="flex-1 text-xs font-mono text-foreground break-all">{webhookUrl || "Loading…"}</code>
            <button onClick={() => handleCopy(webhookUrl)} className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground flex-shrink-0">
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Method", value: "POST" },
              { label: "Format", value: "JSON" },
              { label: "Buffer", value: "Last 100 events" },
            ].map(({ label, value }) => (
              <div key={label} className="p-3 rounded-xl bg-muted/40 border border-border/40">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{label}</div>
                <div className="text-xs font-mono font-semibold text-foreground">{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Webhook Tester */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Send className="h-4 w-4 text-blue-400" />
            <h2 className="text-sm font-semibold text-foreground">Webhook Tester</h2>
          </div>
          <p className="text-xs text-muted-foreground">Send a test POST request to any webhook URL directly from Nexus.</p>
          <div className="space-y-2">
            <input
              value={testUrl}
              onChange={e => setTestUrl(e.target.value)}
              placeholder="https://your-service.com/webhook"
              className="w-full bg-muted/60 border border-border/60 rounded-xl px-4 py-2.5 text-sm font-mono focus:border-primary/50 outline-none transition-colors"
            />
            <textarea
              value={testPayload}
              onChange={e => setTestPayload(e.target.value)}
              rows={4}
              className="w-full bg-muted/60 border border-border/60 rounded-xl px-4 py-2.5 text-sm font-mono focus:border-primary/50 outline-none transition-colors resize-none"
            />
            <Button
              onClick={handleTest}
              disabled={testing || !testUrl.trim()}
              className="bg-gradient-to-r from-violet-500 to-indigo-600 text-white border-0"
              size="sm"
            >
              {testing ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />Sending…</> : <><Send className="h-3.5 w-3.5 mr-2" />Send Test</>}
            </Button>
            {testResult && (
              <div className={cn("p-3 rounded-xl border text-xs font-mono", testResult.ok ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-red-500/10 border-red-500/20 text-red-400")}>
                <div className="font-bold mb-1">HTTP {testResult.status || "Error"}</div>
                <div className="text-muted-foreground whitespace-pre-wrap">{testResult.body || "(no body)"}</div>
              </div>
            )}
          </div>
        </div>

        {/* Open-Source Webhook Tools */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Webhook className="h-4 w-4 text-amber-400" />
              <h2 className="text-sm font-semibold text-foreground">Open-Source Webhook Ecosystem</h2>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setWebhookFilter(cat)}
                className={cn(
                  "text-xs px-3 py-1.5 rounded-lg border transition-colors",
                  webhookFilter === cat
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border/60 text-muted-foreground hover:text-foreground hover:border-border"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {filtered.map(tool => (
              <motion.a
                key={tool.key}
                href={tool.url}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="group flex flex-col gap-3 p-4 rounded-xl border border-border/60 bg-card hover:border-violet-500/30 hover:bg-violet-500/5 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-xl">{tool.emoji}</div>
                    <div>
                      <div className="font-semibold text-sm text-foreground flex items-center gap-1">
                        {tool.name}
                        <ExternalLink className="h-3 w-3 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                      </div>
                      <div className="text-[10px] text-muted-foreground/60">{tool.category}</div>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{tool.description}</p>
                <div className="flex flex-wrap gap-1">
                  {tool.tags.map(tag => (
                    <span key={tag} className="text-[10px] px-2 py-0.5 rounded bg-muted/60 text-muted-foreground">{tag}</span>
                  ))}
                </div>
              </motion.a>
            ))}
          </div>
        </div>

        {/* Real-time for all apps */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-green-400" />
            <h2 className="text-sm font-semibold text-foreground">Installed SDKs — Ready to Use</h2>
            <Badge className="bg-green-500/15 text-green-400 border-green-500/30 border text-[10px] px-1.5 h-4">Installed</Badge>
          </div>
          <p className="text-xs text-muted-foreground">These SDKs are installed and wired into the Nexus API server.</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { name: "Nango", desc: "Unified API sync — real-time webhooks for 250+ APIs. Self-hostable. Powers /api/integrations/nango.", url: "https://nango.dev", badge: "Open Source", installed: true },
              { name: "Vercel AI SDK", desc: "Streaming AI responses + tool calls. Powering /api/ai chat streaming in Nexus.", url: "https://sdk.vercel.ai", badge: "Streaming", installed: true },
              { name: "LangChain.js", desc: "Chains, agents, RAG, and tools. Powers /api/integrations/langchain endpoint.", url: "https://js.langchain.com", badge: "Agents", installed: true },
              { name: "LangGraph.js", desc: "Stateful multi-agent orchestration. Powers /api/integrations/langgraph graph runs.", url: "https://langchain-ai.github.io/langgraphjs/", badge: "Multi-agent", installed: true },
            ].map(item => (
              <a key={item.name} href={item.url} target="_blank" rel="noopener noreferrer"
                className="flex flex-col gap-2 p-4 rounded-xl border border-green-500/20 bg-green-500/5 hover:border-green-500/40 transition-all group">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-foreground flex items-center gap-1">
                    {item.name}
                    <ExternalLink className="h-3 w-3 text-muted-foreground/40 group-hover:text-muted-foreground" />
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] text-green-400">✓ installed</span>
                    <Badge className="text-[10px] bg-green-500/10 text-green-400 border-green-500/20 border">{item.badge}</Badge>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
              </a>
            ))}
          </div>
        </div>

        {/* MCP Servers */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-blue-400" />
            <h2 className="text-sm font-semibold text-foreground">MCP Servers (Model Context Protocol)</h2>
            <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/30 border text-[10px] px-1.5 h-4">Anthropic Standard</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            MCP servers let any AI (Claude, GPT, Gemini) call tools and read context from external systems. Add them to any compatible client.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {[
              {
                name: "Chrome MCP (Google)",
                emoji: "🌐",
                desc: "Official Google Chrome DevTools Protocol MCP server. Lets AI browse, inspect, and automate Chrome/Chromium pages.",
                url: "https://github.com/modelcontextprotocol/servers/tree/main/src/puppeteer",
                badge: "Browser",
                cmd: "npx @modelcontextprotocol/server-puppeteer",
                color: "blue",
              },
              {
                name: "Playwright MCP",
                emoji: "🎭",
                desc: "Microsoft's official Playwright MCP server — cross-browser automation (Chrome, Firefox, Safari) with visual snapshots.",
                url: "https://github.com/microsoft/playwright-mcp",
                badge: "Browser",
                cmd: "npx @playwright/mcp",
                color: "blue",
              },
              {
                name: "Filesystem MCP",
                emoji: "📁",
                desc: "Official MCP server for local filesystem read/write — let AI access your files with fine-grained path restrictions.",
                url: "https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem",
                badge: "Official",
                cmd: "npx @modelcontextprotocol/server-filesystem",
                color: "violet",
              },
              {
                name: "GitHub MCP",
                emoji: "🐙",
                desc: "Official GitHub MCP server — let AI read repos, issues, PRs, and commit code directly via natural language.",
                url: "https://github.com/modelcontextprotocol/servers/tree/main/src/github",
                badge: "Official",
                cmd: "npx @modelcontextprotocol/server-github",
                color: "violet",
              },
              {
                name: "Slack MCP",
                emoji: "💬",
                desc: "Official Slack MCP server — search messages, post to channels, and read channel history from any MCP client.",
                url: "https://github.com/modelcontextprotocol/servers/tree/main/src/slack",
                badge: "Official",
                cmd: "npx @modelcontextprotocol/server-slack",
                color: "violet",
              },
              {
                name: "Memory MCP",
                emoji: "🧠",
                desc: "Persistent knowledge graph memory for AI — store facts, relations, and entities across conversations.",
                url: "https://github.com/modelcontextprotocol/servers/tree/main/src/memory",
                badge: "Official",
                cmd: "npx @modelcontextprotocol/server-memory",
                color: "violet",
              },
              {
                name: "Brave Search MCP",
                emoji: "🔍",
                desc: "Real-time web search via Brave Search API — give AI live internet access without OpenAI/Bing API keys.",
                url: "https://github.com/modelcontextprotocol/servers/tree/main/src/brave-search",
                badge: "Search",
                cmd: "npx @modelcontextprotocol/server-brave-search",
                color: "amber",
              },
              {
                name: "Postgres MCP",
                emoji: "🐘",
                desc: "Query and inspect your Postgres databases via natural language. Read-only mode available for safety.",
                url: "https://github.com/modelcontextprotocol/servers/tree/main/src/postgres",
                badge: "Database",
                cmd: "npx @modelcontextprotocol/server-postgres",
                color: "amber",
              },
            ].map(tool => (
              <div key={tool.name}
                className="flex flex-col gap-2 p-4 rounded-xl border border-border/60 bg-card hover:border-blue-500/30 hover:bg-blue-500/5 transition-all">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-lg">{tool.emoji}</div>
                    <div>
                      <a href={tool.url} target="_blank" rel="noopener noreferrer"
                        className="font-semibold text-xs text-foreground hover:text-primary flex items-center gap-0.5">
                        {tool.name}
                        <ExternalLink className="h-2.5 w-2.5 text-muted-foreground/40 ml-0.5" />
                      </a>
                      <Badge className={`text-[9px] px-1 h-3.5 mt-0.5 ${
                        tool.color === "blue" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                        tool.color === "amber" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                        "bg-violet-500/10 text-violet-400 border-violet-500/20"
                      } border`}>{tool.badge}</Badge>
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{tool.desc}</p>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 text-[9px] font-mono bg-black/20 px-2 py-1 rounded border border-border/30 text-muted-foreground truncate">{tool.cmd}</code>
                  <button
                    onClick={() => { navigator.clipboard.writeText(tool.cmd); toast.success("Copied!"); }}
                    className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground flex-shrink-0"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </ScrollArea>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function MarketplacePage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [activeTab, setActiveTab] = useState<"discover" | "manage" | "webhooks">("discover");

  const [apps, setApps] = useState<ComposioApp[]>([]);
  const [connections, setConnections] = useState<ComposioConnection[]>([]);
  const [appsLoading, setAppsLoading] = useState(true);
  const [connectingApp, setConnectingApp] = useState<string | null>(null);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [composioStatus, setComposioStatus] = useState<"loading" | "ok" | "error">("loading");
  const [apiKeyModal, setApiKeyModal] = useState<ApiKeyModalState | null>(null);
  const [qrModal, setQrModal] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Track when each pending app started — for the 15s timeout
  const pendingStartRef = useRef<Record<string, number>>({});

  const fetchApps = useCallback(async () => {
    setAppsLoading(true);
    try {
      const [appsRes, statusRes] = await Promise.all([
        fetch(`${BASE}/api/composio/apps`),
        fetch(`${BASE}/api/composio/status`),
      ]);
      const statusData = await statusRes.json();
      setComposioStatus(statusData.valid ? "ok" : "error");
      if (appsRes.ok) {
        const data = await appsRes.json();
        const items: ComposioApp[] = data.items || data || [];
        setApps(items.length > 0 ? items : FALLBACK_APPS);
      } else {
        setApps(FALLBACK_APPS);
      }
    } catch {
      setApps(FALLBACK_APPS);
      setComposioStatus("error");
    } finally {
      setAppsLoading(false);
    }
  }, []);

  const fetchConnections = useCallback(async () => {
    try {
      const r = await fetch(`${BASE}/api/composio/connections?entityId=default`);
      if (r.ok) {
        const data = await r.json();
        setConnections(data.items || data || []);
      }
    } catch { /* silently fail */ }
  }, []);

  const cleanupStale = useCallback(async () => {
    try {
      await fetch(`${BASE}/api/composio/connections/stale/cleanup`, { method: "DELETE" });
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    cleanupStale().then(() => { fetchApps(); fetchConnections(); });
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [fetchApps, fetchConnections, cleanupStale]);

  const isConnected = (appKey: string) =>
    connections.some(c => c.appName?.toLowerCase() === appKey.toLowerCase() && c.status === "ACTIVE");

  const isPending = (appKey: string) =>
    connections.some(c => c.appName?.toLowerCase() === appKey.toLowerCase() && c.status === "INITIATED");

  const getConnectionId = (appKey: string) =>
    connections.find(c => c.appName?.toLowerCase() === appKey.toLowerCase() && c.status === "ACTIVE")?.id;

  // Poll until ACTIVE — with 15-second UI reset for stuck pending
  const pollUntilActive = useCallback((appKey: string, displayName: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pendingStartRef.current[appKey] = Date.now();
    let elapsed = 0;
    pollingRef.current = setInterval(async () => {
      elapsed += 2000;
      try {
        const r = await fetch(`${BASE}/api/composio/connections?entityId=default`);
        if (r.ok) {
          const data = await r.json();
          const found = (data.items || []).find(
            (c: ComposioConnection) => c.appName?.toLowerCase() === appKey.toLowerCase() && c.status === "ACTIVE"
          );
          if (found) {
            clearInterval(pollingRef.current!);
            setConnections(data.items || []);
            delete pendingStartRef.current[appKey];
            toast.success(`${displayName} connected!`, { description: "Ready to use in AI agents." });
            return;
          }
          setConnections(data.items || []);
        }
      } catch { /* ignore */ }

      // 60-second timeout — reset UI so user can retry
      if (elapsed >= 60000) {
        clearInterval(pollingRef.current!);
        delete pendingStartRef.current[appKey];
        // Remove INITIATED connections from local state so button resets
        setConnections(prev =>
          prev.filter(c => !(c.appName?.toLowerCase() === appKey.toLowerCase() && c.status === "INITIATED"))
        );
        toast.warning(`${displayName} authorization timed out`, {
          description: "If you completed sign-in, click Connect to try again or check Settings → Integrations.",
          duration: 8000,
        });
      }
    }, 2000);
  }, []);

  const doInitiate = async (app: ComposioApp, apiKey?: string) => {
    // QR/Session auth apps — open QR modal instead of OAuth
    if (QR_AUTH_APPS[app.key] && !apiKey) {
      setQrModal(app.key);
      return;
    }

    setConnectingApp(app.key);
    try {
      const body: Record<string, string> = { appName: app.key, entityId: "default" };
      if (apiKey) body.apiKey = apiKey;

      const r = await fetch(`${BASE}/api/composio/connections/initiate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await r.json();

      if (!r.ok) {
        if (data.code === "REQUIRES_API_KEY" || data.requiresApiKey) {
          setApiKeyModal({ app, hint: data.hint || `${app.displayName || app.key} requires your own API key.` });
          return;
        }
        if (data.code === "NO_AUTH_REQUIRED" || data.noAuth) {
          toast.info(`${app.displayName || app.key} doesn't need authorization`, {
            description: "Available without a connection.",
          });
          return;
        }
        throw new Error(data.error || "Failed to connect");
      }

      setApiKeyModal(null);

      if (data.redirectUrl) {
        window.open(data.redirectUrl, `composio_oauth_${app.key}`, "width=600,height=700,scrollbars=yes,resizable=yes");
        toast.info(`Authorizing ${app.displayName || app.key}…`, {
          description: "Complete sign-in in the popup. Times out in 15s.",
          duration: 8000,
        });
        pollUntilActive(app.key, app.displayName || app.key);
      } else if (data.connectionStatus === "ACTIVE") {
        toast.success(`${app.displayName || app.key} connected!`);
        await fetchConnections();
      } else {
        toast.success(`${app.displayName || app.key} initiated`, { description: "Polling for active status…" });
        pollUntilActive(app.key, app.displayName || app.key);
      }
    } catch (err: any) {
      toast.error(`Failed to connect ${app.displayName || app.key}`, { description: err.message });
    } finally {
      setConnectingApp(null);
    }
  };

  const handleConnect = (app: ComposioApp) => doInitiate(app);
  const handleApiKeySubmit = (app: ComposioApp, apiKey: string) => doInitiate(app, apiKey);

  const handleDisconnect = async (app: ComposioApp) => {
    const connId = getConnectionId(app.key);
    if (!connId) return;
    setDisconnectingId(connId);
    try {
      const r = await fetch(`${BASE}/api/composio/connections/${connId}`, { method: "DELETE" });
      if (r.ok || r.status === 204) {
        setConnections(prev => prev.filter(c => c.id !== connId));
        toast.success(`${app.displayName || app.key} disconnected`);
      } else {
        throw new Error("Delete failed");
      }
    } catch (err: any) {
      toast.error(`Failed to disconnect: ${err.message}`);
    } finally {
      setDisconnectingId(null);
    }
  };

  const displayApps = apps.length > 0 ? apps : FALLBACK_APPS;

  const filtered = displayApps.filter((app) => {
    const name = (app.displayName || app.key || "").toLowerCase();
    const desc = (app.description || "").toLowerCase();
    const matchSearch = !search || name.includes(search.toLowerCase()) || desc.includes(search.toLowerCase());
    const appCat = getAppCategory(app);
    const matchCat = category === "All" || appCat === category;
    return matchSearch && matchCat;
  });

  const connectedApps = displayApps.filter(app => isConnected(app.key));

  return (
    <div className="h-full flex flex-col">
      <AnimatePresence>
        {apiKeyModal && (
          <ApiKeyModal state={apiKeyModal} onClose={() => setApiKeyModal(null)} onSubmit={handleApiKeySubmit} />
        )}
        {qrModal && (
          <QrAuthModal appKey={qrModal} onClose={() => setQrModal(null)} />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="px-8 py-6 border-b border-border/40">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <Plug className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold text-foreground">MCP & Connections</h1>
            {composioStatus === "ok" && (
              <Badge className="bg-green-500/15 text-green-400 border-green-500/30 border text-[10px] px-1.5 h-4">Composio Live</Badge>
            )}
            {composioStatus === "error" && (
              <Badge className="bg-yellow-500/15 text-yellow-400 border-yellow-500/30 border text-[10px] px-1.5 h-4">Offline Mode</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Connect 250+ tools and AI clients to Nexus OS via Composio and Model Context Protocol
          </p>

          <div className="flex items-center gap-4 mt-5">
            {(["discover", "manage", "webhooks"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "text-sm font-medium pb-2 border-b-2 transition-colors capitalize flex items-center gap-1.5",
                  activeTab === tab
                    ? "text-foreground border-primary"
                    : "text-muted-foreground border-transparent hover:text-foreground"
                )}
              >
                {tab === "webhooks" && <Webhook className="h-3.5 w-3.5" />}
                {tab}
                {tab === "manage" && connectedApps.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-4 px-1.5 text-[10px]">{connectedApps.length}</Badge>
                )}
                {tab === "webhooks" && (
                  <Badge className="ml-1 h-4 px-1.5 text-[10px] bg-violet-500/15 text-violet-400 border-violet-500/30 border">New</Badge>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "webhooks" ? (
        <WebhookTab />
      ) : activeTab === "discover" ? (
        <ScrollArea className="flex-1">
          <div className="px-8 py-6 max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  placeholder="Search 250+ apps and integrations..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-muted/40 rounded-xl pl-9 pr-4 py-2.5 text-sm border border-border/40 focus:border-primary/50 outline-none transition-colors"
                />
              </div>
              <Button size="sm" variant="ghost" onClick={() => { fetchApps(); fetchConnections(); }} className="h-9 px-3 text-muted-foreground">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {APP_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={cn(
                    "text-xs px-3 py-1.5 rounded-lg border transition-colors",
                    category === cat
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border/60 text-muted-foreground hover:text-foreground hover:border-border"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* QR/Session auth apps banner */}
            {(category === "All" || category === "Communication") && !search && (
              <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <QrCode className="h-4 w-4 text-violet-400" />
                  <span className="text-sm font-semibold text-foreground">QR & Session Auth Apps</span>
                  <Badge className="text-[10px] bg-violet-500/15 text-violet-400 border-violet-500/20 border">Beeper Method</Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Connect messaging apps via QR code, phone verification, or bot token — no standard OAuth required.
                </p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(QR_AUTH_APPS).map(([key, cfg]) => (
                    <button
                      key={key}
                      onClick={() => setQrModal(key)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border/60 hover:border-violet-500/40 transition-colors text-xs font-medium text-foreground"
                    >
                      <span>{cfg.emoji}</span>
                      {cfg.label}
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {appsLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Loading integrations from Composio…</p>
                </div>
              </div>
            ) : (
              <div>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                  {category === "All" ? "All Integrations" : category} · {filtered.length} available
                </h2>
                <div className="grid grid-cols-3 gap-4">
                  {filtered.map((app, i) => {
                    const connected = isConnected(app.key);
                    const pending = isPending(app.key);
                    const isConnecting = connectingApp === app.key;
                    const logo = getAppLogo(app);
                    const catLabel = getAppCategory(app);
                    const hasQrAuth = !!QR_AUTH_APPS[app.key];

                    return (
                      <motion.div
                        key={app.key}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.01 }}
                        className={cn(
                          "group flex flex-col gap-3 p-4 rounded-xl border bg-card hover:border-border transition-all",
                          connected ? "border-green-500/30 bg-green-500/5"
                          : pending ? "border-amber-500/30 bg-amber-500/5"
                          : "border-border/60"
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            {logo.startsWith("http") ? (
                              <img src={logo} alt={app.displayName || app.key}
                                className="w-10 h-10 rounded-xl object-contain bg-muted p-1"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                            ) : (
                              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-xl">{logo}</div>
                            )}
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-sm text-foreground">{app.displayName || app.key}</span>
                                {connected && <div className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />}
                                {pending && !connected && <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />}
                              </div>
                              <div className="flex items-center gap-1">
                                <div className="text-[11px] text-muted-foreground/60">{catLabel}</div>
                                {hasQrAuth && (
                                  <Badge className="text-[9px] px-1 py-0 h-3.5 bg-violet-500/10 text-violet-400 border-violet-500/20 border">QR</Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        <p className="text-xs text-muted-foreground leading-relaxed flex-1 line-clamp-2">
                          {app.description || `Connect ${app.displayName || app.key} to Nexus OS`}
                        </p>

                        <div className="flex items-center justify-between gap-2">
                          <div className="text-[10px] text-muted-foreground/40 font-mono">
                            {hasQrAuth ? "session auth" : "via composio"}
                          </div>
                          <div className="flex items-center gap-1.5">
                            {hasQrAuth && !connected && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1 border-violet-500/30 text-violet-400 hover:bg-violet-500/10"
                                onClick={() => setQrModal(app.key)}
                              >
                                <QrCode className="h-3 w-3" />QR
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant={connected ? "outline" : "default"}
                              className={cn(
                                "h-7 text-xs gap-1.5",
                                !connected && !pending && "bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white border-0",
                                pending && !connected && "bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30"
                              )}
                              disabled={isConnecting}
                              onClick={() => connected ? handleDisconnect(app) : handleConnect(app)}
                            >
                              {isConnecting ? (
                                <><Loader2 className="h-3 w-3 animate-spin" />Connecting…</>
                              ) : connected ? (
                                <><Check className="h-3 w-3" />Connected</>
                              ) : pending ? (
                                <><Clock className="h-3 w-3" />Pending</>
                              ) : (
                                <><Link2 className="h-3 w-3" />Connect</>
                              )}
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      ) : (
        <ScrollArea className="flex-1">
          <div className="px-8 py-6 max-w-4xl mx-auto">
            {connectedApps.length === 0 ? (
              <div className="text-center py-20">
                <Plug className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="font-semibold text-foreground mb-2">No active connections</h3>
                <p className="text-sm text-muted-foreground mb-1">Connect apps from the Discover tab</p>
                {composioStatus === "error" && (
                  <p className="text-xs text-yellow-400 mb-4">Composio API unavailable — add COMPOSIO_API_KEY</p>
                )}
                <Button size="sm" variant="outline" className="mt-4" onClick={() => setActiveTab("discover")}>
                  Browse integrations
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Connected · {connectedApps.length}
                  </h2>
                  <Button size="sm" variant="ghost" onClick={fetchConnections} className="h-7 text-xs gap-1 text-muted-foreground">
                    <RefreshCw className="h-3 w-3" /> Refresh
                  </Button>
                </div>
                {connectedApps.map((app) => {
                  const logo = getAppLogo(app);
                  const connId = getConnectionId(app.key);
                  const isDisconnecting = disconnectingId === connId;
                  return (
                    <motion.div
                      key={app.key}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-4 p-4 rounded-xl border border-green-500/20 bg-green-500/5"
                    >
                      {logo.startsWith("http") ? (
                        <img src={logo} alt={app.displayName || app.key} className="w-10 h-10 rounded-xl object-contain bg-muted p-1" />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-xl">{logo}</div>
                      )}
                      <div className="flex-1">
                        <div className="font-medium text-sm text-foreground">{app.displayName || app.key}</div>
                        <div className="text-xs text-muted-foreground">{app.description || "Connected via Composio"}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 text-xs text-green-400">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> Active
                        </div>
                        <Button
                          size="sm" variant="ghost"
                          className="h-7 text-xs text-muted-foreground hover:text-destructive"
                          disabled={isDisconnecting}
                          onClick={() => handleDisconnect(app)}
                        >
                          {isDisconnecting ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Unlink className="h-3 w-3 mr-1" />Disconnect</>}
                        </Button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
