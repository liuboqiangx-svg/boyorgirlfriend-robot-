import { NextResponse } from "next/server";
import { initDatabaseAsync, saveCharacter } from "@/lib/db/index-drizzle";
import { DEFAULT_CHARACTER } from "@/lib/character";

let initialized = false;

export async function POST() {
  if (!initialized) {
    await initDatabaseAsync();
    await saveCharacter(DEFAULT_CHARACTER);
    initialized = true;
  }

  return NextResponse.json({
    success: true,
    character: {
      id: DEFAULT_CHARACTER.id,
      name: DEFAULT_CHARACTER.display_name,
      avatar: DEFAULT_CHARACTER.avatar_url,
    },
    message: "角色初始化成功",
  });
}
