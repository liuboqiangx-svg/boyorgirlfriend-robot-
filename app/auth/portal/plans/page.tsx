"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { RefreshCw, Plus, X } from "lucide-react";
import { LoadingSpinner, EmptyState, ErrorState } from "@/components/admin/StatusComponents";
import { Modal } from "@/components/admin/Modal";
import { PORTAL_CONFIG } from "@/lib/config/portal";

interface Plan {
  id: string;
  name: string;
  description: string | null;
  price: string;
  durationDays: number;
  features: string[] | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [saving, setSaving] = useState(false);

  // 表单状态
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formDuration, setFormDuration] = useState("");
  const [formFeatures, setFormFeatures] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/portal/plans");
      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else {
        setPlans(data.data);
      }
    } catch (err) {
      setError("获取套餐列表失败");
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingPlan(null);
    setFormName("");
    setFormDescription("");
    setFormPrice("");
    setFormDuration("");
    setFormFeatures("");
    setFormIsActive(true);
    setShowModal(true);
  };

  const openEditModal = (plan: Plan) => {
    setEditingPlan(plan);
    setFormName(plan.name);
    setFormDescription(plan.description || "");
    setFormPrice(plan.price);
    setFormDuration(plan.durationDays.toString());
    setFormFeatures((plan.features || []).join("\n"));
    setFormIsActive(plan.isActive);
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!formName || !formPrice || !formDuration) {
      alert("请填写必填项");
      return;
    }

    setSaving(true);

    const features = formFeatures
      .split("\n")
      .map((f) => f.trim())
      .filter(Boolean);

    try {
      const body = {
        name: formName,
        description: formDescription || undefined,
        price: parseFloat(formPrice),
        durationDays: parseInt(formDuration),
        features,
        isActive: formIsActive,
      };

      const res = await fetch("/api/auth/portal/plans", {
        method: editingPlan ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingPlan ? { id: editingPlan.id, ...body } : body),
      });

      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        setShowModal(false);
        fetchPlans();
      }
    } catch (err) {
      alert("保存失败");
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (isActive: boolean) => {
    return (
      <span
        className={`px-2 py-1 text-xs font-medium rounded-full ${
          isActive
            ? "bg-green-100 text-green-700"
            : "bg-gray-100 text-gray-700"
        }`}
      >
        {isActive ? "启用" : "禁用"}
      </span>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">套餐管理</h2>
        <div className="flex gap-2">
          <button
            onClick={fetchPlans}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <RefreshCw className="w-4 h-4" />
            刷新
          </button>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
          >
            <Plus className="w-4 h-4" />
            添加套餐
          </button>
        </div>
      </div>

      {/* 套餐列表 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <LoadingSpinner />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchPlans} />
        ) : plans.length === 0 ? (
          <EmptyState
            title="暂无套餐"
            description="还没有创建订阅套餐"
            action={
              <button
                onClick={openCreateModal}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
              >
                创建套餐
              </button>
            }
          />
        ) : (
          <div className="divide-y divide-gray-200">
            {plans.map((plan) => (
              <div key={plan.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-medium text-gray-900">
                        {plan.name}
                      </h3>
                      {getStatusBadge(plan.isActive)}
                    </div>
                    {plan.description && (
                      <p className="text-sm text-gray-500 mb-3">
                        {plan.description}
                      </p>
                    )}
                    <div className="flex items-center gap-6 text-sm">
                      <span className="text-gray-600">
                        价格：<span className="font-medium text-gray-900">¥{plan.price}</span>
                      </span>
                      <span className="text-gray-600">
                        有效期：<span className="font-medium text-gray-900">{plan.durationDays} 天</span>
                      </span>
                      <span className="text-gray-600">
                        创建于：{format(new Date(plan.createdAt), "yyyy-MM-dd", { locale: zhCN })}
                      </span>
                    </div>
                    {plan.features && plan.features.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {plan.features.map((feature, i) => (
                          <span
                            key={i}
                            className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded"
                          >
                            {feature}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => openEditModal(plan)}
                    className="ml-4 text-sm text-gray-600 hover:text-gray-900"
                  >
                    编辑
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 创建/编辑弹窗 */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingPlan ? "编辑套餐" : "添加套餐"}
        size="lg"
        footer={
          <>
            <button
              onClick={() => setShowModal(false)}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              取消
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="px-4 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
            >
              {saving ? "保存中..." : "保存"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              套餐名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="如：月卡、季卡、年卡"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              套餐描述
            </label>
            <textarea
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="套餐详细介绍"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                价格（元）<span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formPrice}
                onChange={(e) => setFormPrice(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                有效期（天）<span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formDuration}
                onChange={(e) => setFormDuration(e.target.value)}
                placeholder="30"
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              功能列表
            </label>
            <textarea
              value={formFeatures}
              onChange={(e) => setFormFeatures(e.target.value)}
              placeholder="每行一个功能，如：&#10;无限聊天&#10;解锁全部角色&#10;优先体验新功能"
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
            <p className="text-xs text-gray-500 mt-1">每行代表一个功能点</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formIsActive}
              onChange={(e) => setFormIsActive(e.target.checked)}
              className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900"
            />
            <label htmlFor="isActive" className="text-sm text-gray-700">
              启用此套餐
            </label>
          </div>
        </div>
      </Modal>
    </div>
  );
}
