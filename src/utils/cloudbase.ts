import cloudbase from "@cloudbase/js-sdk";

export const ENV_ID = import.meta.env.VITE_ENV_ID || "ai-native-d5gv1bzqle900971e";
export const isValidEnvId = ENV_ID && ENV_ID !== "your-env-id";

const PUBLISHABLE_KEY = import.meta.env.VITE_PUBLISHABLE_KEY || "eyJhbGciOiJSUzI1NiIsImtpZCI6IjlkMWRjMzFlLWI0ZDAtNDQ4Yi1hNzZmLWIwY2M2M2Q4MTQ5OCJ9.eyJpc3MiOiJodHRwczovL2FpLW5hdGl2ZS1kNWd2MWJ6cWxlOTAwOTcxZS5hcC1zaGFuZ2hhaS50Y2ItYXBpLnRlbmNlbnRjbG91ZGFwaS5jb20iLCJzdWIiOiJhbm9uIiwiYXVkIjoiYWktbmF0aXZlLWQ1Z3YxYnpxbGU5MDA5NzFlIiwiZXhwIjo0MDg0NTc3NTE1LCJpYXQiOjE3ODA4OTQzMTUsIm5vbmNlIjoiTW1Nam1XYXpTTmVhVktPZnNHdGtpUSIsImF0X2hhc2giOiJNbU1qbVdhelNOZWFWS09mc0d0a2lRIiwibmFtZSI6IkFub255bW91cyIsInNjb3BlIjoiYW5vbnltb3VzIiwicHJvamVjdF9pZCI6ImFpLW5hdGl2ZS1kNWd2MWJ6cWxlOTAwOTcxZSIsIm1ldGEiOnsicGxhdGZvcm0iOiJQdWJsaXNoYWJsZUtleSJ9LCJ1c2VyX3R5cGUiOiIiLCJjbGllbnRfdHlwZSI6ImNsaWVudF91c2VyIiwiaXNfc3lzdGVtX2FkbWluIjpmYWxzZX0.bfjL7yVwDfFUj9Ugnc_jF0o5Y5chweRvpRICtR8_NTPS90ndr4GlwvivlhGx47ABPA-L-p7AEJj05NZrBfOLxMhFguV5pafCgJtPsp7bL8KSpaC0I5MI0zzRMXMNiGUzTgBbIEZsnJQ9jZ4rH3izTOUixbSl4KimMs0l9WWyyfhYmlsZW0G9y-JfQ-KI_cQ32HqeHRNK9w3Att361Avxw0EJKvR75ka1jYFxSkSNFGr5gqVJsnhUmAknrdQQT6UpgMRFEx_55knEzOp6llHf6dD_llpqo2AE3XN-6XdHocPPVP2mQgcAFzL81Ps0qBLS9BOOffNuAH276Y_VQBUDug";

export const init = (config = {}) => {
  const appConfig = { env: config.env || ENV_ID, timeout: config.timeout || 15000, accessKey: config.accessKey || PUBLISHABLE_KEY, auth: { detectSessionInUrl: true } };
  return cloudbase.init(appConfig);
};

export const app = init();
export const auth = app.auth({ persistence: "local" });

export const checkEnvironment = () => { if (!isValidEnvId) { console.error("云开发环境ID未配置"); return false; } return true; };

export const checkLogin = async () => {
  if (!checkEnvironment()) throw new Error("环境ID未配置");
  const { data, error } = await auth.getSession();
  if (error) return { isLoggedIn: false, session: null, user: null };
  if (data.session && !data.session.user?.is_anonymous) return { isLoggedIn: true, session: data.session, user: data.session.user };
  return { isLoggedIn: false, session: null, user: null };
};

export const getCurrentUser = async () => { const { data } = await auth.getUser(); return data?.user || null; };
export const phoneLogin = async (phone) => { const { data, error } = await auth.signInWithOtp({ phone }); if (error) throw error; return data; };
export const passwordLogin = async (username, password) => { const { data, error } = await auth.signInWithPassword({ username, password }); if (error) throw error; return data; };
export const usernameRegister = async (username, password, nickname) => { const { data, error } = await auth.signUp({ username, password, nickname: nickname || username }); if (error) throw error; return data; };
export const phoneRegister = async (phone, password) => { const { data, error } = await auth.signUp({ phone, password: password || undefined }); if (error) throw error; return data; };

export const logout = async () => { const { error } = await auth.signOut(); if (error) throw error; return { success: true, message: "已成功退出登录" }; };

export const onAuthChange = (callback) => { return auth.onAuthStateChange((event, session) => { callback(event, session); }); };

const STORAGE_KEY = "qingyin_data";

export function getLocalData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { journeys: [], checkins: [], footprintTracks: [], profile: { name: "旅行者", bio: "探索世界，记录美好", avatar: "" }, trash: [], carouselIndex: {} };
  try { return JSON.parse(raw); } catch { return { journeys: [], checkins: [], footprintTracks: [], profile: { name: "旅行者", bio: "探索世界，记录美好", avatar: "" }, trash: [], carouselIndex: {} }; }
}

export function saveLocalData(data) { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }

export default { init, app, auth, checkLogin, logout, checkEnvironment, isValidEnvId, phoneLogin, passwordLogin, usernameRegister, phoneRegister, onAuthChange, getCurrentUser, getLocalData, saveLocalData };