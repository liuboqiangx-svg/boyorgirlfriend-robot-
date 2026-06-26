import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  unique,
} from "drizzle-orm/pg-core";

/**
 * 用户表
 */
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/**
 * 角色配置表
 */
export const characters = pgTable("characters", {
  id: text("id").primaryKey(),
  configJson: jsonb("config_json").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/**
 * 消息表
 */
export const messages = pgTable("messages", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  characterId: text("character_id").notNull(),
  role: text("role").notNull(), // 'user' | 'character'
  content: text("content").notNull(),
  type: text("type").default("text").notNull(), // 'text' | 'voice' | 'image' | 'sticker'
  mediaUrl: text("media_url"),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/**
 * 记忆表
 */
export const memories = pgTable(
  "memories",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    characterId: text("character_id").notNull(),
    category: text("category").notNull(), // 'user_fact' | 'relationship' | 'preference' | 'habit'
    key: text("key").notNull(),
    value: text("value").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    uniq: unique().on(table.userId, table.characterId, table.category, table.key),
  })
);

/**
 * 角色状态表
 */
export const characterStates = pgTable(
  "character_states",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    characterId: text("character_id").notNull(),
    mood: text("mood").default("calm").notNull(),
    intimacy: integer("intimacy").default(10).notNull(),
    moodIntensity: integer("mood_intensity"),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
    nextProactiveAt: timestamp("next_proactive_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    uniq: unique().on(table.userId, table.characterId),
  })
);
