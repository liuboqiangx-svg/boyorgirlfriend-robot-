/**
 * 图像生成 - 类型定义
 * 统一所有图像相关的类型定义
 */

// ============ 请求类型 ============

/**
 * 图像生成请求参数
 */
export interface GenerateImageRequest {
  /** 图像描述 Prompt */
  prompt: string;
  /** 角色 ID（可选，用于日志追踪） */
  character_id?: string;
  /** 情绪标签（可选） */
  emotion?: string;
  /** 场景标签（可选） */
  scene?: string;
  /** 图片尺寸 */
  size?: ImageSize;
  /** 是否带水印，默认 true */
  watermark?: boolean;

  // ============ 图生图参数 ============
  /** 参考图片 URL 数组（最多2张，用于图生图） */
  reference_images?: string[];
  /** 图生图指令（如"保持人物，换成傍晚场景"） */
  image_prompt?: string;
}

/**
 * 生成模式
 */
export type ImageGenerationMode = "text_to_image" | "image_to_image";

/**
 * 图片尺寸选项
 */
export type ImageSize = "1K" | "2K" | "4K";

/**
 * 尺寸与分辨率映射
 */
export const IMAGE_SIZE_MAP: Record<ImageSize, string> = {
  "1K": "1024x1024",
  "2K": "3136x1312",
  "4K": "4032x4032",
};

// ============ 响应类型 ============

/**
 * 图像生成统一响应
 */
export interface GenerateImageResponse {
  /** 是否成功 */
  success: boolean;
  /** 成功时的数据 */
  data?: GenerateImageData;
  /** 错误信息 */
  error?: GenerateImageError;
  /** 元信息 */
  meta?: GenerateImageMeta;
}

/**
 * 生成的图像数据
 */
export interface GenerateImageData {
  /** 图片 URL */
  url: string;
  /** 图片尺寸 */
  size: string;
  /** 使用的模型 */
  model: string;
  /** 创建时间 */
  created_at: string;
}

/**
 * 错误信息
 */
export interface GenerateImageError {
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
  | "validation"    // 参数校验错误
  | "network"      // 网络错误
  | "unknown";     // 未知错误

/**
 * 元信息
 */
export interface GenerateImageMeta {
  /** 提供商名称 */
  provider: string;
  /** 请求耗时（毫秒） */
  duration_ms: number;
  /** HTTP 状态码 */
  status_code?: number;
}

// ============ Provider 类型 ============

/**
 * 图像生成 Provider 配置
 */
export interface ProviderConfig {
  /** API Key */
  apiKey: string;
  /** API 基础地址 */
  baseUrl: string;
  /** 模型名称 */
  model: string;
  /** 请求超时（毫秒） */
  timeout?: number;
}

/**
 * Provider 选项
 */
export interface ProviderOptions {
  /** Prompt */
  prompt: string;
  /** 尺寸 */
  size?: ImageSize;
  /** 是否带水印 */
  watermark?: boolean;
  /** 请求标识 */
  requestId?: string;

  // ============ 图生图参数 ============
  /** 参考图片 URL 数组（最多2张） */
  reference_images?: string[];
  /** 图生图指令文本 */
  image_prompt?: string;
  /** 生成模式 */
  mode?: ImageGenerationMode;
}

/**
 * Provider 原始响应
 */
export interface ProviderRawResponse {
  /** 模型 */
  model: string;
  /** 创建时间戳 */
  created: number;
  /** 图像数据 */
  data: ProviderImageData[];
  /** 使用量 */
  usage: ProviderUsage;
}

/**
 * Provider 图像数据
 */
export interface ProviderImageData {
  /** 图片 URL */
  url: string;
  /** 尺寸 */
  size: string;
}

/**
 * Provider 使用量
 */
export interface ProviderUsage {
  /** 生成的图片数 */
  generated_images: number;
  /** 输出 token 数 */
  output_tokens: number;
  /** 总 token 数 */
  total_tokens: number;
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
  [ERROR_CODES.UNKNOWN_ERROR]: "unknown",
};
