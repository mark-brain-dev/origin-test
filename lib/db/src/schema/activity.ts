import { pgTable, text, timestamp, pgEnum, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { workspacesTable } from "./workspaces";

export const activityTypeEnum = pgEnum("activity_type", [
  "page_created", "page_updated", "page_deleted",
  "database_row_added", "ai_chat", "memory_created"
]);

export const activityTable = pgTable("activity", {
  id: text("id").primaryKey().notNull(),
  type: activityTypeEnum("type").notNull(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  workspaceId: text("workspace_id").notNull().references(() => workspacesTable.id, { onDelete: "cascade" }),
  pageId: text("page_id"),
  pageName: text("page_name"),
  description: text("description").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tagsTable = pgTable("tags", {
  id: text("id").primaryKey().notNull(),
  workspaceId: text("workspace_id").notNull().references(() => workspacesTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: text("color").default("#6366f1"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const templatesTable = pgTable("templates", {
  id: text("id").primaryKey().notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  icon: text("icon"),
  pageType: text("page_type").default("page"),
  content: text("content"),
  isBuiltIn: boolean("is_built_in").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const meetingsTable = pgTable("meetings", {
  id: text("id").primaryKey().notNull(),
  workspaceId: text("workspace_id").notNull().references(() => workspacesTable.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  location: text("location"),
  attendees: text("attendees").array().default([]).notNull(),
  calendarSource: text("calendar_source").default("nexus"),
  status: text("status").default("confirmed"),
  color: text("color").default("#6366f1"),
  pageId: text("page_id"),
  isAllDay: boolean("is_all_day").default(false).notNull(),
  recurrence: text("recurrence"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertActivitySchema = createInsertSchema(activityTable).omit({ createdAt: true });
export const insertTagSchema = createInsertSchema(tagsTable).omit({ createdAt: true });
export const insertTemplateSchema = createInsertSchema(templatesTable).omit({ createdAt: true });
export const insertMeetingSchema = createInsertSchema(meetingsTable).omit({ createdAt: true, updatedAt: true });

export type Activity = typeof activityTable.$inferSelect;
export type Tag = typeof tagsTable.$inferSelect;
export type Template = typeof templatesTable.$inferSelect;
export type Meeting = typeof meetingsTable.$inferSelect;
