import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { subscriptionPlans } from "@/lib/db/schema-drizzle";

export async function GET(request: NextRequest) {
  try {
    const result = await db
      .select()
      .from(subscriptionPlans)
      .where(sql`${subscriptionPlans.isActive} = true`)
      .orderBy(subscriptionPlans.sortOrder, subscriptionPlans.price);

    return NextResponse.json({ plans: result });
  } catch (error) {
    console.error("Get plans error:", error);
    return NextResponse.json({ error: "获取套餐列表失败" }, { status: 500 });
  }
}
