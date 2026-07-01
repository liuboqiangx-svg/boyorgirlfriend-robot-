/**
 * DeepSeek Provider 实现
 *
 * 基于 OpenAI SDK 的 DeepSeek API 适配
 */

import OpenAI from "openai";
import {
  LLMProvider,
  ProviderConfig,
  ChatCompletionOptions,
  ChatCompletionResponse,
} from "../provider";
import { ReasoningResult } from "@/types";

/**
 * DeepSeek Provider
 */
export class DeepSeekProvider implements LLMProvider {
  private client: OpenAI;
  private model: string;
  private name = "deepseek";

  constructor(config: ProviderConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL || "https://api.deepseek.com/v1",
    });
    this.model = config.model || "deepseek-v4-pro";
  }

  getName(): string {
    return this.name;
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: "user", content: "hi" }],
        max_tokens: 5,
      });
      return true;
    } catch {
      return false;
    }
  }

  async chat(options: ChatCompletionOptions): Promise<ChatCompletionResponse> {
    // DeepSeek 特定参数
    const reasoningEffort = options.reasoning?.effort || "high";

    const completion = await this.client.chat.completions.create({
      model: options.model || this.model,
      messages: options.messages,
      temperature: options.temperature,
      max_tokens: options.max_tokens,
      stream: false, // DeepSeek Provider 不支持流式
      ...(options.reasoning?.enabled ? {
        thinking: {
          type: "enabled" as const,
        },
        reasoning_effort: reasoningEffort,
      } : {}),
    });

    const choice = completion.choices[0];
    const message = choice?.message as unknown as {
      content?: string;
      reasoning_content?: string;
    };

    // 提取 reasoning_tokens
    const reasoningTokens = (completion.usage as {
      completion_tokens_details?: { reasoning_tokens?: number };
    })?.completion_tokens_details?.reasoning_tokens;

    return {
      content: message?.content?.trim() || "",
      reasoning: message?.reasoning_content,
      reasoningTokens,
      usage: completion.usage ? {
        prompt_tokens: completion.usage.prompt_tokens,
        completion_tokens: completion.usage.completion_tokens,
        total_tokens: completion.usage.total_tokens,
      } : undefined,
      raw: completion,
    };
  }

  toReasoningResult(reasoning: string): ReasoningResult {
    return {
      reasoning,
      reasoningDetails: [
        {
          type: "reasoning.text",
          text: reasoning,
          format: "deepseek",
          index: 0,
        },
      ],
    };
  }
}
