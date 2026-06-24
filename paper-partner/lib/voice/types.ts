/**
 * 语音合成 - 类型定义
 * 统一所有语音相关的类型定义
 */

// ============ 请求类型 ============

/**
 * 语音合成请求参数
 */
export interface SynthesizeRequest {
  /** 要转换的文本 */
  text: string;
  /** 声音模型（可选） */
  speaker?: string;
  /** 音频格式（可选） */
  format?: AudioFormat;
  /** 采样率（可选） */
  sample_rate?: number;
  /** 语速（可选，0.5-2.0） */
  speed?: number;
}

/**
 * 音频格式
 */
export type AudioFormat = "mp3" | "wav";

/**
 * 音频格式映射
 */
export const AUDIO_FORMAT_MAP: Record<AudioFormat, string> = {
  mp3: "mp3",
  wav: "wav",
};

// ============ 响应类型 ============

/**
 * 语音合成统一响应
 */
export interface SynthesizeResponse {
  /** 是否成功 */
  success: boolean;
  /** 成功时的数据 */
  data?: SynthesizeData;
  /** 错误信息 */
  error?: SynthesizeError;
  /** 元信息 */
  meta?: SynthesizeMeta;
}

/**
 * 合成音频数据
 */
export interface SynthesizeData {
  /** 音频 URL（相对于 public） */
  url: string;
  /** 文件路径 */
  file_path: string;
  /** 音频格式 */
  format: string;
  /** 文件大小（字节） */
  size: number;
  /** 创建时间 */
  created_at: string;
}

/**
 * 错误信息
 */
export interface SynthesizeError {
  /** 错误码 */
  code: string;
  /** 错误消息 */
  message: string;
  /** 错误类型 */
  type: ErrorType;
}

/**
 * 错误类型分类
 */
export type ErrorType =
  | "auth"         // 认证错误 (401, 403)
  | "rate_limit"   // 限流错误 (429)
  | "server"       // 服务器错误 (5xx)
  | "timeout"      // 请求超时
  | "validation"   // 参数校验错误
  | "network"      // 网络错误
  | "storage"      // 存储错误
  | "unknown";     // 未知错误

/**
 * 元信息
 */
export interface SynthesizeMeta {
  /** 提供商名称 */
  provider: string;
  /** 请求耗时（毫秒） */
  duration_ms: number;
  /** HTTP 状态码 */
  status_code?: number;
}

// ============ Provider 类型 ============

/**
 * 语音合成 Provider 配置
 */
export interface VoiceProviderConfig {
  /** API Key */
  apiKey: string;
  /** API 端点 */
  endpoint: string;
  /** Resource ID */
  resourceId: string;
  /** 请求超时（毫秒） */
  timeout?: number;
}

/**
 * Provider 选项
 */
export interface ProviderOptions {
  /** 文本 */
  text: string;
  /** 声音模型 */
  speaker?: string;
  /** 音频格式 */
  format?: AudioFormat;
  /** 采样率 */
  sample_rate?: number;
  /** 语速 */
  speed?: number;
  /** 请求标识 */
  requestId?: string;
}

/**
 * Provider 原始响应
 */
export interface ProviderRawResponse {
  /** 错误码，0 表示成功 */
  code: number;
  /** 消息 */
  message: string;
  /** 数据（Base64 编码的音频） */
  data: string | null;
}

// ============ 工具类型 ============

/**
 * 错误码枚举
 */
export const ERROR_CODES = {
  // 认证错误
  INVALID_API_KEY: "INVALID_API_KEY",
  ACCESS_DENIED: "ACCESS_DENIED",

  // 限流错误
  RATE_LIMITED: "RATE_LIMITED",

  // 服务器错误
  SERVER_ERROR: "SERVER_ERROR",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",

  // 客户端错误
  VALIDATION_ERROR: "VALIDATION_ERROR",
  TEXT_TOO_LONG: "TEXT_TOO_LONG",

  // 存储错误
  STORAGE_ERROR: "STORAGE_ERROR",
  FILE_WRITE_ERROR: "FILE_WRITE_ERROR",
  FILE_READ_ERROR: "FILE_READ_ERROR",

  // 超时
  REQUEST_TIMEOUT: "REQUEST_TIMEOUT",

  // 网络
  NETWORK_ERROR: "NETWORK_ERROR",

  // 未知
  UNKNOWN_ERROR: "UNKNOWN_ERROR",
} as const;

/**
 * 错误码到类型的映射
 */
export const ERROR_TYPE_MAP: Record<string, ErrorType> = {
  [ERROR_CODES.INVALID_API_KEY]: "auth",
  [ERROR_CODES.ACCESS_DENIED]: "auth",
  [ERROR_CODES.RATE_LIMITED]: "rate_limit",
  [ERROR_CODES.SERVER_ERROR]: "server",
  [ERROR_CODES.SERVICE_UNAVAILABLE]: "server",
  [ERROR_CODES.REQUEST_TIMEOUT]: "timeout",
  [ERROR_CODES.NETWORK_ERROR]: "network",
  [ERROR_CODES.VALIDATION_ERROR]: "validation",
  [ERROR_CODES.STORAGE_ERROR]: "storage",
  [ERROR_CODES.FILE_WRITE_ERROR]: "storage",
  [ERROR_CODES.FILE_READ_ERROR]: "storage",
  [ERROR_CODES.UNKNOWN_ERROR]: "unknown",
};

/**
 * 默认声音模型
 */
export const DEFAULT_SPEAKER = "zh_male_beijingxiaoye_emo_v2_mars_bigtts";

/**
 * 文本最大长度
 */
export const MAX_TEXT_LENGTH = 500;

/**
 * 音频缓存目录
 */
export const VOICE_CACHE_DIR = "voice-cache";

/**
 * 音频文件过期时间（毫秒）
 */
export const AUDIO_EXPIRY_MS = 60 * 60 * 1000; // 1小时
