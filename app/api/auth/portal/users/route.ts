import { NextRequest, NextResponse } from "next/server";
import { eq, like, or, and, desc, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema-drizzle";
import { requireAdminAuth } from "@/lib/auth/admin-middleware";

const updateUserSchema = z.object({
  status: z.enum(["active", "suspended"]).optional(),
  name: z.string().min(1).optional(),
});

// 获取用户列表
export async function GET(request: NextRequest) {
  const authError = await requireAdminAuth(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";

    const offset = (page - 1) * pageSize;

    // 构建查询条件
    const conditions = [];
    if (search) {
      conditions.push(
        or(
          like(users.name, `%${search}%`),
          like(users.email, `%${search}%`)
        )
      );
    }
    if (status) {
      conditions.push(eq(users.status, status));
    }

    // 获取总数
    const [totalResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users);

    // 获取列表
    const result = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        status: users.status,
        isAdmin: users.isAdmin,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(users.createdAt))
      .limit(pageSize)
      .offset(offset);

    return NextResponse.json({
      data: result,
      total: totalResult.count,
      page,
      pageSize,
      totalPages: Math.ceil(totalResult.count / pageSize),
    });
  } catch (error) {
    console.error("Get users error:", error);
    return NextResponse.json({ error: "获取用户列表失败" }, { status: 500 });
  }
}

// 更新用户
export async function PATCH(request: NextRequest) {
  const authError = await requireAdminAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { id, ...updates } = body;
    const data = updateUserSchema.parse(updates);

    if (!id) {
      return NextResponse.json({ error: "缺少用户 ID" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };
    if (data.status) updateData.status = data.status;
    if (data.name) updateData.name = data.name;

    await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id));

    // 获取更新后的用户
    const [updated] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        status: users.status,
        isAdmin: users.isAdmin,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, id));

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("Update user error:", error);
    return NextResponse.json({ error: "更新用户失败" }, { status: 500 });
  }
}
