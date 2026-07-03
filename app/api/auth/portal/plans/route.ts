import { NextRequest, NextResponse } from "next/server";
import { eq, desc, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { subscriptionPlans } from "@/lib/db/schema-drizzle";
import { requireAdminAuth } from "@/lib/auth/admin-middleware";
import { v4 as uuidv4 } from "uuid";

const planSchema = z.object({
  name: z.string().min(1, "请输入套餐名称"),
  description: z.string().optional(),
  price: z.number().min(0, "价格不能为负数"),
  durationDays: z.number().min(1, "有效期至少1天"),
  features: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
  sortOrder: z.number().default(0),
});

const updatePlanSchema = planSchema.partial();

// 获取套餐列表
export async function GET(request: NextRequest) {
  const authError = await requireAdminAuth(request);
  if (authError) return authError;

  try {
    const result = await db
      .select()
      .from(subscriptionPlans)
      .orderBy(subscriptionPlans.sortOrder, subscriptionPlans.createdAt);

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("Get plans error:", error);
    return NextResponse.json({ error: "获取套餐列表失败" }, { status: 500 });
  }
}

// 创建套餐
export async function POST(request: NextRequest) {
  const authError = await requireAdminAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const data = planSchema.parse(body);

    const id = uuidv4();
    const now = new Date();

    await db.insert(subscriptionPlans).values({
      id,
      name: data.name,
      description: data.description,
      price: data.price.toString(),
      durationDays: data.durationDays,
      features: data.features,
      isActive: data.isActive,
      sortOrder: data.sortOrder,
      createdAt: now,
      updatedAt: now,
    });

    const [created] = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.id, id));

    return NextResponse.json({ success: true, data: created });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("Create plan error:", error);
    return NextResponse.json({ error: "创建套餐失败" }, { status: 500 });
  }
}

// 更新套餐
export async function PUT(request: NextRequest) {
  const authError = await requireAdminAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { id, ...updates } = body;
    const data = updatePlanSchema.parse(updates);

    if (!id) {
      return NextResponse.json({ error: "缺少套餐 ID" }, { status: 400 });
    }

    await db
      .update(subscriptionPlans)
      .set({
        name: data.name,
        description: data.description,
        price: data.price?.toString(),
        durationDays: data.durationDays,
        features: data.features,
        isActive: data.isActive,
        sortOrder: data.sortOrder,
        updatedAt: new Date(),
      })
      .where(eq(subscriptionPlans.id, id));

    const [updated] = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.id, id));

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("Update plan error:", error);
    return NextResponse.json({ error: "更新套餐失败" }, { status: 500 });
  }
}
