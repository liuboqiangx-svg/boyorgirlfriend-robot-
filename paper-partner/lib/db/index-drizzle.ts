/**
 * Drizzle ORM 数据库操作层
 *
 * 迁移自 pg 驱动版本，保持相同的接口
 */

import { eq, desc, and, inArray } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { db } from "./client";
import {
  users,
  characters,
  messages,
  memories,
  characterStates,
} from "./schema-drizzle";
import type {
  CharacterProfile,
  CharacterState,
  Memory,
  Message,
  User,
} from "@/types";

// 数据库是否已初始化
let initialized = false;

/**
 * 初始化数据库（PostgreSQL 表已存在，无需初始化）
 */
export async function initDatabaseAsync(): Promise<void> {
  if (!initialized) {
    // PostgreSQL 表已通过 schema.ts 创建，无需额外初始化
    console.log("[Database] Using PostgreSQL with Drizzle ORM");
    initialized = true;
  }
}

/**
 * 获取或创建用户
 */
export async function getOrCreateUser(
  name = "主人",
  userId?: string
): Promise<User> {
  if (userId) {
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (existing.length > 0) {
      return {
        id: existing[0].id,
        name: existing[0].name,
        created_at: existing[0].createdAt.toISOString(),
      };
    }
  }

  const id = userId ?? uuidv4();
  const createdAt = new Date();

  await db.insert(users).values({
    id,
    name,
    createdAt,
  });

  return {
    id,
    name,
    created_at: createdAt.toISOString(),
  };
}

/**
 * 保存角色配置
 */
export async function saveCharacter(character: CharacterProfile): Promise<void> {
  await db
    .insert(characters)
    .values({
      id: character.id,
      configJson: character as unknown as Record<string, unknown>,
      createdAt: new Date(),
    })
    .onConflictDoUpdate({
      target: characters.id,
      set: {
        configJson: character as unknown as Record<string, unknown>,
      },
    });
}

/**
 * 获取角色配置
 */
export async function getCharacter(
  id: string
): Promise<CharacterProfile | undefined> {
  const result = await db
    .select()
    .from(characters)
    .where(eq(characters.id, id))
    .limit(1);

  if (result.length === 0) return undefined;
  return result[0].configJson as unknown as CharacterProfile;
}

/**
 * 插入消息
 */
export async function insertMessage(
  message: Omit<Message, "id" | "created_at" | "is_read"> & {
    is_read?: boolean;
  }
): Promise<Message> {
  const id = uuidv4();
  const createdAt = new Date();
  const isRead = message.is_read ?? false;

  await db.insert(messages).values({
    id,
    userId: message.user_id,
    characterId: message.character_id,
    role: message.role,
    content: message.content,
    type: message.type,
    mediaUrl: message.media_url ?? null,
    isRead,
    createdAt,
  });

  return {
    ...message,
    id,
    created_at: createdAt.toISOString(),
    is_read: isRead,
  } as Message;
}

/**
 * 获取消息列表
 */
export async function getMessages(
  userId: string,
  characterId: string,
  limit = 100
): Promise<Message[]> {
  const result = await db
    .select()
    .from(messages)
    .where(and(eq(messages.userId, userId), eq(messages.characterId, characterId)))
    .orderBy(desc(messages.createdAt))
    .limit(limit);

  return result
    .reverse()
    .map((row) => ({
      id: row.id,
      user_id: row.userId,
      character_id: row.characterId,
      role: row.role as "user" | "character",
      content: row.content,
      type: row.type as Message["type"],
      media_url: row.mediaUrl ?? undefined,
      is_read: row.isRead,
      created_at: row.createdAt.toISOString(),
    }));
}

/**
 * 标记消息已读
 */
export async function markMessagesAsRead(
  userId: string,
  characterId: string
): Promise<void> {
  await db
    .update(messages)
    .set({ isRead: true })
    .where(
      and(
        eq(messages.userId, userId),
        eq(messages.characterId, characterId),
        eq(messages.role, "character"),
        eq(messages.isRead, false)
      )
    );
}

/**
 * 插入或更新记忆
 */
export async function upsertMemory(
  userId: string,
  characterId: string,
  category: Memory["category"],
  key: string,
  value: string
): Promise<Memory> {
  const now = new Date();

  // 检查是否已存在
  const existing = await db
    .select()
    .from(memories)
    .where(
      and(
        eq(memories.userId, userId),
        eq(memories.characterId, characterId),
        eq(memories.category, category),
        eq(memories.key, key)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    // 更新
    await db
      .update(memories)
      .set({ value, updatedAt: now })
      .where(eq(memories.id, existing[0].id));

    return {
      id: existing[0].id,
      user_id: userId,
      character_id: characterId,
      category,
      key,
      value,
      created_at: existing[0].createdAt.toISOString(),
      updated_at: now.toISOString(),
    };
  }

  // 插入
  const id = uuidv4();
  await db.insert(memories).values({
    id,
    userId,
    characterId,
    category,
    key,
    value,
    createdAt: now,
    updatedAt: now,
  });

  return {
    id,
    user_id: userId,
    character_id: characterId,
    category,
    key,
    value,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  };
}

/**
 * 获取记忆列表
 */
export async function getMemories(
  userId: string,
  characterId: string,
  categories?: Memory["category"][]
): Promise<Memory[]> {
  if (categories && categories.length > 0) {
    const result = await db
      .select()
      .from(memories)
      .where(
        and(
          eq(memories.userId, userId),
          eq(memories.characterId, characterId),
          inArray(memories.category, categories)
        )
      )
      .orderBy(desc(memories.updatedAt));

    return result.map((row) => ({
      id: row.id,
      user_id: row.userId,
      character_id: row.characterId,
      category: row.category as Memory["category"],
      key: row.key,
      value: row.value,
      created_at: row.createdAt.toISOString(),
      updated_at: row.updatedAt.toISOString(),
    }));
  }

  const result = await db
    .select()
    .from(memories)
    .where(and(eq(memories.userId, userId), eq(memories.characterId, characterId)))
    .orderBy(desc(memories.updatedAt));

  return result.map((row) => ({
    id: row.id,
    user_id: row.userId,
    character_id: row.characterId,
    category: row.category as Memory["category"],
    key: row.key,
    value: row.value,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  }));
}

/**
 * 获取角色状态
 */
export async function getCharacterState(
  userId: string,
  characterId: string
): Promise<CharacterState | undefined> {
  const result = await db
    .select()
    .from(characterStates)
    .where(
      and(eq(characterStates.userId, userId), eq(characterStates.characterId, characterId))
    )
    .limit(1);

  if (result.length === 0) return undefined;

  const row = result[0];
  return {
    id: row.id,
    user_id: row.userId,
    character_id: row.characterId,
    mood: row.mood as CharacterState["mood"],
    intimacy: row.intimacy,
    mood_intensity: row.moodIntensity ?? undefined,
    last_message_at: row.lastMessageAt?.toISOString() ?? undefined,
    next_proactive_at: row.nextProactiveAt?.toISOString() ?? undefined,
    updated_at: row.updatedAt.toISOString(),
  };
}

/**
 * 更新角色状态
 */
export async function updateCharacterState(
  userId: string,
  characterId: string,
  updates: Partial<Omit<CharacterState, "id" | "user_id" | "character_id">>
): Promise<CharacterState> {
  const now = new Date();

  // 检查是否已存在
  const existing = await getCharacterState(userId, characterId);

  if (!existing) {
    // 创建新状态
    const id = uuidv4();
    const newState: CharacterState = {
      id,
      user_id: userId,
      character_id: characterId,
      mood: updates.mood ?? "calm",
      intimacy: updates.intimacy ?? 10,
      mood_intensity: updates.mood_intensity,
      last_message_at: updates.last_message_at,
      next_proactive_at: updates.next_proactive_at,
      updated_at: now.toISOString(),
    };

    await db.insert(characterStates).values({
      id,
      userId,
      characterId,
      mood: newState.mood,
      intimacy: newState.intimacy,
      moodIntensity: newState.mood_intensity ?? null,
      lastMessageAt: newState.last_message_at ? new Date(newState.last_message_at) : null,
      nextProactiveAt: newState.next_proactive_at ? new Date(newState.next_proactive_at) : null,
      updatedAt: now,
    });

    return newState;
  }

  // 更新现有状态
  const updated: CharacterState = {
    ...existing,
    ...updates,
    updated_at: now.toISOString(),
  };

  await db
    .update(characterStates)
    .set({
      mood: updated.mood,
      intimacy: updated.intimacy,
      moodIntensity: updated.mood_intensity ?? null,
      lastMessageAt: updated.last_message_at ? new Date(updated.last_message_at) : null,
      nextProactiveAt: updated.next_proactive_at ? new Date(updated.next_proactive_at) : null,
      updatedAt: now,
    })
    .where(eq(characterStates.id, existing.id));

  return updated;
}

// ============ 兼容旧代码（同步版本）============

// 确保数据库已初始化（用于同步调用）
let syncInitialized = false;

export function initDatabaseSync(): void {
  if (!syncInitialized) {
    // 在 Next.js 中，同步初始化应该在 API 路由中调用 initDatabaseAsync
    // 这里只是标记，避免重复调用
    syncInitialized = true;
  }
}

// 兼容旧代码的同步版本（实际是异步，但保持接口一致）
export const getOrCreateUserSync = getOrCreateUser;
export const saveCharacterSync = saveCharacter;
export const getCharacterSync = getCharacter;
export const insertMessageSync = insertMessage;
export const getMessagesSync = getMessages;
export const markMessagesAsReadSync = markMessagesAsRead;
export const upsertMemorySync = upsertMemory;
export const getMemoriesSync = getMemories;
export const getCharacterStateSync = getCharacterState;
export const updateCharacterStateSync = updateCharacterState;
