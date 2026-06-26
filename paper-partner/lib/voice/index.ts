/**
 * 语音合成模块 - 导出索引
 * 统一导出所有公开接口
 */

// 类型导出
export {
  type SynthesizeRequest,
  type SynthesizeResponse,
  type SynthesizeData,
  type SynthesizeError,
  type SynthesizeMeta,
  type AudioFormat,
  type ErrorType,
  type VoiceProviderConfig,
  type ProviderOptions,
  type ProviderRawResponse,
  AUDIO_FORMAT_MAP,
  DEFAULT_SPEAKER,
  MAX_TEXT_LENGTH,
  VOICE_CACHE_DIR,
  AUDIO_EXPIRY_MS,
  ERROR_CODES,
  ERROR_TYPE_MAP,
} from "./types";

// 错误导出
export {
  VoiceGenerationError,
  invalidApiKeyError,
  accessDeniedError,
  rateLimitedError,
  serverError,
  timeoutError,
  networkError,
  validationError,
  storageError,
  unknownError,
  createErrorFromStatus,
  getErrorDisplayMessage,
} from "./errors";

// 服务导出
export {
  VoiceService,
  getVoiceService,
  resetVoiceService,
  type VoiceServiceConfig,
} from "./service";

// Provider 导出
export {
  registerVoiceProvider,
  getVoiceProvider,
  getRegisteredVoiceProviders,
} from "./provider";
export type { VoiceProvider } from "./provider";

// 火山引擎 Provider
export {
  VolcanoVoiceProvider,
  createVolcanoVoiceProvider,
} from "./providers/volcano";

// Mock Provider
export {
  MockVoiceProvider,
  createMockVoiceProvider,
} from "./providers/mock";
