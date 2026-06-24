/**
 * 语音合成 - 火山引擎 TTS Provider 实现
 * 封装火山引擎语音合成 API
 */

import {
  VoiceProviderConfig,
  ProviderOptions,
  ProviderRawResponse,
  DEFAULT_SPEAKER,
} from "../types";
import { VoiceProvider } from "../provider";
import {
  VoiceGenerationError,
  invalidApiKeyError,
  accessDeniedError,
  rateLimitedError,
  serverError,
  timeoutError,
  networkError,
  validationError,
  unknownError,
} from "../errors";
import { createVoiceLogger, PerformanceTimer } from "../logger";

/**
 * 火山引擎 TTS 默认配置
 */
const DEFAULT_CONFIG: Partial<VoiceProviderConfig> = {
  endpoint: "https://openspeech.bytedance.com/api/v3/tts/unidirectional",
  resourceId: "volc.service_type.10029",
  timeout: 30000, // 30秒超时（语音合成通常较快）
};

/**
 * 火山引擎语音合成 Provider
 */
export class VolcanoVoiceProvider implements VoiceProvider {
  public readonly name = "volcano-tts";
  private config: VoiceProviderConfig;
  private logger = createVoiceLogger("volcano-tts");

  constructor(config: VoiceProviderConfig) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    };
  }

  /**
   * 合成语音
   * @returns Base64 编码的音频数据
   */
  async synthesize(options: ProviderOptions): Promise<string> {
    const timer = new PerformanceTimer();
    const requestId = options.requestId || this.generateRequestId();

    // 记录请求开始
    this.logger.logRequestStart({
      text: options.text,
      speaker: options.speaker,
      format: options.format,
      requestId,
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
      if (error instanceof VoiceGenerationError) {
        throw error;
      }

      throw unknownError(error);
    }
  }

  /**
   * 获取配置
   */
  getConfig(): VoiceProviderConfig {
    return { ...this.config };
  }

  /**
   * 构建请求体
   */
  private buildRequestBody(options: ProviderOptions): Record<string, unknown> {
    const speaker = options.speaker || DEFAULT_SPEAKER;
    const format = options.format || "mp3";
    const sampleRate = options.sample_rate || 24000;

    // 构建 additions 字段（JSON 字符串）
    const additions = {
      disable_markdown_filter: true,
      enable_language_detector: true,
      enable_latex_tn: true,
      disable_default_bit_rate: true,
      max_length_to_filter_parenthesis: 0,
      cache_config: {
        text_type: 1,
        use_cache: true,
      },
    };

    return {
      req_params: {
        text: options.text,
        speaker: speaker,
        additions: JSON.stringify(additions),
        audio_params: {
          format: format,
          sample_rate: sampleRate,
        },
      },
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
      const response = await fetch(this.config.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.config.apiKey,
          "X-Api-Resource-Id": this.config.resourceId,
          Connection: "keep-alive",
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
  private async parseResponse(response: Response): Promise<string> {
    // 处理 HTTP 错误状态码
    if (!response.ok) {
      let errorBody: string | undefined;
      try {
        errorBody = await response.text();
      } catch {
        // 忽略解析错误
      }
      throw this.createErrorFromStatus(response.status, errorBody);
    }

    // 解析 JSON 响应
    try {
      const data = await response.json() as ProviderRawResponse;

      // 检查业务错误码
      if (data.code !== 0) {
        throw this.createErrorFromCode(data.code, data.message);
      }

      // 检查是否有音频数据
      if (!data.data) {
        throw validationError("API 返回的音频数据为空");
      }

      return data.data;
    } catch (error) {
      if (error instanceof VoiceGenerationError) {
        throw error;
      }
      throw unknownError(error);
    }
  }

  /**
   * 根据 HTTP 状态码创建错误
   */
  private createErrorFromStatus(status: number, responseBody?: string): VoiceGenerationError {
    switch (status) {
      case 401:
        return invalidApiKeyError();
      case 403:
        return accessDeniedError();
      case 429:
        return rateLimitedError();
      case 500:
      case 502:
      case 503:
      case 504:
        return serverError(status);
      default:
        return unknownError(responseBody) as VoiceGenerationError;
    }
  }

  /**
   * 根据业务错误码创建错误
   */
  private createErrorFromCode(code: number, message?: string): VoiceGenerationError {
    // 火山引擎的错误码处理
    if (code === 20000000) {
      // 这是成功的响应（见示例中的最后一行）
      return unknownError("意外的响应格式") as VoiceGenerationError;
    }

    // 其他错误码映射
    if (code === 10001 || code === 10002) {
      return invalidApiKeyError();
    }

    return new VoiceGenerationError(
      "API_ERROR",
      message || `API 返回错误码: ${code}`,
      "server"
    );
  }

  /**
   * 生成请求 ID
   */
  private generateRequestId(): string {
    return `voice_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

/**
 * 创建火山引擎 TTS Provider
 */
export function createVolcanoVoiceProvider(
  config?: Partial<VoiceProviderConfig>
): VolcanoVoiceProvider {
  const fullConfig: VoiceProviderConfig = {
    apiKey: config?.apiKey || process.env.VOLCANO_TTS_API_KEY || "",
    endpoint: config?.endpoint || DEFAULT_CONFIG.endpoint!,
    resourceId: config?.resourceId || DEFAULT_CONFIG.resourceId!,
    timeout: config?.timeout || DEFAULT_CONFIG.timeout,
  };

  if (!fullConfig.apiKey) {
    throw new Error("VOLCANO_TTS_API_KEY is required");
  }

  return new VolcanoVoiceProvider(fullConfig);
}
