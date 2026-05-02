import { Router } from "express";
import { db, databasesTable, dbPropertiesTable, dbRowsTable, tagsTable, templatesTable, activityTable, workspacesTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

const router = Router();

router.get("/:databaseId", async (req, res) => {
  const database = await db.query.databasesTable.findFirst({ where: eq(databasesTable.id, req.params.databaseId) });
  if (!database) return res.status(404).json({ error: "Not found" });
  const properties = await db.select().from(dbPropertiesTable).where(eq(dbPropertiesTable.databaseId, database.id));
  res.json({ ...database, properties });
});

router.patch("/:databaseId", async (req, res) => {
  const { name, defaultView } = req.body;
  await db.update(databasesTable).set({ ...(name && { name }), ...(defaultView && { defaultView }), updatedAt: new Date() })
    .where(eq(databasesTable.id, req.params.databaseId));
  const database = await db.query.databasesTable.findFirst({ where: eq(databasesTable.id, req.params.databaseId) });
  const props = await db.select().from(dbPropertiesTable).where(eq(dbPropertiesTable.databaseId, req.params.databaseId));
  res.json({ ...database, properties: props });
});

router.get("/:databaseId/rows", async (req, res) => {
  const rows = await db.select().from(dbRowsTable)
    .where(eq(dbRowsTable.databaseId, req.params.databaseId))
    .orderBy(dbRowsTable.order);
  res.json({ rows, total: rows.length, grouped: {} });
});

router.post("/:databaseId/rows", async (req, res) => {
  const { properties } = req.body;
  const id = randomUUID();
  const existing = await db.select().from(dbRowsTable).where(eq(dbRowsTable.databaseId, req.params.databaseId));
  await db.insert(dbRowsTable).values({ id, databaseId: req.params.databaseId, properties: properties || {}, order: existing.length });
  const row = await db.query.dbRowsTable.findFirst({ where: eq(dbRowsTable.id, id) });
  res.status(201).json(row);
});

router.patch("/:databaseId/rows/:rowId", async (req, res) => {
  const { properties } = req.body;
  await db.update(dbRowsTable).set({ properties, updatedAt: new Date() }).where(eq(dbRowsTable.id, req.params.rowId));
  const row = await db.query.dbRowsTable.findFirst({ where: eq(dbRowsTable.id, req.params.rowId) });
  res.json(row);
});

router.delete("/:databaseId/rows/:rowId", async (req, res) => {
  await db.delete(dbRowsTable).where(eq(dbRowsTable.id, req.params.rowId));
  res.status(204).end();
});

router.get("/tags/:workspaceId", async (req, res) => {
  const tags = await db.select().from(tagsTable).where(eq(tagsTable.workspaceId, req.params.workspaceId));
  res.json(tags.map(t => ({ ...t, pageCount: 0 })));
});

router.get("/templates", async (req, res) => {
  const BUILT_IN_TEMPLATES = [
    { id: "meeting-notes", name: "Meeting Notes", description: "Capture meeting agenda, notes, and action items", category: "productivity", icon: "📝", pageType: "page", isBuiltIn: true },
    { id: "project-plan", name: "Project Plan", description: "Plan a project with goals, milestones, and tasks", category: "productivity", icon: "📁", pageType: "project", isBuiltIn: true },
    { id: "wiki-article", name: "Wiki Article", description: "Create a structured knowledge base article", category: "knowledge", icon: "📚", pageType: "wiki", isBuiltIn: true },
    { id: "daily-journal", name: "Daily Journal", description: "Daily reflection and notes template", category: "personal", icon: "📅", pageType: "daily", isBuiltIn: true },
    { id: "product-roadmap", name: "Product Roadmap", description: "Visualize your product roadmap with a database", category: "product", icon: "🗺️", pageType: "database", isBuiltIn: true },
    { id: "okr-tracker", name: "OKR Tracker", description: "Track Objectives and Key Results", category: "productivity", icon: "🎯", pageType: "database", isBuiltIn: true },
    { id: "reading-list", name: "Reading List", description: "Track books, articles, and resources", category: "personal", icon: "📖", pageType: "database", isBuiltIn: true },
    { id: "content-calendar", name: "Content Calendar", description: "Plan and schedule content publishing", category: "marketing", icon: "📅", pageType: "database", isBuiltIn: true },
  ];
  const userTemplates = await db.select().from(templatesTable);
  res.json([...BUILT_IN_TEMPLATES, ...userTemplates]);
});

router.get("/activity/:workspaceId", async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 20;
  const activities = await db.select().from(activityTable)
    .where(eq(activityTable.workspaceId, req.params.workspaceId))
    .orderBy(desc(activityTable.createdAt))
    .limit(limit);
  res.json(activities);
});

export default router;
