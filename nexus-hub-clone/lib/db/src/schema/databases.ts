import { pgTable, text, timestamp, integer, json, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { pagesTable } from "./pages";

export const dbViewEnum = pgEnum("db_view", ["table", "kanban", "calendar", "gallery", "list"]);
export const dbPropertyTypeEnum = pgEnum("db_property_type", [
  "text", "number", "select", "multi_select", "date", "checkbox",
  "url", "email", "phone", "relation", "formula", "rollup",
  "person", "file", "created_time", "updated_time"
]);

export const databasesTable = pgTable("databases", {
  id: text("id").primaryKey().notNull(),
  pageId: text("page_id").notNull().references(() => pagesTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  defaultView: dbViewEnum("default_view").default("table").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const dbPropertiesTable = pgTable("db_properties", {
  id: text("id").primaryKey().notNull(),
  databaseId: text("database_id").notNull().references(() => databasesTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: dbPropertyTypeEnum("type").notNull(),
  options: json("options"),
  order: integer("order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const dbRowsTable = pgTable("db_rows", {
  id: text("id").primaryKey().notNull(),
  databaseId: text("database_id").notNull().references(() => databasesTable.id, { onDelete: "cascade" }),
  properties: json("properties").notNull().default({}),
  order: integer("order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertDatabaseSchema = createInsertSchema(databasesTable).omit({ createdAt: true, updatedAt: true });
export const insertDbRowSchema = createInsertSchema(dbRowsTable).omit({ createdAt: true, updatedAt: true });

export type Database = typeof databasesTable.$inferSelect;
export type DbProperty = typeof dbPropertiesTable.$inferSelect;
export type DbRow = typeof dbRowsTable.$inferSelect;
