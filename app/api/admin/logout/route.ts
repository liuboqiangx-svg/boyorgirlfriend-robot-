import { NextRequest, NextResponse } from "next/server";
import { deleteAdminSession } from "@/lib/auth/admin";

export async function POST(request: NextRequest) {
  const cookieHeader = request.headers.get("cookie");
  if (cookieHeader) {
    const cookies = cookieHeader.split(";").reduce(
      (acc, cookie) => {
        const [key, value] = cookie.trim().split("=");
        acc[key] = value;
        return acc;
      },
      {} as Record<string, string>
    );

    const sessionId = cookies["admin_session_id"];
    if (sessionId) {
      deleteAdminSession(sessionId);
    }
  }

  const response = NextResponse.json({ success: true });
  response.headers.set(
    "Set-Cookie",
    "admin_session_id=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0"
  );
  return response;
}
