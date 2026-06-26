"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Loader2, Crown, CreditCard, LogOut, User, Check } from "lucide-react";

interface User {
  id: string;
  email: string;
  name: string;
}

interface Subscription {
  id: string;
  planId: string;
  planName: string;
  planPrice: string;
  planDuration: number;
  status: string;
  startDate: string | null;
  endDate: string | null;
  autoRenew: boolean;
  isActive: boolean;
}

interface Plan {
  id: string;
  name: string;
  description: string | null;
  price: string;
  durationDays: number;
  features: string[] | null;
}

export default function MemberPage() {
  const [user, setUser] = useState<User | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [plansLoading, setPlansLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 获取当前用户
      const meRes = await fetch("/api/auth/me");
      const meData = await meRes.json();

      if (!meData.user) {
        // 未登录，跳转到登录
        window.location.href = "/auth/login";
        return;
      }

      setUser(meData.user);

      // 获取订阅信息
      const subRes = await fetch("/api/user/subscription");
      const subData = await subRes.json();
      setSubscription(subData.subscription || null);

      // 获取套餐列表
      const plansRes = await fetch("/api/plans");
      const plansData = await plansRes.json();
      setPlans(plansData.plans || []);
    } catch (error) {
      console.error("Fetch data error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  };

  const handleSelectPlan = async (plan: Plan) => {
    if (!user) return;

    setPlansLoading(true);
    // TODO: 这里应该跳转到支付流程
    alert(`你选择了 ${plan.name}（¥${plan.price}），支付功能暂未开放`);
    setPlansLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900">会员中心</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">{user.name}</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
            >
              <LogOut className="w-4 h-4" />
              退出
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* 当前订阅状态 */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">我的订阅</h2>
          {subscription ? (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
                  <Crown className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{subscription.planName}</h3>
                  <p className="text-sm text-gray-500">
                    {subscription.planDuration} 天会员
                  </p>
                </div>
                <div className="ml-auto">
                  <span
                    className={`px-3 py-1 text-sm font-medium rounded-full ${
                      subscription.isActive
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {subscription.isActive ? "有效" : "已过期"}
                  </span>
                </div>
              </div>

              {subscription.isActive && subscription.endDate && (
                <div className="text-sm text-gray-500">
                  到期时间：{format(new Date(subscription.endDate), "yyyy-MM-dd HH:mm", { locale: zhCN })}
                </div>
              )}

              {subscription.autoRenew && (
                <div className="mt-2 text-sm text-gray-500 flex items-center gap-1">
                  <Check className="w-4 h-4 text-green-500" />
                  已开启自动续费
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <CreditCard className="w-6 h-6 text-gray-400" />
              </div>
              <h3 className="font-medium text-gray-900 mb-1">暂无订阅</h3>
              <p className="text-sm text-gray-500">选择一个套餐，开启会员之旅</p>
            </div>
          )}
        </section>

        {/* 套餐选择 */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">选择套餐</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`bg-white rounded-xl border ${
                  subscription?.planId === plan.id
                    ? "border-pink-500 ring-2 ring-pink-100"
                    : "border-gray-200"
                } p-6`}
              >
                <h3 className="font-semibold text-gray-900 mb-2">{plan.name}</h3>
                <div className="mb-4">
                  <span className="text-3xl font-bold text-gray-900">¥{plan.price}</span>
                  <span className="text-sm text-gray-500">/{plan.durationDays}天</span>
                </div>
                {plan.description && (
                  <p className="text-sm text-gray-500 mb-4">{plan.description}</p>
                )}
                {plan.features && plan.features.length > 0 && (
                  <ul className="space-y-2 mb-6">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                        <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                )}
                <button
                  onClick={() => handleSelectPlan(plan)}
                  disabled={plansLoading}
                  className={`w-full py-2 rounded-lg font-medium transition-colors ${
                    subscription?.planId === plan.id
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-pink-500 text-white hover:bg-pink-600 disabled:opacity-50"
                  }`}
                >
                  {subscription?.planId === plan.id ? "当前套餐" : "选择"}
                </button>
              </div>
            ))}
          </div>

          {plans.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              暂无可用套餐
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
