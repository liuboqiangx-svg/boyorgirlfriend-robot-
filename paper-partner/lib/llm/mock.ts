/**
 * Mock Provider 实现
 *
 * 用于开发测试，不调用真实 API
 */

import {
  LLMProvider,
  ProviderConfig,
  ChatCompletionOptions,
  ChatCompletionResponse,
} from "../provider";
import { ReasoningResult } from "@/types";

/**
 * Mock 回复池
 */
const MOCK_REPLIES = [
  "嗯，我在听呢~",
  "哈哈，你真有意思~",
  "我刚想给你发消息，你就来了~",
  "今天有点想你了~",
  "陪我聊会儿好不好？",
];

/**
 * Mock Provider
 */
export class MockProvider implements LLMProvider {
  private name = "mock";

  constructor(_config: ProviderConfig) {
    // Mock Provider 不需要配置
  }

  getName(): string {
    return this.name;
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }

  async chat(options: ChatCompletionOptions): Promise<ChatCompletionResponse> {
    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));

    // 简单分析消息内容，返回合适的回复
    const userMessage = options.messages[options.messages.length - 1]?.content || "";
    const lower = userMessage.toLowerCase();

    let content: string;

    if (lower.includes("早") || lower.includes("morning")) {
      content = "早安~今天也要开心哦~";
    } else if (lower.includes("晚") || lower.includes("sleep")) {
      content = "晚安~别熬夜太晚哦~";
    } else if (lower.includes("吃") || lower.includes("饭")) {
      content = "我刚吃完呢，你呢？";
    } else if (lower.includes("想") || lower.includes("miss")) {
      content = "我也想你~";
    } else if (lower.includes("喜欢") || lower.includes("爱")) {
      content = "我也喜欢你~";
    } else if (lower.includes("在吗") || lower.includes("在干嘛")) {
      content = "在呢~刚在想你呢~";
    } else {
      content = MOCK_REPLIES[Math.floor(Math.random() * MOCK_REPLIES.length)];
    }

    return {
      content,
      usage: {
        prompt_tokens: 10,
        completion_tokens: content.length,
        total_tokens: 10 + content.length,
      },
    };
  }

  toReasoningResult(reasoning: string): ReasoningResult {
    return {
      reasoning,
      reasoningDetails: [
        {
          type: "reasoning.text",
          text: reasoning,
          format: "mock",
          index: 0,
        },
      ],
    };
  }
}
