/**
 * 语音合成 - Edge TTS Provider 实现
 * 封装 openai-edge-tts 兼容 API
 * 用于本地开发测试
 */

import { VoiceProviderConfig, ProviderOptions } from "../types";
import type { VoiceProvider } from "../provider";
import { VoiceGenerationError, networkError, unknownError } from "../errors";
import { createVoiceLogger, PerformanceTimer } from "../logger";

/**
 * Edge TTS 默认配置
 */
const DEFAULT_CONFIG = {
  endpoint: "http://localhost:5050/v1/audio/speech",
  timeout: 30000, // 30秒超时
};

// 兼容 OpenAI 格式的音色映射
const VOICE_MAP: Record<string, string> = {
  // OpenAI 音色映射
  alloy: "en-US-AvaNeural",
  echo: "en-US-AndrewNeural",
  fable: "en-US-OliveNeural",
  onyx: "en-US-DavisNeural",
  nova: "en-US-SarahNeural",
  shimmer: "en-US-JennyNeural",
  // 中文音色（直接使用）
  "zh-CN-XiaoxiaoNeural": "zh-CN-XiaoxiaoNeural",
  "zh-CN-YunxiNeural": "zh-CN-YunxiNeural",
  "zh-CN-YunyangNeural": "zh-CN-YunyangNeural",
  "zh-CN-XiaoyiNeural": "zh-CN-XiaoyiNeural",
};

/**
 * Edge TTS Provider
 */
export class EdgeVoiceProvider implements VoiceProvider {
  public readonly name = "edge-tts";
  private config: VoiceProviderConfig;
  private logger = createVoiceLogger("edge-tts");

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

    this.logger.logRequestStart({
      text: options.text,
      speaker: options.speaker,
      format: options.format,
      requestId,
    });

    try {
      const response = await this.sendRequest(options, requestId);
      this.logger.logRequestSuccess(timer.getElapsed(), response.status, { requestId });
      return response.base64Data;
    } catch (error) {
      this.logger.logRequestError(
        error instanceof Error ? error : new Error(String(error)),
        timer.getElapsed()
      );

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
   * 发送请求
   */
  private async sendRequest(
    options: ProviderOptions,
    requestId: string
  ): Promise<{ status: number; base64Data: string }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      // 映射音色
      let voice = options.speaker || "zh-CN-XiaoxiaoNeural";
      if (VOICE_MAP[voice]) {
        voice = VOICE_MAP[voice];
      }

      const response = await fetch(this.config.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          input: options.text,
          voice: voice,
          model: "tts-1",
          response_format: options.format || "mp3",
          speed: options.speed || 1.0,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        let errorBody: string | undefined;
        try {
          errorBody = await response.text();
        } catch {
          // ignore
        }
        throw this.createErrorFromStatus(response.status, errorBody);
      }

      // 获取二进制音频数据
      const audioBuffer = await response.arrayBuffer();
      const base64Data = Buffer.from(audioBuffer).toString("base64");

      return {
        status: response.status,
        base64Data,
      };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new VoiceGenerationError(
          "REQUEST_TIMEOUT",
          "请求超时，请检查 TTS 服务是否运行",
          "timeout"
        );
      }
      throw networkError(error instanceof Error ? error.message : undefined);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * 根据 HTTP 状态码创建错误
   */
  private createErrorFromStatus(status: number, responseBody?: string): VoiceGenerationError {
    switch (status) {
      case 401:
      case 403:
        return new VoiceGenerationError(
          "AUTH_ERROR",
          "认证失败，请检查 API Key 配置",
          "auth"
        );
      case 429:
        return new VoiceGenerationError(
          "RATE_LIMITED",
          "请求过于频繁，请稍后再试",
          "rate_limit"
        );
      case 500:
      case 502:
      case 503:
      case 504:
        return new VoiceGenerationError(
          "SERVER_ERROR",
          `TTS 服务错误: ${status}`,
          "server"
        );
      default:
        return new VoiceGenerationError(
          "UNKNOWN_ERROR",
          responseBody || `请求失败: ${status}`,
          "unknown"
        );
    }
  }

  /**
   * 生成请求 ID
   */
  private generateRequestId(): string {
    return `edge_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

/**
 * 创建 Edge TTS Provider
 */
export function createEdgeVoiceProvider(
  config?: Partial<VoiceProviderConfig>
): EdgeVoiceProvider {
  const fullConfig: VoiceProviderConfig = {
    apiKey: config?.apiKey || process.env.EDGE_TTS_API_KEY || "paper_partner",
    endpoint: config?.endpoint || process.env.EDGE_TTS_ENDPOINT || DEFAULT_CONFIG.endpoint,
    resourceId: "edge-tts",
    timeout: config?.timeout || DEFAULT_CONFIG.timeout,
  };

  return new EdgeVoiceProvider(fullConfig);
}
