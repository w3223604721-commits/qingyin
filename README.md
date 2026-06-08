# 轻印 (Qingyin) - 旅行记忆

[![Powered by CloudBase](https://7463-tcb-advanced-a656fc-1257967285.tcb.qcloud.la/mcp/powered-by-cloudbase-badge.svg)](https://github.com/TencentCloudBase/CloudBase-AI-ToolKit)

> 基于 **CloudBase AI ToolKit** 开发的全栈旅行记忆应用，支持微信小程序 + 浏览器 Web 双端。
>
> **当前版本：内测 2.0 (Beta 2.0) — 2026-06-08**

## 🚀 部署信息

### 浏览器 Web 版
- **访问地址**: [https://ai-native-d5gv1bzqle900971e-1439954016.tcloudbaseapp.com/?v=20260608](https://ai-native-d5gv1bzqle900971e-1439954016.tcloudbaseapp.com/?v=20260608)
- **部署方式**: CloudBase 静态托管
- **技术栈**: 纯 HTML/CSS/JS 单页应用 + Leaflet 地图 + LocalStorage
- **最新更新**: 2026-06-08 (内测 2.0 - 新增登录系统、用户协议、足迹报告、勋章弹窗、全屏地图、全局更名轻印)

### 微信小程序版
- **AppID**: `wxf4a03848abf825e6`
- **环境 ID**: `ai-native-d5gv1bzqle900971e`
- **部署方式**: 微信开发者工具上传
- **技术栈**: 原生小程序（WXML/WXSS/JS）+ `wx.cloud`
- **最新更新**: 2026-06-08 (内测 2.0 - 新增登录系统、用户协议、足迹报告、勋章弹窗、全屏地图、全局更名轻印)

### CloudBase 环境
| 项目 | 值 |
|------|-----|
| 环境 ID | `ai-native-d5gv1bzqle900971e` |
| 区域 | `ap-shanghai` |
| 静态托管域名 | `ai-native-d5gv1bzqle900971e-1439954016.tcloudbaseapp.com` |

### 云函数
| 函数名 | 用途 | 运行时 |
|--------|------|--------|
| `maporyAuth` | 用户登录/数据同步/手机绑定 | Nodejs18.15 |

### 数据库集合
| 集合名 | 用途 | 权限 |
|--------|------|------|
| `users` | 用户信息 | PRIVATE |
| `journeys` | 旅行日志 | PRIVATE |
| `journey_days` | 日志日记录 | PRIVATE |
| `checkins` | 打卡记录 | PRIVATE |
| `footprint_tracks` | 足迹轨迹 | PRIVATE |
| `medals` | 成就勋章定义 | READONLY |
| `user_medals` | 用户勋章 | PRIVATE |
| `share_exports` | 分享导出 | PRIVATE |

## 🏗️ 项目架构

```
├── miniprogram/           # 微信小程序
│   ├── app.js / .json / .wxss
│   ├── pages/
│   │   ├── index/         # 日志 Tab
│   │   ├── checkin/       # 打卡 Tab
│   │   ├── share/         # 分享 Tab
│   │   ├── profile/       # 我的 Tab
│   │   ├── journey-detail/# 行程详情
│   │   ├── diary-edit/    # 日记编辑
│   │   ├── medals/        # 成就勋章
│   │   ├── insights/      # 旅行洞察
│   │   └── settings/      # 设置
│   └── components/
│       └── custom-tab-bar/ # 自定义 TabBar
├── src/                   # Web 版（Vue 3）
│   ├── App.vue
│   ├── main.ts            # 路由配置
│   ├── style.css          # 全局样式
│   ├── utils/
│   │   └── cloudbase.ts   # CloudBase SDK 初始化
│   └── pages/
│       ├── JournalPage.vue
│       ├── CheckinPage.vue
│       ├── SharePage.vue
│       ├── ProfilePage.vue
│       └── JourneyDetailPage.vue
├── cloudfunctions/        # 云函数
├── dist/                  # Web 构建产物
└── cloudbaserc.json       # CloudBase 配置
```

## 🎨 设计系统

- **主色**: `#6366F1` (Indigo)
- **辅助色**: `#818CF8`, `#4F46E5`
- **强调色**: `#FFD700` (Gold)
- **背景**: `#F5F5F7`
- **圆角**: 20px (卡片), 24px (弹窗)
- **移动优先**: 最大内容宽度 500px

## 🚀 本地开发

### Web 版
```bash
npm install
npm run dev      # 开发服务器
npm run build    # 构建
```

### 小程序版
1. 用微信开发者工具打开项目根目录
2. 在 `miniprogram/app.js` 中确认环境 ID
3. 预览/上传

## 📦 部署

### Web 版
```bash
npm run build
# 使用 CloudBase MCP 工具上传 dist 目录到静态托管
```

### 小程序版
通过微信开发者工具上传代码并提交审核。
