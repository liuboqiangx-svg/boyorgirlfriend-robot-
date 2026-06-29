/**
 * TTS 测试 API
 * 用于验证 TTS 服务是否正常工作
 */

import { NextRequest, NextResponse } from "next/server";
import { getVoiceService } from "@/lib/voice";
import { SynthesizeRequest } from "@/lib/voice";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, speaker, format } = body as Partial<SynthesizeRequest>;

    if (!text?.trim()) {
      return NextResponse.json(
        { error: "text 参数不能为空" },
        { status: 400 }
      );
    }

    // 获取 TTS 服务
    const voiceService = getVoiceService();

    // 合成语音
    const result = await voiceService.synthesize({
      text: text.trim(),
      speaker: speaker || "zh-CN-XiaoxiaoNeural",
      format: format || "mp3",
    });

    return NextResponse.json({
      success: result.success,
      data: result.data ? {
        url: result.data.url,
        format: result.data.format,
        size: result.data.size,
      } : null,
      error: result.error,
      meta: result.meta,
    });
  } catch (error) {
    console.error("TTS test error:", error);
    return NextResponse.json(
      { error: "TTS 服务错误", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
