import { pgTable, text, timestamp, boolean, integer, json, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { workspacesTable } from "./workspaces";

export const pageTypeEnum = pgEnum("page_type", ["page", "database", "wiki", "project", "daily", "canvas"]);

export const pagesTable = pgTable("pages", {
  id: text("id").primaryKey().notNull(),
  title: text("title").notNull().default("Untitled"),
  slug: text("slug").notNull(),
  type: pageTypeEnum("type").default("page").notNull(),
  icon: text("icon"),
  coverUrl: text("cover_url"),
  parentId: text("parent_id"),
  workspaceId: text("workspace_id").notNull().references(() => workspacesTable.id, { onDelete: "cascade" }),
  authorId: text("author_id").notNull().references(() => usersTable.id),
  content: json("content"),
  isPublished: boolean("is_published").default(false).notNull(),
  isFavorite: boolean("is_favorite").default(false).notNull(),
  isArchived: boolean("is_archived").default(false).notNull(),
  tags: text("tags").array().default([]).notNull(),
  excerpt: text("excerpt"),
  wordCount: integer("word_count").default(0).notNull(),
  linkCount: integer("link_count").default(0).notNull(),
  order: integer("order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const pageLinksTable = pgTable("page_links", {
  id: text("id").primaryKey().notNull(),
  fromPageId: text("from_page_id").notNull().references(() => pagesTable.id, { onDelete: "cascade" }),
  toPageId: text("to_page_id").notNull().references(() => pagesTable.id, { onDelete: "cascade" }),
  linkText: text("link_text"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPageSchema = createInsertSchema(pagesTable).omit({ createdAt: true, updatedAt: true });
export const insertPageLinkSchema = createInsertSchema(pageLinksTable).omit({ createdAt: true });

export type InsertPage = z.infer<typeof insertPageSchema>;
export type Page = typeof pagesTable.$inferSelect;
export type PageLink = typeof pageLinksTable.$inferSelect;
