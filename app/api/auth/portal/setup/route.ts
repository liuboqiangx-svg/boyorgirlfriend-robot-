import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { adminUsers } from "@/lib/db/schema-drizzle";
import { createAdmin } from "@/lib/auth/admin";
import { eq } from "drizzle-orm";
import crypto from "crypto";

// 允许设置管理员密钥（通过环境变量配置）
const ADMIN_SETUP_SECRET = process.env.ADMIN_SETUP_SECRET || "dev-setup-secret";

const setupSchema = z.object({
  username: z.string().min(3, "用户名至少3位"),
  password: z.string().min(6, "密码至少6位"),
  name: z.string().min(1, "请输入管理员名称"),
  secret: z.string().min(1),
});

/**
 * 初始化管理员账号
 * 首次设置后台管理员时调用
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = setupSchema.parse(body);

    // 验证密钥
    if (data.secret !== ADMIN_SETUP_SECRET) {
      return NextResponse.json(
        { error: "无效的设置密钥" },
        { status: 403 }
      );
    }

    // 检查是否已有管理员
    const existing = await db
      .select({ id: adminUsers.id })
      .from(adminUsers)
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "管理员已存在，请使用已有账号登录" },
        { status: 400 }
      );
    }

    // 创建管理员
    const admin = await createAdmin(data.username, data.password, data.name);

    return NextResponse.json({
      success: true,
      admin: {
        id: admin.id,
        username: admin.username,
        name: admin.name,
      },
      message: "管理员创建成功",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Admin setup error:", error);
    return NextResponse.json(
      { error: "设置失败" },
      { status: 500 }
    );
  }
}
