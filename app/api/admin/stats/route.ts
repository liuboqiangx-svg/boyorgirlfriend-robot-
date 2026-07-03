import { NextRequest, NextResponse } from "next/server";
import { count, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users, subscriptions, payments, messages } from "@/lib/db/schema-drizzle";
import { requireAdminAuth } from "@/lib/auth/admin-middleware";

export async function GET(request: NextRequest) {
  // 管理员验证
  const authError = await requireAdminAuth(request);
  if (authError) return authError;

  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // 用户统计
    const [userStats] = await db
      .select({
        total: count(),
      })
      .from(users);

    const [todayUsers] = await db
      .select({
        count: count(),
      })
      .from(users)
      .where(gte(users.createdAt, todayStart));

    // 订阅统计
    const [subscriptionStats] = await db
      .select({
        total: count(),
      })
      .from(subscriptions);

    const [activeSubscriptions] = await db
      .select({
        count: count(),
      })
      .from(subscriptions)
      .where(sql`${subscriptions.status} = 'active'`);

    // 支付统计
    const [paymentStats] = await db
      .select({
        total: count(),
      })
      .from(payments);

    const [completedPayments] = await db
      .select({
        count: count(),
      })
      .from(payments)
      .where(sql`${payments.status} = 'completed'`);

    // 计算总收入
    const revenueResult = await db
      .select({
        total: sql<string>`COALESCE(SUM(CAST(${payments.amount} AS DECIMAL)), 0)`,
      })
      .from(payments)
      .where(sql`${payments.status} = 'completed'`);

    // 消息统计
    const [messageStats] = await db
      .select({
        total: count(),
      })
      .from(messages);

    return NextResponse.json({
      users: {
        total: userStats.total,
        today: todayUsers.count,
      },
      subscriptions: {
        total: subscriptionStats.total,
        active: activeSubscriptions.count,
      },
      payments: {
        total: paymentStats.total,
        completed: completedPayments.count,
        revenue: parseFloat(revenueResult[0].total) || 0,
      },
      messages: {
        total: messageStats.total,
      },
    });
  } catch (error) {
    console.error("Stats error:", error);
    return NextResponse.json({ error: "获取统计数据失败" }, { status: 500 });
  }
}
