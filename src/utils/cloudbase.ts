import cloudbase from "@cloudbase/js-sdk";

// 云开发环境ID
export const ENV_ID = import.meta.env.VITE_ENV_ID || "ai-native-d5gv1bzqle900971e";

// 检查环境ID是否已配置
export const isValidEnvId = ENV_ID && ENV_ID !== "your-env-id";

// 客户端 Publishable Key
const PUBLISHABLE_KEY =
  import.meta.env.VITE_PUBLISHABLE_KEY ||
  "eyJhbGciOiJSUzI1NiIsImtpZCI6IjlkMWRjMzFlLWI0ZDAtNDQ4Yi1hNzZmLWIwY2M2M2Q4MTQ5OCJ9.eyJpc3MiOiJodHRwczovL2FpLW5hdGl2ZS1kNWd2MWJ6cWxlOTAwOTcxZS5hcC1zaGFuZ2hhaS50Y2ItYXBpLnRlbmNlbnRjbG91ZGFwaS5jb20iLCJzdWIiOiJhbm9uIiwiYXVkIjoiYWktbmF0aXZlLWQ1Z3YxYnpxbGU5MDA5NzFlIiwiZXhwIjo0MDg0NTc3NTE1LCJpYXQiOjE3ODA4OTQzMTUsIm5vbmNlIjoiTW1Nam1XYXpTTmVhVktPZnNHdGtpUSIsImF0X2hhc2giOiJNbU1qbVdhelNOZWFWS09mc0d0a2lRIiwibmFtZSI6IkFub255bW91cyIsInNjb3BlIjoiYW5vbnltb3VzIiwicHJvamVjdF9pZCI6ImFpLW5hdGl2ZS1kNWd2MWJ6cWxlOTAwOTcxZSIsIm1ldGEiOnsicGxhdGZvcm0iOiJQdWJsaXNoYWJsZUtleSJ9LCJ1c2VyX3R5cGUiOiIiLCJjbGllbnRfdHlwZSI6ImNsaWVudF91c2VyIiwiaXNfc3lzdGVtX2FkbWluIjpmYWxzZX0.bfjL7yVwDfFUj9Ugnc_jF0o5Y5chweRvpRICtR8_NTPS90ndr4GlwvivlhGx47ABPA-L-p7AEJj05NZrBfOLxMhFguV5pafCgJtPsp7bL8KSpaC0I5MI0zzRMXMNiGUzTgBbIEZsnJQ9jZ4rH3izTOUixbSl4KimMs0l9WWyyfhYmlsZW0G9y-JfQ-KI_cQ32HqeHRNK9w3Att361Avxw0EJKvR75ka1jYFxSkSNFGr5gqVJsnhUmAknrdQQT6UpgMRFEx_55knEzOp6llHf6dD_llpqo2AE3XN-6XdHocPPVP2mQgcAFzL81Ps0qBLS9BOOffNuAH276Y_VQBUDug";

/**
 * 初始化云开发实例
 */
export const init = (config: { env?: string; timeout?: number; accessKey?: string } = {}) => {
  const appConfig = {
    env: config.env || ENV_ID,
    timeout: config.timeout || 15000,
    accessKey: config.accessKey || PUBLISHABLE_KEY,
    auth: { detectSessionInUrl: true },
  };

  if (!appConfig.accessKey) {
    console.warn("客户端 Publishable Key 未配置");
  }

  return cloudbase.init(appConfig);
};

/**
 * 默认的云开发实例
 */
export const app = init();

/**
 * 获取 auth 实例（使用 persistence: 'local' 保持登录态）
 */
export const auth = app.auth({ persistence: "local" });

/**
 * 检查环境配置是否有效
 */
export const checkEnvironment = () => {
  if (!isValidEnvId) {
    console.error(
      "❌ 云开发环境ID未配置\n\n请按以下步骤配置：\n" +
        "1. 创建 .env.local 文件\n" +
        "2. 设置 VITE_ENV_ID=your-env-id 和 VITE_PUBLISHABLE_KEY=your-key\n" +
        "3. 重启开发服务器\n\n" +
        "获取环境ID：https://console.cloud.tencent.com/tcb"
    );
    return false;
  }
  return true;
};

/**
 * 检查用户登录态（使用 getSession API）
 */
export const checkLogin = async () => {
  if (!checkEnvironment()) {
    throw new Error("环境ID未配置");
  }

  const { data, error } = await auth.getSession();

  if (error) {
    console.warn("获取会话失败:", error.message);
    return { isLoggedIn: false, session: null, user: null };
  }

  if (data.session && !data.session.user?.is_anonymous) {
    return { isLoggedIn: true, session: data.session, user: data.session.user };
  }

  return { isLoggedIn: false, session: null, user: null };
};

/**
 * 获取当前用户信息
 */
export const getCurrentUser = async () => {
  const { data, error } = await auth.getUser();
  if (error) return null;
  return data.user;
};

/**
 * 手机号短信验证码登录
 */
export const phoneLogin = async (phone: string) => {
  const { data, error } = await auth.signInWithOtp({ phone });
  if (error) throw error;
  return data;
};

/**
 * 验证短信验证码（完成手机号登录）
 */
export const verifyPhoneOtp = async (verifyFn: (params: { token: string }) => Promise<unknown>, token: string) => {
  const result = await verifyFn({ token });
  return result;
};

/**
 * 用户名密码登录
 */
export const passwordLogin = async (username: string, password: string) => {
  const { data, error } = await auth.signInWithPassword({ username, password });
  if (error) throw error;
  return data;
};

/**
 * 用户名密码注册
 */
export const usernameRegister = async (username: string, password: string, nickname?: string) => {
  const { data, error } = await auth.signUp({
    username,
    password,
    nickname: nickname || username,
  });
  if (error) throw error;
  return data;
};

/**
 * 手机号注册（发送验证码）
 */
export const phoneRegister = async (phone: string, password?: string) => {
  const { data, error } = await auth.signUp({
    phone,
    password: password || undefined,
  });
  if (error) throw error;
  return data;
};

/**
 * 退出登录
 */
export const logout = async () => {
  const { error } = await auth.signOut();
  if (error) {
    console.error("退出登录失败:", error.message);
    throw error;
  }
  return { success: true, message: "已成功退出登录" };
};

/**
 * 监听登录状态变化
 */
export const onAuthChange = (callback: (event: string, session: unknown) => void) => {
  return auth.onAuthStateChange((event: string, session: unknown) => {
    callback(event, session);
  });
};

// ── 数据存储辅助（本地 + 云端同步）──

const STORAGE_KEY = "qingyin_data";

export function getLocalData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { journeys: [], checkins: [], footprintTracks: [], profile: { name: "旅行者", bio: "探索世界，记录美好", avatar: "" }, trash: [], carouselIndex: {} };
  try {
    return JSON.parse(raw);
  } catch {
    return { journeys: [], checkins: [], footprintTracks: [], profile: { name: "旅行者", bio: "探索世界，记录美好", avatar: "" }, trash: [], carouselIndex: {} };
  }
}

export function saveLocalData(data: Record<string, unknown>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export default {
  init, app, auth, checkLogin, logout, checkEnvironment, isValidEnvId,
  phoneLogin, verifyPhoneOtp, passwordLogin, usernameRegister, phoneRegister,
  onAuthChange, getCurrentUser, getLocalData, saveLocalData,
};
