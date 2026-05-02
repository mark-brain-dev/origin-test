import { Router, type Request, type Response } from "express";

const router = Router();

type SSEClient = { id: string; res: Response };
const clients = new Map<string, SSEClient>();

export function broadcastEvent(event: string, data: unknown) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of clients.values()) {
    try {
      client.res.write(payload);
    } catch {
    }
  }
}

router.get("/events", (req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.flushHeaders();

  const clientId = `${Date.now()}-${Math.random()}`;
  clients.set(clientId, { id: clientId, res });

  res.write(`event: connected\ndata: {"clientId":"${clientId}"}\n\n`);

  const keepAlive = setInterval(() => {
    try {
      res.write(`: ping\n\n`);
    } catch {
      clearInterval(keepAlive);
    }
  }, 25000);

  req.on("close", () => {
    clearInterval(keepAlive);
    clients.delete(clientId);
  });
});

export default router;
