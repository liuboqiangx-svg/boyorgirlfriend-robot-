import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  unique,
  decimal,
} from "drizzle-orm/pg-core";

/**
 * 用户表（已扩展支持订阅）
 */
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").unique(),                    // 登录邮箱
  passwordHash: text("password_hash"),              // 密码哈希
  name: text("name").notNull(),                     // 显示名称
  isAdmin: boolean("is_admin").default(false),     // 是否管理员
  status: text("status").default("active"),       // active/suspended
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/**
 * 订阅套餐表
 */
export const subscriptionPlans = pgTable("subscription_plans", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),                     // 套餐名称
  description: text("description"),                  // 套餐描述
  price: decimal("price", { precision: 10, scale: 2 }).notNull(), // 价格
  durationDays: integer("duration_days").notNull(), // 有效期天数
  features: jsonb("features").default([]),         // 功能列表
  isActive: boolean("is_active").default(true),    // 是否启用
  sortOrder: integer("sort_order").default(0),     // 排序
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/**
 * 用户订阅表
 */
export const subscriptions = pgTable(
  "subscriptions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    planId: text("plan_id")
      .notNull()
      .references(() => subscriptionPlans.id),
    status: text("status").default("active"),     // active/expired/cancelled/pending
    startDate: timestamp("start_date", { withTimezone: true }),
    endDate: timestamp("end_date", { withTimezone: true }),
    autoRenew: boolean("auto_renew").default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userIdx: unique().on(table.userId, table.planId),
  })
);

/**
 * 支付记录表
 */
export const payments = pgTable(
  "payments",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    subscriptionId: text("subscription_id").references(
      () => subscriptions.id,
      { onDelete: "set null" }
    ),
    orderNo: text("order_no").unique(),            // 订单号
    amount: decimal("amount", { precision: 10, scale: 2 }).notNull(), // 金额
    currency: text("currency").default("CNY"),     // 币种
    paymentMethod: text("payment_method"),         // 支付方式
    status: text("status").default("pending"),     // pending/completed/failed/refunded
    paymentTime: timestamp("payment_time", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  }
);

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
 * 管理员用户表（独立于普通用户）
 */
export const adminUsers = pgTable("admin_users", {
  id: text("id").primaryKey(),
  username: text("username").unique().notNull(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

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
