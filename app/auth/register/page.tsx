"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else {
        // 注册成功，跳转到首页
        router.push("/");
      }
    } catch (err) {
      setError("注册失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center twilight-gradient px-4">
      <div className="w-full max-w-md">
        <div className="twilight-form">
          {/* 标题 */}
          <div className="text-center mb-8">
            <div className="twilight-avatar-lg mx-auto mb-4 text-3xl">💕</div>
            <h1 className="twilight-form-title">💕 创建账号</h1>
            <p className="twilight-form-subtitle">开启你的甜蜜之旅</p>
          </div>

          <form onSubmit={handleSubmit}>
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 text-center">
                {error}
              </div>
            )}

            {/* 名称 */}
            <div className="twilight-form-group">
              <label className="twilight-form-label">
                昵称
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="你的昵称"
                required
                className="twilight-form-input"
              />
            </div>

            {/* 邮箱 */}
            <div className="twilight-form-group">
              <label className="twilight-form-label">
                邮箱
              </label>
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
              <label className="twilight-form-label">
                密码
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="至少6位"
                minLength={6}
                required
                className="twilight-form-input"
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
                  注册中...
                </>
              ) : (
                "注 册"
              )}
            </button>
          </form>

          {/* 登录链接 */}
          <div className="mt-6 text-center">
            <p className="twilight-form-label">
              已有账号？{" "}
              <Link
                href="/"
                className="text-orange-500 hover:text-orange-600 font-semibold"
              >
                立即登录
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
