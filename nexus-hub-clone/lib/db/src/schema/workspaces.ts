import { pgTable, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const workspacePlanEnum = pgEnum("workspace_plan", ["free", "pro", "team"]);
export const workspaceMemberRoleEnum = pgEnum("workspace_member_role", ["owner", "admin", "member", "viewer"]);

export const workspacesTable = pgTable("workspaces", {
  id: text("id").primaryKey().notNull(),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  description: text("description"),
  iconEmoji: text("icon_emoji").default("🏠"),
  coverUrl: text("cover_url"),
  ownerId: text("owner_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  plan: workspacePlanEnum("plan").default("free").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const workspaceMembersTable = pgTable("workspace_members", {
  id: text("id").primaryKey().notNull(),
  workspaceId: text("workspace_id").notNull().references(() => workspacesTable.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  role: workspaceMemberRoleEnum("role").default("member").notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

export const insertWorkspaceSchema = createInsertSchema(workspacesTable).omit({ createdAt: true, updatedAt: true });
export const insertWorkspaceMemberSchema = createInsertSchema(workspaceMembersTable).omit({ joinedAt: true });

export type InsertWorkspace = z.infer<typeof insertWorkspaceSchema>;
export type Workspace = typeof workspacesTable.$inferSelect;
export type WorkspaceMember = typeof workspaceMembersTable.$inferSelect;
