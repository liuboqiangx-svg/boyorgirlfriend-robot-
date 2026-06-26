/**
 * 语音合成 API 路由
 * POST /api/voice/generate
 */

import { NextRequest, NextResponse } from "next/server";
import { getVoiceService } from "@/lib/voice/service";
import {
  SynthesizeResponse,
  ERROR_CODES,
  MAX_TEXT_LENGTH,
} from "@/lib/voice/types";

/**
 * POST /api/voice/generate
 * 合成语音
 */
export async function POST(request: NextRequest) {
  try {
    // 1. 解析请求体
    const body = await request.json();

    // 2. 参数校验
    const validationError = validateRequest(body);
    if (validationError) {
      return createErrorResponse(validationError, 400);
    }

    // 3. 构建请求
    const synthesizeRequest = {
      text: body.text,
      speaker: body.speaker,
      format: body.format || "mp3",
      sample_rate: body.sample_rate || 24000,
      speed: body.speed,
    };

    // 4. 调用服务
    const service = getVoiceService();
    const response = await service.synthesize(synthesizeRequest);

    // 5. 返回响应
    return NextResponse.json(response, {
      status: response.success ? 200 : 400,
    });
  } catch (error) {
    // 处理 JSON 解析错误
    if (error instanceof SyntaxError) {
      return createErrorResponse(
        {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: "请求格式错误，请发送有效的 JSON",
          type: "validation",
        },
        400
      );
    }

    // 处理其他错误
    console.error("[API] Voice synthesis error:", error);

    const errorResponse: SynthesizeResponse = {
      success: false,
      error: {
        code: ERROR_CODES.UNKNOWN_ERROR,
        message: "服务器内部错误，请稍后再试",
        type: "unknown",
      },
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * 校验请求参数
 */
function validateRequest(body: unknown): {
  code: string;
  message: string;
  type: "validation";
} | null {
  if (!body || typeof body !== "object") {
    return {
      code: ERROR_CODES.VALIDATION_ERROR,
      message: "请求体不能为空",
      type: "validation",
    };
  }

  const req = body as Record<string, unknown>;

  // 校验 text
  if (!req.text || typeof req.text !== "string") {
    return {
      code: ERROR_CODES.VALIDATION_ERROR,
      message: "缺少必填字段: text",
      type: "validation",
    };
  }

  if (req.text.trim().length === 0) {
    return {
      code: ERROR_CODES.VALIDATION_ERROR,
      message: "text 不能为空",
      type: "validation",
    };
  }

  if (req.text.length > MAX_TEXT_LENGTH) {
    return {
      code: ERROR_CODES.TEXT_TOO_LONG,
      message: `text 不能超过 ${MAX_TEXT_LENGTH} 个字符`,
      type: "validation",
    };
  }

  // 校验 format
  if (req.format && !["mp3", "wav"].includes(req.format as string)) {
    return {
      code: ERROR_CODES.VALIDATION_ERROR,
      message: "format 必须是 mp3 或 wav",
      type: "validation",
    };
  }

  // 校验 sample_rate
  if (req.sample_rate && typeof req.sample_rate !== "number") {
    return {
      code: ERROR_CODES.VALIDATION_ERROR,
      message: "sample_rate 必须是数字",
      type: "validation",
    };
  }

  // 校验 speed
  if (req.speed !== undefined) {
    if (typeof req.speed !== "number" || req.speed < 0.5 || req.speed > 2.0) {
      return {
        code: ERROR_CODES.VALIDATION_ERROR,
        message: "speed 必须在 0.5-2.0 之间",
        type: "validation",
      };
    }
  }

  return null;
}

/**
 * 创建错误响应
 */
function createErrorResponse(
  error: { code: string; message: string; type: string },
  status: number
): NextResponse {
  const response: SynthesizeResponse = {
    success: false,
    error: {
      code: error.code,
      message: error.message,
      type: error.type as "auth" | "rate_limit" | "server" | "timeout" | "validation" | "unknown",
    },
  };

  return NextResponse.json(response, { status });
}

/**
 * GET 请求不支持
 */
export async function GET() {
  return createErrorResponse(
    {
      code: ERROR_CODES.VALIDATION_ERROR,
      message: "不支持 GET 请求，请使用 POST",
      type: "validation",
    },
    405
  );
}
