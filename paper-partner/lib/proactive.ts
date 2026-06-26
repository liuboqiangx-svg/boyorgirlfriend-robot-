import { getCharacterGreeting } from "@/lib/character";
import {
  getCharacterState,
  getMessages,
  insertMessage,
  updateCharacterState,
} from "@/lib/db/index-drizzle";
import { generateCharacterReply } from "@/lib/llm";
import { getMemoryPromptText } from "@/lib/memory";
import { CharacterProfile, CharacterState } from "@/types";

export interface ProactiveContext {
  userId: string;
  userName: string;
  character: CharacterProfile;
}

export async function maybeSendProactiveMessage(
  context: ProactiveContext
): Promise<{ sent: boolean; message?: string; state?: CharacterState }> {
  const { userId, userName, character } = context;
  const state = await getCharacterState(userId, character.id);
  const now = new Date();

  // 如果用户最近 2 分钟内回过消息，不打扰
  if (state?.last_message_at) {
    const last = new Date(state.last_message_at);
    const diffMin = (now.getTime() - last.getTime()) / 1000 / 60;
    if (diffMin < 2) {
      return { sent: false };
    }
  }

  // 如果还没到下次主动时间，不发
  if (state?.next_proactive_at && new Date(state.next_proactive_at) > now) {
    return { sent: false };
  }

  // 根据时间选择主动话题
  const hour = now.getHours();
  let topic = character.proactive_topics[Math.floor(Math.random() * character.proactive_topics.length)];

  if (hour >= 7 && hour < 10) topic = "早安问候和今天的安排";
  else if (hour >= 11 && hour < 14) topic = "午休时分享吃了什么";
  else if (hour >= 17 && hour < 20) topic = "下班后的疲惫和想见面";
  else if (hour >= 21) topic = "晚安前的撒娇";

  const history = (await getMessages(userId, character.id, 10)).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const memoryText = await getMemoryPromptText(userId, character.id);

  const prompt = `你正在主动给用户发消息，话题是：${topic}。
请自然开启一个话题，不要太长，像恋人一样说话。${memoryText}`;

  const result = await generateCharacterReply({
    userName,
    characterId: character.id,
    characterName: character.display_name,
    characterProfile: character.speech_style,
    memories: [],
    history,
    currentMessage: prompt,
    mood: state?.mood || "calm",
    intimacy: state?.intimacy || 10,
    nickname: character.nicknames_for_user[0],
  });

  const greeting = getCharacterGreeting(character);
  const finalContent = Math.random() > 0.5 ? `${greeting} ${result.content}` : result.content;

  await insertMessage({
    user_id: userId,
    character_id: character.id,
    role: "character",
    content: finalContent,
    type: "text",
  });

  const nextProactive = new Date(now.getTime() + 1000 * 60 * (15 + Math.random() * 30)); // 15-45 分钟后
  const newState = await updateCharacterState(userId, character.id, {
    mood: (result.mood as CharacterState["mood"]) || "miss",
    last_message_at: now.toISOString(),
    next_proactive_at: nextProactive.toISOString(),
  });

  return { sent: true, message: finalContent, state: newState };
}

export async function scheduleNextProactive(
  userId: string,
  characterId: string,
  minutesFromNow = 20
) {
  const next = new Date(Date.now() + 1000 * 60 * minutesFromNow);
  await updateCharacterState(userId, characterId, {
    next_proactive_at: next.toISOString(),
  });
}
