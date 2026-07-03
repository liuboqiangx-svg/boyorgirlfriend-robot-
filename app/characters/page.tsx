"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { ALL_CHARACTERS } from "@/lib/character";
import type { CharacterProfile } from "@/types";
import ImmersiveScrollGallery from "@/components/ImmersiveScrollGallery";

/**
 * 角色选择页面
 * 沉浸式滚动画廊效果
 */
export default function CharacterSelectPage() {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [entering, setEntering] = useState(false);
  const [checking, setChecking] = useState(true);

  // 检查登录状态
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (!data.user) {
        // 未登录，跳转到首页（登录页）
        router.push("/");
        return;
      }
      setChecking(false);
    } catch {
      router.push("/");
    }
  };

  // 选择角色并进入聊天
  const selectCharacter = (character: CharacterProfile) => {
    setSelectedId(character.id);
    setEntering(true);

    // 保存到 localStorage
    localStorage.setItem("selectedCharacterId", character.id);

    // 延迟跳转，让动画完成
    setTimeout(() => {
      window.location.href = "/chat";
    }, 500);
  };

  // 检查中显示加载
  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center twilight-gradient">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen twilight-gradient">
      {/* 顶部导航 */}
      <header className="fixed top-0 left-0 right-0 z-50 twilight-header-glass px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-center">
          <h1 className="text-lg font-semibold twilight-card-name">
            选择你的TA
          </h1>
        </div>
      </header>

      {/* 沉浸式画廊区域 */}
      <main className="relative pt-16">
        <ImmersiveScrollGallery
          characters={ALL_CHARACTERS}
          onSelect={selectCharacter}
        />
      </main>

      {/* 进入动画遮罩 */}
      {entering && (
        <div className="fixed inset-0 z-[100] bg-gradient-to-b from-amber-100 to-orange-200 flex items-center justify-center">
          <div className="text-center animate-pulse">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-orange-300 to-amber-400 flex items-center justify-center shadow-2xl overflow-hidden">
              {selectedId && (
                <img
                  src={ALL_CHARACTERS.find((c) => c.id === selectedId)?.avatar_url}
                  alt=""
                  className="w-16 h-16 rounded-full object-cover"
                />
              )}
            </div>
            <p className="text-xl font-bold text-amber-800">
              正在进入聊天...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
