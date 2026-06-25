/**
 * API 日志模块
 *
 * 提供统一的结构化日志记录
 * 支持请求追踪、错误记录、凭证脱敏
 */

import { LogEntry, LogLevel, LogEvent, ApiError } from '@/types';

/**
 * 生成请求 ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * 获取当前时间戳（ISO 格式）
 */
function getTimestamp(): string {
  return new Date().toISOString();
}

/**
 * 脱敏 API Key（只显示前3后3位）
 */
export function maskApiKey(key: string | undefined): string {
  if (!key || key.length < 10) {
    return '***';
  }
  return `${key.substring(0, 3)}***${key.substring(key.length - 3)}`;
}

/**
 * 日志记录器类
 */
export class ApiLogger {
  private provider: string;
  private requestId: string;

  constructor(provider: string) {
    this.provider = provider;
    this.requestId = generateRequestId();
  }

  /**
   * 记录请求开始
   */
  logRequestStart(method: string, model?: string): LogEntry {
    const entry: LogEntry = {
      level: 'info',
      event: 'api_request_start',
      provider: this.provider,
      method,
      requestId: this.requestId,
      timestamp: getTimestamp(),
    };

    if (model) {
      // 脱敏日志输出
      console.log(`[${entry.timestamp}] ${entry.event} | provider=${this.provider} | method=${method} | model=${model} | requestId=${entry.requestId}`);
    } else {
      console.log(`[${entry.timestamp}] ${entry.event} | provider=${this.provider} | method=${method} | requestId=${entry.requestId}`);
    }

    return entry;
  }

  /**
   * 记录请求结束
   */
  logRequestEnd(
    method: string,
    statusCode: number,
    duration: number,
    maskedKey?: string,
    usage?: { promptTokens?: number; completionTokens?: number; reasoningTokens?: number }
  ): LogEntry {
    const entry: LogEntry = {
      level: statusCode >= 400 ? 'warn' : 'info',
      event: 'api_request_end',
      provider: this.provider,
      method,
      requestId: this.requestId,
      duration,
      statusCode,
      maskedKey,
      timestamp: getTimestamp(),
    };

    // 添加 token 使用情况
    if (usage) {
      entry.promptTokens = usage.promptTokens;
      entry.completionTokens = usage.completionTokens;
      entry.reasoningTokens = usage.reasoningTokens;
    }

    const logMessage = `[${entry.timestamp}] ${entry.event} | provider=${this.provider} | method=${method} | status=${statusCode} | duration=${duration}ms | maskedKey=${maskedKey || 'N/A'}`;
    const usageMessage = usage ? ` | tokens=prompt:${usage.promptTokens} completion:${usage.completionTokens} reasoning:${usage.reasoningTokens || 0}` : '';

    if (statusCode >= 400) {
      console.warn(`${logMessage}${usageMessage}`);
    } else {
      console.log(`${logMessage}${usageMessage}`);
    }

    return entry;
  }

  /**
   * 记录 API 错误
   */
  logError(
    method: string,
    error: Error | ApiError,
    maskedKey?: string
  ): LogEntry {
    const errorCode = 'code' in error ? error.code : 'UNKNOWN_ERROR';
    const errorMessage = error.message || String(error);
    const httpStatus = 'httpStatus' in error ? error.httpStatus : undefined;

    const entry: LogEntry = {
      level: 'error',
      event: 'api_error',
      provider: this.provider,
      method,
      requestId: this.requestId,
      statusCode: httpStatus,
      errorCode,
      errorMessage: errorMessage.substring(0, 200), // 限制长度
      maskedKey,
      timestamp: getTimestamp(),
    };

    // 安全日志：不打印完整错误信息
    console.error(
      `[${entry.timestamp}] ${entry.event} | provider=${this.provider} | method=${method} | errorCode=${errorCode} | status=${httpStatus || 'N/A'} | maskedKey=${maskedKey || 'N/A'} | requestId=${entry.requestId}`
    );

    return entry;
  }

  /**
   * 记录推理开始
   */
  logReasoningStart(model: string): LogEntry {
    const entry: LogEntry = {
      level: 'info',
      event: 'reasoning_start',
      provider: this.provider,
      method: 'chat.completions',
      requestId: this.requestId,
      timestamp: getTimestamp(),
    };

    console.log(`[${entry.timestamp}] ${entry.event} | model=${model} | requestId=${entry.requestId}`);

    return entry;
  }

  /**
   * 记录推理结束
   */
  logReasoningEnd(reasoningTokens: number, totalDuration: number): LogEntry {
    const entry: LogEntry = {
      level: 'info',
      event: 'reasoning_end',
      provider: this.provider,
      method: 'chat.completions',
      requestId: this.requestId,
      duration: totalDuration,
      reasoningTokens,
      timestamp: getTimestamp(),
    };

    console.log(
      `[${entry.timestamp}] ${entry.event} | reasoningTokens=${reasoningTokens} | duration=${totalDuration}ms | requestId=${entry.requestId}`
    );

    return entry;
  }

  /**
   * 获取当前请求 ID
   */
  getRequestId(): string {
    return this.requestId;
  }

  /**
   * 创建新的请求 ID
   */
  resetRequestId(): void {
    this.requestId = generateRequestId();
  }
}

/**
 * 创建日志记录器
 */
export function createLogger(provider: string = 'openrouter'): ApiLogger {
  return new ApiLogger(provider);
}

/**
 * 便捷方法：记录请求开始
 */
export function logRequestStart(
  provider: string,
  method: string,
  model?: string
): LogEntry {
  const logger = createLogger(provider);
  return logger.logRequestStart(method, model);
}

/**
 * 便捷方法：记录请求结束
 */
export function logRequestEnd(
  provider: string,
  method: string,
  statusCode: number,
  duration: number,
  maskedKey?: string,
  usage?: { promptTokens?: number; completionTokens?: number; reasoningTokens?: number }
): LogEntry {
  const logger = createLogger(provider);
  return logger.logRequestEnd(method, statusCode, duration, maskedKey, usage);
}

/**
 * 便捷方法：记录错误
 */
export function logApiError(
  provider: string,
  method: string,
  error: Error | ApiError,
  maskedKey?: string
): LogEntry {
  const logger = createLogger(provider);
  return logger.logError(method, error, maskedKey);
}

/**
 * 便捷方法：记录推理
 */
export function logReasoning(
  provider: string,
  model: string,
  reasoningTokens: number,
  totalDuration: number
): LogEntry {
  const logger = createLogger(provider);
  logger.logReasoningStart(model);
  return logger.logReasoningEnd(reasoningTokens, totalDuration);
}
