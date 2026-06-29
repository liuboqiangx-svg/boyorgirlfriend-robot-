import { NextRequest, NextResponse } from "next/server";
import { initDatabaseAsync, saveCharacter } from "@/lib/db/index-drizzle";
import { DEFAULT_CHARACTER, getCharacterById } from "@/lib/character";

let initialized = false;

export async function POST(request: NextRequest) {
  // 获取请求的角色 ID
  const { characterId } = await request.json().catch(() => ({}));

  // 根据 ID 获取角色配置
  const characterConfig = characterId ? getCharacterById(characterId) : null;
  const character = characterConfig || DEFAULT_CHARACTER;

  if (!initialized) {
    await initDatabaseAsync();
    await saveCharacter(character);
    initialized = true;
  } else {
    // 如果角色已变更，更新保存的角色
    await saveCharacter(character);
  }

  return NextResponse.json({
    success: true,
    character: {
      id: character.id,
      name: character.display_name,
      avatar: character.avatar_url,
    },
    message: "角色初始化成功",
  });
}
