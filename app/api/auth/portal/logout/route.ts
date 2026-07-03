import { NextResponse } from "next/server";
import { deleteAdminSession } from "@/lib/auth/admin";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set("admin_session_id", "", {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return response;
}
