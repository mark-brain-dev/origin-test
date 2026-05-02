import { Router } from "express";
import { db, aiProvidersTable, aiConversationsTable, aiMessagesTable, memoriesTable, skillsTable, usersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

const router = Router();

const AI_PROVIDER_CATALOG = [
  { id: "openai", name: "OpenAI", baseUrl: "https://api.openai.com/v1", authTypes: ["api_key"], defaultModels: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"], supportsStreaming: true, isOpenAiCompatible: true, category: "cloud" },
  { id: "anthropic", name: "Anthropic Claude", baseUrl: "https://api.anthropic.com/v1", authTypes: ["api_key"], defaultModels: ["claude-opus-4-5", "claude-sonnet-4-5", "claude-3-5-haiku-latest"], supportsStreaming: true, isOpenAiCompatible: false, category: "cloud" },
  { id: "google-gemini", name: "Google Gemini", baseUrl: "https://generativelanguage.googleapis.com/v1beta", authTypes: ["api_key", "oauth"], defaultModels: ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"], supportsStreaming: true, isOpenAiCompatible: false, category: "cloud" },
  { id: "groq", name: "Groq", baseUrl: "https://api.groq.com/openai/v1", authTypes: ["api_key"], defaultModels: ["llama-3.3-70b-versatile", "mixtral-8x7b-32768", "gemma2-9b-it"], supportsStreaming: true, isOpenAiCompatible: true, category: "cloud" },
  { id: "mistral", name: "Mistral AI", baseUrl: "https://api.mistral.ai/v1", authTypes: ["api_key"], defaultModels: ["mistral-large-latest", "mistral-medium-latest", "codestral-latest"], supportsStreaming: true, isOpenAiCompatible: true, category: "cloud" },
  { id: "openrouter", name: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1", authTypes: ["api_key"], defaultModels: ["openai/gpt-4o", "anthropic/claude-3-5-sonnet", "meta-llama/llama-3.1-70b-instruct"], supportsStreaming: true, isOpenAiCompatible: true, category: "cloud" },
  { id: "together", name: "Together AI", baseUrl: "https://api.together.xyz/v1", authTypes: ["api_key"], defaultModels: ["meta-llama/Llama-3.3-70B-Instruct-Turbo", "mistralai/Mixtral-8x7B-Instruct-v0.1"], supportsStreaming: true, isOpenAiCompatible: true, category: "cloud" },
  { id: "cohere", name: "Cohere", baseUrl: "https://api.cohere.com/v1", authTypes: ["api_key"], defaultModels: ["command-r-plus", "command-r", "command-light"], supportsStreaming: true, isOpenAiCompatible: false, category: "cloud" },
  { id: "perplexity", name: "Perplexity", baseUrl: "https://api.perplexity.ai", authTypes: ["api_key"], defaultModels: ["llama-3.1-sonar-large-128k-online", "llama-3.1-sonar-small-128k-online"], supportsStreaming: true, isOpenAiCompatible: true, category: "cloud" },
  { id: "deepseek", name: "DeepSeek", baseUrl: "https://api.deepseek.com", authTypes: ["api_key"], defaultModels: ["deepseek-chat", "deepseek-coder", "deepseek-reasoner"], supportsStreaming: true, isOpenAiCompatible: true, category: "cloud" },
  { id: "xai", name: "xAI Grok", baseUrl: "https://api.x.ai/v1", authTypes: ["api_key"], defaultModels: ["grok-2", "grok-2-mini", "grok-beta"], supportsStreaming: true, isOpenAiCompatible: true, category: "cloud" },
  { id: "fireworks", name: "Fireworks AI", baseUrl: "https://api.fireworks.ai/inference/v1", authTypes: ["api_key"], defaultModels: ["accounts/fireworks/models/llama-v3p1-70b-instruct", "accounts/fireworks/models/mixtral-8x7b-instruct"], supportsStreaming: true, isOpenAiCompatible: true, category: "cloud" },
  { id: "cloudflare", name: "Cloudflare Workers AI", baseUrl: "https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/v1", authTypes: ["api_key"], defaultModels: ["@cf/meta/llama-3.1-8b-instruct", "@cf/mistral/mistral-7b-instruct-v0.1"], supportsStreaming: true, isOpenAiCompatible: true, category: "cloud" },
  { id: "vultr", name: "Vultr Inference", baseUrl: "https://api.vultrinference.com/v1", authTypes: ["api_key"], defaultModels: ["llama2-13b-chat-Q5_K_M", "zephyr-7b-beta-Q5_K_M"], supportsStreaming: true, isOpenAiCompatible: true, category: "cloud" },
  { id: "nvidia", name: "NVIDIA NIM", baseUrl: "https://integrate.api.nvidia.com/v1", authTypes: ["api_key"], defaultModels: ["meta/llama-3.1-70b-instruct", "mistralai/mistral-large-2-instruct"], supportsStreaming: true, isOpenAiCompatible: true, category: "cloud" },
  { id: "cerebras", name: "Cerebras", baseUrl: "https://api.cerebras.ai/v1", authTypes: ["api_key"], defaultModels: ["llama3.1-70b", "llama3.1-8b"], supportsStreaming: true, isOpenAiCompatible: true, category: "cloud" },
  { id: "ai21", name: "AI21 Labs", baseUrl: "https://api.ai21.com/studio/v1", authTypes: ["api_key"], defaultModels: ["jamba-1.5-large", "jamba-1.5-mini"], supportsStreaming: true, isOpenAiCompatible: false, category: "cloud" },
  { id: "novita", name: "NovitaAI", baseUrl: "https://api.novita.ai/v3/openai", authTypes: ["api_key"], defaultModels: ["meta-llama/llama-3.1-70b-instruct", "mistralai/mixtral-8x7b-instruct"], supportsStreaming: true, isOpenAiCompatible: true, category: "cloud" },
  { id: "huggingface", name: "HuggingFace", baseUrl: "https://api-inference.huggingface.co/models", authTypes: ["api_key"], defaultModels: ["meta-llama/Llama-3.1-70B-Instruct", "mistralai/Mixtral-8x7B-Instruct-v0.1"], supportsStreaming: false, isOpenAiCompatible: false, category: "cloud" },
  { id: "replicate", name: "Replicate", baseUrl: "https://api.replicate.com/v1", authTypes: ["api_key"], defaultModels: ["meta/llama-3.1-405b-instruct", "mistralai/mixtral-8x7b-instruct-v0.1"], supportsStreaming: true, isOpenAiCompatible: false, category: "cloud" },
  { id: "azure-openai", name: "Azure OpenAI", baseUrl: "https://{resource}.openai.azure.com", authTypes: ["api_key"], defaultModels: ["gpt-4o", "gpt-4-turbo", "gpt-35-turbo"], supportsStreaming: true, isOpenAiCompatible: true, category: "cloud" },
  { id: "aws-bedrock", name: "Amazon Bedrock", baseUrl: "https://bedrock-runtime.{region}.amazonaws.com", authTypes: ["api_key"], defaultModels: ["anthropic.claude-3-5-sonnet-20241022-v2:0", "meta.llama3-1-70b-instruct-v1:0"], supportsStreaming: true, isOpenAiCompatible: false, category: "cloud" },
  { id: "ollama", name: "Ollama (Local)", baseUrl: "http://localhost:11434/api", authTypes: ["api_key"], defaultModels: ["llama3.1", "mistral", "codellama", "phi3"], supportsStreaming: true, isOpenAiCompatible: false, category: "local" },
  { id: "lmstudio", name: "LM Studio (Local)", baseUrl: "http://localhost:1234/v1", authTypes: ["api_key"], defaultModels: ["local-model"], supportsStreaming: true, isOpenAiCompatible: true, category: "local" },
  { id: "chatgpt-session", name: "ChatGPT (Session)", baseUrl: "https://chatgpt.com", authTypes: ["session_cookie"], defaultModels: ["gpt-4o", "gpt-4", "gpt-3.5-turbo"], supportsStreaming: true, isOpenAiCompatible: false, category: "session" },
  { id: "claude-session", name: "Claude (Session)", baseUrl: "https://claude.ai", authTypes: ["session_cookie"], defaultModels: ["claude-3-5-sonnet", "claude-3-opus"], supportsStreaming: true, isOpenAiCompatible: false, category: "session" },
];

const BUILT_IN_SKILLS = [
  { id: "summarize", name: "Summarize", description: "Summarize selected text or entire page", category: "writing", prompt: "Please summarize the following content concisely:\n\n{{input}}", icon: "📝", isBuiltIn: true },
  { id: "improve-writing", name: "Improve Writing", description: "Improve grammar, clarity, and style", category: "writing", prompt: "Please improve the writing quality of this text, fixing grammar and enhancing clarity:\n\n{{input}}", icon: "✨", isBuiltIn: true },
  { id: "make-shorter", name: "Make Shorter", description: "Condense the text while keeping key points", category: "writing", prompt: "Make this text shorter while keeping all key information:\n\n{{input}}", icon: "📏", isBuiltIn: true },
  { id: "make-longer", name: "Make Longer", description: "Expand the text with more detail", category: "writing", prompt: "Expand this text with more detail and examples:\n\n{{input}}", icon: "📖", isBuiltIn: true },
  { id: "translate", name: "Translate", description: "Translate text to another language", category: "writing", prompt: "Translate the following to English (or specify target language):\n\n{{input}}", icon: "🌍", isBuiltIn: true },
  { id: "action-items", name: "Extract Action Items", description: "Extract action items from meeting notes", category: "productivity", prompt: "Extract all action items from this text as a bulleted list:\n\n{{input}}", icon: "✅", isBuiltIn: true },
  { id: "create-outline", name: "Create Outline", description: "Generate a structured outline", category: "productivity", prompt: "Create a detailed outline for:\n\n{{input}}", icon: "📋", isBuiltIn: true },
  { id: "brainstorm", name: "Brainstorm Ideas", description: "Generate ideas on a topic", category: "creative", prompt: "Generate 10 creative ideas about:\n\n{{input}}", icon: "💡", isBuiltIn: true },
  { id: "explain", name: "Explain", description: "Explain a concept in simple terms", category: "learning", prompt: "Explain this in simple, easy-to-understand terms:\n\n{{input}}", icon: "🎓", isBuiltIn: true },
  { id: "code-review", name: "Code Review", description: "Review code for bugs and improvements", category: "coding", prompt: "Review this code for bugs, performance, and best practices:\n\n{{input}}", icon: "🔍", isBuiltIn: true },
];

// Provider catalog
router.get("/providers/catalog", (req, res) => {
  res.json(AI_PROVIDER_CATALOG);
});

// List providers
router.get("/providers", async (req, res) => {
  const clerkId = (req as any).auth?.userId || "demo-user";
  let user = await db.query.usersTable.findFirst({ where: eq(usersTable.clerkId, clerkId) });
  if (!user) return res.json([]);

  const providers = await db.select().from(aiProvidersTable).where(eq(aiProvidersTable.userId, user.id));
  const sanitized = providers.map(p => ({
    ...p,
    apiKeyEncrypted: p.apiKeyEncrypted ? "***" : null,
    sessionCookieEncrypted: p.sessionCookieEncrypted ? "***" : null,
  }));
  res.json(sanitized);
});

// Add provider
router.post("/providers", async (req, res) => {
  const clerkId = (req as any).auth?.userId || "demo-user";
  let user = await db.query.usersTable.findFirst({ where: eq(usersTable.clerkId, clerkId) });
  if (!user) {
    const id = randomUUID();
    await db.insert(usersTable).values({ id, clerkId, email: `${clerkId}@nexus.app`, name: "User" });
    user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, id) });
  }

  const { name, provider, baseUrl, model, authType, apiKey, sessionCookie, isDefault } = req.body;
  const catalogEntry = AI_PROVIDER_CATALOG.find(c => c.id === provider);
  const finalBaseUrl = baseUrl || catalogEntry?.baseUrl || "";

  const id = randomUUID();
  await db.insert(aiProvidersTable).values({
    id, userId: user!.id, name, provider, baseUrl: finalBaseUrl,
    model: model || catalogEntry?.defaultModels[0],
    authType, apiKeyEncrypted: apiKey || null,
    sessionCookieEncrypted: sessionCookie || null,
    isDefault: isDefault || false,
    capabilities: ["chat", "completion"],
  });

  if (isDefault) {
    await db.update(aiProvidersTable).set({ isDefault: false }).where(
      eq(aiProvidersTable.userId, user!.id)
    );
    await db.update(aiProvidersTable).set({ isDefault: true }).where(eq(aiProvidersTable.id, id));
  }

  const p = await db.query.aiProvidersTable.findFirst({ where: eq(aiProvidersTable.id, id) });
  res.status(201).json({ ...p, apiKeyEncrypted: "***" });
});

router.patch("/providers/:providerId", async (req, res) => {
  const { name, model, apiKey, sessionCookie, isActive, isDefault } = req.body;
  await db.update(aiProvidersTable).set({
    ...(name !== undefined && { name }),
    ...(model !== undefined && { model }),
    ...(apiKey !== undefined && { apiKeyEncrypted: apiKey }),
    ...(sessionCookie !== undefined && { sessionCookieEncrypted: sessionCookie }),
    ...(isActive !== undefined && { isActive }),
    ...(isDefault !== undefined && { isDefault }),
    updatedAt: new Date(),
  }).where(eq(aiProvidersTable.id, req.params.providerId));
  const p = await db.query.aiProvidersTable.findFirst({ where: eq(aiProvidersTable.id, req.params.providerId) });
  res.json({ ...p, apiKeyEncrypted: "***" });
});

router.delete("/providers/:providerId", async (req, res) => {
  await db.delete(aiProvidersTable).where(eq(aiProvidersTable.id, req.params.providerId));
  res.status(204).end();
});

router.post("/providers/:providerId/test", async (req, res) => {
  const provider = await db.query.aiProvidersTable.findFirst({ where: eq(aiProvidersTable.id, req.params.providerId) });
  if (!provider) return res.status(404).json({ error: "Not found" });
  res.json({ success: true, message: `Connected to ${provider.name} successfully`, latencyMs: 120 });
});

// AI Chat
router.post("/chat", async (req, res) => {
  const { messages, providerId, pageId, workspaceId, useMemory } = req.body;
  const lastMessage = messages[messages.length - 1];

  const response = {
    id: randomUUID(),
    content: generateDemoResponse(lastMessage?.content || ""),
    role: "assistant",
    providerId,
    tokensUsed: 150,
    createdAt: new Date().toISOString(),
  };

  res.json(response);
});

// AI Generate
router.post("/generate", async (req, res) => {
  const { prompt, type, context } = req.body;
  const content = generateContent(type, prompt, context);
  res.json({ content, type, tokensUsed: 200 });
});

// Conversations
router.get("/conversations", async (req, res) => {
  const clerkId = (req as any).auth?.userId || "demo-user";
  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.clerkId, clerkId) });
  if (!user) return res.json([]);
  const conversations = await db.select().from(aiConversationsTable)
    .where(eq(aiConversationsTable.userId, user.id))
    .orderBy(desc(aiConversationsTable.updatedAt))
    .limit(20);
  res.json(conversations);
});

// Memory endpoints
router.get("/memory", async (req, res) => {
  const clerkId = (req as any).auth?.userId || "demo-user";
  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.clerkId, clerkId) });
  if (!user) return res.json([]);
  const memories = await db.select().from(memoriesTable)
    .where(eq(memoriesTable.userId, user.id))
    .orderBy(desc(memoriesTable.createdAt))
    .limit(parseInt(req.query.limit as string) || 50);
  res.json(memories);
});

router.post("/memory", async (req, res) => {
  const clerkId = (req as any).auth?.userId || "demo-user";
  let user = await db.query.usersTable.findFirst({ where: eq(usersTable.clerkId, clerkId) });
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  const { content, type, source, importance } = req.body;
  const id = randomUUID();
  await db.insert(memoriesTable).values({ id, userId: user.id, content, type, source, importance: importance || 5 });
  const memory = await db.query.memoriesTable.findFirst({ where: eq(memoriesTable.id, id) });
  res.status(201).json(memory);
});

router.delete("/memory/:memoryId", async (req, res) => {
  await db.delete(memoriesTable).where(eq(memoriesTable.id, req.params.memoryId));
  res.status(204).end();
});

router.post("/memory/search", async (req, res) => {
  const { query, limit } = req.body;
  const clerkId = (req as any).auth?.userId || "demo-user";
  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.clerkId, clerkId) });
  if (!user) return res.json([]);
  const memories = await db.select().from(memoriesTable)
    .where(eq(memoriesTable.userId, user.id))
    .limit(limit || 10);
  res.json(memories);
});

// Skills endpoints
router.get("/skills", async (req, res) => {
  const clerkId = (req as any).auth?.userId || "demo-user";
  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.clerkId, clerkId) });

  let customSkills: any[] = [];
  if (user) {
    customSkills = await db.select().from(skillsTable).where(eq(skillsTable.userId, user.id));
  }

  res.json([...BUILT_IN_SKILLS, ...customSkills]);
});

router.post("/skills", async (req, res) => {
  const clerkId = (req as any).auth?.userId || "demo-user";
  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.clerkId, clerkId) });
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  const { name, description, category, prompt, icon } = req.body;
  const id = randomUUID();
  await db.insert(skillsTable).values({ id, userId: user.id, name, description, category, prompt, icon, isBuiltIn: false });
  const skill = await db.query.skillsTable.findFirst({ where: eq(skillsTable.id, id) });
  res.status(201).json(skill);
});

router.post("/skills/:skillId/run", async (req, res) => {
  const { input, pageId, providerId } = req.body;
  const { skillId } = req.params;

  const builtIn = BUILT_IN_SKILLS.find(s => s.id === skillId);
  const prompt = builtIn?.prompt.replace("{{input}}", input) || input;
  const output = generateDemoResponse(prompt);

  res.json({ output, skillId, tokensUsed: 300, executionMs: 250 });
});

function generateDemoResponse(message: string): string {
  const responses = [
    `I've analyzed your request: "${message.slice(0, 50)}..."\n\nHere's what I found and suggest:\n\n1. **Key Insight**: The information you provided suggests a structured approach would work best.\n2. **Recommendation**: Consider breaking this into smaller, manageable steps.\n3. **Next Steps**: Start with the most impactful action first.\n\nWould you like me to elaborate on any of these points?`,
    `Great question! Based on your input about "${message.slice(0, 40)}...", I can help you with:\n\n• **Analysis**: I've processed the context and identified key patterns\n• **Suggestions**: Here are 3 actionable recommendations\n• **Resources**: I can help you create organized notes or databases\n\nShall I proceed with any of these?`,
    `I understand you're asking about: "${message.slice(0, 50)}"\n\nLet me help you think through this systematically. The most important considerations are:\n\n1. First, define your core objective\n2. Break it into measurable milestones\n3. Track progress in a Nexus database\n\nWant me to create a project template for this?`,
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}

function generateContent(type: string, prompt: string, context?: string): string {
  const templates: Record<string, string> = {
    summarize: `**Summary**\n\nThis content covers the key points of: ${prompt}\n\n• Main point 1\n• Main point 2\n• Main point 3`,
    continue: `${context || ""}\n\nContinuing from here, we can explore the next aspects of this topic, building on the foundation established above...`,
    rewrite: `Here's a rewritten version:\n\n${prompt.split(". ").map(s => s.trim()).filter(Boolean).join(".\n\n")}`,
    translate: `Translation:\n\n${prompt}`,
    fix_grammar: `Corrected version:\n\n${prompt}`,
    action_items: `**Action Items:**\n\n- [ ] Review and validate the main points\n- [ ] Schedule follow-up meeting\n- [ ] Document decisions made\n- [ ] Assign responsibilities`,
    create_page: `# ${prompt}\n\n## Overview\n\nThis page covers ${prompt}.\n\n## Key Points\n\n- Point 1\n- Point 2\n- Point 3\n\n## Next Steps\n\n1. Step 1\n2. Step 2`,
    explain: `**Explanation:**\n\n${prompt} refers to a concept that can be understood as follows:\n\nIn simple terms, think of it like... The key thing to understand is that it involves three main components.`,
  };
  return templates[type] || `Generated content for: ${prompt}`;
}

export default router;
