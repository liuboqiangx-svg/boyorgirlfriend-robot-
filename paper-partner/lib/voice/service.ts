/**
 * 语音合成 - 统一服务层
 * 整合 Provider，提供统一的语音合成服务
 */

import {
  SynthesizeRequest,
  SynthesizeResponse,
  SynthesizeData,
  ProviderOptions,
  VoiceProviderConfig,
  VOICE_CACHE_DIR,
  AUDIO_EXPIRY_MS,
} from "./types";
import { VoiceProvider } from "./provider";
import { VolcanoVoiceProvider } from "./providers/volcano";
import { MockVoiceProvider } from "./providers/mock";
import { EdgeVoiceProvider } from "./providers/edge";
import { VoiceGenerationError, getErrorDisplayMessage } from "./errors";
import { createVoiceLogger, PerformanceTimer } from "./logger";
import * as fs from "fs";
import * as path from "path";

/**
 * 服务配置
 */
export interface VoiceServiceConfig {
  /** 默认 Provider */
  defaultProvider: "volcano-tts" | "mock-tts" | "edge-tts";
  /** Provider 配置 */
  providerConfig: {
    "volcano-tts"?: {
      apiKey?: string;
      endpoint?: string;
      resourceId?: string;
      timeout?: number;
    };
    "mock-tts"?: Record<string, never>;
    "edge-tts"?: {
      apiKey?: string;
      endpoint?: string;
      timeout?: number;
    };
  };
}

/**
 * 语音合成服务
 */
export class VoiceService {
  private provider: VoiceProvider;
  private logger = createVoiceLogger("voice-service");
  private cacheDir: string;

  constructor(config: VoiceServiceConfig) {
    // 根据配置创建 Provider
    if (config.defaultProvider === "mock-tts") {
      // Mock 模式
      this.provider = new MockVoiceProvider();
      this.logger.info("Using Mock TTS Provider");
    } else if (config.defaultProvider === "edge-tts") {
      // Edge TTS 模式
      this.provider = new EdgeVoiceProvider({
        apiKey: config.providerConfig["edge-tts"]?.apiKey || process.env.EDGE_TTS_API_KEY || "paper_partner",
        endpoint: config.providerConfig["edge-tts"]?.endpoint || process.env.EDGE_TTS_ENDPOINT || "http://localhost:5050/v1/audio/speech",
        resourceId: "edge-tts",
        timeout: config.providerConfig["edge-tts"]?.timeout || 30000,
      });
      this.logger.info("Using Edge TTS Provider");
    } else {
      // 真实 API 模式（火山引擎）
      this.provider = new VolcanoVoiceProvider({
        apiKey: config.providerConfig["volcano-tts"]?.apiKey || process.env.VOLCANO_TTS_API_KEY || "",
        endpoint: config.providerConfig["volcano-tts"]?.endpoint || "https://openspeech.bytedance.com/api/v3/tts/unidirectional",
        resourceId: config.providerConfig["volcano-tts"]?.resourceId || "volc.service_type.10029",
        timeout: config.providerConfig["volcano-tts"]?.timeout || 30000,
      });
      this.logger.info("Using Volcano TTS Provider");
    }

    // 缓存目录
    this.cacheDir = path.join(process.cwd(), "public", VOICE_CACHE_DIR);
    this.ensureCacheDir();
  }

  /**
   * 确保缓存目录存在
   */
  private ensureCacheDir(): void {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  /**
   * 合成语音
   */
  async synthesize(request: SynthesizeRequest): Promise<SynthesizeResponse> {
    const timer = new PerformanceTimer();

    // 记录请求
    this.logger.logRequestStart({
      text: request.text,
      speaker: request.speaker,
      format: request.format,
    });

    try {
      // 构建 Provider 选项
      const options: ProviderOptions = {
        text: request.text,
        speaker: request.speaker,
        format: request.format,
        sample_rate: request.sample_rate,
        speed: request.speed,
        requestId: this.generateRequestId(),
      };

      // 调用 Provider 获取 Base64
      const base64Data = await this.provider.synthesize(options);

      // 保存为文件
      const fileData = await this.saveToFile(base64Data, request.format || "mp3");

      // 构建成功响应
      const response: SynthesizeResponse = {
        success: true,
        data: fileData,
        meta: {
          provider: this.provider.name,
          duration_ms: timer.getElapsed(),
        },
      };

      // 记录成功
      this.logger.logRequestSuccess(timer.getElapsed(), 200, {
        file_path: fileData.file_path,
        size: fileData.size,
      });

      return response;
    } catch (error) {
      // 记录错误
      this.logger.logRequestError(
        error instanceof Error ? error : new Error(String(error)),
        timer.getElapsed()
      );

      // 构建错误响应
      if (error instanceof VoiceGenerationError) {
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
   * 保存 Base64 为文件
   */
  private async saveToFile(
    base64Data: string,
    format: string
  ): Promise<SynthesizeData> {
    try {
      // 生成文件名
      const filename = `voice_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${format}`;
      const filePath = path.join(this.cacheDir, filename);

      // 解码 Base64 并写入文件
      const buffer = Buffer.from(base64Data, "base64");
      fs.writeFileSync(filePath, buffer);

      // 返回数据
      return {
        url: `/${VOICE_CACHE_DIR}/${filename}`,
        file_path: filePath,
        format: format,
        size: buffer.length,
        created_at: new Date().toISOString(),
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.warn("Failed to save audio file", { error: err.message });
      throw error;
    }
  }

  /**
   * 获取用户友好的错误消息
   */
  getUserFriendlyError(response: SynthesizeResponse): string | null {
    if (response.success || !response.error) {
      return null;
    }
    return getErrorDisplayMessage(
      response.error as unknown as VoiceGenerationError
    );
  }

  /**
   * 清理过期文件
   */
  async cleanExpiredFiles(): Promise<number> {
    try {
      const files = fs.readdirSync(this.cacheDir);
      const now = Date.now();
      let cleaned = 0;

      for (const file of files) {
        const filePath = path.join(this.cacheDir, file);
        const stats = fs.statSync(filePath);
        const age = now - stats.mtime.getTime();

        if (age > AUDIO_EXPIRY_MS) {
          fs.unlinkSync(filePath);
          cleaned++;
        }
      }

      if (cleaned > 0) {
        this.logger.info(`Cleaned ${cleaned} expired audio files`);
      }

      return cleaned;
    } catch (error) {
      this.logger.warn("Failed to clean expired files", {
        error: error instanceof Error ? error.message : String(error),
      });
      return 0;
    }
  }

  /**
   * 生成请求 ID
   */
  private generateRequestId(): string {
    return `voice_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

/**
 * 默认服务实例
 */
let defaultService: VoiceService | null = null;

/**
 * 是否使用 Mock TTS 模式
 */
function isMockTTSEnabled(): boolean {
  // 优先检查 USE_MOCK_TTS 环境变量
  const useMock = process.env.USE_MOCK_TTS;
  if (useMock !== undefined) {
    return useMock === "true";
  }
  // 如果没有配置任何 TTS API key，使用 Mock 模式
  return !process.env.VOLCANO_TTS_API_KEY;
}

/**
 * 获取使用的 TTS Provider 类型
 */
function getActiveProvider(): "volcano-tts" | "mock-tts" | "edge-tts" {
  // 明确指定的 Provider
  const provider = process.env.TTS_PROVIDER;
  if (provider === "volcano-tts") return "volcano-tts";
  if (provider === "mock-tts") return "mock-tts";
  if (provider === "edge-tts") return "edge-tts";

  // 自动检测
  if (isMockTTSEnabled()) return "mock-tts";
  if (process.env.EDGE_TTS_ENDPOINT) return "edge-tts";
  return "volcano-tts";
}

/**
 * 获取默认服务实例（单例）
 */
export function getVoiceService(): VoiceService {
  if (!defaultService) {
    const activeProvider = getActiveProvider();
    defaultService = new VoiceService({
      defaultProvider: activeProvider,
      providerConfig: {
        "volcano-tts": {},
        "mock-tts": {},
        "edge-tts": {},
      },
    });
  }
  return defaultService;
}

/**
 * 重置服务实例（用于测试或配置变更）
 */
export function resetVoiceService(): void {
  defaultService = null;
}
