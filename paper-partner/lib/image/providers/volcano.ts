/**
 * 图像生成 - 火山引擎 Provider 实现
 * 封装火山引擎图像生成 API
 */

import {
  ProviderConfig,
  ProviderOptions,
  ProviderRawResponse,
  ImageSize,
  IMAGE_SIZE_MAP,
  ProviderImageData,
} from "../types";
import { ImageProvider } from "../provider";
import {
  ImageGenerationError,
  invalidApiKeyError,
  accessDeniedError,
  rateLimitedError,
  serverError,
  timeoutError,
  networkError,
  validationError,
  unknownError,
  createErrorFromStatus,
} from "../errors";
import { createImageLogger, PerformanceTimer } from "../logger";

/**
 * 火山引擎 Provider 默认配置
 */
const DEFAULT_CONFIG: Partial<ProviderConfig> = {
  baseUrl: "https://ark.cn-beijing.volces.com/api/v3",
  model: "doubao-seedream-5-0-260128",
  timeout: 60000, // 60秒超时
};

/**
 * 火山引擎图像生成 Provider
 */
export class VolcanoImageProvider implements ImageProvider {
  public readonly name = "volcano";
  private config: ProviderConfig;
  private logger = createImageLogger("volcano");

  constructor(config: ProviderConfig) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    };
  }

  /**
   * 生成图像
   */
  async generate(options: ProviderOptions): Promise<ProviderRawResponse> {
    const timer = new PerformanceTimer();
    const requestId = options.requestId || this.generateRequestId();

    // 记录请求开始
    const mode = options.reference_images?.length ? "image_to_image" : "text_to_image";
    this.logger.logRequestStart({
      ...options,
      requestId,
      mode,
    });

    try {
      // 构建请求体
      const body = this.buildRequestBody(options);

      // 发送请求
      const response = await this.sendRequest(body, requestId, timer);

      // 记录成功
      this.logger.logRequestSuccess(timer.getElapsed(), response.status, {
        request_id: requestId,
      });

      // 解析响应
      return this.parseResponse(response);
    } catch (error) {
      // 记录错误
      this.logger.logRequestError(
        error instanceof Error ? error : new Error(String(error)),
        timer.getElapsed()
      );

      // 重新抛出或转换错误
      if (error instanceof ImageGenerationError) {
        throw error;
      }

      throw unknownError(error);
    }
  }

  /**
   * 获取配置
   */
  getConfig(): ProviderConfig {
    return { ...this.config };
  }

  /**
   * 构建请求体
   * 根据是否有 reference_images 判断是文生图还是图生图
   */
  private buildRequestBody(options: ProviderOptions): Record<string, unknown> {
    const size = options.size || "2K";
    const sizeValue = IMAGE_SIZE_MAP[size] || IMAGE_SIZE_MAP["2K"];

    const baseBody = {
      model: this.config.model,
      sequential_image_generation: "disabled",
      response_format: "url",
      size: sizeValue,
      stream: false,
      watermark: options.watermark !== false, // 默认带水印
    };

    // ============ 图生图模式 ============
    if (options.reference_images && options.reference_images.length > 0) {
      // 校验参考图数量
      if (options.reference_images.length > 2) {
        throw validationError("参考图片最多2张");
      }

      return {
        ...baseBody,
        image: options.reference_images,
        prompt: options.image_prompt || options.prompt,
      };
    }

    // ============ 文生图模式 ============
    return {
      ...baseBody,
      prompt: options.prompt,
    };
  }

  /**
   * 发送请求
   */
  private async sendRequest(
    body: Record<string, unknown>,
    requestId: string,
    timer: PerformanceTimer
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(`${this.config.baseUrl}/images/generations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.apiKey}`,
          "X-Request-Id": requestId,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      return response;
    } catch (error) {
      // 处理 abort（超时）
      if (error instanceof Error && error.name === "AbortError") {
        throw timeoutError();
      }

      // 处理网络错误
      throw networkError(error instanceof Error ? error.message : undefined);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * 解析响应
   */
  private async parseResponse(response: Response): Promise<ProviderRawResponse> {
    // 处理 HTTP 错误状态码
    if (!response.ok) {
      let errorBody: string | undefined;
      try {
        errorBody = await response.text();
      } catch {
        // 忽略解析错误
      }
      throw createErrorFromStatus(response.status, errorBody);
    }

    // 解析 JSON 响应
    try {
      const data = await response.json();

      // 验证响应格式
      if (!this.validateResponse(data)) {
        throw validationError("API 响应格式不正确");
      }

      return data as ProviderRawResponse;
    } catch (error) {
      if (error instanceof ImageGenerationError) {
        throw error;
      }
      throw unknownError(error);
    }
  }

  /**
   * 验证响应格式
   */
  private validateResponse(data: unknown): data is ProviderRawResponse {
    if (!data || typeof data !== "object") {
      return false;
    }

    const obj = data as Record<string, unknown>;

    // 检查必需字段
    if (!Array.isArray(obj.data) || obj.data.length === 0) {
      return false;
    }

    const imageData = obj.data[0] as Record<string, unknown>;
    if (!imageData || typeof imageData.url !== "string") {
      return false;
    }

    return true;
  }

  /**
   * 生成请求 ID
   */
  private generateRequestId(): string {
    return `img_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

/**
 * 创建火山引擎 Provider
 */
export function createVolcanoProvider(config?: Partial<ProviderConfig>): VolcanoImageProvider {
  const fullConfig: ProviderConfig = {
    apiKey: config?.apiKey || process.env.VOLCANO_API_KEY || "",
    baseUrl: config?.baseUrl || process.env.VOLCANO_BASE_URL || DEFAULT_CONFIG.baseUrl!,
    model: config?.model || process.env.VOLCANO_MODEL || DEFAULT_CONFIG.model!,
    timeout: config?.timeout || DEFAULT_CONFIG.timeout,
  };

  if (!fullConfig.apiKey) {
    throw new Error("VOLCANO_API_KEY is required");
  }

  return new VolcanoImageProvider(fullConfig);
}
