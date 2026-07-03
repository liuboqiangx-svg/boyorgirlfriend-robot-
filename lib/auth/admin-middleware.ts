import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAdminSession } from "@/lib/auth/admin";

/**
 * 管理员保护 - 检查是否有有效的后台 Session
 */
export async function requireAdminAuth(request: NextRequest) {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) {
    return NextResponse.json(
      { error: "请先登录后台" },
      { status: 401 }
    );
  }

  const cookies = cookieHeader.split(";").reduce(
    (acc, cookie) => {
      const [key, value] = cookie.trim().split("=");
      acc[key] = value;
      return acc;
    },
    {} as Record<string, string>
  );

  const sessionId = cookies["admin_session_id"];
  if (!sessionId) {
    return NextResponse.json(
      { error: "请先登录后台" },
      { status: 401 }
    );
  }

  const session = getAdminSession(sessionId);
  if (!session) {
    return NextResponse.json(
      { error: "会话已过期，请重新登录" },
      { status: 401 }
    );
  }

  return null; // 通过验证
}

/**
 * 从 NextRequest 获取会话（兼容 Next.js 15）
 */
export function getAdminSessionFromRequest(request: NextRequest) {
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

  const sessionId = cookies["admin_session_id"];
  if (!sessionId) return null;

  return getAdminSession(sessionId);
}
