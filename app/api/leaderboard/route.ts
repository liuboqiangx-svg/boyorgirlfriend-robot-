import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { leaderboardRecords, users } from "@/lib/db/schema-drizzle";
import { desc, eq } from "drizzle-orm";
import { getSessionFromCookie } from "@/lib/auth";

const TOP_N = 20; // 显示前20名

// 获取排行榜
export async function GET(request: NextRequest) {
  try {
    // 获取当前登录用户（如果有）
    const session = getSessionFromCookie(request.headers.get("cookie"));
    const currentUserId = session?.userId || null;

    // 查询排行榜（按最高亲密度降序）
    const records = await db
      .select({
        id: leaderboardRecords.id,
        userId: leaderboardRecords.userId,
        userName: users.name,
        highestIntimacy: leaderboardRecords.highestIntimacy,
        achievedAt: leaderboardRecords.achievedAt,
      })
      .from(leaderboardRecords)
      .leftJoin(users, eq(leaderboardRecords.userId, users.id))
      .orderBy(desc(leaderboardRecords.highestIntimacy))
      .limit(TOP_N);

    // 格式化返回数据
    const leaderboard = records.map((record, index) => ({
      rank: index + 1,
      userId: record.userId,
      userName: record.userName || "神秘用户",
      highestIntimacy: record.highestIntimacy,
      achievedAt: record.achievedAt,
      isCurrentUser: record.userId === currentUserId,
    }));

    return NextResponse.json({ leaderboard, currentUserId });
  } catch (error) {
    console.error("获取排行榜失败:", error);
    return NextResponse.json({ error: "获取排行榜失败" }, { status: 500 });
  }
}

// 更新当前用户的排行榜记录
export async function POST(request: NextRequest) {
  try {
    const session = getSessionFromCookie(request.headers.get("cookie"));

    const body = await request.json();
    const { currentIntimacy, userId: bodyUserId } = body;

    if (typeof currentIntimacy !== "number" || currentIntimacy < 0) {
      return NextResponse.json({ error: "无效的亲密度数值" }, { status: 400 });
    }

    // 优先使用 session 中的 userId，其次使用请求体中的 userId（deviceId）
    const targetUserId = session?.userId || bodyUserId;
    if (!targetUserId) {
      return NextResponse.json({ error: "无法确定用户身份" }, { status: 401 });
    }

    // 查询当前用户的排行榜记录
    const existing = await db
      .select()
      .from(leaderboardRecords)
      .where(eq(leaderboardRecords.userId, targetUserId))
      .limit(1);

    const now = new Date();

    if (existing.length === 0) {
      // 新建记录（只有达到一定亲密度才记录，设置为30作为最低上榜门槛）
      if (currentIntimacy >= 30) {
        await db.insert(leaderboardRecords).values({
          id: `lr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          userId: targetUserId,
          highestIntimacy: currentIntimacy,
          achievedAt: now,
        });
      }
    } else {
      // 更新记录（如果新分数更高，更新最高分和达成时间）
      const record = existing[0];
      if (currentIntimacy > record.highestIntimacy) {
        await db
          .update(leaderboardRecords)
          .set({
            highestIntimacy: currentIntimacy,
            achievedAt: now,
            updatedAt: now,
          })
          .where(eq(leaderboardRecords.userId, targetUserId));
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("更新排行榜失败:", error);
    return NextResponse.json({ error: "更新排行榜失败" }, { status: 500 });
  }
}
