/**
 * 角色图像生成 API 路由
 * POST /api/image/character
 *
 * 基于角色、情绪自动组装 Prompt 并生成图像
 */

import { NextRequest, NextResponse } from "next/server";
import { getImageService } from "@/lib/image/service";
import { PromptAssembler } from "@/lib/image/assembler";
import { getRegisteredCharacterIds, characterPromptRegistry } from "@/lib/image/prompts/registry";
import { GenerateCharacterImageRequest, GenerateImageResponse, ImageSize } from "@/lib/image";
import { ERROR_CODES } from "@/lib/image/types";

// 导入所有角色 Prompt 库（触发注册）
import "@/lib/image/prompts";

/**
 * 允许的尺寸选项
 */
const ALLOWED_SIZES: ImageSize[] = ["2K", "4K"];

/**
 * 允许的角色 ID
 */
const ALLOWED_CHARACTERS = ["lu-chen-001", "lin-ye", "shen-mo", "shu-ting", "gu-ran"];

/**
 * POST /api/image/character
 * 基于角色生成图像
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

    // 3. 检查角色是否支持
    const supportedCharacters = getRegisteredCharacterIds();
    if (!supportedCharacters.includes(body.characterId)) {
      return createErrorResponse(
        {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: `不支持的角色: ${body.characterId}，支持的: ${supportedCharacters.join(", ")}`,
          type: "validation",
        },
        400
      );
    }

    // 4. 构建请求
    const generateRequest: GenerateCharacterImageRequest = {
      characterId: body.characterId,
      emotion: body.emotion,
      scene: body.scene,
      clothing: body.clothing,
      lighting: body.lighting,
      camera: body.camera,
      customPrompt: body.customPrompt,
      size: body.size || "2K",
      watermark: body.watermark !== false,
      reference_images: body.reference_images,
      image_prompt: body.image_prompt,
    };

    // 5. 预览 Prompt（可选返回）
    const preview = PromptAssembler.preview(generateRequest);

    // 6. 调用服务
    const service = getImageService();
    const response = await service.generateCharacterImage(generateRequest);

    // 7. 返回响应（包含预览信息）
    return NextResponse.json(
      {
        ...response,
        preview, // 返回使用的片段信息
      },
      {
        status: response.success ? 200 : 400,
      }
    );
  } catch (error) {
    console.error("[API] Character image generation error:", error);

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
 * GET /api/image/character
 * 获取支持的角色列表
 */
export async function GET() {
  const characters = getRegisteredCharacterIds();

  return NextResponse.json({
    success: true,
    data: {
      characters: characters.map((id) => {
        const options = PromptAssembler.getAvailableOptions(id);
        return {
          id,
          name: id.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
          availableOptions: options,
        };
      }),
    },
  });
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

  // 校验 characterId
  if (!req.characterId || typeof req.characterId !== "string") {
    return {
      code: ERROR_CODES.VALIDATION_ERROR,
      message: "缺少必填字段: characterId",
      type: "validation",
    };
  }

  if (!ALLOWED_CHARACTERS.includes(req.characterId as string)) {
    return {
      code: ERROR_CODES.VALIDATION_ERROR,
      message: `不支持的角色: ${req.characterId}，支持的: ${ALLOWED_CHARACTERS.join(", ")}`,
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

    for (const url of req.reference_images as string[]) {
      if (typeof url !== "string") {
        return {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: "reference_images 中的每一项必须是字符串",
          type: "validation",
        };
      }
      // 支持 http URL 或 Base64 格式
      const isValidUrl = url.startsWith("http");
      const isValidBase64 = url.startsWith("data:image/");
      if (!isValidUrl && !isValidBase64) {
        return {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: "reference_images 中的每一项必须是有效的 URL 或 Base64 图片",
          type: "validation",
        };
      }
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
