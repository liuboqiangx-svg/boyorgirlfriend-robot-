"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Trophy } from "lucide-react";
import { Turnstile } from '@marsidev/react-turnstile';

export default function HomePage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true); // 检查登录状态
  const [error, setError] = useState("");

  // 检查登录状态
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (data.user) {
        // 已登录，跳转到角色选择页
        router.push("/characters");
      } else {
        setChecking(false);
      }
    } catch {
      setChecking(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // 检查是否完成人机验证
    if (!turnstileToken) {
      setError("请完成人机验证");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, turnstileToken }),
      });

      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else {
        // 登录成功，跳转到角色选择页
        router.push("/characters");
      }
    } catch {
      setError("登录失败，请稍后重试");
    } finally {
      setLoading(false);
    }
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
    <div className="min-h-screen flex items-center justify-center twilight-gradient px-4">
      <div className="w-full max-w-md">
        <div className="twilight-form">
          {/* 标题 */}
          <div className="text-center mb-8">
            <div className="twilight-avatar-lg mx-auto mb-4 text-3xl">🌅</div>
            <h1 className="twilight-form-title">🌅 欢迎回来</h1>
            <p className="twilight-form-subtitle">登录开始和TA聊天吧</p>
          </div>

          <form onSubmit={handleSubmit}>
            {/* 排行榜入口 */}
            <Link
              href="/leaderboard"
              className="flex items-center justify-center gap-2 mb-4 px-4 py-3 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg border border-amber-200 transition-colors"
            >
              <Trophy className="w-5 h-5 text-amber-500" />
              <span className="font-medium">查看排行榜</span>
            </Link>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 text-center">
                {error}
              </div>
            )}

            {/* 邮箱 */}
            <div className="twilight-form-group">
              <label className="twilight-form-label">邮箱</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="twilight-form-input"
              />
            </div>

            {/* 密码 */}
            <div className="twilight-form-group">
              <label className="twilight-form-label">密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="twilight-form-input"
              />
            </div>

            {/* Turnstile 人机验证 */}
            <div className="mb-4">
              <Turnstile
                siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ""}
                onSuccess={(token) => setTurnstileToken(token)}
              />
            </div>

            {/* 提交按钮 */}
            <button
              type="submit"
              disabled={loading}
              className="twilight-form-btn flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  登录中...
                </>
              ) : (
                "登 录"
              )}
            </button>
          </form>

          {/* 注册链接 */}
          <div className="mt-6 text-center">
            <p className="twilight-form-label">
              还没有账号？{" "}
              <Link
                href="/auth/register"
                className="text-orange-500 hover:text-orange-600 font-semibold"
              >
                立即注册
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
