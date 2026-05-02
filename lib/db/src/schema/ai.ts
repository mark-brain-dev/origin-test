import { pgTable, text, timestamp, boolean, integer, json, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { pagesTable } from "./pages";

export const aiAuthTypeEnum = pgEnum("ai_auth_type", ["api_key", "session_cookie", "oauth"]);
export const memoryTypeEnum = pgEnum("memory_type", ["short_term", "long_term", "skill", "preference"]);

export const aiProvidersTable = pgTable("ai_providers", {
  id: text("id").primaryKey().notNull(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  provider: text("provider").notNull(),
  baseUrl: text("base_url").notNull(),
  model: text("model"),
  authType: aiAuthTypeEnum("auth_type").notNull(),
  apiKeyEncrypted: text("api_key_encrypted"),
  sessionCookieEncrypted: text("session_cookie_encrypted"),
  isActive: boolean("is_active").default(true).notNull(),
  isDefault: boolean("is_default").default(false).notNull(),
  capabilities: text("capabilities").array().default([]).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const aiConversationsTable = pgTable("ai_conversations", {
  id: text("id").primaryKey().notNull(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  pageId: text("page_id").references(() => pagesTable.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  messageCount: integer("message_count").default(0).notNull(),
  lastMessage: text("last_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const aiMessagesTable = pgTable("ai_messages", {
  id: text("id").primaryKey().notNull(),
  conversationId: text("conversation_id").notNull().references(() => aiConversationsTable.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  providerId: text("provider_id"),
  tokensUsed: integer("tokens_used"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const memoriesTable = pgTable("memories", {
  id: text("id").primaryKey().notNull(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  type: memoryTypeEnum("type").notNull(),
  source: text("source"),
  importance: integer("importance").default(5).notNull(),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const skillsTable = pgTable("skills", {
  id: text("id").primaryKey().notNull(),
  userId: text("user_id").references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  prompt: text("prompt").notNull(),
  icon: text("icon"),
  isBuiltIn: boolean("is_built_in").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAiProviderSchema = createInsertSchema(aiProvidersTable).omit({ createdAt: true, updatedAt: true });
export const insertMemorySchema = createInsertSchema(memoriesTable).omit({ createdAt: true });
export const insertSkillSchema = createInsertSchema(skillsTable).omit({ createdAt: true });

export type AiProvider = typeof aiProvidersTable.$inferSelect;
export type Memory = typeof memoriesTable.$inferSelect;
export type Skill = typeof skillsTable.$inferSelect;
export type AiConversation = typeof aiConversationsTable.$inferSelect;
export type AiMessage = typeof aiMessagesTable.$inferSelect;
