"use client";

import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { RefreshCw } from "lucide-react";
import { LoadingSpinner, EmptyState, ErrorState } from "@/components/admin/StatusComponents";
import { Pagination } from "@/components/admin/Pagination";
import { Modal } from "@/components/admin/Modal";
import { PORTAL_CONFIG } from "@/lib/config/portal";

interface Payment {
  id: string;
  userId: string;
  subscriptionId: string | null;
  orderNo: string | null;
  amount: string;
  currency: string;
  paymentMethod: string | null;
  status: string;
  paymentTime: string | null;
  createdAt: string;
  userName: string | null;
  userEmail: string | null;
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [editStatus, setEditStatus] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: "20",
      });
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/auth/portal/payments?${params}`);
      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else {
        setPayments(data.data);
        setTotalPages(data.totalPages);
      }
    } catch (err) {
      setError("获取订单列表失败");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const openEditModal = (payment: Payment) => {
    setEditingPayment(payment);
    setEditStatus(payment.status);
  };

  const handleSaveStatus = async () => {
    if (!editingPayment) return;
    setSaving(true);

    try {
      const res = await fetch("/api/auth/portal/payments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingPayment.id, status: editStatus }),
      });

      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        setEditingPayment(null);
        fetchPayments();
      }
    } catch (err) {
      alert("更新失败");
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-700",
      completed: "bg-green-100 text-green-700",
      failed: "bg-red-100 text-red-700",
      refunded: "bg-gray-100 text-gray-700",
    };
    const labels: Record<string, string> = {
      pending: "待支付",
      completed: "已完成",
      failed: "失败",
      refunded: "已退款",
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

  const formatAmount = (amount: string, currency: string) => {
    const num = parseFloat(amount);
    if (isNaN(num)) return amount;
    return currency === "CNY" ? `¥${num.toFixed(2)}` : `$${num.toFixed(2)}`;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">订单管理</h2>
        <button
          onClick={fetchPayments}
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
          <option value="pending">待支付</option>
          <option value="completed">已完成</option>
          <option value="failed">失败</option>
          <option value="refunded">已退款</option>
        </select>
      </div>

      {/* 表格 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <LoadingSpinner />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchPayments} />
        ) : payments.length === 0 ? (
          <EmptyState title="暂无订单" description="还没有订单记录" />
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  订单号
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  用户
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  金额
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  支付方式
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  状态
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  下单时间
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  支付时间
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <span className="text-sm font-mono text-gray-900">
                      {payment.orderNo || payment.id.slice(0, 8)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900">
                        {payment.userName || "-"}
                      </p>
                      <p className="text-sm text-gray-500">{payment.userEmail || "-"}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-medium text-gray-900">
                      {formatAmount(payment.amount, payment.currency)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {payment.paymentMethod || "-"}
                  </td>
                  <td className="px-6 py-4">{getStatusBadge(payment.status)}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {format(new Date(payment.createdAt), "yyyy-MM-dd HH:mm", {
                      locale: zhCN,
                    })}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {payment.paymentTime
                      ? format(new Date(payment.paymentTime), "yyyy-MM-dd HH:mm", {
                          locale: zhCN,
                        })
                      : "-"}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => openEditModal(payment)}
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
        isOpen={!!editingPayment}
        onClose={() => setEditingPayment(null)}
        title="编辑订单"
        footer={
          <>
            <button
              onClick={() => setEditingPayment(null)}
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
        {editingPayment && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                订单号
              </label>
              <input
                type="text"
                value={editingPayment.orderNo || editingPayment.id.slice(0, 8)}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                用户
              </label>
              <input
                type="text"
                value={`${editingPayment.userName || "-"} (${editingPayment.userEmail || "-"})`}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                金额
              </label>
              <input
                type="text"
                value={formatAmount(editingPayment.amount, editingPayment.currency)}
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
                <option value="pending">待支付</option>
                <option value="completed">已完成</option>
                <option value="failed">失败</option>
                <option value="refunded">已退款</option>
              </select>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
