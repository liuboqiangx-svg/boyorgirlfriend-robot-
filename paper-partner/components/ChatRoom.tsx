"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { formatDistanceToNow, isToday, isYesterday, format, differenceInMinutes } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Send, Sparkles, Loader2, Mic, Image, Heart, Zap, Volume2, Play, Pause, X, ZoomIn, ZoomOut, RotateCcw, Copy, Trash2, ChevronDown } from "lucide-react";
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
  // 图片预览状态
  const [previewImage, setPreviewImage] = useState<{ url: string; alt: string } | null>(null);
  const [previewScale, setPreviewScale] = useState(1);
  // 长按菜单状态
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; messageId: string; content: string } | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  // 语音进度拖动状态
  const [isDragging, setIsDragging] = useState(false);
  const [dragProgress, setDragProgress] = useState(0);
  const [activeDragMsgId, setActiveDragMsgId] = useState<string | null>(null);
  const progressBarRefs = useRef<Record<string, HTMLDivElement | null>>({});
  // 语音错误提示
  const [voiceError, setVoiceError] = useState<string | null>(null);
  // 快捷回复栏显示状态
  const [showQuickReplies, setShowQuickReplies] = useState(true);
  // 语音消息状态管理
  const [voiceStates, setVoiceStates] = useState<Record<string, VoiceState>>({});
  // 语音消息展开状态（显示文字）
  const [expandedVoiceIds, setExpandedVoiceIds] = useState<Set<string>>(new Set());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentVoiceIdRef = useRef<string | null>(null);
  const autoPlayNextRef = useRef(true);
  const messagesRef = useRef<MessageWithImage[]>(messages);
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

  // 点击其他区域关闭长按菜单
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [contextMenu]);

  // 滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 同步 messagesRef
  useEffect(() => {
    messagesRef.current = messages;
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
  const testCharacters = ["xiao-xiao", "lin-ye", "shen-mo", "shu-ting", "gu-ran"];

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
    const text = input.trim();
    if (!text || loading) return;
    await sendMessageWithText(text);
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
  const playVoice = async (msg: MessageWithImage, isAutoPlay = false) => {
    // 用户手动播放时开启自动播放下一条
    if (!isAutoPlay) {
      autoPlayNextRef.current = true;
    }
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

          // 自动播放下一条角色语音
          if (autoPlayNextRef.current) {
            const currentIndex = messagesRef.current.findIndex((m) => m.id === msg.id);
            const nextVoiceMsg = messagesRef.current
              .slice(currentIndex + 1)
              .find((m) => m.role === "character" && m.type === "text");

            if (nextVoiceMsg) {
              // 延迟 500ms 再播放下一条，更自然
              setTimeout(() => {
                if (autoPlayNextRef.current && !currentVoiceIdRef.current) {
                  playVoice(nextVoiceMsg, true);
                }
              }, 500);
            }
          }
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
        // 解析错误信息
        let errorMessage = "语音生成失败，请稍后重试";
        if (data.error) {
          if (typeof data.error === 'string') {
            errorMessage = data.error;
          } else if (data.error.message) {
            errorMessage = data.error.message;
          } else if (data.error.code) {
            errorMessage = `错误: ${data.error.code}`;
          }
        }
        console.error("语音生成失败:", errorMessage, data.error);
        setVoiceError(errorMessage);
        setTimeout(() => setVoiceError(null), 3000); // 3秒后自动消失
        setVoiceStates(prev => ({
          ...prev,
          [msg.id]: { ...prev[msg.id], isGenerating: false }
        }));
      }
    } catch (error) {
      console.error("播放语音错误:", error);
      setVoiceError("语音播放出错，请稍后重试");
      setTimeout(() => setVoiceError(null), 3000);
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

  // 暂停播放（用户手动暂停时取消自动播放）
  const pauseVoice = () => {
    autoPlayNextRef.current = false;
    stopVoice();
  };

  // 格式化时间 (秒 -> MM:SS)
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // 处理进度条拖动开始
  const handleProgressDragStart = (e: React.MouseEvent | React.TouchEvent, msgId: string) => {
    e.stopPropagation();
    setIsDragging(true);
    setActiveDragMsgId(msgId);
    setDragProgress(voiceStates[msgId]?.progress || 0);
  };

  // 处理进度条拖动中
  const handleProgressDrag = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging || !activeDragMsgId || !progressBarRefs.current[activeDragMsgId]) return;
    e.stopPropagation();

    const barRef = progressBarRefs.current[activeDragMsgId];
    const rect = barRef.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const newProgress = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    setDragProgress(newProgress);
  };

  // 处理进度条拖动结束
  const handleProgressDragEnd = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging || !activeDragMsgId || !progressBarRefs.current[activeDragMsgId] || !audioRef.current || !currentVoiceIdRef.current) {
      setIsDragging(false);
      setActiveDragMsgId(null);
      return;
    }
    e.stopPropagation();

    const barRef = progressBarRefs.current[activeDragMsgId];
    const rect = barRef.getBoundingClientRect();
    const clientX = 'changedTouches' in e ? e.changedTouches[0].clientX : e.clientX;
    const finalProgress = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));

    // 跳转到指定位置
    const newTime = (finalProgress / 100) * audioRef.current.duration;
    audioRef.current.currentTime = newTime;

    setVoiceStates(prev => ({
      ...prev,
      [activeDragMsgId]: { ...prev[activeDragMsgId], progress: finalProgress }
    }));
    setIsDragging(false);
    setActiveDragMsgId(null);
  };

  // 长按开始
  const handleLongPressStart = (e: React.TouchEvent | React.MouseEvent, msg: MessageWithImage) => {
    e.preventDefault();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    longPressTimerRef.current = setTimeout(() => {
      setContextMenu({ x: clientX, y: clientY, messageId: msg.id, content: msg.content });
    }, 500);
  };

  // 长按取消
  const handleLongPressEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // 复制消息
  const copyMessage = async () => {
    if (contextMenu) {
      try {
        await navigator.clipboard.writeText(contextMenu.content);
      } catch {
        // 降级方案
        const textarea = document.createElement('textarea');
        textarea.value = contextMenu.content;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setContextMenu(null);
    }
  };

  // 删除消息
  const deleteMessage = () => {
    if (contextMenu) {
      setMessages((prev) => prev.filter((m) => m.id !== contextMenu.messageId));
      setContextMenu(null);
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

    return groups.map((group, groupIndex) => (
      <div key={`${group.date}-${groupIndex}`}>
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

            {/* 文字消息 / 语音消息 */}
            <div
              className={`max-w-[75%] ${
                msg.role === "user" ? "twilight-bubble-user" : "twilight-bubble-bot"
              } ${msg.type === "voice" ? "px-2 py-2" : "px-4 py-3"}`}
              onContextMenu={(e) => {
                e.preventDefault();
                setContextMenu({ x: e.clientX, y: e.clientY, messageId: msg.id, content: msg.content });
              }}
              onTouchStart={(e) => handleLongPressStart(e, msg)}
              onTouchEnd={handleLongPressEnd}
              onTouchMove={handleLongPressEnd}
              onMouseDown={(e) => {
                // PC端长按 (按住一段时间)
                longPressTimerRef.current = setTimeout(() => {
                  setContextMenu({ x: e.clientX, y: e.clientY, messageId: msg.id, content: msg.content });
                }, 500);
              }}
              onMouseUp={handleLongPressEnd}
              onMouseLeave={handleLongPressEnd}
            >
              {/* 图片消息 */}
              {msg.type === "image" && msg.media_url && (
                <div className="mb-2 twilight-image-bubble">
                  <img
                    src={msg.media_url}
                    alt="生成的图片"
                    className="rounded-lg max-w-full max-h-80 object-contain cursor-zoom-in hover:opacity-90 transition-opacity"
                    loading="lazy"
                    onClick={() => {
                      setPreviewImage({ url: msg.media_url!, alt: msg.content || "图片预览" });
                      setPreviewScale(1);
                    }}
                  />
                </div>
              )}

              {/* 语音消息（类似微信语音） */}
              {msg.type === "voice" && msg.role === "character" && (
                <VoiceMessageBubble msg={msg} voiceStates={voiceStates} />
              )}

              {/* 文字消息（voice类型不显示文字，除非用户展开） */}
              {(msg.type !== "voice" || (msg.type === "voice" && expandedVoiceIds.has(msg.id))) && (
                <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              )}

              {/* 语音消息展开按钮 */}
              {msg.type === "voice" && msg.role === "character" && (
                <div className="flex justify-end mt-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedVoiceIds(prev => {
                        const next = new Set(prev);
                        if (next.has(msg.id)) {
                          next.delete(msg.id);
                        } else {
                          next.add(msg.id);
                        }
                        return next;
                      });
                    }}
                    className="text-xs text-amber-600 hover:underline"
                  >
                    {expandedVoiceIds.has(msg.id) ? "收起" : "显示文字"}
                  </button>
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

  // 快捷回复列表
  const quickReplies = [
    { emoji: "☀️", label: "早安", text: "早安呀～今天也要元气满满！" },
    { emoji: "🌙", label: "晚安", text: "晚安，做个好梦～" },
    { emoji: "💭", label: "在干嘛", text: "在干嘛呢？" },
    { emoji: "🍚", label: "吃了吗", text: "吃了吗？" },
    { emoji: "🤗", label: "抱抱", text: "要抱抱～" },
    { emoji: "❤️", label: "想你", text: "想你了" },
  ];

  // 发送快捷回复
  const sendQuickReply = async (text: string) => {
    if (loading) return;
    setInput(text);
    // 使用 setTimeout 确保 input 已更新（实际上直接调用 sendMessage 也可以，因为这里需要立刻发送）
    // 更好的方式是直接复用 sendMessage 逻辑
    await sendMessageWithText(text);
  };

  // 发送指定文本的消息
  const sendMessageWithText = async (text: string) => {
    if (!text.trim() || loading) return;

    setInput("");

    // 1. 先立即添加用户消息（不等待 API）
    const userMessage: MessageWithImage = {
      id: `user-${Date.now()}`,
      user_id: deviceIdRef.current,
      character_id: character?.id || "",
      role: "user",
      content: text,
      type: "text",
      is_read: true,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // 2. 设置 loading 显示"正在输入..."动画
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-device-id": deviceIdRef.current,
        },
        body: JSON.stringify({
          content: text,
          characterId: character?.id,
        }),
      });

      const data = await res.json();
      if (data.characterMessage) {
        // 3. API 返回后添加角色消息
        let newCharMsg = data.characterMessage;

        // 4. 检测是否触发语音，触发时消息类型改为 voice
        if (data.state) {
          const { shouldSpeak } = await import("@/lib/voice/trigger");
          const currentMood = data.state.mood || "calm";
          if (shouldSpeak(text, currentMood)) {
            // 触发语音：消息类型改为 voice
            newCharMsg = { ...newCharMsg, type: "voice" as const };
            // 添加消息后再播放语音
            setMessages((prev) => [...prev, newCharMsg]);
            setTimeout(() => {
              playVoice(newCharMsg, true); // 自动播放
            }, 300);
          } else {
            // 不触发语音：正常添加文字消息
            setMessages((prev) => [...prev, newCharMsg]);
          }
        } else {
          setMessages((prev) => [...prev, newCharMsg]);
        }

        if (data.state && data.state.mood !== lastMood) {
          setMoodChanged(true);
          setLastMood(data.state.mood);
          setTimeout(() => setMoodChanged(false), 2000);
        }

        if (data.state) {
          setState(data.state);
          onStateChange?.(data.state);
        }

        if (shouldGenerateImage(text) && !generatingImage) {
          let scene = "beach";
          if (text.includes("海边") || text.includes("沙滩")) scene = "beach";
          else if (text.includes("爬山") || text.includes("山")) scene = "mountain";
          else if (text.includes("咖啡")) scene = "cafe";
          else if (text.includes("日落") || text.includes("黄昏")) scene = "sunset";
          else if (text.includes("家里") || text.includes("在家")) scene = "home";
          setTimeout(() => generateImage(scene), 1000);
        }
      }
    } catch (error) {
      console.error("发送失败:", error);
      // 用户消息已添加，可以选择删除或保留，这里保留让用户知道消息发出了
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  // 测试图像生成
  const testImageGeneration = async () => {
    if (generatingImage) return;

    // 使用当前选中的角色
    const currentCharacterId = character?.id;
    if (!currentCharacterId) return;

    setGeneratingImage(true);
    try {
      const res = await fetch("/api/image/character", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterId: currentCharacterId,
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
          character_id: currentCharacterId,
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

  // 语音消息气泡组件（类似微信语音）
  const VoiceMessageBubble = ({ msg, voiceStates }: { msg: MessageWithImage; voiceStates: Record<string, VoiceState> }) => {
    const voiceState = voiceStates[msg.id];
    const isGenerating = voiceState?.isGenerating;
    const isPlaying = voiceState?.isPlaying;
    const duration = voiceState?.duration || 0;

    return (
      <div className="flex items-center gap-3 py-1 min-w-[120px]">
        {/* 播放/暂停按钮 */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            if (voiceStates[msg.id]?.isPlaying) {
              pauseVoice();
            } else {
              playVoice(msg);
            }
          }}
          className="twilight-play-btn w-10 h-10 rounded-full flex items-center justify-center cursor-pointer"
        >
          {isGenerating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isPlaying ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4 ml-0.5" />
          )}
        </div>

        {/* 进度条 / 静态条 */}
        <div className="flex-1 flex flex-col gap-1">
          <div
            className="h-1.5 bg-gray-300 rounded-full overflow-hidden"
          >
            <div
              className="h-full bg-amber-500 rounded-full transition-all duration-100"
              style={{ width: `${voiceState?.progress || 0}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>{isPlaying ? `${formatTime((voiceState?.progress || 0) / 100 * duration)}` : "0:00"}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>
    );
  };

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

      {/* 语音错误提示 */}
      {voiceError && (
        <div className="bg-red-500 px-4 py-2 text-center text-sm text-white animate-pulse flex items-center justify-center gap-2">
          <span>🔔 {voiceError}</span>
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

          {/* 加载状态 / 打字特效 */}
          {loading && (
            <div className="flex gap-3 justify-start twilight-animate-in">
              <div className="relative flex-shrink-0">
                <img
                  src={character?.avatar_url || "/avatar.png"}
                  alt="角色"
                  className="w-9 h-9 rounded-full bg-orange-100 border-2 border-orange-200 object-cover twilight-typing-avatar"
                />
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-white animate-pulse" />
              </div>
              <div className="twilight-bubble-bot px-4 py-3">
                <div className="flex items-center gap-3 text-amber-600">
                  {/* 三个跳动的点 */}
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="w-2 h-2 bg-amber-500 rounded-full twilight-typing-dot"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                  <span className="text-sm">{character?.display_name || "TA"} 正在输入...</span>
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

      {/* 快捷回复栏 */}
      {showQuickReplies && (
        <div className="bg-white/80 backdrop-blur-md border-t border-orange-100 px-4 py-2 twilight-form">
          <div className="flex items-center gap-2 max-w-3xl mx-auto overflow-x-auto scrollbar-hide">
            <span className="text-xs text-amber-500 whitespace-nowrap">快捷回复:</span>
            {quickReplies.map((qr) => (
              <button
                key={qr.label}
                onClick={() => {
                  sendQuickReply(qr.text);
                  setShowQuickReplies(false);
                }}
                disabled={loading}
                className="flex items-center gap-1 px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-amber-700 rounded-full text-sm whitespace-nowrap transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>{qr.emoji}</span>
                <span>{qr.label}</span>
              </button>
            ))}
            <button
              onClick={() => setShowQuickReplies(false)}
              className="text-xs text-amber-400 hover:text-amber-600 whitespace-nowrap px-2"
            >
              收起
            </button>
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

        <div className="flex items-center justify-between max-w-3xl mx-auto mt-2">
          <button
            onClick={() => setShowQuickReplies(true)}
            className={`text-xs transition-colors ${showQuickReplies ? 'text-amber-300 cursor-default' : 'text-amber-600 hover:text-amber-800'}`}
            disabled={showQuickReplies}
          >
            {showQuickReplies ? '快捷回复已展开' : '➕ 快捷回复'}
          </button>
          <p className="text-center text-xs text-amber-600">
            {mockMode
              ? "💡 当前为演示模式，可配置 OPENAI_API_KEY 使用真实 AI"
              : "✨ Powered by AI"}
          </p>
        </div>
      </footer>

      {/* 图片预览弹窗 */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center"
          onClick={() => {
            setPreviewImage(null);
            setPreviewScale(1);
          }}
        >
          {/* 操作按钮 */}
          <div className="absolute top-4 right-4 flex gap-2 z-10">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setPreviewScale((s) => Math.max(0.5, s - 0.25));
              }}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
              title="缩小"
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setPreviewScale((s) => Math.min(3, s + 0.25));
              }}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
              title="放大"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setPreviewScale(1);
              }}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
              title="重置"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setPreviewImage(null);
                setPreviewScale(1);
              }}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
              title="关闭"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 图片 */}
          <img
            src={previewImage.url}
            alt={previewImage.alt}
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl transition-transform duration-200"
            style={{ transform: `scale(${previewScale})` }}
            onClick={(e) => e.stopPropagation()}
          />

          {/* 缩放提示 */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-white/20 rounded-full text-white text-sm">
            {Math.round(previewScale * 100)}%
          </div>
        </div>
      )}

      {/* 长按菜单弹窗 */}
      {contextMenu && (
        <>
          {/* 遮罩层 */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setContextMenu(null)}
          />
          {/* 菜单 */}
          <div
            className="fixed z-50 bg-white rounded-xl shadow-2xl overflow-hidden"
            style={{
              left: Math.min(contextMenu.x, window.innerWidth - 160),
              top: Math.min(contextMenu.y, window.innerHeight - 120),
            }}
          >
            <button
              onClick={copyMessage}
              className="flex items-center gap-3 w-full px-4 py-3 hover:bg-gray-50 transition-colors text-left"
            >
              <Copy className="w-5 h-5 text-gray-500" />
              <span className="text-gray-700">复制</span>
            </button>
            <div className="h-px bg-gray-100" />
            <button
              onClick={deleteMessage}
              className="flex items-center gap-3 w-full px-4 py-3 hover:bg-red-50 transition-colors text-left"
            >
              <Trash2 className="w-5 h-5 text-red-500" />
              <span className="text-red-500">删除</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
