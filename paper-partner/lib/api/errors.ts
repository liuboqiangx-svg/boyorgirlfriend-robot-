/**
 * API 错误处理模块
 *
 * 提供统一的 API 错误分类和处理
 * 支持的错误码：401、403、429、5xx、timeout、network 等
 */

import { ApiErrorCode, ApiError } from '@/types';

/**
 * 错误码到可读消息的映射
 */
const ERROR_MESSAGES: Record<ApiErrorCode, string> = {
  [ApiErrorCode.UNAUTHORIZED]: '认证失败，请检查 API Key 是否正确',
  [ApiErrorCode.FORBIDDEN]: '无权限访问，请检查账户状态',
  [ApiErrorCode.RATE_LIMIT]: '请求过于频繁，请稍后重试',
  [ApiErrorCode.SERVER_ERROR]: '服务暂时不可用，请稍后重试',
  [ApiErrorCode.TIMEOUT]: '请求超时，请检查网络连接',
  [ApiErrorCode.NETWORK_ERROR]: '网络连接失败，请检查网络',
  [ApiErrorCode.PARSE_ERROR]: '响应解析失败，请联系开发者',
  [ApiErrorCode.VALIDATION_ERROR]: '请求参数错误，请检查输入',
  [ApiErrorCode.UNKNOWN_ERROR]: '发生了未知错误，请稍后重试',
};

/**
 * 错误码是否可重试
 */
const RETRYABLE_ERRORS: Set<ApiErrorCode> = new Set([
  ApiErrorCode.RATE_LIMIT,
  ApiErrorCode.SERVER_ERROR,
  ApiErrorCode.TIMEOUT,
  ApiErrorCode.NETWORK_ERROR,
]);

/**
 * API 错误类
 */
export class LlmApiError extends Error {
  public readonly code: ApiErrorCode;
  public readonly httpStatus?: number;
  public readonly retryable: boolean;
  public readonly provider: string;
  public readonly timestamp: number;
  public readonly details?: string;

  constructor(
    code: ApiErrorCode,
    provider: string,
    message?: string,
    httpStatus?: number,
    details?: string
  ) {
    // 使用传入的消息或默认消息
    const displayMessage = message || ERROR_MESSAGES[code];
    super(displayMessage);

    this.name = 'LlmApiError';
    this.code = code;
    this.provider = provider;
    this.httpStatus = httpStatus;
    this.retryable = RETRYABLE_ERRORS.has(code);
    this.timestamp = Date.now();
    this.details = details;

    // 保持错误栈追踪
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * 转换为统一的 ApiError 接口
   */
  toApiError(): ApiError {
    return {
      code: this.code,
      message: this.message,
      provider: this.provider,
      httpStatus: this.httpStatus,
      retryable: this.retryable,
      timestamp: this.timestamp,
      details: this.details,
    };
  }

  /**
   * 获取用户友好的错误消息
   */
  getUserFriendlyMessage(): string {
    // 可以在这里添加多语言支持或自定义消息
    return this.message;
  }
}

/**
 * 从 HTTP 状态码创建错误
 */
export function createErrorFromStatus(
  status: number,
  provider: string,
  message?: string,
  details?: string
): LlmApiError {
  let code: ApiErrorCode;

  switch (status) {
    case 401:
      code = ApiErrorCode.UNAUTHORIZED;
      break;
    case 403:
      code = ApiErrorCode.FORBIDDEN;
      break;
    case 429:
      code = ApiErrorCode.RATE_LIMIT;
      break;
    default:
      if (status >= 500) {
        code = ApiErrorCode.SERVER_ERROR;
      } else if (status >= 400) {
        code = ApiErrorCode.VALIDATION_ERROR;
      } else {
        code = ApiErrorCode.UNKNOWN_ERROR;
      }
  }

  return new LlmApiError(code, provider, message, status, details);
}

/**
 * 从 Fetch 错误创建错误
 */
export function createErrorFromFetch(error: Error, provider: string): LlmApiError {
  // 判断是否为超时错误
  if (error.name === 'AbortError' || error.message.includes('timeout')) {
    return new LlmApiError(
      ApiErrorCode.TIMEOUT,
      provider,
      '请求超时',
      undefined,
      error.message
    );
  }

  // 网络错误
  return new LlmApiError(
    ApiErrorCode.NETWORK_ERROR,
    provider,
    '网络连接失败',
    undefined,
    error.message
  );
}

/**
 * 从 API 响应创建错误
 */
export async function createErrorFromResponse(
  response: Response,
  provider: string
): Promise<LlmApiError> {
  const status = response.status;
  let errorData: { error?: { message?: string; code?: string } } | null = null;

  try {
    errorData = await response.json();
  } catch {
    // 响应不是 JSON，忽略
  }

  const message = errorData?.error?.message;
  const details = errorData?.error?.code || `HTTP ${status}`;

  return createErrorFromStatus(status, provider, message, details);
}

/**
 * 判断错误是否可重试
 */
export function isRetryable(error: LlmApiError | ApiError): boolean {
  return error.retryable;
}

/**
 * 获取错误的重试延迟（指数退避）
 */
export function getRetryDelay(
  attempt: number,
  baseDelay: number = 1000,
  maxDelay: number = 30000
): number {
  // 指数退避：1s, 2s, 4s, 8s, 16s, 30s(max)
  const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
  // 添加随机抖动（±25%）
  const jitter = delay * 0.25 * (Math.random() * 2 - 1);
  return Math.floor(delay + jitter);
}

/**
 * 带重试的 API 调用
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  provider: string,
  maxAttempts: number = 3
): Promise<T> {
  let lastError: LlmApiError | Error | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof LlmApiError
        ? error
        : (error instanceof Error
          ? createErrorFromFetch(error, provider)
          : new LlmApiError(ApiErrorCode.UNKNOWN_ERROR, provider));

      // 如果不可重试，直接抛出
      if (!isRetryable(lastError as LlmApiError)) {
        throw lastError;
      }

      // 如果不是最后一次尝试，等待后重试
      if (attempt < maxAttempts - 1) {
        const delay = getRetryDelay(attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
