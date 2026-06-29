"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, Sparkles, ArrowLeft } from "lucide-react";
import { ALL_CHARACTERS } from "@/lib/character";
import type { CharacterProfile } from "@/types";
import Link from "next/link";

/**
 * 角色选择页面
 * 暮光治愈系风格
 */
export default function CharacterSelectPage() {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [entering, setEntering] = useState(false);

  // 选择角色并进入聊天
  const selectCharacter = (character: CharacterProfile) => {
    setSelectedId(character.id);
    setEntering(true);

    // 保存到 localStorage
    localStorage.setItem("selectedCharacterId", character.id);

    // 延迟跳转，让动画完成，然后用 location.href 强制刷新
    setTimeout(() => {
      window.location.href = "/";
    }, 500);
  };

  return (
    <div className="min-h-screen twilight-gradient overflow-hidden">
      {/* 背景装饰 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* 渐变光晕 */}
        <div className="absolute top-20 left-20 w-64 h-64 bg-orange-300/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-pink-300/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-200/10 rounded-full blur-3xl" />
      </div>

      {/* 顶部导航 */}
      <header className="relative z-10 twilight-header-glass px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-amber-700 hover:text-orange-600 transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">返回</span>
          </Link>
          <h1 className="text-lg font-semibold twilight-card-name flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-orange-500" />
            选择你的TA
          </h1>
          <div className="w-16" /> {/* 占位 */}
        </div>
      </header>

      {/* 主内容 */}
      <main className="relative z-10 px-4 py-8">
        <div className="max-w-5xl mx-auto">
          {/* 标题区域 */}
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold twilight-card-name mb-2">
              🌟 选择你的纸片人
            </h2>
            <p className="text-amber-700 text-sm">
              每个角色都有独特的性格和故事
            </p>
          </div>

          {/* 角色卡片网格 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ALL_CHARACTERS.map((character, index) => {
              const isSelected = selectedId === character.id;
              const isHovered = hoveredId === character.id;

              return (
                <div
                  key={character.id}
                  className={`relative group cursor-pointer transition-all duration-300 ${
                    entering && isSelected ? "scale-95 opacity-50" : ""
                  }`}
                  style={{
                    animationDelay: `${index * 0.1}s`,
                  }}
                  onClick={() => selectCharacter(character)}
                  onMouseEnter={() => setHoveredId(character.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  {/* 卡片 */}
                  <div
                    className={`twilight-card relative overflow-hidden ${
                      isSelected ? "ring-4 ring-orange-400 scale-105" : ""
                    } ${isHovered && !entering ? "scale-[1.02]" : ""}`}
                  >
                    {/* 头像 */}
                    <div className="relative mb-4">
                      <div
                        className={`w-24 h-24 mx-auto rounded-full overflow-hidden border-4 transition-all duration-300 ${
                          isSelected
                            ? "border-orange-400 shadow-lg shadow-orange-200"
                            : "border-white/50 group-hover:border-orange-200"
                        }`}
                        style={{
                          boxShadow: isHovered ? "0 0 30px rgba(255,159,67,0.3)" : undefined,
                        }}
                      >
                        <img
                          src={character.avatar_url}
                          alt={character.name}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* 在线状态 */}
                      <div className="absolute bottom-2 right-1/2 translate-x-8 w-5 h-5 bg-green-400 rounded-full border-3 border-white flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>

                      {/* 选中标记 */}
                      {isSelected && (
                        <div className="absolute -top-1 -right-1 w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                          <Heart className="w-4 h-4 text-white fill-white" />
                        </div>
                      )}
                    </div>

                    {/* 角色信息 */}
                    <div className="text-center">
                      <h3 className="text-xl font-bold twilight-card-name mb-1">
                        {character.name}
                      </h3>
                      <p className="text-sm text-amber-600 mb-3">
                        {character.occupation}
                      </p>

                      {/* 性格标签 */}
                      <div className="flex flex-wrap justify-center gap-1 mb-4">
                        {character.personality.slice(0, 3).map((trait, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 bg-orange-100 text-orange-600 text-xs rounded-full"
                          >
                            {trait.slice(0, 6)}
                          </span>
                        ))}
                      </div>

                      {/* 昵称提示 */}
                      <p className="text-xs text-amber-500">
                        会叫你：{character.nicknames_for_user.slice(0, 2).join("、")}
                      </p>
                    </div>

                    {/* 悬停效果 - 波浪边框 */}
                    <div
                      className={`absolute inset-0 rounded-2xl border-2 border-transparent transition-all duration-300 ${
                        isHovered && !entering ? "border-orange-300" : ""
                      }`}
                    />
                  </div>

                  {/* 进入按钮（悬停时显示） */}
                  <div
                    className={`absolute inset-x-4 bottom-0 translate-y-full transition-all duration-300 ${
                      isHovered && !entering ? "opacity-100 translate-y-2" : "opacity-0"
                    }`}
                  >
                    <button
                      className="w-full py-2 bg-gradient-to-r from-orange-400 to-amber-400 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all"
                      onClick={(e) => {
                        e.stopPropagation();
                        selectCharacter(character);
                      }}
                    >
                      和 {character.name} 聊天 💬
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 底部提示 */}
          <div className="text-center mt-12">
            <p className="text-amber-600 text-sm">
              💡 点击角色卡片即可开始聊天
            </p>
            <p className="text-amber-500 text-xs mt-1">
              每个角色的记忆相互独立，可以分别培养感情
            </p>
          </div>
        </div>
      </main>

      {/* 进入动画遮罩 */}
      {entering && (
        <div className="fixed inset-0 z-50 bg-gradient-to-b from-amber-100 to-orange-200 flex items-center justify-center">
          <div className="text-center animate-pulse">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-orange-300 to-amber-400 flex items-center justify-center shadow-2xl">
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
