import { Router } from "express";
import { db, pagesTable, pageLinksTable, usersTable } from "@workspace/db";
import { eq, and, isNull, sql, desc, or } from "drizzle-orm";
import { randomUUID } from "crypto";
import { broadcastEvent } from "./events";

const router = Router();

async function getOrCreateUser(clerkId: string) {
  let user = await db.query.usersTable.findFirst({ where: eq(usersTable.clerkId, clerkId) });
  if (!user) {
    const id = randomUUID();
    await db.insert(usersTable).values({ id, clerkId, email: `${clerkId}@nexus.app`, name: "User" });
    user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, id) });
  }
  return user!;
}

router.get("/:workspaceId/pages", async (req, res) => {
  const { workspaceId } = req.params;
  const pages = await db.select().from(pagesTable).where(eq(pagesTable.workspaceId, workspaceId)).orderBy(pagesTable.order, pagesTable.createdAt);
  res.json(pages);
});

router.post("/:workspaceId/pages", async (req, res) => {
  const clerkId = (req as any).auth?.userId || "demo-user";
  const user = await getOrCreateUser(clerkId);
  const { workspaceId } = req.params;
  const { title, type, parentId, icon, coverUrl } = req.body;

  const id = randomUUID();
  const slug = `${(title || "untitled").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Math.random().toString(36).slice(2, 7)}`;
  const defaultContent = { type: "doc", content: [{ type: "paragraph" }] };

  await db.insert(pagesTable).values({
    id, title: title || "Untitled", slug, type: type || "page",
    parentId: parentId || null, icon: icon || getDefaultIcon(type),
    coverUrl: coverUrl || null, workspaceId, authorId: user.id,
    content: defaultContent,
  });

  const page = await db.query.pagesTable.findFirst({ where: eq(pagesTable.id, id) });
  broadcastEvent("page:created", { pageId: id, workspaceId });
  res.status(201).json(page);
});

router.get("/:workspaceId/pages/tree", async (req, res) => {
  const { workspaceId } = req.params;
  const pages = await db.select().from(pagesTable)
    .where(and(eq(pagesTable.workspaceId, workspaceId), eq(pagesTable.isArchived, false)))
    .orderBy(pagesTable.order);
  res.json(buildTree(pages));
});

router.get("/:workspaceId/pages/recent", async (req, res) => {
  const { workspaceId } = req.params;
  const limit = parseInt(req.query.limit as string) || 10;
  const pages = await db.select().from(pagesTable)
    .where(and(eq(pagesTable.workspaceId, workspaceId), eq(pagesTable.isArchived, false)))
    .orderBy(desc(pagesTable.updatedAt))
    .limit(limit);
  res.json(pages);
});

router.get("/:workspaceId/graph", async (req, res) => {
  const { workspaceId } = req.params;
  const pages = await db.select().from(pagesTable)
    .where(and(eq(pagesTable.workspaceId, workspaceId), eq(pagesTable.isArchived, false)));
  const links = await db.select().from(pageLinksTable);

  const nodes = pages.map(p => ({
    id: p.id, label: p.title, type: p.type, icon: p.icon,
    linkCount: links.filter(l => l.fromPageId === p.id || l.toPageId === p.id).length,
    updatedAt: p.updatedAt,
  }));
  const edges = links.map(l => ({ id: l.id, source: l.fromPageId, target: l.toPageId, label: l.linkText || "" }));

  res.json({ nodes, edges });
});

function buildTree(pages: any[]): any[] {
  const map = new Map<string, any>();
  const roots: any[] = [];
  pages.forEach(p => map.set(p.id, { ...p, children: [] }));
  pages.forEach(p => {
    if (p.parentId && map.has(p.parentId)) {
      map.get(p.parentId).children.push(map.get(p.id));
    } else {
      roots.push(map.get(p.id));
    }
  });
  return roots;
}

function getDefaultIcon(type?: string) {
  const icons: Record<string, string> = {
    page: "📄", database: "🗃️", wiki: "📚", project: "📁", daily: "📅", canvas: "🎨",
  };
  return icons[type || "page"] || "📄";
}

export default router;
