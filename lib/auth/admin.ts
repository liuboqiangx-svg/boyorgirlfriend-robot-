import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { adminUsers } from "@/lib/db/schema-drizzle";

const SALT_ROUNDS = 10;
const ADMIN_SESSION_COOKIE_NAME = "admin_session_id";
const ADMIN_SESSION_EXPIRY_DAYS = 7;

// 内存会话存储（生产环境应使用 Redis）
const adminSessions = new Map<string, { adminId: string; expiresAt: Date }>();

export interface AdminUser {
  id: string;
  username: string;
  name: string;
  createdAt: Date;
}

export interface AdminSession {
  id: string;
  adminId: string;
  expiresAt: Date;
}

/**
 * 哈希密码
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * 验证密码
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * 创建管理员（初始-setup 用）
 */
export async function createAdmin(
  username: string,
  password: string,
  name: string
): Promise<AdminUser> {
  const id = uuidv4();
  const passwordHash = await hashPassword(password);
  const now = new Date();

  await db.insert(adminUsers).values({
    id,
    username,
    passwordHash,
    name,
    createdAt: now,
  });

  return { id, username, name, createdAt: now };
}

/**
 * 根据用户名获取管理员
 */
export async function getAdminByUsername(
  username: string
): Promise<(AdminUser & { passwordHash: string }) | null> {
  const result = await db
    .select({
      id: adminUsers.id,
      username: adminUsers.username,
      name: adminUsers.name,
      passwordHash: adminUsers.passwordHash,
      createdAt: adminUsers.createdAt,
    })
    .from(adminUsers)
    .where(eq(adminUsers.username, username))
    .limit(1);

  if (result.length === 0) return null;

  const row = result[0];
  return {
    id: row.id,
    username: row.username,
    name: row.name,
    passwordHash: row.passwordHash,
    createdAt: row.createdAt,
  };
}

/**
 * 验证管理员登录
 */
export async function verifyAdminLogin(
  username: string,
  password: string
): Promise<AdminUser | null> {
  const admin = await getAdminByUsername(username);
  if (!admin) return null;

  const isValid = await verifyPassword(password, admin.passwordHash);
  if (!isValid) return null;

  return {
    id: admin.id,
    username: admin.username,
    name: admin.name,
    createdAt: admin.createdAt,
  };
}

/**
 * 创建会话
 */
export function createAdminSession(adminId: string): AdminSession {
  const sessionId = uuidv4();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + ADMIN_SESSION_EXPIRY_DAYS);

  adminSessions.set(sessionId, { adminId, expiresAt });

  return { id: sessionId, adminId, expiresAt };
}

/**
 * 获取会话
 */
export function getAdminSession(sessionId: string): AdminSession | null {
  const session = adminSessions.get(sessionId);
  if (!session) return null;

  if (session.expiresAt < new Date()) {
    adminSessions.delete(sessionId);
    return null;
  }

  return { id: sessionId, ...session };
}

/**
 * 删除会话
 */
export function deleteAdminSession(sessionId: string): void {
  adminSessions.delete(sessionId);
}

/**
 * 从请求中获取管理员会话
 */
export function getAdminSessionFromRequest(request: Request): AdminSession | null {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(";").reduce(
    (acc, cookie) => {
      const [key, value] = cookie.trim().split("=");
      acc[key] = value;
      return acc;
    },
    {} as Record<string, string>
  );

  const sessionId = cookies[ADMIN_SESSION_COOKIE_NAME];
  if (!sessionId) return null;

  return getAdminSession(sessionId);
}

/**
 * 生成 Set-Cookie 头
 */
export function createAdminSessionCookie(session: AdminSession): string {
  const maxAge = Math.floor(
    (session.expiresAt.getTime() - Date.now()) / 1000
  );
  return `${ADMIN_SESSION_COOKIE_NAME}=${session.id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
}

/**
 * 生成删除会话的 Cookie
 */
export function deleteAdminSessionCookie(): string {
  return `${ADMIN_SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export { ADMIN_SESSION_COOKIE_NAME };
