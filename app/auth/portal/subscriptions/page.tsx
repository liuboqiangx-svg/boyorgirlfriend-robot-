"use client";

import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { RefreshCw } from "lucide-react";
import { LoadingSpinner, EmptyState, ErrorState } from "@/components/admin/StatusComponents";
import { Pagination } from "@/components/admin/Pagination";
import { Modal } from "@/components/admin/Modal";
import { PORTAL_CONFIG } from "@/lib/config/portal";

interface Subscription {
  id: string;
  userId: string;
  planId: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  autoRenew: boolean;
  createdAt: string;
  userName: string | null;
  userEmail: string | null;
  planName: string | null;
}

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [editingSub, setEditingSub] = useState<Subscription | null>(null);
  const [editStatus, setEditStatus] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchSubscriptions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: "20",
      });
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/auth/portal/subscriptions?${params}`);
      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else {
        setSubscriptions(data.data);
        setTotalPages(data.totalPages);
      }
    } catch (err) {
      setError("获取订阅列表失败");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  const openEditModal = (sub: Subscription) => {
    setEditingSub(sub);
    setEditStatus(sub.status);
  };

  const handleSaveStatus = async () => {
    if (!editingSub) return;
    setSaving(true);

    try {
      const res = await fetch("/api/auth/portal/subscriptions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingSub.id, status: editStatus }),
      });

      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        setEditingSub(null);
        fetchSubscriptions();
      }
    } catch (err) {
      alert("更新失败");
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: "bg-green-100 text-green-700",
      expired: "bg-gray-100 text-gray-700",
      cancelled: "bg-red-100 text-red-700",
      pending: "bg-yellow-100 text-yellow-700",
    };
    const labels: Record<string, string> = {
      active: "有效",
      expired: "已过期",
      cancelled: "已取消",
      pending: "待支付",
    };
    return (
      <span
        className={`px-2 py-1 text-xs font-medium rounded-full ${
          styles[status] || "bg-gray-100 text-gray-700"
        }`}
      >
        {labels[status] || status}
      </span>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">订阅管理</h2>
        <button
          onClick={fetchSubscriptions}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
        >
          <RefreshCw className="w-4 h-4" />
          刷新
        </button>
      </div>

      {/* 筛选 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
        >
          <option value="">全部状态</option>
          <option value="active">有效</option>
          <option value="expired">已过期</option>
          <option value="cancelled">已取消</option>
          <option value="pending">待支付</option>
        </select>
      </div>

      {/* 表格 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <LoadingSpinner />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchSubscriptions} />
        ) : subscriptions.length === 0 ? (
          <EmptyState title="暂无订阅" description="还没有用户订阅" />
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  用户
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  套餐
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  状态
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  到期时间
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  自动续费
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  订阅时间
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {subscriptions.map((sub) => (
                <tr key={sub.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900">
                        {sub.userName || "-"}
                      </p>
                      <p className="text-sm text-gray-500">{sub.userEmail || "-"}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {sub.planName || "-"}
                  </td>
                  <td className="px-6 py-4">{getStatusBadge(sub.status)}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {sub.endDate
                      ? format(new Date(sub.endDate), "yyyy-MM-dd", { locale: zhCN })
                      : "-"}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`text-sm ${
                        sub.autoRenew ? "text-green-600" : "text-gray-400"
                      }`}
                    >
                      {sub.autoRenew ? "是" : "否"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {format(new Date(sub.createdAt), "yyyy-MM-dd", { locale: zhCN })}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => openEditModal(sub)}
                      className="text-sm text-gray-600 hover:text-gray-900"
                    >
                      编辑
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 分页 */}
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />

      {/* 编辑弹窗 */}
      <Modal
        isOpen={!!editingSub}
        onClose={() => setEditingSub(null)}
        title="编辑订阅"
        footer={
          <>
            <button
              onClick={() => setEditingSub(null)}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              取消
            </button>
            <button
              onClick={handleSaveStatus}
              disabled={saving}
              className="px-4 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
            >
              {saving ? "保存中..." : "保存"}
            </button>
          </>
        }
      >
        {editingSub && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                用户
              </label>
              <input
                type="text"
                value={editingSub.userName || "-"}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                套餐
              </label>
              <input
                type="text"
                value={editingSub.planName || "-"}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                状态
              </label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                <option value="active">有效</option>
                <option value="expired">已过期</option>
                <option value="cancelled">已取消</option>
                <option value="pending">待支付</option>
              </select>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
