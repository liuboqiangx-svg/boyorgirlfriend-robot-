"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, User, Sparkles } from "lucide-react";
import { ALL_CHARACTERS } from "@/lib/character";
import type { CharacterProfile } from "@/types";

interface CharacterSwitcherProps {
  currentCharacter: CharacterProfile | null;
  onSwitch?: (character: CharacterProfile) => void;
}

/**
 * 角色切换器组件
 * 暮光治愈系风格
 */
export function CharacterSwitcher({ currentCharacter, onSwitch }: CharacterSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 切换角色
  const handleSwitch = (character: CharacterProfile) => {
    if (character.id === currentCharacter?.id) {
      setIsOpen(false);
      return;
    }

    setSwitching(true);
    setIsOpen(false);

    // 保存新角色
    localStorage.setItem("selectedCharacterId", character.id);

    // 回调
    onSwitch?.(character);

    // 延迟跳转，让动画完成
    setTimeout(() => {
      // 刷新页面以加载新角色
      window.location.href = "/?refresh=" + Date.now();
    }, 400);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* 当前角色按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/80 backdrop-blur-sm border border-orange-200 hover:border-orange-300 hover:bg-white transition-all shadow-sm"
      >
        {currentCharacter ? (
          <>
            <img
              src={currentCharacter.avatar_url}
              alt={currentCharacter.name}
              className="w-7 h-7 rounded-full object-cover border border-orange-200"
            />
            <span className="text-sm font-medium text-amber-800 max-w-20 truncate">
              {currentCharacter.name}
            </span>
          </>
        ) : (
          <>
            <User className="w-5 h-5 text-amber-600" />
            <span className="text-sm text-amber-600">选择角色</span>
          </>
        )}
        <ChevronDown
          className={`w-4 h-4 text-amber-600 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* 下拉菜单 */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-72 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-orange-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
          {/* 标题 */}
          <div className="px-4 py-3 bg-gradient-to-r from-orange-100 to-amber-50 border-b border-orange-100">
            <p className="text-sm font-medium text-amber-800 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-orange-500" />
              切换角色
            </p>
          </div>

          {/* 角色列表 */}
          <div className="max-h-80 overflow-y-auto p-2">
            {ALL_CHARACTERS.map((character) => {
              const isActive = character.id === currentCharacter?.id;

              return (
                <button
                  key={character.id}
                  onClick={() => handleSwitch(character)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                    isActive
                      ? "bg-orange-100 border-2 border-orange-300"
                      : "hover:bg-amber-50 border-2 border-transparent"
                  }`}
                >
                  {/* 头像 */}
                  <div className="relative">
                    <img
                      src={character.avatar_url}
                      alt={character.name}
                      className={`w-10 h-10 rounded-full object-cover border-2 ${
                        isActive ? "border-orange-400" : "border-orange-100"
                      }`}
                    />
                    {isActive && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    )}
                  </div>

                  {/* 信息 */}
                  <div className="flex-1 text-left">
                    <p className="font-medium text-amber-900">{character.name}</p>
                    <p className="text-xs text-amber-600">{character.occupation}</p>
                  </div>

                  {/* 活跃标记 */}
                  {isActive && (
                    <span className="text-xs text-orange-500 font-medium">当前</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* 底部 */}
          <div className="px-4 py-3 border-t border-orange-100 bg-gradient-to-r from-orange-50 to-amber-50">
            <button
              onClick={() => {
                setIsOpen(false);
                router.push("/characters");
              }}
              className="w-full text-center text-sm text-amber-600 hover:text-orange-500 transition-colors"
            >
              查看全部角色 →
            </button>
          </div>
        </div>
      )}

      {/* 切换动画遮罩 */}
      {switching && (
        <div className="fixed inset-0 z-50 bg-gradient-to-b from-amber-100 to-orange-200 flex items-center justify-center pointer-events-none">
          <div className="text-center animate-pulse">
            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-orange-300 to-amber-400 flex items-center justify-center shadow-xl">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <p className="text-lg font-bold text-amber-800">切换中...</p>
          </div>
        </div>
      )}
    </div>
  );
}
