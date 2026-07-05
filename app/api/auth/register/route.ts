import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema-drizzle";
import { createUser, createSession, createSessionCookie } from "@/lib/auth";
import { sendWelcomeEmail } from "@/lib/email/sender";

const registerSchema = z.object({
  email: z.string().email("请输入有效的邮箱"),
  password: z.string().min(6, "密码至少6位"),
  name: z.string().min(1, "请输入名称"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = registerSchema.parse(body);

    // 检查邮箱是否已存在
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, data.email))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "该邮箱已被注册" },
        { status: 400 }
      );
    }

    const user = await createUser(data.email, data.password, data.name);
    const session = createSession(user.id);
    const cookie = createSessionCookie(session);

    // 发送欢迎邮件（异步，不影响注册结果）
    sendWelcomeEmail(user.email || '', user.name || '用户').catch((err) => {
      console.error("发送欢迎邮件失败:", err);
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isAdmin: user.isAdmin,
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
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "注册失败" },
      { status: 500 }
    );
  }
}
