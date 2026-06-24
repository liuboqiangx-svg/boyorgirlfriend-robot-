/**
 * 语音合成 - Provider 接口定义
 * 抽象语音合成的 Provider 接口，便于扩展和替换
 */

import {
  VoiceProviderConfig,
  ProviderOptions,
  ProviderRawResponse,
} from "./types";

/**
 * Provider 接口
 * 定义语音合成器的标准接口
 */
export interface VoiceProvider {
  /**
   * 提供商名称
   */
  readonly name: string;

  /**
   * 合成语音
   * @param options 合成选项
   * @returns Base64 编码的音频数据
   */
  synthesize(options: ProviderOptions): Promise<string>;

  /**
   * 获取提供商配置
   */
  getConfig(): VoiceProviderConfig;
}

/**
 * Provider 工厂函数类型
 */
export type VoiceProviderFactory = (config: VoiceProviderConfig) => VoiceProvider;

/**
 * Provider 注册表
 */
const voiceProviderRegistry: Map<string, VoiceProviderFactory> = new Map();

/**
 * 注册 Provider
 */
export function registerVoiceProvider(name: string, factory: VoiceProviderFactory): void {
  voiceProviderRegistry.set(name, factory);
}

/**
 * 获取 Provider
 */
export function getVoiceProvider(name: string, config: VoiceProviderConfig): VoiceProvider | null {
  const factory = voiceProviderRegistry.get(name);
  if (!factory) {
    return null;
  }
  return factory(config);
}

/**
 * 获取所有已注册的 Provider 名称
 */
export function getRegisteredVoiceProviders(): string[] {
  return Array.from(voiceProviderRegistry.keys());
}
