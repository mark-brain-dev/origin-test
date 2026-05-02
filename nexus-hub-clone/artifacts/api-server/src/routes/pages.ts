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

// List pages in workspace
router.get("/:workspaceId/pages", async (req, res) => {
  const { workspaceId } = req.params;
  const { type, isFavorite } = req.query;

  let where: any = eq(pagesTable.workspaceId, workspaceId);
  const pages = await db.select().from(pagesTable).where(where).orderBy(pagesTable.order, pagesTable.createdAt);
  res.json(pages);
});

// Create page
router.post("/:workspaceId/pages", async (req, res) => {
  const clerkId = (req as any).auth?.userId || "demo-user";
  const user = await getOrCreateUser(clerkId);
  const { workspaceId } = req.params;
  const { title, type, parentId, icon, coverUrl, templateId } = req.body;

  const id = randomUUID();
  const slug = `${(title || "untitled").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Math.random().toString(36).slice(2, 7)}`;

  const defaultContent = {
    type: "doc",
    content: [{ type: "paragraph" }]
  };

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

// Get page tree
router.get("/:workspaceId/pages/tree", async (req, res) => {
  const { workspaceId } = req.params;
  const pages = await db.select().from(pagesTable)
    .where(and(eq(pagesTable.workspaceId, workspaceId), eq(pagesTable.isArchived, false)))
    .orderBy(pagesTable.order);

  const tree = buildTree(pages);
  res.json(tree);
});

// Get recent pages
router.get("/:workspaceId/pages/recent", async (req, res) => {
  const { workspaceId } = req.params;
  const limit = parseInt(req.query.limit as string) || 10;
  const pages = await db.select().from(pagesTable)
    .where(and(eq(pagesTable.workspaceId, workspaceId), eq(pagesTable.isArchived, false)))
    .orderBy(desc(pagesTable.updatedAt))
    .limit(limit);
  res.json(pages);
});

// Get workspace graph
router.get("/:workspaceId/graph", async (req, res) => {
  const { workspaceId } = req.params;
  const pages = await db.select().from(pagesTable)
    .where(and(eq(pagesTable.workspaceId, workspaceId), eq(pagesTable.isArchived, false)));

  const links = await db.select().from(pageLinksTable);

  const nodes = pages.map(p => ({
    id: p.id,
    label: p.title,
    type: p.type,
    icon: p.icon,
    linkCount: links.filter(l => l.fromPageId === p.id || l.toPageId === p.id).length,
    updatedAt: p.updatedAt,
  }));

  const edges = links.map(l => ({
    id: l.id,
    source: l.fromPageId,
    target: l.toPageId,
    label: l.linkText || "",
  }));

  res.json({ nodes, edges });
});

// Get single page
router.get("/:pageId", async (req, res) => {
  const page = await db.query.pagesTable.findFirst({ where: eq(pagesTable.id, req.params.pageId) });
  if (!page) return res.status(404).json({ error: "Page not found" });
  res.json(page);
});

// Update page
router.patch("/:pageId", async (req, res) => {
  const { title, icon, coverUrl, parentId, isPublished, isFavorite, isArchived, tags } = req.body;
  await db.update(pagesTable).set({
    ...(title !== undefined && { title }),
    ...(icon !== undefined && { icon }),
    ...(coverUrl !== undefined && { coverUrl }),
    ...(parentId !== undefined && { parentId }),
    ...(isPublished !== undefined && { isPublished }),
    ...(isFavorite !== undefined && { isFavorite }),
    ...(isArchived !== undefined && { isArchived }),
    ...(tags !== undefined && { tags }),
    updatedAt: new Date(),
  }).where(eq(pagesTable.id, req.params.pageId));
  const page = await db.query.pagesTable.findFirst({ where: eq(pagesTable.id, req.params.pageId) });
  broadcastEvent("page:updated", { pageId: req.params.pageId });
  res.json(page);
});

// Delete page
router.delete("/:pageId", async (req, res) => {
  broadcastEvent("page:deleted", { pageId: req.params.pageId });
  await db.delete(pagesTable).where(eq(pagesTable.id, req.params.pageId));
  res.status(204).end();
});

// Get backlinks
router.get("/:pageId/backlinks", async (req, res) => {
  const links = await db.select().from(pageLinksTable).where(eq(pageLinksTable.toPageId, req.params.pageId));
  const fromIds = links.map(l => l.fromPageId);
  if (fromIds.length === 0) return res.json([]);
  const pages = await db.select().from(pagesTable).where(sql`${pagesTable.id} = ANY(${fromIds})`);
  res.json(pages);
});

// Get page graph
router.get("/:pageId/graph", async (req, res) => {
  const depth = parseInt(req.query.depth as string) || 2;
  const page = await db.query.pagesTable.findFirst({ where: eq(pagesTable.id, req.params.pageId) });
  if (!page) return res.status(404).json({ error: "Not found" });

  const links = await db.select().from(pageLinksTable).where(
    or(eq(pageLinksTable.fromPageId, req.params.pageId), eq(pageLinksTable.toPageId, req.params.pageId))
  );

  const connectedIds = [...new Set([...links.map(l => l.fromPageId), ...links.map(l => l.toPageId)])];
  const connectedPages = connectedIds.length > 0
    ? await db.select().from(pagesTable).where(sql`${pagesTable.id} = ANY(${connectedIds})`)
    : [];

  const allPages = [page, ...connectedPages.filter(p => p.id !== page.id)];
  const nodes = allPages.map(p => ({
    id: p.id, label: p.title, type: p.type, icon: p.icon, linkCount: 0, updatedAt: p.updatedAt,
  }));
  const edges = links.map(l => ({ id: l.id, source: l.fromPageId, target: l.toPageId, label: l.linkText || "" }));

  res.json({ nodes, edges });
});

// Get page content
router.get("/:pageId/content", async (req, res) => {
  const page = await db.query.pagesTable.findFirst({ where: eq(pagesTable.id, req.params.pageId) });
  if (!page) return res.status(404).json({ error: "Not found" });
  res.json({ pageId: page.id, content: page.content || { type: "doc", content: [] }, updatedAt: page.updatedAt });
});

// Save page content
router.put("/:pageId/content", async (req, res) => {
  const { content } = req.body;
  await db.update(pagesTable).set({ content, updatedAt: new Date() }).where(eq(pagesTable.id, req.params.pageId));
  const page = await db.query.pagesTable.findFirst({ where: eq(pagesTable.id, req.params.pageId) });
  broadcastEvent("page:content:saved", { pageId: req.params.pageId });
  res.json({ pageId: page!.id, content: page!.content, updatedAt: page!.updatedAt });
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
