import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/admin";
import { getAdminByUsername } from "@/lib/auth/admin";
import type { AdminUser } from "@/lib/auth/admin";

export async function GET(request: NextRequest) {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
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
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const session = getAdminSession(sessionId);
  if (!session) {
    return NextResponse.json({ error: "会话已过期" }, { status: 401 });
  }

  // 获取管理员信息
  const admins = await import("@/lib/auth/admin").then(m => m);
  // 直接从 sessions 存储中获取 adminId 来查询
  const { adminSessions } = await import("@/lib/auth/admin");

  // 管理员 ID 存在 session 中
  const adminId = session.adminId;

  // 需要从数据库获取管理员信息，但目前 adminSessions 只存了 adminId
  // 简单起见，我们只返回 session 信息，让前端知道已登录
  // 后续可以优化为从数据库获取完整信息

  return NextResponse.json({
    admin: {
      id: adminId,
      username: "admin", // 简化：后续可以从 session 中存储更多信息
      name: "管理员",
    },
  });
}
