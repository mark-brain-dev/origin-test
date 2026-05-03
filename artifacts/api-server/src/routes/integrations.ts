/**
 * /api/integrations — LangChain, LangGraph, Nango, Vercel AI SDK
 *
 * Installed packages: ai, @langchain/core, @langchain/openai, @langchain/langgraph, nango
 * These endpoints expose the capabilities of each SDK for use by Nexus agents.
 */
import { Router, type Request, type Response } from "express";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { PromptTemplate, ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence, RunnablePassthrough } from "@langchain/core/runnables";
import { StateGraph, END, START } from "@langchain/langgraph";
import { Annotation } from "@langchain/langgraph";
import { streamText, generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { Nango } from "@nangohq/node";

const router = Router();

// ── Helpers ────────────────────────────────────────────────────────────────────

function getOpenAIKey(): string | undefined {
  return process.env.OPENAI_API_KEY;
}

function makeOpenAIModel(model = "gpt-4o-mini") {
  const apiKey = getOpenAIKey();
  if (!apiKey) throw new Error("OPENAI_API_KEY not set");
  return new ChatOpenAI({ openAIApiKey: apiKey, modelName: model, temperature: 0.7 });
}

// ── GET /api/integrations — list installed SDKs and status ─────────────────────

router.get("/", (_req: Request, res: Response) => {
  const openaiKey = !!getOpenAIKey();
  const nangoKey = !!process.env.NANGO_SECRET_KEY;

  res.json({
    sdks: [
      {
        name: "LangChain.js",
        package: "@langchain/core + @langchain/openai",
        version: "0.3.x",
        status: openaiKey ? "ready" : "no_api_key",
        endpoints: [
          "POST /api/integrations/langchain/chain",
          "POST /api/integrations/langchain/chat",
        ],
        docs: "https://js.langchain.com",
      },
      {
        name: "LangGraph.js",
        package: "@langchain/langgraph",
        version: "0.2.x",
        status: openaiKey ? "ready" : "no_api_key",
        endpoints: [
          "POST /api/integrations/langgraph/agent",
          "POST /api/integrations/langgraph/research",
        ],
        docs: "https://langchain-ai.github.io/langgraphjs/",
      },
      {
        name: "Vercel AI SDK",
        package: "ai",
        version: "4.x",
        status: openaiKey ? "ready" : "no_api_key",
        endpoints: [
          "POST /api/integrations/vercel-ai/stream",
          "POST /api/integrations/vercel-ai/generate",
        ],
        docs: "https://sdk.vercel.ai",
      },
      {
        name: "Nango",
        package: "@nangohq/node",
        version: "0.70.x",
        status: nangoKey ? "ready" : "no_secret_key",
        endpoints: [
          "GET /api/integrations/nango/connections",
          "POST /api/integrations/nango/sync",
        ],
        docs: "https://nango.dev",
      },
    ],
    mcp: {
      note: "MCP servers can be launched externally and connected to this instance",
      servers: [
        { name: "Chrome MCP", cmd: "npx @modelcontextprotocol/server-puppeteer", url: "https://github.com/modelcontextprotocol/servers/tree/main/src/puppeteer" },
        { name: "Playwright MCP", cmd: "npx @playwright/mcp", url: "https://github.com/microsoft/playwright-mcp" },
        { name: "Filesystem MCP", cmd: "npx @modelcontextprotocol/server-filesystem", url: "https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem" },
        { name: "GitHub MCP", cmd: "npx @modelcontextprotocol/server-github", url: "https://github.com/modelcontextprotocol/servers/tree/main/src/github" },
        { name: "Memory MCP", cmd: "npx @modelcontextprotocol/server-memory", url: "https://github.com/modelcontextprotocol/servers/tree/main/src/memory" },
      ],
    },
  });
});

// ── LangChain ─────────────────────────────────────────────────────────────────

// POST /api/integrations/langchain/chain
// Run a simple prompt → LLM chain
router.post("/langchain/chain", async (req: Request, res: Response) => {
  const { prompt, systemPrompt, model = "gpt-4o-mini", variables = {} } = req.body;
  if (!prompt) { res.status(400).json({ error: "prompt is required" }); return; }

  try {
    const llm = makeOpenAIModel(model);
    const template = ChatPromptTemplate.fromMessages([
      ["system", systemPrompt || "You are a helpful assistant."],
      ["human", prompt],
    ]);
    const chain = RunnableSequence.from([template, llm, new StringOutputParser()]);
    const result = await chain.invoke(variables);
    res.json({ result, model, sdk: "langchain" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/integrations/langchain/chat
// Multi-turn chat via LangChain with message history
router.post("/langchain/chat", async (req: Request, res: Response) => {
  const { messages = [], systemPrompt, model = "gpt-4o-mini" } = req.body;
  if (!messages.length) { res.status(400).json({ error: "messages array is required" }); return; }

  try {
    const llm = makeOpenAIModel(model);
    const langMessages = [
      new SystemMessage(systemPrompt || "You are a helpful Nexus OS assistant."),
      ...messages.map((m: { role: string; content: string }) =>
        m.role === "user" ? new HumanMessage(m.content) : new AIMessage(m.content)
      ),
    ];
    const response = await llm.invoke(langMessages);
    res.json({
      result: typeof response.content === "string" ? response.content : JSON.stringify(response.content),
      model,
      sdk: "langchain",
      usage: response.usage_metadata,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── LangGraph ─────────────────────────────────────────────────────────────────

// Define a simple ReAct-style graph state
const AgentState = Annotation.Root({
  messages: Annotation<Array<{ role: string; content: string }>>({
    reducer: (x, y) => x.concat(y),
  }),
  step: Annotation<number>({ reducer: (_x, y) => y }),
  result: Annotation<string>({ reducer: (_x, y) => y }),
  done: Annotation<boolean>({ reducer: (_x, y) => y }),
});

// POST /api/integrations/langgraph/agent
// Run a simple LangGraph agent that thinks step-by-step
router.post("/langgraph/agent", async (req: Request, res: Response) => {
  const { task, systemPrompt, model = "gpt-4o-mini", maxSteps = 3 } = req.body;
  if (!task) { res.status(400).json({ error: "task is required" }); return; }

  try {
    const llm = makeOpenAIModel(model);

    // Node: think about the task
    const thinkNode = async (state: typeof AgentState.State) => {
      const stepNum = state.step + 1;
      const history = state.messages.map(m => `${m.role}: ${m.content}`).join("\n");
      const thinkPrompt = stepNum === 1
        ? `Task: ${task}\n\nThink through this step by step. What do you need to do?`
        : `${history}\n\nContinue your reasoning. Step ${stepNum}/${maxSteps}. If you have enough information, say DONE: [your final answer].`;

      const resp = await llm.invoke([
        new SystemMessage(systemPrompt || "You are a smart AI agent. Reason step by step, then provide a final answer prefixed with DONE:"),
        new HumanMessage(thinkPrompt),
      ]);
      const content = typeof resp.content === "string" ? resp.content : JSON.stringify(resp.content);
      const isDone = content.includes("DONE:") || stepNum >= maxSteps;
      const result = isDone ? content.replace(/.*DONE:\s*/s, "").trim() : "";

      return {
        messages: [{ role: "assistant", content }],
        step: stepNum,
        result,
        done: isDone,
      };
    };

    // Conditional edge
    const shouldContinue = (state: typeof AgentState.State) =>
      state.done ? END : "think";

    // Build the graph
    const graph = new StateGraph(AgentState)
      .addNode("think", thinkNode)
      .addEdge(START, "think")
      .addConditionalEdges("think", shouldContinue);

    const app = graph.compile();

    const finalState = await app.invoke({
      messages: [{ role: "user", content: task }],
      step: 0,
      result: "",
      done: false,
    });

    res.json({
      result: finalState.result || finalState.messages[finalState.messages.length - 1]?.content || "",
      steps: finalState.step,
      messages: finalState.messages,
      model,
      sdk: "langgraph",
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/integrations/langgraph/research
// Multi-step research agent: plan → search → synthesize
router.post("/langgraph/research", async (req: Request, res: Response) => {
  const { topic, model = "gpt-4o-mini" } = req.body;
  if (!topic) { res.status(400).json({ error: "topic is required" }); return; }

  try {
    const llm = makeOpenAIModel(model);

    const ResearchState = Annotation.Root({
      topic: Annotation<string>({ reducer: (_x, y) => y }),
      outline: Annotation<string>({ reducer: (_x, y) => y }),
      research: Annotation<string>({ reducer: (_x, y) => y }),
      summary: Annotation<string>({ reducer: (_x, y) => y }),
    });

    const planNode = async (state: typeof ResearchState.State) => {
      const resp = await llm.invoke([
        new SystemMessage("You are a research planner. Create a brief outline (3-5 bullet points) for researching the given topic."),
        new HumanMessage(`Create a research outline for: ${state.topic}`),
      ]);
      return { outline: typeof resp.content === "string" ? resp.content : JSON.stringify(resp.content) };
    };

    const researchNode = async (state: typeof ResearchState.State) => {
      const resp = await llm.invoke([
        new SystemMessage("You are a researcher. Based on the outline, provide detailed research points."),
        new HumanMessage(`Topic: ${state.topic}\n\nOutline:\n${state.outline}\n\nProvide detailed research for each point.`),
      ]);
      return { research: typeof resp.content === "string" ? resp.content : JSON.stringify(resp.content) };
    };

    const synthesizeNode = async (state: typeof ResearchState.State) => {
      const resp = await llm.invoke([
        new SystemMessage("You are a writer. Synthesize the research into a clear, structured summary."),
        new HumanMessage(`Topic: ${state.topic}\n\nResearch:\n${state.research}\n\nWrite a clear, actionable summary.`),
      ]);
      return { summary: typeof resp.content === "string" ? resp.content : JSON.stringify(resp.content) };
    };

    const graph = new StateGraph(ResearchState)
      .addNode("plan", planNode)
      .addNode("research", researchNode)
      .addNode("synthesize", synthesizeNode)
      .addEdge(START, "plan")
      .addEdge("plan", "research")
      .addEdge("research", "synthesize")
      .addEdge("synthesize", END);

    const app = graph.compile();
    const result = await app.invoke({ topic, outline: "", research: "", summary: "" });

    res.json({
      topic,
      outline: result.outline,
      research: result.research,
      summary: result.summary,
      model,
      sdk: "langgraph",
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Vercel AI SDK ─────────────────────────────────────────────────────────────

// POST /api/integrations/vercel-ai/generate
// Non-streaming text generation via Vercel AI SDK
router.post("/vercel-ai/generate", async (req: Request, res: Response) => {
  const { prompt, systemPrompt, model = "gpt-4o-mini" } = req.body;
  if (!prompt) { res.status(400).json({ error: "prompt is required" }); return; }

  const apiKey = getOpenAIKey();
  if (!apiKey) { res.status(400).json({ error: "OPENAI_API_KEY not set" }); return; }

  try {
    const openai = createOpenAI({ apiKey });
    const { text, usage } = await generateText({
      model: openai(model),
      system: systemPrompt || "You are a helpful Nexus OS assistant.",
      prompt,
    });
    res.json({ text, usage, model, sdk: "vercel-ai" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/integrations/vercel-ai/stream
// Streaming text generation via Vercel AI SDK (SSE)
router.post("/vercel-ai/stream", async (req: Request, res: Response) => {
  const { prompt, systemPrompt, model = "gpt-4o-mini" } = req.body;
  if (!prompt) { res.status(400).json({ error: "prompt is required" }); return; }

  const apiKey = getOpenAIKey();
  if (!apiKey) { res.status(400).json({ error: "OPENAI_API_KEY not set" }); return; }

  try {
    const openai = createOpenAI({ apiKey });
    const result = streamText({
      model: openai(model),
      system: systemPrompt || "You are a helpful Nexus OS assistant.",
      prompt,
    });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    for await (const chunk of result.textStream) {
      res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
    }
    res.write("data: [DONE]\n\n");
    res.end();
  } catch (err: any) {
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
});

// ── Nango ─────────────────────────────────────────────────────────────────────

function getNangoClient() {
  const secretKey = process.env.NANGO_SECRET_KEY;
  if (!secretKey) throw new Error("NANGO_SECRET_KEY not set. Add it in environment secrets.");
  return new Nango({ secretKey });
}

// GET /api/integrations/nango/connections
// List all Nango connections for the default user
router.get("/nango/connections", async (req: Request, res: Response) => {
  const connectionId = (req.query.connectionId as string) || "default";
  try {
    const nango = getNangoClient();
    const connections = await nango.listConnections();
    res.json({ connections, connectionId });
  } catch (err: any) {
    if (err.message?.includes("NANGO_SECRET_KEY")) {
      res.json({ connections: [], error: err.message, hint: "Add NANGO_SECRET_KEY in Settings → Secrets" });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

// POST /api/integrations/nango/token
// Get a fresh access token for a Nango connection
router.post("/nango/token", async (req: Request, res: Response) => {
  const { providerConfigKey, connectionId = "default" } = req.body;
  if (!providerConfigKey) { res.status(400).json({ error: "providerConfigKey is required" }); return; }

  try {
    const nango = getNangoClient();
    const token = await nango.getToken(providerConfigKey, connectionId);
    res.json({ token, providerConfigKey, connectionId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/integrations/nango/records
// Fetch synced records from a Nango sync
router.get("/nango/records", async (req: Request, res: Response) => {
  const { providerConfigKey, connectionId = "default", model: syncModel } = req.query;
  if (!providerConfigKey || !syncModel) {
    res.status(400).json({ error: "providerConfigKey and model are required" });
    return;
  }

  try {
    const nango = getNangoClient();
    const records = await nango.listRecords({
      providerConfigKey: providerConfigKey as string,
      connectionId: connectionId as string,
      model: syncModel as string,
    });
    res.json({ records, providerConfigKey, connectionId, model: syncModel });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
