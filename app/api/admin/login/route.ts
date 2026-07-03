import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  verifyAdminLogin,
  createAdminSession,
  createAdminSessionCookie,
} from "@/lib/auth/admin";

const loginSchema = z.object({
  username: z.string().min(1, "请输入用户名"),
  password: z.string().min(1, "请输入密码"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = loginSchema.parse(body);

    const admin = await verifyAdminLogin(data.username, data.password);
    if (!admin) {
      return NextResponse.json(
        { error: "用户名或密码错误" },
        { status: 401 }
      );
    }

    const session = createAdminSession(admin.id);
    const cookie = createAdminSessionCookie(session);

    const response = NextResponse.json({
      success: true,
      admin: {
        id: admin.id,
        username: admin.username,
        name: admin.name,
      },
    });

    response.headers.set("Set-Cookie", cookie);
    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Admin login error:", error);
    return NextResponse.json(
      { error: "登录失败" },
      { status: 500 }
    );
  }
}
