import { createApp } from "vue";
import { createRouter, createWebHashHistory } from "vue-router";
import App from "./App.vue";

// 导入页面组件
import JournalPage from "./pages/JournalPage.vue";
import CheckinPage from "./pages/CheckinPage.vue";
import SharePage from "./pages/SharePage.vue";
import ProfilePage from "./pages/ProfilePage.vue";
import JourneyDetailPage from "./pages/JourneyDetailPage.vue";
import FootprintReportPage from "./pages/FootprintReportPage.vue";
import LoginPage from "./pages/LoginPage.vue";
import SettingsPage from "./pages/SettingsPage.vue";

// 后台管理页面
import AdminLayoutPage from "./pages/admin/AdminLayoutPage.vue";
import AdminDashboardPage from "./pages/admin/AdminDashboardPage.vue";
import AdminFeedbackPage from "./pages/admin/AdminFeedbackPage.vue";
import AdminUsersPage from "./pages/admin/AdminUsersPage.vue";
import AdminAnalyticsView from "./pages/admin/AdminAnalyticsView.vue";

// 定义路由
const routes = [
  { path: "/", redirect: "/journal" },
  { path: "/login", component: LoginPage, meta: { noAuth: true } },
  { path: "/journal", component: JournalPage },
  { path: "/checkin", component: CheckinPage },
  { path: "/share", component: SharePage },
  { path: "/profile", component: ProfilePage },
  { path: "/settings", component: SettingsPage },
  { path: "/footprint-report", component: FootprintReportPage },
  { path: "/journey/:id", component: JourneyDetailPage },

  // 后台管理系统
  {
    path: "/admin",
    component: AdminLayoutPage,
    meta: { noAuth: true },
    children: [
      { path: "", component: AdminDashboardPage },
      { path: "feedback", component: AdminFeedbackPage },
      { path: "users", component: AdminUsersPage },
      { path: "analytics", component: AdminAnalyticsView },
    ],
  },

  { path: "/:pathMatch(.*)*", redirect: "/journal" },
];

// 创建路由实例 - 使用hash模式
const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

// 路由守卫：需要登录的页面未登录则跳转登录页
router.beforeEach(async (to, _from, next) => {
  if (to.meta.noAuth) { next(); return; }
  try {
    const { checkLogin } = await import("./utils/cloudbase");
    const result = await checkLogin();
    if (!result.isLoggedIn) { next("/login"); }
    else { next(); }
  } catch { next(); }
});

const app = createApp(App);
app.use(router);
app.mount("#app");