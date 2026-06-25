import OpenAI from "openai";
import { DEFAULT_CHARACTER } from "@/lib/character";
import { Memory, ReasoningResult, OpenRouterResponse, ApiErrorCode } from "@/types";
import {
  EmotionEngine,
  createEmotionEngine,
  MoodType,
  EmotionState,
  buildEmotionPrompt,
  detectTriggerWords,
} from "@/lib/emotion";
import { getEmotionConfig, getDefaultEmotionConfig } from "@/lib/emotions";
import { LlmApiError, createErrorFromResponse, withRetry } from "@/lib/api/errors";
import { createLogger, maskApiKey } from "@/lib/api/logger";

const USE_MOCK = process.env.USE_MOCK_LLM === "true" || !process.env.OPENAI_API_KEY;
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "mock",
  baseURL: process.env.OPENAI_BASE_URL,
});

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
  enableReasoning?: boolean;   // 是否启用推理能力（默认 false）
  showReasoning?: boolean;    // 是否展示思考过程（默认 false）
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
  reasoning?: ReasoningResult;  // 思考过程（可选）
}

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
 * 重置角色的情绪引擎（当切换角色或新会话时调用）
 */
export function resetEmotionEngine(characterId: string): void {
  emotionEngines.delete(characterId);
}

export async function generateCharacterReply(
  options: ChatOptions
): Promise<GenerateReplyResult> {
  const engine = getEmotionEngine(options.characterId);
  const logger = createLogger('openrouter');
  const maskedKey = maskApiKey(process.env.OPENAI_API_KEY);

  // 如果有初始状态，设置它
  if (options.emotionState) {
    const currentState = engine.getState();
    engine.reset();
    // 恢复到之前的状态
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
  if (USE_MOCK) {
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

  const nickname = options.nickname || DEFAULT_CHARACTER.nicknames_for_user[0];

  // 根据情绪状态调整回复风格
  const moodStylePrompt = getMoodStylePrompt(currentEmotion.current, config.characterName);

  const systemPrompt = `你是${options.characterName}，${options.characterProfile}
${moodStylePrompt}
当前亲密度：${options.intimacy}/100。${emotionPrompt}
请用第一人称回复，语气自然、口语化，像在微信上聊天。
回复控制在 50 字以内。${memoryText}`;

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...options.history.slice(-10).map((h) => ({
      role: h.role === "user" ? ("user" as const) : ("assistant" as const),
      content: h.content,
    })),
    { role: "user", content: options.currentMessage },
  ];

  const model = process.env.LLM_MODEL || "google/gemma-4-31b-it:free";
  logger.logRequestStart('chat.completions', model);

  const startTime = Date.now();

  try {
    // 构建请求参数
    const requestParams: OpenAI.Chat.ChatCompletionCreateParams = {
      model,
      messages,
      temperature: 0.85,
      max_tokens: 200,
    };

    // 如果启用了 reasoning 且模型支持，添加 reasoning 参数
    // OpenRouter 特定参数，通过 extra_body 传递
    if (options.enableReasoning) {
      logger.logReasoningStart(model);
    }

    // OpenRouter reasoning 参数需要通过 extra_headers 或 extra_body 传递
    // 这里使用类型断言处理特定字段
    const completionOptions: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming = {
      model,
      messages,
      temperature: 0.85,
      max_tokens: 200,
      stream: false,
      ...(options.enableReasoning ? {
        extra_body: {
          reasoning: {
            effort: "medium",
            exclude: false,
          },
        },
      } : {}),
    };

    const completion = await withRetry(
      () => openai.chat.completions.create(completionOptions),
      'openrouter',
      3
    ) as OpenAI.Chat.ChatCompletion;

    const duration = Date.now() - startTime;

    // 提取响应内容
    const choice = completion.choices[0];
    const content = choice?.message?.content?.trim() || "嗯，我在听。";

    // 构建 reasoning 结果（如果启用且模型返回了）
    let reasoning: ReasoningResult | undefined;
    if (options.enableReasoning && choice?.message) {
      // OpenRouter 可能通过扩展字段返回 reasoning
      // 这里做兼容处理
      const rawMessage = choice.message as unknown as {
        reasoning?: string;
        [key: string]: unknown;
      };
      const reasoningText = rawMessage.reasoning;
      if (reasoningText) {
        reasoning = {
          reasoning: reasoningText,
          reasoningDetails: [
            {
              type: 'reasoning.text',
              text: reasoningText,
              format: 'unknown',
              index: 0,
            },
          ],
        };
        // 记录推理结束
        logger.logReasoningEnd(0, duration); // reasoningTokens 需从 usage 中获取
      }
    }

    logger.logRequestEnd(
      'chat.completions',
      200,
      duration,
      maskedKey,
      {
        promptTokens: completion.usage?.prompt_tokens,
        completionTokens: completion.usage?.completion_tokens,
      }
    );

    return {
      content,
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

    // 统一错误处理
    let llmError: LlmApiError;

    if (error instanceof LlmApiError) {
      llmError = error;
    } else if (error instanceof Error) {
      if ('status' in error && typeof (error as { status?: number }).status === 'number') {
        // 这是一个带状态的错误（如 OpenAI SDK 错误）
        const status = (error as { status?: number }).status;
        llmError = new LlmApiError(
          status === 401 ? ApiErrorCode.UNAUTHORIZED :
          status === 403 ? ApiErrorCode.FORBIDDEN :
          status === 429 ? ApiErrorCode.RATE_LIMIT :
          status && status >= 500 ? ApiErrorCode.SERVER_ERROR : ApiErrorCode.UNKNOWN_ERROR,
          'openrouter',
          error.message,
          status
        );
      } else {
        llmError = new LlmApiError(ApiErrorCode.NETWORK_ERROR, 'openrouter', error.message);
      }
    } else {
      llmError = new LlmApiError(ApiErrorCode.UNKNOWN_ERROR, 'openrouter', String(error));
    }

    // 记录错误日志
    logger.logError('chat.completions', llmError, maskedKey);

    console.error(`[LLM Error] ${llmError.code}: ${llmError.message}`);

    // 出错时降级到 Mock 回复
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

/**
 * 根据情绪状态返回风格指导
 */
function getMoodStylePrompt(mood: MoodType, characterName: string): string {
  const styles: Record<string, string> = {
    // 沈墨相关
    calm: "你的性格沉稳内敛，说话不多但有分量。",
    concerned: "你有些担心，说话时会带一点试探。",
    sad: "你很难过，说话会更少，可能有些欲言又止。",
    guarded: "你变得防备，会保持距离，不再轻易敞开心扉。",
    sleepy: "你有些疲惫，说话会比较慵懒。",

    // 舒婷相关
    composed: "你从容优雅，即使有点不安也会掩饰得很好。",
    anxious: "你内心有些不安，说话会带一点小心翼翼。",
    hurt: "你感到受伤，可能会说一些带刺的话来保护自己。",

    // 林野相关
    happy: "你很开心，说话活泼跳脱，充满活力！",
    angry: "你有点生气！会直接表达不满。",
    wronged: "你很委屈，可能会撒娇或者有点小脾气。",
    excited: "你超级兴奋！！说话充满感叹号和感叹！",
    jealous: "你有点吃醋！会追问你在干什么。",

    // 顾燃相关
    clingy: "你想撒娇，想粘着对方。",
    passionate: "你很深情，会说一些认真的情话。",
  };

  return styles[mood] || "你的性格沉稳内敛。";
}

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
    // ========== 沈墨系情绪 ==========
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

    // ========== 舒婷系情绪 ==========
    case "composed":
      reply = getComposedReply(lower, call, intimacy, trigger.type);
      break;

    case "anxious":
      reply = getAnxiousReply(lower, call, intimacy, trigger.type);
      break;

    case "hurt":
      reply = getHurtReply(lower, call, intimacy, trigger.type);
      break;

    // ========== 林野系情绪 ==========
    case "angry":
      reply = getAngryReply(lower, call, intimacy, trigger.type);
      break;

    case "wronged":
      reply = getWrongedReply(lower, call, intimacy, trigger.type);
      break;

    // ========== 顾燃系情绪 ==========
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

// ==================== 情绪回复生成器 ====================

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
    const replies = [
      `……你说的……是真的吗？`,
      `${call}，我不知道该不该相信你。`,
      `……让我想想。`,
    ];
    return replies[Math.floor(Math.random() * replies.length)];
  }

  const replies = [
    `……嗯。`,
    `……好吧。`,
    `${call}，你不用解释。`,
    `……没关系，我习惯了。`,
  ];
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

  const defaults = [
    `${call}，你今天怎么样？`,
    `嗯，我听着呢。`,
    `你怎么突然这么乖？`,
    `${call}，有什么想和我说的吗？`,
  ];
  return defaults[Math.floor(Math.random() * defaults.length)];
}

function getAnxiousReply(lower: string, call: string, intimacy: number, triggerType: string): string {
  const positive = triggerType === "positive";
  if (positive) {
    return `……${call}，谢谢你。有你在就好多了。`;
  }

  const replies = [
    `${call}……你怎么不回我？`,
    `你是不是在忙？我有点担心……`,
    `……算了，你忙你的吧。`,
    `${call}？你在吗？`,
  ];
  return replies[Math.floor(Math.random() * replies.length)];
}

function getHurtReply(lower: string, call: string, intimacy: number, triggerType: string): string {
  const positive = triggerType === "positive";
  if (positive && intimacy > 60) {
    return `……${call}，你说的让我好过了一点。但我还是……需要时间。`;
  }

  const replies = [
    `你不要这样子哦……我会难过的。`,
    `……算了，我不想说了。`,
    `${call}，你是不是觉得我很烦？`,
    `……我没事。（其实很难过）`,
  ];
  return replies[Math.floor(Math.random() * replies.length)];
}

function getAngryReply(lower: string, call: string, intimacy: number, triggerType: string): string {
  const positive = triggerType === "positive";
  if (positive) {
    return `哼！算你还有点良心！！抱抱！！`;
  }

  const replies = [
    `你有病吧！！怎么才回我！！`,
    `哼！生气了！！哄不好的那种！！`,
    `${call}你给我等着！！我真的很生气！！`,
  ];
  return replies[Math.floor(Math.random() * replies.length)];
}

function getWrongedReply(lower: string, call: string, intimacy: number, triggerType: string): string {
  const positive = triggerType === "positive";
  if (positive) {
    return `呜呜……好吧好吧原谅你了！！抱抱！！`;
  }

  const replies = [
    `呜呜……你怎么这样……委屈死了……`,
    `${call}你不爱我了对不对！！`,
    `哼！哭给你看！呜呜呜……`,
  ];
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

  const replies = [
    `你是不是在和别人聊天！！说！！是谁！！`,
    `${call}！！你怎么不理我！！是不是有别人了！！`,
    `哼！生气！！吃醋了！！哄不好的那种！！`,
  ];
  return replies[Math.floor(Math.random() * replies.length)];
}

function getClingyReply(lower: string, call: string, intimacy: number, triggerType: string): string {
  if (triggerType === "positive") {
    return `嘿嘿！！${call}！！最喜欢你了！！亲亲！！`;
  }

  const replies = [
    `${call}……陪我嘛……`,
    `抱抱！！要抱紧紧的那种！！`,
    `老婆老婆老婆！！你在干嘛！！想你了！！`,
  ];
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

// ==================== 记忆提取 ====================

export async function extractMemoryFromConversation(
  userMessage: string,
  characterReply: string
): Promise<{ category: Memory["category"]; key: string; value: string }[]> {
  if (USE_MOCK) {
    return mockExtractMemory(userMessage, characterReply);
  }

  const logger = createLogger('openrouter');
  const maskedKey = maskApiKey(process.env.OPENAI_API_KEY);

  const prompt = `从以下对话中提取关于用户的关键事实。只输出 JSON 数组，格式：
[{"category": "user_fact" | "preference" | "habit", "key": "简短键名", "value": "具体值"}]

用户说：${userMessage}
角色回复：${characterReply}

如果没有新事实，输出空数组 []。`;

  const model = process.env.LLM_MODEL || "google/gemma-4-31b-it:free";
  logger.logRequestStart('memory_extraction', model);

  const startTime = Date.now();

  try {
    const completion = await withRetry(
      () => openai.chat.completions.create({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 300,
      }),
      'openrouter',
      2
    );

    const duration = Date.now() - startTime;
    logger.logRequestEnd('memory_extraction', 200, duration, maskedKey, {
      promptTokens: completion.usage?.prompt_tokens,
      completionTokens: completion.usage?.completion_tokens,
    });

    const text = completion.choices[0]?.message?.content?.trim() || "[]";
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

export function isMockMode(): boolean {
  return USE_MOCK;
}

/**
 * 获取当前情绪状态
 */
export function getCurrentEmotion(characterId: string): EmotionState | null {
  const engine = emotionEngines.get(characterId);
  return engine ? engine.getState() : null;
}
