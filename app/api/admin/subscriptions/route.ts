import { NextRequest, NextResponse } from "next/server";
import { eq, desc, and, like, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { subscriptions, users, subscriptionPlans } from "@/lib/db/schema-drizzle";
import { requireAdminAuth } from "@/lib/auth/admin-middleware";

const updateSchema = z.object({
  status: z.enum(["active", "expired", "cancelled", "pending"]).optional(),
  autoRenew: z.boolean().optional(),
  endDate: z.string().optional(),
});

// 获取订阅列表
export async function GET(request: NextRequest) {
  const authError = await requireAdminAuth(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");
    const status = searchParams.get("status") || "";
    const search = searchParams.get("search") || "";

    const offset = (page - 1) * pageSize;

    // 构建查询
    let query = db
      .select({
        id: subscriptions.id,
        userId: subscriptions.userId,
        planId: subscriptions.planId,
        status: subscriptions.status,
        startDate: subscriptions.startDate,
        endDate: subscriptions.endDate,
        autoRenew: subscriptions.autoRenew,
        createdAt: subscriptions.createdAt,
        userName: users.name,
        userEmail: users.email,
        planName: subscriptionPlans.name,
      })
      .from(subscriptions)
      .leftJoin(users, eq(subscriptions.userId, users.id))
      .leftJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
      .orderBy(desc(subscriptions.createdAt))
      .limit(pageSize)
      .offset(offset);

    // 获取总数
    const [totalResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(subscriptions);

    const result = await query;

    return NextResponse.json({
      data: result,
      total: totalResult.count,
      page,
      pageSize,
      totalPages: Math.ceil(totalResult.count / pageSize),
    });
  } catch (error) {
    console.error("Get subscriptions error:", error);
    return NextResponse.json({ error: "获取订阅列表失败" }, { status: 500 });
  }
}

// 更新订阅
export async function PATCH(request: NextRequest) {
  const authError = await requireAdminAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { id, ...updates } = body;
    const data = updateSchema.parse(updates);

    if (!id) {
      return NextResponse.json({ error: "缺少订阅 ID" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };
    if (data.status) updateData.status = data.status;
    if (data.autoRenew !== undefined) updateData.autoRenew = data.autoRenew;
    if (data.endDate) updateData.endDate = new Date(data.endDate);

    await db
      .update(subscriptions)
      .set(updateData)
      .where(eq(subscriptions.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("Update subscription error:", error);
    return NextResponse.json({ error: "更新订阅失败" }, { status: 500 });
  }
}
