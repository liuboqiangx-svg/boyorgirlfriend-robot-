"use client";

import { useEffect } from "react";
import { initCrisp } from "@/lib/crisp";

/**
 * Crisp Provider 组件
 * 在 layout.tsx 中使用，全局初始化 Crisp SDK
 */
export function CrispProvider() {
  useEffect(() => {
    initCrisp();
  }, []);

  return null;
}
