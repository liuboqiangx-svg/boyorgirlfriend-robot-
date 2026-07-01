/**
 * LLM Provider 接口定义
 *
 * 定义统一的 Provider 接口，保证上层调用不变的情况下切换底层实现
 */

import { ReasoningResult } from "@/types";

/**
 * Chat 请求选项
 */
export interface ChatCompletionOptions {
  /** 模型 */
  model: string;
  /** 消息列表 */
  messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }>;
  /** 温度参数 */
  temperature?: number;
  /** 最大 token 数 */
  max_tokens?: number;
  /** 是否流式输出 */
  stream?: boolean;
  /** 启用推理（Provider 特定） */
  reasoning?: {
    enabled: boolean;
    effort?: "low" | "medium" | "high";
  };
}

/**
 * Chat 响应
 */
export interface ChatCompletionResponse {
  /** 生成的文本内容 */
  content: string;
  /** 推理内容（如果有） */
  reasoning?: string;
  /** 推理 token 数（如果有） */
  reasoningTokens?: number;
  /** 使用的 token 数 */
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  /** 原始响应（用于调试） */
  raw?: unknown;
}

/**
 * Provider 配置
 */
export interface ProviderConfig {
  /** API Key */
  apiKey: string;
  /** API 端点 */
  baseURL?: string;
  /** 模型 */
  model?: string;
  /** 超时时间（毫秒） */
  timeout?: number;
}

/**
 * LLM Provider 接口
 */
export interface LLMProvider {
  /**
   * 获取 Provider 名称
   */
  getName(): string;

  /**
   * 健康检查
   */
  healthCheck(): Promise<boolean>;

  /**
   * 发送 Chat 请求
   */
  chat(options: ChatCompletionOptions): Promise<ChatCompletionResponse>;

  /**
   * 转换为统一的 ReasoningResult
   */
  toReasoningResult?(reasoning: string): ReasoningResult;
}

/**
 * Provider 列表
 */
export type ProviderType = "openai" | "deepseek" | "anthropic" | "mock";
