import { NextRequest, NextResponse } from "next/server";
import { eq, desc, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { payments, users, subscriptions } from "@/lib/db/schema-drizzle";
import { requireAdminAuth } from "@/lib/auth/admin-middleware";

const updateSchema = z.object({
  status: z.enum(["pending", "completed", "failed", "refunded"]).optional(),
});

// 获取支付列表
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

    // 获取总数
    const [totalResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(payments);

    // 获取列表
    const result = await db
      .select({
        id: payments.id,
        userId: payments.userId,
        subscriptionId: payments.subscriptionId,
        orderNo: payments.orderNo,
        amount: payments.amount,
        currency: payments.currency,
        paymentMethod: payments.paymentMethod,
        status: payments.status,
        paymentTime: payments.paymentTime,
        createdAt: payments.createdAt,
        userName: users.name,
        userEmail: users.email,
      })
      .from(payments)
      .leftJoin(users, eq(payments.userId, users.id))
      .orderBy(desc(payments.createdAt))
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
    console.error("Get payments error:", error);
    return NextResponse.json({ error: "获取支付列表失败" }, { status: 500 });
  }
}

// 更新支付状态
export async function PATCH(request: NextRequest) {
  const authError = await requireAdminAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { id, ...updates } = body;
    const data = updateSchema.parse(updates);

    if (!id) {
      return NextResponse.json({ error: "缺少支付 ID" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };
    if (data.status) {
      updateData.status = data.status;
      if (data.status === "completed") {
        updateData.paymentTime = new Date();
      }
    }

    await db
      .update(payments)
      .set(updateData)
      .where(eq(payments.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("Update payment error:", error);
    return NextResponse.json({ error: "更新支付失败" }, { status: 500 });
  }
}
