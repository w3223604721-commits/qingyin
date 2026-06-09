# 轻印 (QingYin) - 旅行记忆

[![Powered by CloudBase](https://7463-tcb-advanced-a656fc-1257967285.tcb.qcloud.la/mcp/powered-by-cloudbase-badge.svg)](https://github.com/TencentCloudBase/CloudBase-AI-ToolKit)

> 轻量级旅行日记与足迹记录应用，支持微信小程序 + 浏览器 Web 双端。
>
> **当前版本：内测 2.3 (Beta 2.3) — 2026-06-09**

## 🚀 部署信息

### 浏览器 Web 版（生产环境）
| 平台 | 地址 | 技术栈 |
|------|------|--------|
| **Vercel** (主) | [https://20260603112143.vercel.app](https://20260603112143.vercel.app) | 纯 HTML/CSS/JS SPA + Cloudflare Workers 后端 |
| **CloudBase** (镜像) | [https://ai-native-d5gv1bzqle900971e-1439954016.tcloudbaseapp.com/](https://ai-native-d5gv1bzqle900971e-1439954016.tcloudbaseapp.com/) | 纯 HTML/CSS/JS SPA + Leaflet 地图 |
| **管理后台** | [https://20260603112143.vercel.app/admin/](https://20260603112143.vercel.app/admin/) | 管理员账号密码登录 · 用户管理/冻结/回收站 |
| **管理后台(备用)** | [https://ai-native-d5gv1bzqle900971e-1439954016.tcloudbaseapp.com/?v=20260604](https://ai-native-d5gv1bzqle900971e-1439954016.tcloudbaseapp.com/?v=20260604) | Vue 3 + Element Plus · admin/admin123 |

### 微信小程序版
| 项目 | 值 |
|------|-----|
| AppID | `wxf4a03848abf825e6` |
| 环境 ID | `ai-native-d5gv1bzqle900971e` |
| 最新更新 | 2026-06-08 |

### CloudBase 环境
| 项目 | 值 |
|------|-----|
| 环境 ID | `ai-native-d5gv1bzqle900971e` |
| 区域 | `ap-shanghai` |
| 静态托管域名 | `ai-native-d5gv1bzqle900971e-1439954016.tcloudbaseapp.com` |

### Cloudflare Workers 后端
| 项目 | 值 |
|------|-----|
| Worker 地址 | `https://qingyin-api.w3223604721.workers.dev` |
| API 文档 | 见 [CLOUDFLARE_DEPLOY.md](./CLOUDFLARE_DEPLOY.md) |

## 📦 项目架构

```
qingyin/
├── wechat/                   # 🚀 主产品 — 纯 HTML/CSS/JS SPA
│   ├── index.html            # 单页应用入口（含登录覆盖层）
│   ├── script.js             # 核心交互逻辑（含 Cloudflare Workers 登录）
│   ├── styles.css            # 全局样式
│   ├── china_provinces.json  # 中国省份地理数据
│   ├── project.config.json   # 微信小程序项目配置
│   └── PRD.md                # 产品需求文档
├── miniprogram/              # 微信小程序版
├── worker/                   # Cloudflare Workers 后端
│   ├── index.js              # API 接口（注册/登录/鉴权）
│   ├── schema.sql            # D1 数据库初始化
│   └── wrangler.toml         # Wrangler 配置
├── cloudfunctions/           # CloudBase 云函数（遗留）
├── src/                      # Vue 3 SPA（遗留，已停用）
├── vercel.json               # Vercel 部署配置（静态文件）
└── README.md
```

## ⚠️ 重要提示

- **主部署平台为 Vercel**，CloudBase 为镜像部署
- **所有修改必须同步到两个平台**：Vercel（推送 GitHub） + CloudBase（`uploadFiles`）
- **修改后更新 PRD**：`wechat/PRD.md` 记录版本变更

## 🎨 设计系统

- **主色**: `#6366F1` (Indigo)
- **辅助色**: `#818CF8`, `#4F46E5`
- **强调色**: `#FFD700` (Gold)
- **背景**: `#F5F5F7`
- **圆角**: 20px (卡片), 24px (弹窗)
- **移动优先**: 最大内容宽度 500px

## 🚀 部署流程

### Vercel（自动）
1. 推送 `master` 分支到 GitHub → Vercel 自动部署

### CloudBase（手动）
使用 CloudBase MCP 工具上传 `wechat/` 目录到静态托管。

### Cloudflare Workers
见 [CLOUDFLARE_DEPLOY.md](./CLOUDFLARE_DEPLOY.md)

## 📄 API 接口

| 方法 | 路径 | 功能 |
|------|------|------|
| POST | `/api/register` | 用户注册 |
| POST | `/api/login` | 用户登录 |
| GET | `/api/me` | 获取当前用户 |
| GET | `/api/explore` | 数据探索（调试） |
