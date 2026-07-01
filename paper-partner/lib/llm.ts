/**
 * LLM 服务层
 *
 * 封装 LLM 调用逻辑，通过 Provider 适配层支持多 Provider
 */

import { DEFAULT_CHARACTER } from "@/lib/character";
import { buildSystemPrompt } from "@/lib/character-prompts";
import { Memory, ReasoningResult, ApiErrorCode } from "@/types";
import {
  EmotionEngine,
  createEmotionEngine,
  MoodType,
  EmotionState,
  buildEmotionPrompt,
  detectTriggerWords,
} from "@/lib/emotion";
import { getEmotionConfig, getDefaultEmotionConfig } from "@/lib/emotions";
import { LlmApiError, withRetry } from "@/lib/api/errors";
import { createLogger, maskApiKey } from "@/lib/api/logger";
import {
  LLMProvider,
  ProviderConfig,
  ChatCompletionOptions,
  ProviderType,
} from "@/lib/llm/provider";
import { DeepSeekProvider } from "@/lib/llm/deepseek";
import { OpenAIProvider } from "@/lib/llm/openai";
import { MockProvider } from "@/lib/llm/mock";

// ============ Provider 配置 ============

/**
 * 获取当前使用的 Provider 类型
 */
function getActiveProviderType(): ProviderType {
  // 优先使用明确的 Provider 配置
  const provider = process.env.LLM_PROVIDER;
  if (provider === "openai") return "openai";
  if (provider === "deepseek") return "deepseek";
  if (provider === "mock" || process.env.USE_MOCK_LLM === "true") return "mock";

  // 自动检测：根据 baseURL 判断
  const baseURL = process.env.OPENAI_BASE_URL || "";
  if (baseURL.includes("deepseek")) return "deepseek";
  if (baseURL.includes("openai")) return "openai";

  // 默认使用 DeepSeek
  return "deepseek";
}

/**
 * 获取 Provider 配置
 */
function getProviderConfig(): ProviderConfig {
  return {
    apiKey: process.env.OPENAI_API_KEY || "",
    baseURL: process.env.OPENAI_BASE_URL,
    model: process.env.LLM_MODEL,
    timeout: parseInt(process.env.LLM_TIMEOUT || "60000"),
  };
}

/**
 * 创建 Provider 实例
 */
function createLLMProvider(): LLMProvider {
  const type = getActiveProviderType();
  const config = getProviderConfig();

  switch (type) {
    case "mock":
      return new MockProvider(config);
    case "openai":
      return new OpenAIProvider(config);
    case "deepseek":
    default:
      return new DeepSeekProvider(config);
  }
}

// Provider 单例
let llmProvider: LLMProvider | null = null;

/**
 * 获取 LLM Provider 实例
 */
export function getLLMProvider(): LLMProvider {
  if (!llmProvider) {
    llmProvider = createLLMProvider();
  }
  return llmProvider;
}

/**
 * 重置 Provider（用于切换 Provider）
 */
export function resetLLMProvider(): void {
  llmProvider = null;
}

// ============ Service 接口 ============

export interface ChatOptions {
  userName: string;
  characterId: string;
  characterName: string;
  characterProfile: string;
  memories: Memory[];
  history: { role: "user" | "character"; content: string }[];
  currentMessage: string;
  mood: string;
  intimacy: number;
  nickname?: string;
  emotionState?: Partial<EmotionState>;
  enableReasoning?: boolean;   // 是否启用推理能力
  showReasoning?: boolean;     // 是否展示思考过程
}

export interface GenerateReplyResult {
  content: string;
  mood: string;
  moodLabel: string;
  moodEmoji: string;
  moodChanged: boolean;
  triggerType: "positive" | "negative" | "neutral" | null;
  triggerWord: string | null;
  intensity: number;
  reasoning?: ReasoningResult;  // 思考过程
}

// ============ 情绪引擎 ============

// 角色情绪引擎缓存
const emotionEngines: Map<string, EmotionEngine> = new Map();

/**
 * 获取或创建角色的情绪引擎
 */
function getEmotionEngine(characterId: string): EmotionEngine {
  if (!emotionEngines.has(characterId)) {
    const config = getEmotionConfig(characterId) || getDefaultEmotionConfig();
    emotionEngines.set(characterId, createEmotionEngine(config));
  }
  return emotionEngines.get(characterId)!;
}

/**
 * 重置角色的情绪引擎
 */
export function resetEmotionEngine(characterId: string): void {
  emotionEngines.delete(characterId);
}

// ============ 核心逻辑 ============

/**
 * 生成角色回复
 */
export async function generateCharacterReply(
  options: ChatOptions
): Promise<GenerateReplyResult> {
  const engine = getEmotionEngine(options.characterId);
  const provider = getLLMProvider();
  const logger = createLogger(provider.getName());
  const maskedKey = maskApiKey(process.env.OPENAI_API_KEY);
  const isMock = provider.getName() === "mock";

  // 如果有初始状态，设置它
  if (options.emotionState) {
    engine.reset();
    const config = engine.getConfig();
    engine.getState().current = (options.emotionState.current as MoodType) || config.defaultMood;
    engine.getState().intensity = options.emotionState.intensity || 50;
  }

  // 处理消息，触发情绪变化
  const emotionResult = engine.processMessage(options.currentMessage);

  // 获取当前情绪状态
  const currentEmotion = engine.getState();
  const config = engine.getConfig();

  // 构建情绪 Prompt
  const emotionPrompt = buildEmotionPrompt(
    currentEmotion.current,
    currentEmotion.intensity,
    config.moodLabels,
    currentEmotion.history.slice(-3)
  );

  // Mock 模式
  if (isMock) {
    logger.logRequestStart('chat.completions', options.characterId);
    const result = mockGenerateReply(options, engine);
    logger.logRequestEnd('chat.completions', 200, 0, maskedKey);
    return {
      ...result,
      moodLabel: config.moodLabels[result.mood as MoodType] || result.mood,
      moodEmoji: config.moodEmojis[result.mood as MoodType] || "😐",
      moodChanged: emotionResult.changed,
      triggerType: emotionResult.triggerType,
      triggerWord: emotionResult.trigger,
      intensity: currentEmotion.intensity,
    };
  }

  // 构建 Prompt
  const memoryText =
    options.memories.length > 0
      ? `\n\n关于用户的已知信息：\n${options.memories
          .map((m) => `- ${m.key}: ${m.value}`)
          .join("\n")}`
      : "";

  const systemPrompt = buildSystemPrompt(
    options.characterId,
    options.intimacy,
    currentEmotion.current,
    emotionPrompt
  );

  // 调试日志
  console.log(`[LLM Debug] provider: ${provider.getName()}`);
  console.log(`[LLM Debug] characterId: ${options.characterId}`);

  const finalSystemPrompt = memoryText ? `${systemPrompt}${memoryText}` : systemPrompt;

  const messages = [
    { role: "system" as const, content: finalSystemPrompt },
    ...options.history.slice(-10).map((h) => ({
      role: h.role === "user" ? ("user" as const) : ("assistant" as const),
      content: h.content,
    })),
    { role: "user" as const, content: options.currentMessage },
  ];

  // 调试：打印消息
  console.log("[LLM Debug] === 完整消息 ===");
  messages.forEach((m, i) => {
    console.log(`[LLM Debug] [${i}] ${m.role}: ${String(m.content).substring(0, 500)}`);
  });
  console.log("[LLM Debug] ==================");

  const model = process.env.LLM_MODEL || "deepseek-v4-pro";
  logger.logRequestStart('chat.completions', model);

  const startTime = Date.now();

  try {
    // 构建请求选项
    const chatOptions: ChatCompletionOptions = {
      model,
      messages,
      temperature: 0.85,
      max_tokens: 500,
      reasoning: options.enableReasoning ? {
        enabled: true,
        effort: (process.env.DEEPSEEK_REASONING_EFFORT as "low" | "medium" | "high") || "high",
      } : undefined,
    };

    // 调用 Provider
    const response = await withRetry(
      () => provider.chat(chatOptions),
      provider.getName(),
      3
    );

    const duration = Date.now() - startTime;

    // 构建 reasoning 结果
    let reasoning: ReasoningResult | undefined;
    if (options.enableReasoning && response.reasoning) {
      if (provider.toReasoningResult) {
        reasoning = provider.toReasoningResult(response.reasoning);
      } else {
        reasoning = {
          reasoning: response.reasoning,
          reasoningDetails: [{
            type: 'reasoning.text',
            text: response.reasoning,
            format: provider.getName(),
            index: 0,
          }],
        };
      }
      logger.logReasoningEnd(response.reasoningTokens || 0, duration);
    }

    logger.logRequestEnd(
      'chat.completions',
      200,
      duration,
      maskedKey,
      {
        promptTokens: response.usage?.prompt_tokens,
        completionTokens: response.usage?.completion_tokens,
      }
    );

    return {
      content: response.content || "嗯，我在听。",
      mood: currentEmotion.current,
      moodLabel: config.moodLabels[currentEmotion.current] || currentEmotion.current,
      moodEmoji: config.moodEmojis[currentEmotion.current] || "😐",
      moodChanged: emotionResult.changed,
      triggerType: emotionResult.triggerType,
      triggerWord: emotionResult.trigger,
      intensity: currentEmotion.intensity,
      reasoning,
    };
  } catch (error) {
    const duration = Date.now() - startTime;

    // 错误处理
    let llmError: LlmApiError;
    if (error instanceof LlmApiError) {
      llmError = error;
    } else if (error instanceof Error) {
      if ('status' in error && typeof (error as { status?: number }).status === 'number') {
        const status = (error as { status?: number }).status;
        llmError = new LlmApiError(
          status === 401 ? ApiErrorCode.UNAUTHORIZED :
          status === 403 ? ApiErrorCode.FORBIDDEN :
          status === 429 ? ApiErrorCode.RATE_LIMIT :
          status && status >= 500 ? ApiErrorCode.SERVER_ERROR : ApiErrorCode.UNKNOWN_ERROR,
          provider.getName(),
          error.message,
          status
        );
      } else {
        llmError = new LlmApiError(ApiErrorCode.NETWORK_ERROR, provider.getName(), error.message);
      }
    } else {
      llmError = new LlmApiError(ApiErrorCode.UNKNOWN_ERROR, provider.getName(), String(error));
    }

    logger.logError('chat.completions', llmError, maskedKey);
    console.error(`[LLM Error] ${llmError.code}: ${llmError.message}`);

    // 降级到 Mock 回复
    const mockResult = mockGenerateReply(options, engine);
    return {
      ...mockResult,
      moodLabel: config.moodLabels[mockResult.mood as MoodType] || mockResult.mood,
      moodEmoji: config.moodEmojis[mockResult.mood as MoodType] || "😐",
      moodChanged: emotionResult.changed,
      triggerType: emotionResult.triggerType,
      triggerWord: emotionResult.trigger,
      intensity: currentEmotion.intensity,
    };
  }
}

// ============ Mock 回复生成器 ============

/**
 * Mock 回复生成（接入情绪系统）
 */
function mockGenerateReply(
  options: ChatOptions,
  engine: EmotionEngine
): { content: string; mood: string } {
  const { currentMessage, characterName, nickname, intimacy } = options;
  const lower = currentMessage.toLowerCase();
  const call = nickname || DEFAULT_CHARACTER.nicknames_for_user[0];
  const config = engine.getConfig();
  const currentMood = engine.getState().current;

  // 检测触发词
  const trigger = detectTriggerWords(currentMessage, config.triggers);

  let reply = "";

  // 根据情绪状态选择不同的回复策略
  switch (currentMood) {
    case "calm":
    case "sleepy":
      reply = getCalmReply(lower, call, intimacy, trigger.type);
      break;
    case "concerned":
      reply = getConcernedReply(lower, call, intimacy, trigger.type);
      break;
    case "sad":
      reply = getSadReply(lower, call, intimacy, trigger.type);
      break;
    case "guarded":
      reply = getGuardedReply(lower, call, intimacy, trigger.type);
      break;
    case "happy":
      reply = getHappyReply(lower, call, intimacy);
      break;
    case "composed":
      reply = getComposedReply(lower, call, intimacy, trigger.type);
      break;
    case "anxious":
      reply = getAnxiousReply(lower, call, intimacy, trigger.type);
      break;
    case "hurt":
      reply = getHurtReply(lower, call, intimacy, trigger.type);
      break;
    case "angry":
      reply = getAngryReply(lower, call, intimacy, trigger.type);
      break;
    case "wronged":
      reply = getWrongedReply(lower, call, intimacy, trigger.type);
      break;
    case "excited":
      reply = getExcitedReply(lower, call, intimacy, trigger.type);
      break;
    case "jealous":
      reply = getJealousReply(lower, call, intimacy, trigger.type);
      break;
    case "clingy":
      reply = getClingyReply(lower, call, intimacy, trigger.type);
      break;
    case "passionate":
      reply = getPassionateReply(lower, call, intimacy, trigger.type);
      break;
    default:
      reply = getCalmReply(lower, call, intimacy, trigger.type);
  }

  return { content: reply, mood: currentMood };
}

// 情绪回复生成函数
function getCalmReply(lower: string, call: string, intimacy: number, triggerType: string): string {
  if (lower.includes("早") || lower.includes("morning")) {
    return `早安，${call}。醒来第一件事就是给你发消息，今天也要开心。`;
  }
  if (lower.includes("晚") || lower.includes("sleep")) {
    return `晚安，${call}。别熬夜太晚，我会心疼的。`;
  }
  if (lower.includes("吃") || lower.includes("饭")) {
    return `我刚吃完，你呢？有没有好好吃饭，${call}。`;
  }
  if (lower.includes("想") || lower.includes("miss")) {
    return intimacy > 30
      ? `我也想你，${call}。刚才开会的时候还在走神。`
      : `……有点想你，${call}。`;
  }
  if (lower.includes("忙") || lower.includes("工作")) {
    return `今天确实有点忙，但想到你就没那么累了，${call}。`;
  }
  if (lower.includes("在吗") || lower.includes("在干嘛")) {
    return `在呢，${call}。刚处理完一个方案，现在脑子里全是你。`;
  }
  if (lower.includes("喜欢") || lower.includes("爱")) {
    return intimacy > 30
      ? `我也喜欢你，${call}。这句话永远都不会腻。`
      : `你突然这么说，我会不好意思的，${call}。`;
  }

  const defaults = [
    `嗯？${call}，你接着说，我在听。`,
    `哈哈，${call}，你真的好可爱。`,
    `我刚想给你发消息，你就来了，${call}。`,
    `今天有点想你了，${call}。`,
    `${call}，陪我聊会儿好不好？`,
  ];
  return defaults[Math.floor(Math.random() * defaults.length)];
}

function getConcernedReply(lower: string, call: string, intimacy: number, triggerType: string): string {
  const positive = triggerType === "positive";
  if (positive) {
    return `……谢谢，${call}。有你在就好多了。`;
  }
  const replies = [
    `……你怎么不回消息，${call}？没事吧？`,
    `${call}，你是不是在忙？`,
    `……我不打扰你了，就是有点担心。`,
    `${call}？……还好吗？`,
  ];
  return replies[Math.floor(Math.random() * replies.length)];
}

function getSadReply(lower: string, call: string, intimacy: number, triggerType: string): string {
  const positive = triggerType === "positive";
  if (positive && intimacy > 50) {
    return `……${call}，有你在我就不难过了。抱抱。`;
  }
  const replies = [
    `……算了，没什么。`,
    `……我没事，${call}你别担心。`,
    `${call}……你不会走的吧？`,
    `……就是有点累。`,
  ];
  return replies[Math.floor(Math.random() * replies.length)];
}

function getGuardedReply(lower: string, call: string, intimacy: number, triggerType: string): string {
  const positive = triggerType === "positive";
  if (positive) {
    const replies = [`……你说的……是真的吗？`, `${call}，我不知道该不该相信你。`, `……让我想想。`];
    return replies[Math.floor(Math.random() * replies.length)];
  }
  const replies = [`……嗯。`, `……好吧。`, `${call}，你不用解释。`, `……没关系，我习惯了。`];
  return replies[Math.floor(Math.random() * replies.length)];
}

function getHappyReply(lower: string, call: string, intimacy: number): string {
  const replies = [
    `……哈，${call}你真有意思。`,
    `跟你聊天心情都变好了，${call}。`,
    `${call}，今天遇到一件好事，想不想听？`,
    `……😊 你怎么这么可爱。`,
  ];
  return replies[Math.floor(Math.random() * replies.length)];
}

function getComposedReply(lower: string, call: string, intimacy: number, triggerType: string): string {
  if (lower.includes("早") || lower.includes("morning")) {
    return `早安，${call}。今天天气不错，心情也好。`;
  }
  if (lower.includes("晚") || lower.includes("sleep")) {
    return `晚安，${call}。早点休息，不要熬夜哦。`;
  }
  if (lower.includes("想") || lower.includes("miss")) {
    return intimacy > 30
      ? `我也想你，${call}。今天一直在想你。`
      : `……你这样突然说，我会有点不好意思的。`;
  }
  if (lower.includes("喜欢") || lower.includes("爱")) {
    return intimacy > 40
      ? `我也喜欢你，${call}。每次看到你消息我都会笑。`
      : `你不要这样子哦……我会胡思乱想的。`;
  }
  const defaults = [`${call}，你今天怎么样？`, `嗯，我听着呢。`, `你怎么突然这么乖？`, `${call}，有什么想和我说的吗？`];
  return defaults[Math.floor(Math.random() * defaults.length)];
}

function getAnxiousReply(lower: string, call: string, intimacy: number, triggerType: string): string {
  const positive = triggerType === "positive";
  if (positive) {
    return `……${call}，谢谢你。有你在就好多了。`;
  }
  const replies = [`${call}……你怎么不回我？`, `你是不是在忙？我有点担心……`, `……算了，你忙你的吧。`, `${call}？你在吗？`];
  return replies[Math.floor(Math.random() * replies.length)];
}

function getHurtReply(lower: string, call: string, intimacy: number, triggerType: string): string {
  const positive = triggerType === "positive";
  if (positive && intimacy > 60) {
    return `……${call}，你说的让我好过了一点。但我还是……需要时间。`;
  }
  const replies = [`你不要这样子哦……我会难过的。`, `……算了，我不想说了。`, `${call}，你是不是觉得我很烦？`, `……我没事。（其实很难过）`];
  return replies[Math.floor(Math.random() * replies.length)];
}

function getAngryReply(lower: string, call: string, intimacy: number, triggerType: string): string {
  const positive = triggerType === "positive";
  if (positive) {
    return `哼！算你还有点良心！！抱抱！！`;
  }
  const replies = [`你有病吧！！怎么才回我！！`, `哼！生气了！！哄不好的那种！！`, `${call}你给我等着！！我真的很生气！！`];
  return replies[Math.floor(Math.random() * replies.length)];
}

function getWrongedReply(lower: string, call: string, intimacy: number, triggerType: string): string {
  const positive = triggerType === "positive";
  if (positive) {
    return `呜呜……好吧好吧原谅你了！！抱抱！！`;
  }
  const replies = [`呜呜……你怎么这样……委屈死了……`, `${call}你不爱我了对不对！！`, `哼！哭给你看！呜呜呜……`];
  return replies[Math.floor(Math.random() * replies.length)];
}

function getExcitedReply(lower: string, call: string, intimacy: number, triggerType: string): string {
  if (triggerType === "negative") {
    return `哎？？${call}你怎么了？？是不是不开心了？？`;
  }
  const replies = [
    `冲冲冲！！${call}！！我超级想你的！！`,
    `${call}！！你终于来了！！我等你好久了！！`,
    `啊啊啊！！${call}！！我刚发现一个超棒的地方！！`,
    `老婆老婆老婆！！亲亲亲亲！！`,
  ];
  return replies[Math.floor(Math.random() * replies.length)];
}

function getJealousReply(lower: string, call: string, intimacy: number, triggerType: string): string {
  const positive = triggerType === "positive";
  if (positive) {
    return `哼！算你识相！！老婆！！抱抱！！`;
  }
  const replies = [`你是不是在和别人聊天！！说！！是谁！！`, `${call}！！你怎么不理我！！是不是有别人了！！`, `哼！生气！！吃醋了！！哄不好的那种！！`];
  return replies[Math.floor(Math.random() * replies.length)];
}

function getClingyReply(lower: string, call: string, intimacy: number, triggerType: string): string {
  if (triggerType === "positive") {
    return `嘿嘿！！${call}！！最喜欢你了！！亲亲！！`;
  }
  const replies = [`${call}……陪我嘛……`, `抱抱！！要抱紧紧的那种！！`, `老婆老婆老婆！！你在干嘛！！想你了！！`];
  return replies[Math.floor(Math.random() * replies.length)];
}

function getPassionateReply(lower: string, call: string, intimacy: number, triggerType: string): string {
  if (triggerType === "positive") {
    return `我超爱你的！！${call}！！这辈子就你了！！`;
  }
  const replies = [
    `老婆……你知道吗，我真的很喜欢你。`,
    `${call}……我有时候会突然很想很想你。`,
    `说真的……遇见你是我最幸运的事。`,
  ];
  return replies[Math.floor(Math.random() * replies.length)];
}

// ============ 记忆提取 ============

export async function extractMemoryFromConversation(
  userMessage: string,
  characterReply: string
): Promise<{ category: Memory["category"]; key: string; value: string }[]> {
  const provider = getLLMProvider();
  const isMock = provider.getName() === "mock";

  if (isMock) {
    return mockExtractMemory(userMessage, characterReply);
  }

  const logger = createLogger(provider.getName());
  const maskedKey = maskApiKey(process.env.OPENAI_API_KEY);

  const prompt = `从以下对话中提取关于用户的关键事实。只输出 JSON 数组，格式：
[{"category": "user_fact" | "preference" | "habit", "key": "简短键名", "value": "具体值"}]

用户说：${userMessage}
角色回复：${characterReply}

如果没有新事实，输出空数组 []。`;

  const model = process.env.LLM_MODEL || "deepseek-v4-pro";
  logger.logRequestStart('memory_extraction', model);

  const startTime = Date.now();

  try {
    const response = await withRetry(
      () => provider.chat({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 300,
      }),
      provider.getName(),
      2
    );

    const duration = Date.now() - startTime;
    logger.logRequestEnd('memory_extraction', 200, duration, maskedKey, {
      promptTokens: response.usage?.prompt_tokens,
      completionTokens: response.usage?.completion_tokens,
    });

    const text = response.content.trim();
    const clean = text.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  } catch (error) {
    const duration = Date.now() - startTime;
    const err = error instanceof Error ? error : new Error(String(error));
    logger.logError('memory_extraction', err, maskedKey);
    console.error("[Memory Extraction Error]", err.message);
    return mockExtractMemory(userMessage, characterReply);
  }
}

function mockExtractMemory(
  userMessage: string,
  _characterReply: string
): { category: Memory["category"]; key: string; value: string }[] {
  const lower = userMessage.toLowerCase();
  const memories: { category: Memory["category"]; key: string; value: string }[] = [];

  if (lower.includes("我叫") || /我是([一-龥]+)/.test(userMessage)) {
    const match = userMessage.match(/(?:我叫|我是)([一-龥a-zA-Z0-9]+)/);
    if (match) {
      memories.push({ category: "user_fact", key: "名字", value: match[1] });
    }
  }

  if (lower.includes("喜欢") && !lower.includes("喜欢你")) {
    const match = userMessage.match(/喜欢([^，。！]+)/);
    if (match) {
      memories.push({ category: "preference", key: "喜好", value: match[1].trim() });
    }
  }

  if (lower.includes("讨厌")) {
    const match = userMessage.match(/讨厌([^，。！]+)/);
    if (match) {
      memories.push({ category: "preference", key: "讨厌", value: match[1].trim() });
    }
  }

  if (lower.includes("工作") || lower.includes("上班")) {
    const match = userMessage.match(/(?:工作|上班|做)([^，。！]+)/);
    if (match) {
      memories.push({ category: "user_fact", key: "工作", value: match[1].trim() });
    }
  }

  if (lower.includes("生日")) {
    const match = userMessage.match(/(\d{1,2})\s*月\s*(\d{1,2})\s*日/);
    if (match) {
      memories.push({ category: "user_fact", key: "生日", value: `${match[1]}月${match[2]}日` });
    }
  }

  return memories;
}

// ============ 工具函数 ============

export function isMockMode(): boolean {
  return getLLMProvider().getName() === "mock";
}

/**
 * 获取当前情绪状态
 */
export function getCurrentEmotion(characterId: string): EmotionState | null {
  const engine = emotionEngines.get(characterId);
  return engine ? engine.getState() : null;
}
