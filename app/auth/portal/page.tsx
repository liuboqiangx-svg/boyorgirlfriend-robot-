"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  CreditCard,
  DollarSign,
  MessageSquare,
} from "lucide-react";
import { LoadingSpinner, ErrorState } from "@/components/admin/StatusComponents";
import { PORTAL_CONFIG } from "@/lib/config/portal";

interface Stats {
  users: { total: number; today: number };
  subscriptions: { total: number; active: number };
  payments: { total: number; completed: number; revenue: number };
  messages: { total: number };
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(PORTAL_CONFIG.apiStats);
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setStats(data);
      }
    } catch (err) {
      setError("获取统计数据失败");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorState message={error} onRetry={fetchStats} />;
  if (!stats) return null;

  const statCards = [
    {
      title: "用户总数",
      value: stats.users.total,
      subtitle: `今日新增 ${stats.users.today}`,
      icon: Users,
      color: "bg-blue-500",
    },
    {
      title: "活跃订阅",
      value: stats.subscriptions.active,
      subtitle: `共 ${stats.subscriptions.total} 个订阅`,
      icon: CreditCard,
      color: "bg-green-500",
    },
    {
      title: "总收入",
      value: `¥${stats.payments.revenue.toFixed(2)}`,
      subtitle: `${stats.payments.completed} 笔成交`,
      icon: DollarSign,
      color: "bg-yellow-500",
    },
    {
      title: "消息总数",
      value: stats.messages.total,
      subtitle: "用户与角色互动",
      icon: MessageSquare,
      color: "bg-purple-500",
    },
  ];

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-6">数据概览</h2>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="bg-white rounded-xl border border-gray-200 p-6"
            >
              <div className="flex items-center gap-4">
                <div className={`${card.color} p-3 rounded-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">{card.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-3">{card.subtitle}</p>
            </div>
          );
        })}
      </div>

      {/* 快捷入口 */}
      <h3 className="text-lg font-medium text-gray-900 mb-4">快捷操作</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <QuickAction
          title="用户管理"
          description="查看和管理所有用户账户"
          href={`${PORTAL_CONFIG.home}/users`}
        />
        <QuickAction
          title="订阅管理"
          description="查看和管理用户订阅"
          href={`${PORTAL_CONFIG.home}/subscriptions`}
        />
        <QuickAction
          title="套餐管理"
          description="配置订阅套餐"
          href={`${PORTAL_CONFIG.home}/plans`}
        />
      </div>
    </div>
  );
}

function QuickAction({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="bg-white rounded-xl border border-gray-200 p-6 hover:border-gray-300 transition-colors"
    >
      <h4 className="font-medium text-gray-900 mb-1">{title}</h4>
      <p className="text-sm text-gray-500">{description}</p>
    </Link>
  );
}
