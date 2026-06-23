import Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import { join } from "path";
import {
  CharacterProfile,
  CharacterState,
  Memory,
  Message,
  MessageType,
  User,
} from "@/types";

const dbPath = join(process.cwd(), "paper-partner.db");
const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS characters (
      id TEXT PRIMARY KEY,
      config_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      character_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'text',
      media_url TEXT,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS memories (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      character_id TEXT NOT NULL,
      category TEXT NOT NULL,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(user_id, character_id, category, key)
    );

    CREATE TABLE IF NOT EXISTS character_states (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      character_id TEXT NOT NULL,
      mood TEXT NOT NULL DEFAULT 'calm',
      intimacy INTEGER NOT NULL DEFAULT 10,
      last_message_at TEXT,
      next_proactive_at TEXT,
      updated_at TEXT NOT NULL,
      UNIQUE(user_id, character_id)
    );
  `);
}

export function getOrCreateUser(name = "主人", userId?: string): User {
  if (userId) {
    const existing = db.prepare("SELECT * FROM users WHERE id = ?").get(userId) as
      | User
      | undefined;
    if (existing) return existing;
  }

  const user: User = {
    id: userId ?? uuidv4(),
    name,
    created_at: new Date().toISOString(),
  };
  db.prepare("INSERT INTO users (id, name, created_at) VALUES (?, ?, ?)").run(
    user.id,
    user.name,
    user.created_at
  );
  return user;
}

export function saveCharacter(character: CharacterProfile) {
  db.prepare(
    "INSERT OR REPLACE INTO characters (id, config_json) VALUES (?, ?)"
  ).run(character.id, JSON.stringify(character));
}

export function getCharacter(id: string): CharacterProfile | undefined {
  const row = db
    .prepare("SELECT config_json FROM characters WHERE id = ?")
    .get(id) as { config_json: string } | undefined;
  if (!row) return undefined;
  return JSON.parse(row.config_json) as CharacterProfile;
}

export function insertMessage(
  message: Omit<Message, "id" | "created_at" | "is_read"
> & { is_read?: boolean }
): Message {
  const id = uuidv4();
  const created_at = new Date().toISOString();
  const is_read = message.is_read ?? false;
  db.prepare(
    "INSERT INTO messages (id, user_id, character_id, role, content, type, media_url, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(
    id,
    message.user_id,
    message.character_id,
    message.role,
    message.content,
    message.type,
    message.media_url ?? null,
    is_read ? 1 : 0,
    created_at
  );
  return {
    ...message,
    id,
    created_at,
    is_read,
  } as Message;
}

export function getMessages(
  userId: string,
  characterId: string,
  limit = 100
): Message[] {
  return db
    .prepare(
      "SELECT * FROM messages WHERE user_id = ? AND character_id = ? ORDER BY created_at DESC LIMIT ?"
    )
    .all(userId, characterId, limit)
    .map(parseMessage)
    .reverse();
}

export function markMessagesAsRead(userId: string, characterId: string) {
  db.prepare(
    "UPDATE messages SET is_read = 1 WHERE user_id = ? AND character_id = ? AND role = 'character' AND is_read = 0"
  ).run(userId, characterId);
}

function parseMessage(row: unknown): Message {
  const r = row as Record<string, unknown>;
  return {
    id: r.id as string,
    user_id: r.user_id as string,
    character_id: r.character_id as string,
    role: r.role as "user" | "character",
    content: r.content as string,
    type: r.type as MessageType,
    media_url: (r.media_url as string | null) ?? undefined,
    is_read: Boolean(r.is_read as number),
    created_at: r.created_at as string,
  };
}

export function upsertMemory(
  userId: string,
  characterId: string,
  category: Memory["category"],
  key: string,
  value: string
): Memory {
  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO memories (id, user_id, character_id, category, key, value, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id, character_id, category, key)
     DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
  ).run(id, userId, characterId, category, key, value, now, now);

  return {
    id,
    user_id: userId,
    character_id: characterId,
    category,
    key,
    value,
    created_at: now,
    updated_at: now,
  };
}

export function getMemories(
  userId: string,
  characterId: string,
  categories?: Memory["category"][]
): Memory[] {
  if (categories && categories.length > 0) {
    const placeholders = categories.map(() => "?").join(",");
    return db
      .prepare(
        `SELECT * FROM memories WHERE user_id = ? AND character_id = ? AND category IN (${placeholders}) ORDER BY updated_at DESC`
      )
      .all(userId, characterId, ...categories)
      .map(parseMemory);
  }
  return db
    .prepare(
      "SELECT * FROM memories WHERE user_id = ? AND character_id = ? ORDER BY updated_at DESC"
    )
    .all(userId, characterId)
    .map(parseMemory);
}

function parseMemory(row: unknown): Memory {
  const r = row as Record<string, unknown>;
  return {
    id: r.id as string,
    user_id: r.user_id as string,
    character_id: r.character_id as string,
    category: r.category as Memory["category"],
    key: r.key as string,
    value: r.value as string,
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
  };
}

export function getCharacterState(
  userId: string,
  characterId: string
): CharacterState | undefined {
  const row = db
    .prepare("SELECT * FROM character_states WHERE user_id = ? AND character_id = ?")
    .get(userId, characterId) as CharacterState | undefined;
  return row;
}

export function updateCharacterState(
  userId: string,
  characterId: string,
  updates: Partial<Omit<CharacterState, "id" | "user_id" | "character_id">>
): CharacterState {
  const existing = getCharacterState(userId, characterId);
  const now = new Date().toISOString();

  if (!existing) {
    const id = uuidv4();
    const newState: CharacterState = {
      id,
      user_id: userId,
      character_id: characterId,
      mood: updates.mood ?? "calm",
      intimacy: updates.intimacy ?? 10,
      last_message_at: updates.last_message_at,
      next_proactive_at: updates.next_proactive_at,
      updated_at: now,
    };
    db.prepare(
      "INSERT INTO character_states (id, user_id, character_id, mood, intimacy, last_message_at, next_proactive_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(
      id,
      userId,
      characterId,
      newState.mood,
      newState.intimacy,
      newState.last_message_at ?? null,
      newState.next_proactive_at ?? null,
      now
    );
    return newState;
  }

  const updated: CharacterState = {
    ...existing,
    ...updates,
    updated_at: now,
  };
  db.prepare(
    "UPDATE character_states SET mood = ?, intimacy = ?, last_message_at = ?, next_proactive_at = ?, updated_at = ? WHERE user_id = ? AND character_id = ?"
  ).run(
    updated.mood,
    updated.intimacy,
    updated.last_message_at ?? null,
    updated.next_proactive_at ?? null,
    now,
    userId,
    characterId
  );
  return updated;
}

export { db };
