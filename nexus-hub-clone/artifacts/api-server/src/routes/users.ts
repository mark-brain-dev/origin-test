import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

const router = Router();

router.get("/me", async (req, res) => {
  const clerkId = (req as any).auth?.userId || "demo-user";

  let user = await db.query.usersTable.findFirst({
    where: eq(usersTable.clerkId, clerkId),
  });

  if (!user) {
    const newUser = {
      id: randomUUID(),
      clerkId,
      email: "demo@nexusos.app",
      name: "Demo User",
      avatarUrl: null,
      bio: null,
    };
    await db.insert(usersTable).values(newUser);
    user = await db.query.usersTable.findFirst({ where: eq(usersTable.clerkId, clerkId) });
  }

  res.json(user);
});

router.patch("/me", async (req, res) => {
  const clerkId = (req as any).auth?.userId || "demo-user";
  const { name, bio, avatarUrl } = req.body;

  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.clerkId, clerkId) });
  if (!user) return res.status(404).json({ error: "User not found" });

  await db.update(usersTable).set({ name, bio, avatarUrl, updatedAt: new Date() }).where(eq(usersTable.id, user.id));
  const updated = await db.query.usersTable.findFirst({ where: eq(usersTable.id, user.id) });
  res.json(updated);
});

export default router;
