import { NextRequest, NextResponse } from "next/server";
import {
  getMessages,
  initDatabaseAsync,
  insertMessage,
  markMessagesAsRead,
  saveCharacter,
  getCharacterState,
  updateCharacterState,
} from "@/lib/db/index-drizzle";
import { DEFAULT_CHARACTER, getCharacterById } from "@/lib/character";
import { generateCharacterReply, isMockMode } from "@/lib/llm";
import { MoodType } from "@/types";
import { detectImageTrigger, inferSceneFromMessage } from "@/lib/image/trigger";
import { getCharacterAvatarBase64 } from "@/lib/character-avatar";
import { getImageService } from "@/lib/image/service";
import { getSessionFromCookie, getUserById } from "@/lib/auth";

/**
 * 同意/确认关键词
 * 当角色回复包含这些词时，表示同意发送图片
 */
const CONSENT_KEYWORDS = [
  "好的", "可以", "行", "嗯", "好啊", "好的呀",
  "这就发", "马上", "稍等", "发你", "给你", "给你看",
  "拍给你", "照给你", "发张", "给你来一张",
  "没问题", "当然", "当然可以", "好嘞", "好呀"
];

/**
 * 场景服装映射
 * 根据场景自动匹配服装描述
 */
const SCENE_CLOTHING_MAP: Record<string, string> = {
  beach: "bikini/swimsuit, beach outfit, summer fashion",
  mountain: "casual outdoor wear, hiking outfit, sporty style",
  cafe: "casual stylish outfit, coffee date look, relaxed fashion",
  home: "cozy home wear, comfortable loungewear, pajamas",
  sunset: "romantic dress, evening outfit, elegant fashion",
  office: "professional work attire, office fashion, business casual",
  bedroom: "lingerie, silk pajamas, intimate sleepwear",
  street: "streetwear, trendy casual, urban fashion",
  gym: "sportswear, fitness outfit, workout clothes",
  pool: "swimsuit, bikini, poolside fashion",
};

/**
 * 从回复中推断场景关键词
 */
function detectSceneFromReply(reply: string): string | null {
  // 场景关键词
  const sceneKeywords: Record<string, string[]> = {
    beach: ["海", "海边", "沙滩", "泳装", "游泳", "阳光", "海边玩"],
    mountain: ["爬山", "登山", "山顶", "户外", "徒步"],
    cafe: ["咖啡", "喝咖啡", "咖啡厅", "奶茶", "下午茶"],
    home: ["家里", "在家", "回家", "睡觉", "睡前"],
    sunset: ["日落", "黄昏", "傍晚", "夕阳"],
    office: ["上班", "工作", "办公室", "加班"],
    bedroom: ["睡觉", "睡前", "刚醒", "在床上", "卧室", "躺着"],
    street: ["逛街", "出门", "街头", "城市"],
    gym: ["健身", "运动", "跑步", "锻炼"],
    pool: ["泳池", "游泳", "玩水"],
  };

  for (const [scene, keywords] of Object.entries(sceneKeywords)) {
    for (const keyword of keywords) {
      if (reply.includes(keyword)) {
        return scene;
      }
    }
  }
  return null;
}

/**
 * 检查回复是否包含同意关键词
 */
function hasConsentKeyword(reply: string): boolean {
  return CONSENT_KEYWORDS.some(keyword => reply.includes(keyword));
}

// 确保数据库已初始化
let initialized = false;
async function ensureInit() {
  if (!initialized) {
    await initDatabaseAsync();
    await saveCharacter(DEFAULT_CHARACTER);
    initialized = true;
  }
}

export async function GET(request: NextRequest) {
  await ensureInit();
  const searchParams = request.nextUrl.searchParams;
  const characterId = searchParams.get("characterId") || DEFAULT_CHARACTER.id;

  // 用户验证
  const sessionId = request.cookies.get("session_id")?.value;
  const session = sessionId ? getSessionFromCookie(request.headers.get("cookie")) : null;

  if (!session) {
    // 兼容旧设备 ID 方式（逐步迁移）
    const deviceId = request.headers.get("x-device-id") || "anonymous";
    const userId = deviceId;

    const messages = await getMessages(userId, characterId, 100);
    const state = await getCharacterState(userId, characterId);
    await markMessagesAsRead(userId, characterId);

    return NextResponse.json({
      messages,
      state,
      mockMode: isMockMode(),
      authRequired: true,
    });
  }

  // 已登录用户
  const user = await getUserById(session.userId);
  if (!user) {
    return NextResponse.json({ error: "用户不存在" }, { status: 401 });
  }

  const userId = user.id;
  const characterConfig = getCharacterById(characterId) || DEFAULT_CHARACTER;

  const messages = await getMessages(userId, characterId, 100);
  const state = await getCharacterState(userId, characterId);
  await markMessagesAsRead(userId, characterId);

  return NextResponse.json({
    messages,
    character: characterConfig,
    state,
    mockMode: isMockMode(),
    authRequired: false,
  });
}

export async function POST(request: NextRequest) {
  await ensureInit();

  try {
    const body = await request.json();
    const { content, characterId } = body;

    if (!content?.trim()) {
      return NextResponse.json({ error: "消息内容不能为空" }, { status: 400 });
    }

    // 用户验证
    const sessionId = request.cookies.get("session_id")?.value;
    const session = sessionId ? getSessionFromCookie(request.headers.get("cookie")) : null;

    let userId: string;

    if (!session) {
      // 兼容旧设备 ID 方式（逐步迁移）
      userId = request.headers.get("x-device-id") || "anonymous";
    } else {
      const user = await getUserById(session.userId);
      if (!user) {
        return NextResponse.json({ error: "用户不存在" }, { status: 401 });
      }
      userId = user.id;
    }

    const charId = characterId || DEFAULT_CHARACTER.id;

    // 获取当前角色配置
    const characterConfig = getCharacterById(charId) || DEFAULT_CHARACTER;

    // 保存用户消息
    const userMsg = await insertMessage({
      user_id: userId,
      character_id: charId,
      role: "user",
      content: content.trim(),
      type: "text",
    });

    // 获取历史
    const history = (await getMessages(userId, charId, 20)).map((m) => ({
      role: m.role,
      content: m.content,
    }));
    const state = await getCharacterState(userId, charId);
    const nickname =
      state
        ? undefined
        : characterConfig.nicknames_for_user[
            Math.floor(Math.random() * characterConfig.nicknames_for_user.length)
          ];

    // 检测用户消息是否触发图片请求
    const userImageTrigger = detectImageTrigger(content.trim());

    // 生成角色回复（使用当前角色的配置）
    const result = await generateCharacterReply({
      userName: userId,
      characterId: charId,
      characterName: characterConfig.display_name,
      characterProfile: characterConfig.speech_style,
      memories: [],
      history,
      currentMessage: content.trim(),
      mood: state?.mood || "calm",
      intimacy: state?.intimacy || 10,
      nickname,
    });

    // 保存角色回复
    const charMsg = await insertMessage({
      user_id: userId,
      character_id: charId,
      role: "character",
      content: result.content,
      type: "text",
    });

    // 检测角色回复是否包含同意关键词 + 场景关键词
    // 如果用户请求了图片，且角色回复同意，则生成图片
    let imageMessage = null;

    // 测试模式：消息包含 #测试# 时强制触发图片生成
    const isTestMode = content.includes("#测试#");
    if ((userImageTrigger.triggered && hasConsentKeyword(result.content)) || isTestMode) {
      const avatarBase64 = getCharacterAvatarBase64(charId);
      if (avatarBase64) {
        // 从用户消息和角色回复中推断场景
        const sceneFromUser = inferSceneFromMessage(content.trim());
        const sceneFromReply = detectSceneFromReply(result.content);
        const scene = sceneFromReply || sceneFromUser || userImageTrigger.suggestedScene || "beach";

        // 根据场景获取服装描述
        const clothingPrompt = SCENE_CLOTHING_MAP[scene] || "casual stylish outfit";

        const imageService = getImageService();
        const imageResult = await imageService.generateCharacterImage({
          characterId: charId,
          scene: scene,
          reference_images: [avatarBase64],
          image_prompt: `A beautiful young woman, ${clothingPrompt}, ${scene} background, natural pose, smiling happily, high quality photo, professional photography`,
        });

        if (imageResult.success && imageResult.data) {
          imageMessage = await insertMessage({
            user_id: userId,
            character_id: charId,
            role: "character",
            content: "",
            type: "image",
            media_url: imageResult.data.url,
          });
        }
      }
    }

    // 更新角色状态（使用当前角色的亲密度成长配置）
    const newState = await updateCharacterState(userId, charId, {
      mood: (result.mood as MoodType) || "calm",
      intimacy: Math.min(100, (state?.intimacy || 10) + characterConfig.intimacy_growth.reply),
      mood_intensity: result.intensity,
      last_message_at: new Date().toISOString(),
      next_proactive_at: new Date(Date.now() + 1000 * 60 * 20).toISOString(),
    });

    return NextResponse.json({
      userMessage: userMsg,
      characterMessage: charMsg,
      imageMessage,
      state: newState,
      moodChanged: result.moodChanged,
      moodLabel: result.moodLabel,
      moodEmoji: result.moodEmoji,
      triggerType: result.triggerType,
      triggerWord: result.triggerWord,
      mockMode: isMockMode(),
    });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: "服务器错误，请稍后重试" },
      { status: 500 }
    );
  }
}
