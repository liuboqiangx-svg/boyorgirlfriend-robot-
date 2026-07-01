"use client";

import { useRef } from "react";
import React from "react";
import { motion, useScroll, useTransform, MotionValue } from "framer-motion";
import type { CharacterProfile } from "@/types";

interface ImmersiveScrollGalleryProps {
  characters: CharacterProfile[];
  onSelect?: (character: CharacterProfile) => void;
}

/**
 * 沉浸式滚动画廊组件
 * 角色头像随滚动缩放的效果
 */
const ImmersiveScrollGallery: React.FC<ImmersiveScrollGalleryProps> = ({
  characters,
  onSelect,
}) => {
  const container = useRef<HTMLDivElement | null>(null);

  // 滚动相关
  const { scrollYProgress } = useScroll({
    target: container,
    offset: ["start start", "end end"],
  });

  // 透明度动画
  const opacityImage = useTransform(scrollYProgress, [0, 0.6], [1, 0]);
  const opacitySection2 = useTransform(scrollYProgress, [0.6, 0.8], [0, 1]);

  // 为每个角色头像分配不同的缩放值
  const scaleValues: MotionValue<number>[] = [
    useTransform(scrollYProgress, [0, 1], [1, 4]),
    useTransform(scrollYProgress, [0, 1], [1, 5]),
    useTransform(scrollYProgress, [0, 1], [1, 6]),
    useTransform(scrollYProgress, [0, 1], [1, 5]),
    useTransform(scrollYProgress, [0, 1], [1, 6]),
    useTransform(scrollYProgress, [0, 1], [1, 8]),
    useTransform(scrollYProgress, [0, 1], [1, 9]),
  ];

  // 头像位置样式
  const avatarPositions = [
    "w-[25vw] h-[25vh]",
    "w-[35vw] h-[30vh] -top-[30vh] left-[5vw]",
    "w-[20vw] h-[55vh] -top-[15vh] -left-[25vw]",
    "w-[25vw] h-[25vh] left-[27.5vw]",
    "w-[20vw] h-[30vh] top-[30vh] left-[5vw]",
    "w-[30vw] h-[25vh] top-[27.5vh] -left-[22.5vw]",
    "w-[15vw] h-[15vh] top-[22.5vh] left-[25vw]",
  ];

  return (
    <div ref={container} className="relative h-[300vh]">
      <div className="sticky top-0 h-[100vh] overflow-hidden">
        {/* 角色头像层 - 随滚动放大 */}
        {characters.slice(0, 7).map((character, index) => {
          const scale = scaleValues[index % scaleValues.length];

          return (
            <motion.div
              key={character.id}
              style={{ scale, opacity: opacityImage }}
              className="absolute flex items-center justify-center w-full h-full top-0"
            >
              <div className={`relative ${avatarPositions[index]}`}>
                <img
                  src={character.avatar_url}
                  alt={character.name}
                  className="w-full h-full object-cover rounded-2xl shadow-2xl"
                />
                {/* 角色名标签 */}
                <div className="absolute bottom-4 left-4 right-4 text-center">
                  <span className="px-4 py-2 bg-black/50 backdrop-blur-sm rounded-full text-white text-lg font-medium">
                    {character.name}
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}

        {/* 底部内容区域 - 选择卡片 */}
        <motion.div
          style={{
            opacity: opacitySection2,
            scale: useTransform(scrollYProgress, [0.6, 0.8], [0.8, 1]),
          }}
          className="absolute inset-0 flex items-end justify-center pb-8 px-4"
        >
          <div className="max-w-5xl w-full">
            {/* 选择提示 */}
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white mb-2 drop-shadow-lg">
                向下滚动，选择你的TA
              </h2>
              <p className="text-white/80 text-sm drop-shadow">
                每个角色都有独特的性格和故事 ✨
              </p>
            </div>

            {/* 角色卡片网格 */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {characters.map((character) => (
                <button
                  key={character.id}
                  onClick={() => onSelect?.(character)}
                  className="group relative bg-white/90 backdrop-blur-sm rounded-xl p-3 shadow-lg hover:shadow-xl transition-all hover:scale-105"
                >
                  {/* 头像 */}
                  <div className="relative mb-2">
                    <img
                      src={character.avatar_url}
                      alt={character.name}
                      className="w-full aspect-square rounded-lg object-cover border-2 border-orange-200 group-hover:border-orange-400 transition-colors"
                    />
                    {/* 在线状态 */}
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-400 rounded-full border-2 border-white flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </div>
                  </div>

                  {/* 信息 */}
                  <div className="text-center">
                    <h3 className="font-bold text-amber-900 text-sm truncate">
                      {character.name}
                    </h3>
                    <p className="text-xs text-amber-600 truncate">
                      {character.occupation}
                    </p>
                  </div>

                  {/* 悬停边框 */}
                  <div className="absolute inset-0 rounded-xl border-2 border-transparent group-hover:border-orange-300 transition-colors pointer-events-none" />
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ImmersiveScrollGallery;
