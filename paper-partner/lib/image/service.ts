/**
 * 图像生成 - 统一服务层
 * 整合 Provider，提供统一的图像生成服务
 */

import {
  GenerateImageRequest,
  GenerateImageResponse,
  GenerateImageData,
  GenerateImageMeta,
  ProviderOptions,
  ProviderRawResponse,
  ImageSize,
} from "./types";
import { ImageProvider } from "./provider";
import { VolcanoImageProvider } from "./providers/volcano";
import { ImageGenerationError, getErrorDisplayMessage } from "./errors";
import { createImageLogger, PerformanceTimer } from "./logger";

/**
 * 服务配置
 */
export interface ImageServiceConfig {
  /** 默认 Provider */
  defaultProvider: "volcano";
  /** Provider 配置 */
  providerConfig: {
    volcano?: {
      apiKey?: string;
      baseUrl?: string;
      model?: string;
      timeout?: number;
    };
  };
}

/**
 * 图像生成服务
 */
export class ImageService {
  private provider: ImageProvider;
  private logger = createImageLogger("image-service");

  constructor(config: ImageServiceConfig) {
    // 根据配置创建 Provider
    this.provider = new VolcanoImageProvider({
      apiKey: config.providerConfig.volcano?.apiKey || process.env.VOLCANO_API_KEY || "",
      baseUrl: config.providerConfig.volcano?.baseUrl || process.env.VOLCANO_BASE_URL || "https://ark.cn-beijing.volces.com/api/v3",
      model: config.providerConfig.volcano?.model || process.env.VOLCANO_MODEL || "doubao-seedream-5-0-260128",
      timeout: config.providerConfig.volcano?.timeout || 60000,
    });
  }

  /**
   * 生成图像
   */
  async generateImage(request: GenerateImageRequest): Promise<GenerateImageResponse> {
    const timer = new PerformanceTimer();

    // 记录请求
    const mode = request.reference_images?.length ? "image_to_image" : "text_to_image";
    this.logger.logRequestStart({
      prompt: request.prompt,
      character_id: request.character_id,
      emotion: request.emotion,
      scene: request.scene,
      size: request.size,
      watermark: request.watermark,
      reference_images: request.reference_images,
      mode,
    });

    try {
      // 构建 Provider 选项
      const options: ProviderOptions = {
        prompt: request.prompt,
        size: request.size,
        watermark: request.watermark,
        requestId: this.generateRequestId(),
        // ============ 图生图参数 ============
        reference_images: request.reference_images,
        image_prompt: request.image_prompt,
      };

      // 调用 Provider
      const rawResponse = await this.provider.generate(options);

      // 转换响应
      const data = this.transformResponse(rawResponse);

      // 构建成功响应
      const response: GenerateImageResponse = {
        success: true,
        data,
        meta: {
          provider: this.provider.name,
          duration_ms: timer.getElapsed(),
        },
      };

      // 记录成功
      this.logger.logRequestSuccess(timer.getElapsed(), 200, {
        character_id: request.character_id,
      });

      return response;
    } catch (error) {
      // 记录错误
      this.logger.logRequestError(
        error instanceof Error ? error : new Error(String(error)),
        timer.getElapsed()
      );

      // 构建错误响应
      if (error instanceof ImageGenerationError) {
        return {
          success: false,
          error: error.toResponse(),
          meta: {
            provider: this.provider.name,
            duration_ms: timer.getElapsed(),
          },
        };
      }

      // 未知错误
      return {
        success: false,
        error: {
          code: "UNKNOWN_ERROR",
          message: "发生未知错误，请稍后再试",
          type: "unknown",
        },
        meta: {
          provider: this.provider.name,
          duration_ms: timer.getElapsed(),
        },
      };
    }
  }

  /**
   * 获取用户友好的错误消息
   */
  getUserFriendlyError(response: GenerateImageResponse): string | null {
    if (response.success || !response.error) {
      return null;
    }
    return getErrorDisplayMessage(response.error as unknown as ImageGenerationError);
  }

  /**
   * 转换 Provider 响应为统一格式
   */
  private transformResponse(raw: ProviderRawResponse): GenerateImageData {
    const imageData = raw.data[0];

    return {
      url: imageData.url,
      size: imageData.size,
      model: raw.model,
      created_at: new Date(raw.created * 1000).toISOString(),
    };
  }

  /**
   * 生成请求 ID
   */
  private generateRequestId(): string {
    return `img_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

/**
 * 默认服务实例
 */
let defaultService: ImageService | null = null;

/**
 * 获取默认服务实例（单例）
 */
export function getImageService(): ImageService {
  if (!defaultService) {
    defaultService = new ImageService({
      defaultProvider: "volcano",
      providerConfig: {
        volcano: {},
      },
    });
  }
  return defaultService;
}

/**
 * 重置服务实例（用于测试或配置变更）
 */
export function resetImageService(): void {
  defaultService = null;
}
