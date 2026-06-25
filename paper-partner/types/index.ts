export type MessageRole = "user" | "character";
export type MessageType = "text" | "voice" | "image" | "sticker";

export interface Message {
  id: string;
  user_id: string;
  character_id: string;
  role: MessageRole;
  content: string;
  type: MessageType;
  media_url?: string;
  is_read: boolean;
  created_at: string;
}

export interface Memory {
  id: string;
  user_id: string;
  character_id: string;
  category: "user_fact" | "relationship" | "preference" | "habit";
  key: string;
  value: string;
  created_at: string;
  updated_at: string;
}

// 支持所有角色的情绪类型
export type MoodType =
  | "calm"        // 平静/从容
  | "concerned"   // 担心
  | "sad"         // 难过/悲伤
  | "guarded"     // 防备/警惕
  | "happy"       // 开心
  | "clingy"      // 撒娇/粘人
  | "jealous"     // 吃醋/不满
  | "worried"     // 焦虑
  | "hurt"        // 受伤
  | "composed"    // 淡定/从容（女版）
  | "anxious"     // 不安
  | "excited"     // 兴奋（男版）
  | "passionate"  // 深情
  | "sleepy"      // 困倦
  | "angry"       // 生气（林野）
  | "wronged";    // 委屈

export interface CharacterState {
  id: string;
  user_id: string;
  character_id: string;
  mood: MoodType;
  intimacy: number; // 0 - 100
  mood_intensity?: number; // 情绪强度 0-100
  last_message_at?: string;
  next_proactive_at?: string;
  updated_at: string;
}

// 情绪标签映射
export const MOOD_LABELS: Record<MoodType, string> = {
  calm: "😌 平静",
  concerned: "😟 担心",
  sad: "😢 难过",
  guarded: "🛡️ 防备",
  happy: "😊 开心",
  clingy: "🥰 撒娇",
  jealous: "😤 吃醋",
  worried: "😰 焦虑",
  hurt: "💔 受伤",
  composed: "☕ 从容",
  anxious: "😳 不安",
  excited: "🤩 兴奋",
  passionate: "❤️ 深情",
  sleepy: "😴 困倦",
  angry: "😠 生气",
  wronged: "😢 委屈",
};

// 情绪 Emoji 映射
export const MOOD_EMOJIS: Record<MoodType, string> = {
  calm: "😌",
  concerned: "😟",
  sad: "😢",
  guarded: "🛡️",
  happy: "😊",
  clingy: "🥰",
  jealous: "😤",
  worried: "😰",
  hurt: "💔",
  composed: "☕",
  anxious: "😳",
  excited: "🤩",
  passionate: "❤️",
  sleepy: "😴",
  angry: "😠",
  wronged: "😢",
};

export interface CharacterProfile {
  id: string;
  name: string;
  display_name: string;
  age: number;
  occupation: string;
  avatar_url: string;
  sticker_url: string;
  personality: string[];
  speech_style: string;
  nicknames_for_user: string[];
  daily_schedule: Record<number, string>;
  proactive_topics: string[];
  intimacy_growth: {
    reply: number;
    share: number;
    miss: number;
  };
}

export interface User {
  id: string;
  name: string;
  created_at: string;
}

// ==================== API 相关类型 ====================

/**
 * API 错误码枚举
 */
export enum ApiErrorCode {
  UNAUTHORIZED = 'UNAUTHORIZED',        // 401 - 凭证无效
  FORBIDDEN = 'FORBIDDEN',              // 403 - 无权限
  RATE_LIMIT = 'RATE_LIMIT',            // 429 - 限流
  SERVER_ERROR = 'SERVER_ERROR',        // 5xx - 服务端错误
  TIMEOUT = 'TIMEOUT',                  // 请求超时
  NETWORK_ERROR = 'NETWORK_ERROR',      // 网络断开
  PARSE_ERROR = 'PARSE_ERROR',          // 响应解析失败
  VALIDATION_ERROR = 'VALIDATION_ERROR',// 参数校验失败
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',      // 未知错误
}

/**
 * API 错误接口
 */
export interface ApiError {
  code: ApiErrorCode;
  message: string;
  provider: string;
  httpStatus?: number;
  retryable: boolean;
  timestamp: number;
  details?: string;
}

/**
 * 日志级别
 */
export type LogLevel = 'info' | 'warn' | 'error';

/**
 * 日志事件类型
 */
export type LogEvent = 'api_request_start' | 'api_request_end' | 'api_error' | 'reasoning_start' | 'reasoning_end';

/**
 * 日志条目
 */
export interface LogEntry {
  level: LogLevel;
  event: LogEvent;
  provider: string;
  method: string;
  requestId: string;
  duration?: number;        // 毫秒
  statusCode?: number;
  errorCode?: string;
  errorMessage?: string;
  maskedKey?: string;      // 脱敏后的凭证前缀
  timestamp: string;
  reasoningTokens?: number; // 推理消耗 token 数
  promptTokens?: number;    // 输入 token 数
  completionTokens?: number;// 输出 token 数
}

/**
 * 推理结果（reasoning 能力）
 */
export interface ReasoningResult {
  reasoning: string;           // 思考过程
  reasoningDetails?: {         // 详细思考信息
    type: 'reasoning.text';
    text: string;
    format: string;
    index: number;
  }[];
  rawResponse?: unknown;        // 原始响应（可选，用于调试）
}

/**
 * OpenRouter 响应结构
 */
export interface OpenRouterResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  provider: string;
  system_fingerprint?: string;
  service_tier?: string | null;
  choices: {
    index: number;
    logprobs: unknown | null;
    finish_reason: string;
    native_finish_reason: string;
    message: {
      role: string;
      content: string;
      refusal: string | null;
      reasoning: string;
      reasoning_details: ReasoningResult['reasoningDetails'];
    };
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    cost: number;
    is_byok: boolean;
    prompt_tokens_details: {
      cached_tokens: number;
      cache_write_tokens: number;
      audio_tokens: number;
      video_tokens: number;
    };
    cost_details: {
      upstream_inference_cost: number;
      upstream_inference_prompt_cost: number;
      upstream_inference_completions_cost: number;
    };
    completion_tokens_details: {
      reasoning_tokens: number;
      image_tokens: number;
      audio_tokens: number;
    };
  };
}
