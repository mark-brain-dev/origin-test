import { Router } from "express";
import { db, pagesTable, pageLinksTable } from "@workspace/db";
import { eq, or, sql, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";

const router = Router();

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
  res.json(page);
});

// Delete page
router.delete("/:pageId", async (req, res) => {
  await db.delete(pagesTable).where(eq(pagesTable.id, req.params.pageId));
  res.status(204).end();
});

// Get backlinks
router.get("/:pageId/backlinks", async (req, res) => {
  const links = await db.select().from(pageLinksTable).where(eq(pageLinksTable.toPageId, req.params.pageId));
  const fromIds = links.map(l => l.fromPageId);
  if (fromIds.length === 0) return res.json([]);
  const pages = await db.select().from(pagesTable).where(inArray(pagesTable.id, fromIds));
  res.json(pages);
});

// Get page graph
router.get("/:pageId/graph", async (req, res) => {
  const page = await db.query.pagesTable.findFirst({ where: eq(pagesTable.id, req.params.pageId) });
  if (!page) return res.status(404).json({ error: "Not found" });

  const links = await db.select().from(pageLinksTable).where(
    or(eq(pageLinksTable.fromPageId, req.params.pageId), eq(pageLinksTable.toPageId, req.params.pageId))
  );

  const connectedIds = [...new Set([...links.map(l => l.fromPageId), ...links.map(l => l.toPageId)])];
  const connectedPages = connectedIds.length > 0
    ? await db.select().from(pagesTable).where(inArray(pagesTable.id, connectedIds))
    : [];

  const allPages = [page, ...connectedPages.filter(p => p.id !== page.id)];
  const nodes = allPages.map(p => ({ id: p.id, label: p.title, type: p.type, icon: p.icon, linkCount: 0, updatedAt: p.updatedAt }));
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
  res.json({ pageId: page!.id, content: page!.content, updatedAt: page!.updatedAt });
});

export default router;
