import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminSession } from "@/lib/auth/admin";

export async function GET() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("admin_session_id")?.value;

  if (!sessionId) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const session = getAdminSession(sessionId);
  if (!session) {
    return NextResponse.json({ error: "会话已过期" }, { status: 401 });
  }

  return NextResponse.json({
    admin: {
      id: session.adminId,
      username: "admin",
      name: "管理员",
    },
  });
}
