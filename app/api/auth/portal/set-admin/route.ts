import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema-drizzle";

// 临时接口：设置管理员
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "缺少邮箱" }, { status: 400 });
    }

    await db
      .update(users)
      .set({ isAdmin: true })
      .where(eq(users.email, email));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Set admin error:", error);
    return NextResponse.json({ error: "设置失败" }, { status: 500 });
  }
}
