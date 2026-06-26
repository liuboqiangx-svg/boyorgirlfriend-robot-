import { getMemories, upsertMemory } from "@/lib/db/index-drizzle";
import { extractMemoryFromConversation } from "@/lib/llm";
import { Memory } from "@/types";

/**
 * 从对话中提取并保存记忆
 */
export async function updateMemoryFromExchange(
  userId: string,
  characterId: string,
  userMessage: string,
  characterReply: string
): Promise<Memory[]> {
  const extracted = await extractMemoryFromConversation(userMessage, characterReply);
  const saved: Memory[] = [];

  for (const item of extracted) {
    const memory = await upsertMemory(
      userId,
      characterId,
      item.category,
      item.key,
      item.value
    );
    saved.push(memory);
  }

  return saved;
}

/**
 * 获取记忆文本（注入到 Prompt 中）
 */
export async function getMemoryPromptText(
  userId: string,
  characterId: string
): Promise<string> {
  const memories = await getMemories(userId, characterId);
  if (memories.length === 0) return "";

  return `\n\n【你记得关于 TA 的事】\n${memories
    .map((m) => `• ${memoryCategoryLabel(m.category)} - ${m.key}: ${m.value}`)
    .join("\n")}`;
}

function memoryCategoryLabel(category: Memory["category"]): string {
  switch (category) {
    case "user_fact":
      return "事实";
    case "preference":
      return "喜好";
    case "habit":
      return "习惯";
    case "relationship":
      return "关系";
    default:
      return "其他";
  }
}

export { getMemories };
