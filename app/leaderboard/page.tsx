"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Trophy, Medal, Crown, ArrowLeft, User, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

interface LeaderboardItem {
  rank: number;
  userId: string;
  userName: string;
  highestIntimacy: number;
  achievedAt: string | null;
  isCurrentUser: boolean;
}

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch("/api/leaderboard");
      const data = await res.json();
      if (data.leaderboard) {
        setLeaderboard(data.leaderboard);
      }
    } catch (error) {
      console.error("获取排行榜失败:", error);
    } finally {
      setLoading(false);
    }
  };

  // 获取排名图标
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Medal className="w-5 h-5 text-amber-600" />;
      default:
        return <span className="w-5 text-center font-semibold text-gray-500">{rank}</span>;
    }
  };

  // 获取排名背景色
  const getRankBgClass = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-gradient-to-r from-yellow-100 to-amber-50 border-yellow-300";
      case 2:
        return "bg-gradient-to-r from-gray-50 to-slate-50 border-gray-300";
      case 3:
        return "bg-gradient-to-r from-amber-50 to-orange-50 border-amber-300";
      default:
        return "bg-white/60 border-gray-200";
    }
  };

  return (
    <div className="min-h-screen twilight-gradient">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-10 twilight-header-glass px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <Link
            href="/characters"
            className="flex items-center gap-2 text-amber-700 hover:text-orange-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">返回</span>
          </Link>
          <h1 className="flex-1 text-center text-lg font-semibold twilight-card-name flex items-center justify-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            好感度排行榜
          </h1>
          <div className="w-16" />
        </div>
      </header>

      {/* 排行榜内容 */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-8 h-8 border-4 border-amber-200 border-t-amber-500 rounded-full" />
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="text-center py-20">
            <Trophy className="w-16 h-16 mx-auto mb-4 text-amber-300" />
            <p className="text-lg text-amber-700 mb-2">暂无排行榜数据</p>
            <p className="text-sm text-amber-600">
              快去和TA聊天，创造你的最高好感度吧！
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* 排行榜说明 */}
            <div className="text-center mb-6">
              <p className="text-sm text-amber-600">
                <Sparkles className="w-4 h-4 inline-block mr-1" />
                亲密度达到 30 即可上榜，加油！
              </p>
            </div>

            {/* 排行榜列表 */}
            {leaderboard.map((item) => (
              <div
                key={item.userId}
                className={`
                  relative rounded-xl border p-4 transition-all
                  ${getRankBgClass(item.rank)}
                  ${item.isCurrentUser ? "ring-2 ring-orange-400 ring-offset-2" : ""}
                `}
              >
                {/* 当前用户标识 */}
                {item.isCurrentUser && (
                  <div className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">
                    你
                  </div>
                )}

                <div className="flex items-center gap-4">
                  {/* 排名 */}
                  <div className="w-10 flex items-center justify-center">
                    {getRankIcon(item.rank)}
                  </div>

                  {/* 用户信息 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-amber-500" />
                      <span className="font-medium text-gray-800 truncate twilight-card-name">
                        {item.userName}
                      </span>
                      {item.isCurrentUser && (
                        <span className="text-xs text-orange-500">(你)</span>
                      )}
                    </div>
                    {item.achievedAt && (
                      <p className="text-xs text-amber-600 mt-1">
                        达成时间：{format(new Date(item.achievedAt), "yyyy-MM-dd HH:mm", { locale: zhCN })}
                      </p>
                    )}
                  </div>

                  {/* 亲密度 */}
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      <span className="text-xl font-bold text-orange-500">
                        {item.highestIntimacy}
                      </span>
                      <span className="text-sm text-amber-600">❤️</span>
                    </div>
                    <p className="text-xs text-amber-500">好感度</p>
                  </div>
                </div>

                {/* 前三名特殊效果 */}
                {item.rank <= 3 && (
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-50" />
                )}
              </div>
            ))}
          </div>
        )}

        {/* 底部提示 */}
        <div className="mt-8 text-center">
          <p className="text-xs text-amber-500">
            排行榜每日前更新，展示历史最高好感度
          </p>
        </div>
      </main>
    </div>
  );
}
