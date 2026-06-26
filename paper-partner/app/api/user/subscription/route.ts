import { NextRequest, NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { subscriptions, subscriptionPlans } from "@/lib/db/schema-drizzle";
import { getSessionFromCookie } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = getSessionFromCookie(request.headers.get("cookie"));

  if (!session) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  try {
    // 获取用户的最新订阅
    const result = await db
      .select({
        id: subscriptions.id,
        planId: subscriptions.planId,
        status: subscriptions.status,
        startDate: subscriptions.startDate,
        endDate: subscriptions.endDate,
        autoRenew: subscriptions.autoRenew,
        planName: subscriptionPlans.name,
        planPrice: subscriptionPlans.price,
        planDuration: subscriptionPlans.durationDays,
      })
      .from(subscriptions)
      .leftJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
      .where(eq(subscriptions.userId, session.userId))
      .orderBy(desc(subscriptions.createdAt))
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json({ subscription: null });
    }

    const sub = result[0];
    const now = new Date();
    const isActive = sub.status === "active" && sub.endDate && new Date(sub.endDate) > now;

    return NextResponse.json({
      subscription: {
        id: sub.id,
        planId: sub.planId,
        status: sub.status,
        startDate: sub.startDate?.toISOString(),
        endDate: sub.endDate?.toISOString(),
        autoRenew: sub.autoRenew,
        planName: sub.planName,
        planPrice: sub.planPrice,
        planDuration: sub.planDuration,
        isActive,
      },
    });
  } catch (error) {
    console.error("Get subscription error:", error);
    return NextResponse.json({ error: "获取订阅信息失败" }, { status: 500 });
  }
}
