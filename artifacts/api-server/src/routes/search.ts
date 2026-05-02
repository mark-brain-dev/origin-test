import { Router } from "express";
import { db, pagesTable } from "@workspace/db";
import { eq, and, ilike, or } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res) => {
  const { q, workspaceId, type, limit } = req.query;
  if (!q || typeof q !== "string") return res.json({ pages: [], total: 0, query: "" });

  const limitNum = parseInt(limit as string) || 20;
  const query = q.toLowerCase();

  let where: any = or(ilike(pagesTable.title, `%${query}%`), ilike(pagesTable.excerpt, `%${query}%`));
  if (workspaceId) where = and(where, eq(pagesTable.workspaceId, workspaceId as string));

  const pages = await db.select().from(pagesTable).where(where).limit(limitNum);

  const results = pages.map(p => ({
    id: p.id,
    type: "page",
    title: p.title,
    excerpt: p.excerpt || "",
    icon: p.icon,
    workspaceId: p.workspaceId,
    parentId: p.parentId,
    updatedAt: p.updatedAt,
    score: p.title.toLowerCase().includes(query) ? 1.0 : 0.7,
  }));

  res.json({ pages: results, total: results.length, query: q });
});

export default router;
