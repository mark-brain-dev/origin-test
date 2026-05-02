import { Router } from "express";
import { db, workspacesTable, workspaceMembersTable, usersTable, pagesTable, databasesTable, tagsTable, aiConversationsTable, memoriesTable, pageLinksTable } from "@workspace/db";
import { eq, and, count, sql, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";

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

router.get("/", async (req, res) => {
  const clerkId = (req as any).auth?.userId || "demo-user";
  const user = await getOrCreateUser(clerkId);

  const memberships = await db.query.workspaceMembersTable.findMany({
    where: eq(workspaceMembersTable.userId, user.id),
  });

  if (memberships.length === 0) {
    const wsId = randomUUID();
    const slug = `workspace-${Math.random().toString(36).slice(2, 7)}`;
    await db.insert(workspacesTable).values({
      id: wsId, name: "My Workspace", slug, ownerId: user.id, iconEmoji: "🏠",
    });
    await db.insert(workspaceMembersTable).values({
      id: randomUUID(), workspaceId: wsId, userId: user.id, role: "owner",
    });
    await seedDefaultPages(wsId, user.id);
    return res.json(await db.query.workspacesTable.findMany({ where: eq(workspacesTable.ownerId, user.id) }));
  }

  const wsIds = memberships.map(m => m.workspaceId);
  const workspaces = await db.select().from(workspacesTable).where(
    inArray(workspacesTable.id, wsIds)
  );
  res.json(workspaces);
});

router.post("/", async (req, res) => {
  const clerkId = (req as any).auth?.userId || "demo-user";
  const user = await getOrCreateUser(clerkId);
  const { name, slug, description, iconEmoji } = req.body;
  const id = randomUUID();
  const finalSlug = slug || `${name.toLowerCase().replace(/\s+/g, "-")}-${Math.random().toString(36).slice(2, 6)}`;

  await db.insert(workspacesTable).values({ id, name, slug: finalSlug, description, iconEmoji, ownerId: user.id });
  await db.insert(workspaceMembersTable).values({ id: randomUUID(), workspaceId: id, userId: user.id, role: "owner" });
  const ws = await db.query.workspacesTable.findFirst({ where: eq(workspacesTable.id, id) });
  res.status(201).json(ws);
});

router.get("/:workspaceId", async (req, res) => {
  const ws = await db.query.workspacesTable.findFirst({ where: eq(workspacesTable.id, req.params.workspaceId) });
  if (!ws) return res.status(404).json({ error: "Not found" });
  res.json(ws);
});

router.patch("/:workspaceId", async (req, res) => {
  const { name, description, iconEmoji, coverUrl } = req.body;
  await db.update(workspacesTable).set({ name, description, iconEmoji, coverUrl, updatedAt: new Date() })
    .where(eq(workspacesTable.id, req.params.workspaceId));
  const ws = await db.query.workspacesTable.findFirst({ where: eq(workspacesTable.id, req.params.workspaceId) });
  res.json(ws);
});

router.delete("/:workspaceId", async (req, res) => {
  await db.delete(workspacesTable).where(eq(workspacesTable.id, req.params.workspaceId));
  res.status(204).end();
});

router.get("/:workspaceId/stats", async (req, res) => {
  const { workspaceId } = req.params;
  const [pageCount] = await db.select({ count: count() }).from(pagesTable).where(eq(pagesTable.workspaceId, workspaceId));
  const [tagCount] = await db.select({ count: count() }).from(tagsTable).where(eq(tagsTable.workspaceId, workspaceId));
  const [linkCount] = await db.select({ count: count() }).from(pageLinksTable);

  res.json({
    pageCount: Number(pageCount.count),
    databaseCount: 0,
    tagCount: Number(tagCount.count),
    aiInteractionCount: 0,
    linkCount: Number(linkCount.count),
    activeMemoryCount: 0,
  });
});

async function seedDefaultPages(workspaceId: string, authorId: string) {
  const pages = [
    { id: randomUUID(), title: "Getting Started", type: "page" as const, icon: "🚀", order: 0, excerpt: "Welcome to your Nexus OS workspace" },
    { id: randomUUID(), title: "Projects", type: "project" as const, icon: "📁", order: 1, excerpt: "Manage your projects" },
    { id: randomUUID(), title: "Knowledge Base", type: "wiki" as const, icon: "📚", order: 2, excerpt: "Your organization's knowledge base" },
  ];
  for (const p of pages) {
    await db.insert(pagesTable).values({
      ...p, slug: `${p.title.toLowerCase().replace(/\s+/g, "-")}-${Math.random().toString(36).slice(2, 5)}`,
      workspaceId, authorId,
    });
  }
}

export default router;
