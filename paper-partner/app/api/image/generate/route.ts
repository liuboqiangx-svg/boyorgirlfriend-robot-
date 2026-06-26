/**
 * 图像生成 API 路由
 * POST /api/image/generate
 */

import { NextRequest, NextResponse } from "next/server";
import { getImageService } from "@/lib/image/service";
import {
  GenerateImageRequest,
  GenerateImageResponse,
  ImageSize,
  ERROR_CODES,
} from "@/lib/image/types";
import { ImageGenerationError } from "@/lib/image/errors";

/**
 * 请求超时时间（秒）
 */
const REQUEST_TIMEOUT = 55; // 留 5 秒给 Next.js

/**
 * 允许的尺寸选项
 */
const ALLOWED_SIZES: ImageSize[] = ["2K", "4K"];

/**
 * POST /api/image/generate
 * 生成图像
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
    const generateRequest: GenerateImageRequest = {
      prompt: body.prompt,
      character_id: body.character_id,
      emotion: body.emotion,
      scene: body.scene,
      size: body.size,
      watermark: body.watermark !== false,
      // ============ 图生图参数 ============
      reference_images: body.reference_images,
      image_prompt: body.image_prompt,
    };

    // 4. 调用服务
    const service = getImageService();
    const response = await service.generateImage(generateRequest);

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
    console.error("[API] Image generation error:", error);

    const errorResponse: GenerateImageResponse = {
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

  // 校验 prompt
  if (!req.prompt || typeof req.prompt !== "string") {
    return {
      code: ERROR_CODES.VALIDATION_ERROR,
      message: "缺少必填字段: prompt",
      type: "validation",
    };
  }

  if (req.prompt.trim().length === 0) {
    return {
      code: ERROR_CODES.VALIDATION_ERROR,
      message: "prompt 不能为空",
      type: "validation",
    };
  }

  if (req.prompt.length > 4000) {
    return {
      code: ERROR_CODES.VALIDATION_ERROR,
      message: "prompt 不能超过 4000 个字符",
      type: "validation",
    };
  }

  // 校验 size
  if (req.size && !ALLOWED_SIZES.includes(req.size as ImageSize)) {
    return {
      code: ERROR_CODES.VALIDATION_ERROR,
      message: `size 必须是以下之一: ${ALLOWED_SIZES.join(", ")}`,
      type: "validation",
    };
  }

  // ============ 图生图参数校验 ============
  // 校验 reference_images
  if (req.reference_images !== undefined) {
    if (!Array.isArray(req.reference_images)) {
      return {
        code: ERROR_CODES.VALIDATION_ERROR,
        message: "reference_images 必须是数组",
        type: "validation",
      };
    }

    if (req.reference_images.length > 2) {
      return {
        code: ERROR_CODES.VALIDATION_ERROR,
        message: "reference_images 最多2张图片",
        type: "validation",
      };
    }

    for (const url of req.reference_images) {
      if (typeof url !== "string" || !url.startsWith("http")) {
        return {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: "reference_images 中的每一项必须是有效的 URL",
          type: "validation",
        };
      }
    }
  }

  // 校验 image_prompt
  if (req.image_prompt !== undefined && typeof req.image_prompt !== "string") {
    return {
      code: ERROR_CODES.VALIDATION_ERROR,
      message: "image_prompt 必须是字符串",
      type: "validation",
    };
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
  const response: GenerateImageResponse = {
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
