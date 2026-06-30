"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { formatDistanceToNow, isToday, isYesterday, format, differenceInMinutes } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Send, Sparkles, Loader2, Mic, Image, Heart, Zap, Volume2, Play, Pause } from "lucide-react";
import type { Message, CharacterProfile, CharacterState, MoodType } from "@/types";
import { MOOD_LABELS, MOOD_EMOJIS } from "@/types";
import { getCharacterVoiceConfig, DEFAULT_CHARACTER } from "@/lib/character";
import { CharacterSwitcher } from "./CharacterSwitcher";

interface MessageWithImage {
  id: string;
  user_id: string;
  character_id: string;
  role: "user" | "character";
  content: string;
  type: "text" | "voice" | "image" | "sticker";
  media_url?: string;
  is_read: boolean;
  created_at: string;
}

/** 语音消息状态 */
interface VoiceState {
  /** 是否正在生成 */
  isGenerating: boolean;
  /** 是否正在播放 */
  isPlaying: boolean;
  /** 音频URL */
  audioUrl?: string;
  /** 播放进度 (0-100) */
  progress: number;
  /** 时长（秒） */
  duration: number;
}

interface ChatRoomProps {
  onStateChange?: (state: CharacterState) => void;
}

export default function ChatRoom({ onStateChange }: ChatRoomProps) {
  const [messages, setMessages] = useState<MessageWithImage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [character, setCharacter] = useState<CharacterProfile | null>(null);
  const [state, setState] = useState<CharacterState | null>(null);
  const [mockMode, setMockMode] = useState(true);
  const [showStickers, setShowStickers] = useState(false);
  const [moodChanged, setMoodChanged] = useState(false);
  const [lastMood, setLastMood] = useState<string>("");
  const [generatingImage, setGeneratingImage] = useState(false);
  // 语音消息状态管理
  const [voiceStates, setVoiceStates] = useState<Record<string, VoiceState>>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentVoiceIdRef = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const deviceIdRef = useRef<string>("");
  const initRef = useRef(false);

  // 初始化聊天（加载角色 + 初始化 + 加载消息）
  const initChat = useCallback(async (characterId?: string) => {
    if (initRef.current) return;
    initRef.current = true;

    // 1. 获取设备ID
    let id = localStorage.getItem("deviceId");
    if (!id) {
      id = "user-" + Math.random().toString(36).slice(2, 11);
      localStorage.setItem("deviceId", id);
    }
    deviceIdRef.current = id;

    // 2. 获取角色ID（优先用参数 > localStorage > 默认）
    const savedCharacterId = localStorage.getItem("selectedCharacterId");
    const targetCharacterId = characterId || savedCharacterId || "lu-chen-001";

    // 3. 加载角色配置
    const { getCharacterById } = await import("@/lib/character");
    const characterConfig = getCharacterById(targetCharacterId);
    if (characterConfig) {
      setCharacter(characterConfig);
    }

    // 4. 初始化角色
    try {
      await fetch("/api/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ characterId: targetCharacterId }),
      });
    } catch (error) {
      console.error("初始化失败:", error);
    }

    // 5. 加载消息
    try {
      const res = await fetch(`/api/chat?characterId=${targetCharacterId}`, {
        headers: { "x-device-id": deviceIdRef.current },
      });
      const data = await res.json();
      if (data.messages) setMessages(data.messages);
      if (data.state) {
        setState(data.state);
        setLastMood(data.state.mood);
        onStateChange?.(data.state);
      }
      setMockMode(data.mockMode);
    } catch (error) {
      console.error("加载消息失败:", error);
    }
  }, [onStateChange]);

  // 初始化
  useEffect(() => {
    initChat();
  }, [initChat]);

  // 滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 图像触发关键词
  const imageKeywords = [
    "发图片", "发照片", "发张图片", "发张照片", "发个图",
    "想看", "想看看", "看看你", "看看照片", "看看图片",
    "你的照片", "你的图片", "给我看", "给我看看",
    "长什么样", "长啥样", "发个自拍", "自拍看看",
  ];

  // 检测是否触发图像生成
  const shouldGenerateImage = (message: string): boolean => {
    const lower = message.toLowerCase();
    return imageKeywords.some(keyword => lower.includes(keyword));
  };

  // 随机选择测试角色
  const testCharacters = ["lin-ye", "shen-mo", "shu-ting", "gu-ran"];

  // 生成图像（自动触发）
  const generateImage = async (scene?: string) => {
    if (generatingImage) return;

    const testCharacterId = testCharacters[Math.floor(Math.random() * testCharacters.length)];

    setGeneratingImage(true);
    try {
      const res = await fetch("/api/image/character", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterId: testCharacterId,
          emotion: state?.mood || "happy",
          scene: scene || "beach",
          size: "2K",
        }),
      });

      const data = await res.json();
      if (data.success && data.data?.url) {
        // 添加图片消息
        const imageMsg: MessageWithImage = {
          id: `img-${Date.now()}`,
          user_id: "character",
          character_id: testCharacterId,
          role: "character",
          content: "给你看看~",
          type: "image",
          media_url: data.data.url,
          is_read: false,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, imageMsg]);
      }
    } catch (error) {
      console.error("图像生成错误:", error);
    } finally {
      setGeneratingImage(false);
    }
  };

  // 发送消息
  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-device-id": deviceIdRef.current,
        },
        body: JSON.stringify({
          content: userMessage,
          characterId: character?.id,
        }),
      });

      const data = await res.json();
      if (data.userMessage && data.characterMessage) {
        setMessages((prev) => [...prev, data.userMessage, data.characterMessage]);

        // 检查情绪是否变化
        if (data.state && data.state.mood !== lastMood) {
          setMoodChanged(true);
          setLastMood(data.state.mood);
          setTimeout(() => setMoodChanged(false), 2000);
        }

        // 更新状态
        if (data.state) {
          setState(data.state);
          onStateChange?.(data.state);
        }

        // 检查是否触发图像生成
        if (shouldGenerateImage(userMessage) && !generatingImage) {
          // 从用户消息推断场景
          let scene = "beach";
          if (userMessage.includes("海边") || userMessage.includes("沙滩")) scene = "beach";
          else if (userMessage.includes("爬山") || userMessage.includes("山")) scene = "mountain";
          else if (userMessage.includes("咖啡")) scene = "cafe";
          else if (userMessage.includes("日落") || userMessage.includes("黄昏")) scene = "sunset";
          else if (userMessage.includes("家里") || userMessage.includes("在家")) scene = "home";

          // 延迟1秒后生成，让聊天更自然
          setTimeout(() => generateImage(scene), 1000);
        }
      }
    } catch (error) {
      console.error("发送失败:", error);
      setInput(userMessage); // 恢复输入
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  // 回车发送
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // 获取情绪标签
  const getMoodLabel = (mood: MoodType): string => {
    return MOOD_LABELS[mood] || mood;
  };

  // 获取情绪 Emoji
  const getMoodEmoji = (mood: MoodType): string => {
    return MOOD_EMOJIS[mood] || "😐";
  };

  // 生成并播放语音
  const playVoice = async (msg: MessageWithImage) => {
    // 如果已经在生成这个语音，直接返回
    if (voiceStates[msg.id]?.isGenerating) return;

    // 如果正在播放这个语音，暂停它
    if (voiceStates[msg.id]?.isPlaying) {
      stopVoice();
      return;
    }

    // 如果有其他语音在播放，先停止
    if (currentVoiceIdRef.current && currentVoiceIdRef.current !== msg.id) {
      stopVoice();
    }

    // 设置正在生成
    setVoiceStates(prev => ({
      ...prev,
      [msg.id]: { ...prev[msg.id], isGenerating: true, isPlaying: false, progress: 0 }
    }));

    try {
      // 获取角色的音色配置
      const voiceConfig = getCharacterVoiceConfig(msg.character_id || character?.id || "lu-chen-001");

      // 调用 TTS API 生成语音
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: msg.content,
          speaker: voiceConfig.voiceId,
          speed: voiceConfig.speed,
        }),
      });

      const data = await res.json();

      if (data.success && data.data?.url) {
        // 停止之前的音频
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }

        // 加载新音频
        const audio = new Audio(data.data.url);
        audioRef.current = audio;
        currentVoiceIdRef.current = msg.id;

        // 获取音频时长
        audio.addEventListener("loadedmetadata", () => {
          setVoiceStates(prev => ({
            ...prev,
            [msg.id]: {
              ...prev[msg.id],
              audioUrl: data.data.url,
              duration: audio.duration || 0,
            }
          }));
        });

        // 播放进度更新
        audio.addEventListener("timeupdate", () => {
          if (audio.duration) {
            const progress = (audio.currentTime / audio.duration) * 100;
            setVoiceStates(prev => ({
              ...prev,
              [msg.id]: { ...prev[msg.id], progress }
            }));
          }
        });

        audio.addEventListener("ended", () => {
          setVoiceStates(prev => ({
            ...prev,
            [msg.id]: { ...prev[msg.id], isPlaying: false, progress: 0 }
          }));
          currentVoiceIdRef.current = null;
        });

        audio.addEventListener("error", () => {
          console.error("音频播放失败");
          setVoiceStates(prev => ({
            ...prev,
            [msg.id]: { ...prev[msg.id], isPlaying: false, isGenerating: false }
          }));
          currentVoiceIdRef.current = null;
        });

        // 开始播放
        await audio.play();

        setVoiceStates(prev => ({
          ...prev,
          [msg.id]: { ...prev[msg.id], isGenerating: false, isPlaying: true }
        }));
      } else {
        console.error("语音生成失败:", data.error);
        setVoiceStates(prev => ({
          ...prev,
          [msg.id]: { ...prev[msg.id], isGenerating: false }
        }));
      }
    } catch (error) {
      console.error("播放语音错误:", error);
      setVoiceStates(prev => ({
        ...prev,
        [msg.id]: { ...prev[msg.id], isGenerating: false }
      }));
    }
  };

  // 停止播放
  const stopVoice = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (currentVoiceIdRef.current) {
      setVoiceStates(prev => ({
        ...prev,
        [currentVoiceIdRef.current!]: { ...prev[currentVoiceIdRef.current!], isPlaying: false, progress: 0 }
      }));
      currentVoiceIdRef.current = null;
    }
  };

  // 渲染消息分组
  const renderMessageGroups = () => {
    const groups: { date: string; dateLabel: string; messages: MessageWithImage[] }[] = [];
    let currentGroup: { date: string; dateLabel: string; messages: MessageWithImage[] } | null = null;

    messages.forEach((msg, index) => {
      const msgDate = new Date(msg.created_at);
      const dateKey = format(msgDate, "yyyy-MM-dd");
      let dateLabel = format(msgDate, "M月d日 EEEE", { locale: zhCN });

      if (isToday(msgDate)) {
        dateLabel = "今天";
      } else if (isYesterday(msgDate)) {
        dateLabel = "昨天";
      }

      // 检查是否需要新的分组（日期改变 或 与上一条消息间隔超过5分钟）
      const prevMsg = messages[index - 1];
      const needNewGroup = !currentGroup || currentGroup.date !== dateKey ||
        (prevMsg && differenceInMinutes(msgDate, new Date(prevMsg.created_at)) > 5);

      if (needNewGroup) {
        currentGroup = { date: dateKey, dateLabel, messages: [] };
        groups.push(currentGroup);
      }

      currentGroup?.messages.push(msg);
    });

    return groups.map((group) => (
      <div key={group.date}>
        {/* 日期标签 */}
        <div className="flex items-center justify-center my-4">
          <span className="px-4 py-1 bg-white/60 backdrop-blur-sm rounded-full text-xs text-amber-600 shadow-sm">
            {group.dateLabel}
          </span>
        </div>

        {/* 消息列表 */}
        {group.messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"} twilight-animate-in`}
          >
            {msg.role === "character" && (
              <img
                src={character?.avatar_url || "/avatar.png"}
                alt="角色"
                className="w-9 h-9 rounded-full bg-orange-100 border-2 border-orange-200 flex-shrink-0 object-cover"
              />
            )}

            <div
              className={`max-w-[75%] px-4 py-3 ${
                msg.role === "user"
                  ? "twilight-bubble-user"
                  : "twilight-bubble-bot"
              }`}
            >
              {/* 图片消息 */}
              {msg.type === "image" && msg.media_url && (
                <div className="mb-2 twilight-image-bubble">
                  <img
                    src={msg.media_url}
                    alt="生成的图片"
                    className="rounded-lg max-w-full max-h-80 object-contain"
                    loading="lazy"
                  />
                </div>
              )}
              <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              {/* 语音播放按钮（仅角色消息显示） */}
              {msg.role === "character" && (
                <div className="mt-2">
                  <div
                    onClick={() => playVoice(msg)}
                    className="twilight-voice-bubble py-2 px-3 cursor-pointer"
                    title={voiceStates[msg.id]?.isPlaying ? "暂停" : "播放语音"}
                  >
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        if (voiceStates[msg.id]?.isPlaying) {
                          stopVoice();
                        } else {
                          playVoice(msg);
                        }
                      }}
                      className="twilight-play-btn w-8 h-8 cursor-pointer"
                    >
                      {voiceStates[msg.id]?.isGenerating ? (
                        <Loader2 className="w-3 h-3 twilight-spin" />
                      ) : voiceStates[msg.id]?.isPlaying ? (
                        <Pause className="w-3 h-3" />
                      ) : (
                        <Play className="w-3 h-3 ml-0.5" />
                      )}
                    </div>
                    {voiceStates[msg.id]?.isPlaying ? (
                      <div className="flex items-center gap-0.5 flex-1">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div
                            key={i}
                            className="twilight-wave-bar"
                            style={{ animationDelay: `${i * 0.1}s` }}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="flex-1 h-4 flex items-center">
                        <div className="twilight-progress-bar flex-1">
                          <div
                            className="twilight-progress-fill"
                            style={{ width: `${voiceStates[msg.id]?.progress || 0}%` }}
                          />
                        </div>
                      </div>
                    )}
                    <span className="twilight-voice-time text-xs whitespace-nowrap">
                      {voiceStates[msg.id]?.isGenerating ? "生成中..." : voiceStates[msg.id]?.isPlaying ? "播放中" : "听语音"}
                    </span>
                  </div>
                </div>
              )}
              <p className={`text-xs mt-1 ${msg.role === "user" ? "text-orange-100" : "text-amber-600"}`}>
                {formatDistanceToNow(new Date(msg.created_at), { addSuffix: false, locale: zhCN })}
              </p>
            </div>

            {msg.role === "user" && (
              <div className="w-9 h-9 rounded-full bg-orange-100 border-2 border-orange-200 flex-shrink-0 flex items-center justify-center text-orange-600 font-medium">
                我
              </div>
            )}
          </div>
        ))}
      </div>
    ));
  };

  // 测试图像生成
  const testImageGeneration = async () => {
    if (generatingImage) return;

    // 可用的角色列表（暂时硬编码，后续可以从 API 获取）
    const availableCharacters = ["lin-ye", "shen-mo", "shu-ting", "gu-ran"];
    const testCharacterId = availableCharacters[Math.floor(Math.random() * availableCharacters.length)];

    setGeneratingImage(true);
    try {
      const res = await fetch("/api/image/character", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterId: testCharacterId,
          emotion: state?.mood || "happy",
          scene: "beach",
          size: "2K",
        }),
      });

      const data = await res.json();
      if (data.success && data.data?.url) {
        // 添加图片消息
        const imageMsg: MessageWithImage = {
          id: `img-${Date.now()}`,
          user_id: "character",
          character_id: testCharacterId,
          role: "character",
          content: "这是我的照片~",
          type: "image",
          media_url: data.data.url,
          is_read: false,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, imageMsg]);
      } else {
        console.error("图像生成失败:", data.error);
        alert("图片生成失败: " + (data.error?.message || "未知错误"));
      }
    } catch (error) {
      console.error("图像生成错误:", error);
    } finally {
      setGeneratingImage(false);
    }
  };

  // 贴纸快捷发送
  const stickers = [
    { emoji: "🥰", label: "亲亲" },
    { emoji: "😤", label: "哼" },
    { emoji: "😢", label: "委屈" },
    { emoji: "🤗", label: "抱抱" },
    { emoji: "😴", label: "困了" },
    { emoji: "❤️", label: "喜欢" },
    { emoji: "🥺", label: "撒娇" },
    { emoji: "😠", label: "生气" },
  ];

  return (
    <div className="flex flex-col h-full twilight-gradient">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-10 twilight-header-glass px-4 py-3">
        <div className="flex items-center gap-3 max-w-3xl mx-auto">
          {/* 角色切换器 */}
          <CharacterSwitcher
            currentCharacter={character}
            onSwitch={(newCharacter) => {
              setCharacter(newCharacter);
              // 清空当前聊天
              setMessages([]);
            }}
          />

          {/* 角色信息 */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="relative">
              <img
                src={character?.avatar_url || DEFAULT_CHARACTER.avatar_url}
                alt={character?.display_name}
                className="w-10 h-10 rounded-full object-cover bg-orange-100 border-2 border-orange-200"
              />
              <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-semibold text-gray-900 truncate twilight-card-name text-sm">
                {character?.display_name || "加载中..."}
              </h1>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                {state && (
                  <span className="flex items-center gap-1">
                    {getMoodEmoji(state.mood)} {getMoodLabel(state.mood)}
                  </span>
                )}
                {mockMode && (
                  <span className="twilight-demo-badge-light">
                    <Sparkles className="w-2 h-2" />
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 亲密度 */}
          {state && (
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-1 text-sm">
                <Heart className="w-4 h-4 text-orange-500" />
                <span className="text-orange-600 font-medium">
                  {state.intimacy}
                </span>
              </div>
              {state.mood_intensity && (
                <div className="twilight-intimacy-track">
                  <div
                    className="twilight-intimacy-fill"
                    style={{ width: `${state.mood_intensity}%` }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* 情绪变化提示 */}
      {moodChanged && state && (
        <div className="twilight-header px-4 py-2 text-center text-sm text-white animate-pulse flex items-center justify-center gap-2">
          <Zap className="w-4 h-4" />
          <span>情绪发生了变化：{getMoodEmoji(state.mood)} {getMoodLabel(state.mood)}</span>
        </div>
      )}

      {/* 消息列表 */}
      <main className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12 text-amber-700">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-orange-200 to-amber-100 flex items-center justify-center">
                <span className="text-3xl">💭</span>
              </div>
              <p className="text-lg mb-2">还没有消息</p>
              <p className="text-sm text-amber-600">开始和 {character?.display_name} 聊天吧~</p>
            </div>
          )}

          {/* 消息分组渲染 */}
          {renderMessageGroups()}

          {/* 加载状态 */}
          {loading && (
            <div className="flex gap-3 justify-start twilight-animate-in">
              <img
                src={character?.avatar_url || "/avatar.png"}
                alt="角色"
                className="w-9 h-9 rounded-full bg-orange-100 border-2 border-orange-200 flex-shrink-0 object-cover"
              />
              <div className="twilight-bubble-bot px-4 py-3">
                <div className="flex items-center gap-2 text-amber-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>打字中...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* 贴纸栏 */}
      {showStickers && (
        <div className="bg-white/95 backdrop-blur-md border-t border-orange-100 px-4 py-3 twilight-form">
          <div className="flex gap-3 flex-wrap max-w-3xl mx-auto">
            {stickers.map((s) => (
              <button
                key={s.emoji}
                onClick={() => {
                  setInput(s.emoji);
                  setShowStickers(false);
                  inputRef.current?.focus();
                }}
                className="twilight-sticker"
                title={s.label}
              >
                {s.emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 输入区域 */}
      <footer className="twilight-header-glass px-4 py-3">
        <div className="flex items-end gap-3 max-w-3xl mx-auto">
          {/* 功能按钮 */}
          <div className="flex gap-2 pb-1">
            <button
              onClick={() => setShowStickers(!showStickers)}
              className="p-2 rounded-full hover:bg-orange-100 text-amber-600 transition-colors"
              title="表情包"
            >
              <Sparkles className="w-5 h-5" />
            </button>
            <button
              className="p-2 rounded-full hover:bg-orange-100 text-amber-600 transition-colors opacity-50 cursor-not-allowed"
              title="语音(即将上线)"
            >
              <Mic className="w-5 h-5" />
            </button>
            <button
              onClick={testImageGeneration}
              disabled={!character || generatingImage}
              className="p-2 rounded-full hover:bg-orange-100 text-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title={generatingImage ? "生成中..." : "生成图片"}
            >
              {generatingImage ? (
                <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
              ) : (
                <Image className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* 输入框 */}
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`给 ${character?.display_name || "TA"} 发消息...`}
              rows={1}
              className="twilight-input w-full resize-none px-4 py-3 pr-12"
              style={{ maxHeight: "120px" }}
            />
          </div>

          {/* 发送按钮 */}
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="twilight-btn twilight-send-btn disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:hover:shadow-none"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>

        <p className="text-center text-xs text-amber-600 mt-2 max-w-3xl mx-auto">
          {mockMode
            ? "💡 当前为演示模式，可配置 OPENAI_API_KEY 使用真实 AI"
            : "✨ Powered by AI"}
        </p>
      </footer>
    </div>
  );
}
