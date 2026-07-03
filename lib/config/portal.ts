/**
 * 后台管理路径配置
 * 通过环境变量配置，支持部署时自定义路径
 */

// 服务端配置
const getPortalPath = () => {
  // 服务端可以从环境变量读取
  if (typeof process !== 'undefined' && process.env?.AUTH_PORTAL_PATH) {
    return process.env.AUTH_PORTAL_PATH;
  }
  return "auth/portal";
};

const getPortalSlug = () => {
  if (typeof process !== 'undefined' && process.env?.AUTH_PORTAL_SLUG) {
    return process.env.AUTH_PORTAL_SLUG;
  }
  return "portal";
};

// 客户端使用的路径（硬编码默认值，可以通过 NEXT_PUBLIC_ 前缀的环境变量覆盖）
const CLIENT_PORTAL_PATH = "auth/portal";

export const PORTAL_CONFIG = {
  // 基础路径
  basePath: CLIENT_PORTAL_PATH,
  slug: "portal",

  // 完整路径
  home: `/${CLIENT_PORTAL_PATH}`,
  login: `/${CLIENT_PORTAL_PATH}/signin`,

  // API 路径
  apiBase: "/api/auth/portal",
  apiLogin: "/api/auth/portal/login",
  apiLogout: "/api/auth/portal/logout",
  apiMe: "/api/auth/portal/me",
  apiSetup: "/api/auth/portal/setup",
  apiStats: "/api/auth/portal/stats",
  apiUsers: "/api/auth/portal/users",
  apiSubscriptions: "/api/auth/portal/subscriptions",
  apiPlans: "/api/auth/portal/plans",
  apiPayments: "/api/auth/portal/payments",
};

/**
 * 服务端获取配置（供 API 路由使用）
 */
export function getServerPortalConfig() {
  const basePath = getPortalPath();
  return {
    basePath,
    slug: getPortalSlug(),
    home: `/${basePath}`,
    login: `/${basePath}/signin`,
    apiBase: "/api/auth/portal",
    apiLogin: "/api/auth/portal/signin",
    apiLogout: "/api/auth/portal/logout",
    apiMe: "/api/auth/portal/me",
    apiSetup: "/api/auth/portal/setup",
    apiStats: "/api/auth/portal/stats",
    apiUsers: "/api/auth/portal/users",
    apiSubscriptions: "/api/auth/portal/subscriptions",
    apiPlans: "/api/auth/portal/plans",
    apiPayments: "/api/auth/portal/payments",
  };
}

/**
 * 判断当前路径是否是登录页
 */
export function isLoginPage(pathname: string): boolean {
  return pathname === PORTAL_CONFIG.login;
}

/**
 * 判断当前路径是否是后台路径
 */
export function isPortalPath(pathname: string): boolean {
  return pathname.startsWith(`/${PORTAL_CONFIG.basePath}`);
}
