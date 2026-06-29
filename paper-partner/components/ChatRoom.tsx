"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Send, Sparkles, Loader2, Mic, Image, Heart, Zap, Volume2 } from "lucide-react";
import type { Message, CharacterProfile, CharacterState, MoodType } from "@/types";
import { MOOD_LABELS, MOOD_EMOJIS } from "@/types";

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
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [generatingVoice, setGeneratingVoice] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const deviceIdRef = useRef<string>("");

  // 初始化设备ID
  useEffect(() => {
    let id = localStorage.getItem("deviceId");
    if (!id) {
      id = "user-" + Math.random().toString(36).slice(2, 11);
      localStorage.setItem("deviceId", id);
    }
    deviceIdRef.current = id;
  }, []);

  // 加载历史消息
  const loadMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/chat?characterId=${character?.id}`, {
        headers: { "x-device-id": deviceIdRef.current },
      });
      const data = await res.json();
      if (data.messages) setMessages(data.messages);
      if (data.character) setCharacter(data.character);
      if (data.state) {
        setState(data.state);
        setLastMood(data.state.mood);
        onStateChange?.(data.state);
      }
      setMockMode(data.mockMode);
    } catch (error) {
      console.error("加载消息失败:", error);
    }
  }, [character?.id, onStateChange]);

  // 初始化
  useEffect(() => {
    const init = async () => {
      try {
        await fetch("/api/init", { method: "POST" });
        await loadMessages();
      } catch (error) {
        console.error("初始化失败:", error);
      }
    };
    init();
  }, [loadMessages]);

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
    // 如果正在播放或正在生成，直接返回
    if (playingMessageId === msg.id || generatingVoice === msg.id) return;
    if (generatingVoice) return;

    setPlayingMessageId(msg.id);
    setGeneratingVoice(msg.id);

    try {
      // 调用 TTS API 生成语音
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: msg.content }),
      });

      const data = await res.json();

      if (data.success && data.data?.url) {
        // 停止之前的音频
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }

        // 播放新音频
        const audio = new Audio(data.data.url);
        audioRef.current = audio;

        audio.onplay = () => {
          setPlayingMessageId(msg.id);
        };

        audio.onended = () => {
          setPlayingMessageId(null);
        };

        audio.onerror = () => {
          console.error("音频播放失败");
          setPlayingMessageId(null);
        };

        await audio.play();
      } else {
        console.error("语音生成失败:", data.error);
      }
    } catch (error) {
      console.error("播放语音错误:", error);
    } finally {
      setGeneratingVoice(null);
    }
  };

  // 停止播放
  const stopVoice = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlayingMessageId(null);
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
    <div className="flex flex-col h-full bg-gradient-to-b from-pink-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-pink-100 dark:border-gray-700 px-4 py-3">
        <div className="flex items-center gap-3 max-w-3xl mx-auto">
          <div className="relative">
            <img
              src={character?.avatar_url || "/avatar.png"}
              alt={character?.display_name}
              className="w-12 h-12 rounded-full border-2 border-pink-200 dark:border-pink-500 object-cover bg-pink-100"
            />
            <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white dark:border-gray-800" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-gray-900 dark:text-white truncate">
              {character?.display_name || "加载中..."}
            </h1>
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              {state && (
                <span className="flex items-center gap-1">
                  {getMoodEmoji(state.mood)} {getMoodLabel(state.mood)}
                </span>
              )}
              {mockMode && (
                <span className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-200 text-xs rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> 演示模式
                </span>
              )}
            </div>
          </div>
          {state && (
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-1 text-sm">
                <Heart className="w-4 h-4 text-pink-500" />
                <span className="text-pink-600 dark:text-pink-400 font-medium">
                  {state.intimacy}
                </span>
              </div>
              {/* 情绪强度指示 */}
              {state.mood_intensity && (
                <div className="w-16 h-1 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-pink-400 to-pink-600 rounded-full transition-all"
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
        <div className="bg-gradient-to-r from-pink-100 to-purple-100 dark:from-pink-900/30 dark:to-purple-900/30 px-4 py-2 text-center text-sm text-pink-600 dark:text-pink-400 animate-pulse flex items-center justify-center gap-2">
          <Zap className="w-4 h-4" />
          <span>情绪发生了变化：{getMoodEmoji(state.mood)} {getMoodLabel(state.mood)}</span>
        </div>
      )}

      {/* 消息列表 */}
      <main className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12 text-gray-400 dark:text-gray-500">
              <p className="text-lg mb-2">还没有消息</p>
              <p className="text-sm">开始和 {character?.display_name} 聊天吧~</p>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "character" && (
                <img
                  src={character?.avatar_url || "/avatar.png"}
                  alt="角色"
                  className="w-9 h-9 rounded-full bg-pink-100 border border-pink-200 flex-shrink-0"
                />
              )}

              <div
                className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                  msg.role === "user"
                    ? "bg-pink-500 text-white rounded-br-md"
                    : "bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-bl-md shadow-sm"
                }`}
              >
                {/* 图片消息 */}
                {msg.type === "image" && msg.media_url && (
                  <div className="mb-2">
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
                  <button
                    onClick={() => playingMessageId === msg.id ? stopVoice() : playVoice(msg)}
                    disabled={generatingVoice !== null && generatingVoice !== msg.id}
                    className={`mt-2 flex items-center gap-1 text-xs px-2 py-1 rounded-full transition-all ${
                      playingMessageId === msg.id
                        ? "bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400"
                        : "bg-gray-100 text-gray-500 hover:bg-pink-50 hover:text-pink-500 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-pink-900/30 dark:hover:text-pink-400"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                    title="播放语音"
                  >
                    {generatingVoice === msg.id ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>生成中...</span>
                      </>
                    ) : playingMessageId === msg.id ? (
                      <>
                        <Volume2 className="w-3 h-3" />
                        <span>播放中</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-3 h-3" />
                        <span>听语音</span>
                      </>
                    )}
                  </button>
                )}
                <p
                  className={`text-xs mt-1 opacity-70 ${
                    msg.role === "user" ? "text-pink-100" : "text-gray-400"
                  }`}
                >
                  {formatDistanceToNow(new Date(msg.created_at), {
                    addSuffix: false,
                    locale: zhCN,
                  })}
                </p>
              </div>

              {msg.role === "user" && (
                <div className="w-9 h-9 rounded-full bg-pink-100 border border-pink-200 flex-shrink-0 flex items-center justify-center text-pink-500 font-medium">
                  我
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 justify-start">
              <img
                src={character?.avatar_url || "/avatar.png"}
                alt="角色"
                className="w-9 h-9 rounded-full bg-pink-100 border border-pink-200 flex-shrink-0"
              />
              <div className="bg-white dark:bg-gray-700 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                <div className="flex items-center gap-2 text-gray-400">
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
        <div className="bg-white dark:bg-gray-800 border-t border-pink-100 dark:border-gray-700 px-4 py-3">
          <div className="flex gap-3 flex-wrap max-w-3xl mx-auto">
            {stickers.map((s) => (
              <button
                key={s.emoji}
                onClick={() => {
                  setInput(s.emoji);
                  setShowStickers(false);
                  inputRef.current?.focus();
                }}
                className="text-3xl hover:scale-125 transition-transform"
                title={s.label}
              >
                {s.emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 输入区域 */}
      <footer className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-t border-pink-100 dark:border-gray-700 px-4 py-3">
        <div className="flex items-end gap-3 max-w-3xl mx-auto">
          {/* 功能按钮 */}
          <div className="flex gap-2 pb-1">
            <button
              onClick={() => setShowStickers(!showStickers)}
              className="p-2 rounded-full hover:bg-pink-100 dark:hover:bg-gray-700 text-gray-500 transition-colors"
              title="表情包"
            >
              <Sparkles className="w-5 h-5" />
            </button>
            <button
              className="p-2 rounded-full hover:bg-pink-100 dark:hover:bg-gray-700 text-gray-500 transition-colors opacity-50 cursor-not-allowed"
              title="语音(即将上线)"
            >
              <Mic className="w-5 h-5" />
            </button>
            <button
              onClick={testImageGeneration}
              disabled={!character || generatingImage}
              className="p-2 rounded-full hover:bg-pink-100 dark:hover:bg-gray-700 text-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title={generatingImage ? "生成中..." : "生成图片"}
            >
              {generatingImage ? (
                <Loader2 className="w-5 h-5 animate-spin text-pink-500" />
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
              className="w-full resize-none rounded-2xl bg-gray-100 dark:bg-gray-700 px-4 py-3 pr-12 text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-300 dark:focus:ring-pink-500"
              style={{ maxHeight: "120px" }}
            />
          </div>

          {/* 发送按钮 */}
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="p-3 rounded-full bg-pink-500 hover:bg-pink-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white transition-all hover:scale-105 active:scale-95 flex-shrink-0"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 mt-2 max-w-3xl mx-auto">
          {mockMode
            ? "💡 当前为演示模式，可配置 OPENAI_API_KEY 使用真实 AI"
            : "✨ Powered by AI"}
        </p>
      </footer>
    </div>
  );
}
