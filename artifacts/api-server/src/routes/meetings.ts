import { Router } from "express";
import { db, meetingsTable, workspacesTable, usersTable, workspaceMembersTable } from "@workspace/db";
import { eq, and, gte, lte, inArray } from "drizzle-orm";
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

// List meetings for workspace
router.get("/:workspaceId/meetings", async (req, res) => {
  const clerkId = (req as any).auth?.userId || "demo-user";
  const user = await getOrCreateUser(clerkId);
  const { workspaceId } = req.params;
  const { start, end } = req.query;

  let query = db.select().from(meetingsTable)
    .where(and(
      eq(meetingsTable.workspaceId, workspaceId),
      eq(meetingsTable.userId, user.id)
    ));

  const meetings = await query;

  let filtered = meetings;
  if (start) filtered = filtered.filter(m => new Date(m.startTime) >= new Date(start as string));
  if (end) filtered = filtered.filter(m => new Date(m.startTime) <= new Date(end as string));

  res.json(filtered.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()));
});

// Create meeting
router.post("/:workspaceId/meetings", async (req, res) => {
  const clerkId = (req as any).auth?.userId || "demo-user";
  const user = await getOrCreateUser(clerkId);
  const { workspaceId } = req.params;
  const { title, description, startTime, endTime, location, attendees, color, isAllDay, pageId } = req.body;

  if (!title || !startTime || !endTime) {
    return res.status(400).json({ error: "title, startTime, endTime are required" });
  }

  const id = randomUUID();
  await db.insert(meetingsTable).values({
    id,
    workspaceId,
    userId: user.id,
    title,
    description: description || null,
    startTime: new Date(startTime),
    endTime: new Date(endTime),
    location: location || null,
    attendees: attendees || [],
    color: color || "#6366f1",
    isAllDay: isAllDay || false,
    pageId: pageId || null,
    calendarSource: "nexus",
    status: "confirmed",
  });

  const meeting = await db.query.meetingsTable.findFirst({ where: eq(meetingsTable.id, id) });
  res.status(201).json(meeting);
});

// Get single meeting
router.get("/:workspaceId/meetings/:meetingId", async (req, res) => {
  const meeting = await db.query.meetingsTable.findFirst({
    where: and(
      eq(meetingsTable.id, req.params.meetingId),
      eq(meetingsTable.workspaceId, req.params.workspaceId)
    )
  });
  if (!meeting) return res.status(404).json({ error: "Not found" });
  res.json(meeting);
});

// Update meeting
router.patch("/:workspaceId/meetings/:meetingId", async (req, res) => {
  const { title, description, startTime, endTime, location, attendees, color, status, isAllDay } = req.body;
  await db.update(meetingsTable)
    .set({
      ...(title && { title }),
      ...(description !== undefined && { description }),
      ...(startTime && { startTime: new Date(startTime) }),
      ...(endTime && { endTime: new Date(endTime) }),
      ...(location !== undefined && { location }),
      ...(attendees && { attendees }),
      ...(color && { color }),
      ...(status && { status }),
      ...(isAllDay !== undefined && { isAllDay }),
      updatedAt: new Date(),
    })
    .where(and(
      eq(meetingsTable.id, req.params.meetingId),
      eq(meetingsTable.workspaceId, req.params.workspaceId)
    ));

  const meeting = await db.query.meetingsTable.findFirst({ where: eq(meetingsTable.id, req.params.meetingId) });
  res.json(meeting);
});

// Delete meeting
router.delete("/:workspaceId/meetings/:meetingId", async (req, res) => {
  await db.delete(meetingsTable).where(and(
    eq(meetingsTable.id, req.params.meetingId),
    eq(meetingsTable.workspaceId, req.params.workspaceId)
  ));
  res.status(204).end();
});

export default router;
