import { NextRequest, NextResponse } from "next/server";
import { getCharacterState, updateCharacterState } from "@/lib/db/index-drizzle";
import { maybeSendProactiveMessage } from "@/lib/proactive";
import { DEFAULT_CHARACTER } from "@/lib/character";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mood, intimacy } = body;

    const deviceId = request.headers.get("x-device-id") || "anonymous";
    const userId = deviceId;

    if (mood || intimacy !== undefined) {
      const state = await updateCharacterState(userId, DEFAULT_CHARACTER.id, {
        mood,
        intimacy,
      });
      return NextResponse.json({ success: true, state });
    }

    // 尝试主动发送消息
    const result = await maybeSendProactiveMessage({
      userId,
      userName: userId,
      character: DEFAULT_CHARACTER,
    });

    return NextResponse.json({
      proactive: result.sent,
      message: result.message,
      state: result.state,
    });
  } catch (error) {
    console.error("State error:", error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const deviceId = request.headers.get("x-device-id") || "anonymous";
  const userId = deviceId;
  const state = await getCharacterState(userId, DEFAULT_CHARACTER.id);
  return NextResponse.json({ state });
}
