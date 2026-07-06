/**
 * Crisp 客服 SDK 封装
 * 提供用户身份识别和基础配置功能
 */

import { Crisp } from "crisp-sdk-web";

// 用户信息类型
interface CrispUser {
  id: string;
  email?: string;
  nickname?: string;
  avatar?: string;
}

/**
 * 初始化 Crisp SDK
 * 在 layout.tsx 中调用一次即可
 */
export const initCrisp = () => {
  const websiteId = process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID;

  if (!websiteId) {
    console.warn("[Crisp] NEXT_PUBLIC_CRISP_WEBSITE_ID 未配置");
    return;
  }

  try {
    Crisp.configure(websiteId);
    console.log("[Crisp] SDK 初始化成功");
  } catch (error) {
    console.error("[Crisp] SDK 初始化失败:", error);
  }
};

/**
 * 识别用户（登录后调用）
 * 将用户信息同步到 Crisp，客服可以看到正在和谁聊天
 */
export const identifyUser = (user: CrispUser) => {
  try {
    // 设置用户数据，客服可在后台看到
    Crisp.session.setData({
      user_id: user.id,
      user_email: user.email || "",
      user_nickname: user.nickname || "",
    });
    console.log("[Crisp] 用户身份已同步:", user);
  } catch (error) {
    console.error("[Crisp] 用户身份同步失败:", error);
  }
};

/**
 * 重置用户（退出登录时调用）
 */
export const resetCrispUser = () => {
  try {
    Crisp.session.reset();
    console.log("[Crisp] 用户已退出");
  } catch (error) {
    console.error("[Crisp] 重置用户失败:", error);
  }
};

/**
 * 打开 Crisp 聊天窗口
 */
export const openCrispChat = () => {
  try {
    Crisp.chat.open();
  } catch (error) {
    console.error("[Crisp] 打开聊天窗口失败:", error);
  }
};
