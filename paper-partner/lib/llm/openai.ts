/**
 * OpenAI Provider 实现
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
 * OpenAI Provider
 */
export class OpenAIProvider implements LLMProvider {
  private client: OpenAI;
  private model: string;
  private name = "openai";

  constructor(config: ProviderConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL || "https://api.openai.com/v1",
    });
    this.model = config.model || "gpt-4o-mini";
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
    const completion = await this.client.chat.completions.create({
      model: options.model || this.model,
      messages: options.messages,
      temperature: options.temperature,
      max_tokens: options.max_tokens,
      stream: false, // 强制非流式
      ...(options.reasoning?.enabled ? {
        extra_body: {
          reasoning: {
            effort: options.reasoning.effort || "medium",
            exclude: false,
          },
        },
      } : {}),
    });

    const choice = completion.choices[0];
    const message = choice?.message;

    return {
      content: message?.content?.trim() || "",
      reasoning: (message as unknown as { reasoning?: string })?.reasoning,
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
          format: "openai",
          index: 0,
        },
      ],
    };
  }
}
