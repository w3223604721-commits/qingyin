# 轻印 (Qingyin) - 旅行记忆应用

## 项目概述

轻印是一款面向旅行爱好者的全栈应用，帮助用户记录旅行足迹、管理旅行日记、查看统计报告。

### 技术栈

- **微信小程序**：原生 WXML/WXSS/JS，使用微信小程序 CloudBase SDK
- **Web 端**：Vue 3 + Vite + TypeScript + Tailwind CSS
- **后端**：CloudBase 云函数（Node.js）
- **基础设施**：腾讯云 CloudBase

## 项目结构

```
qingyin/
├── miniprogram/          # 微信小程序源码
│   ├── app.js            # 小程序入口
│   ├── app.json          # 小程序配置
│   ├── app.wxss          # 全局样式
│   ├── pages/            # 页面目录
│   │   ├── login/        # 登录页
│   │   ├── journal/      # 旅程列表
│   │   ├── journey-detail/ # 旅程详情
│   │   ├── diary-edit/   # 日记编辑
│   │   ├── checkin/      # 打卡页
│   │   ├── share/        # 分享页
│   │   ├── profile/      # 个人中心
│   │   ├── insights/     # 数据洞察
│   │   ├── medals/       # 勋章页面
│   │   ├── settings/     # 设置页面
│   │   └── footprint-report/ # 足迹报告
│   └── components/       # 组件目录
│       ├── custom-tab-bar/   # 自定义底部导航
│       ├── cloudbase-badge/  # CloudBase 标识
│       └── privacy-agreement/ # 隐私协议
├── cloudfunctions/       # 云函数目录
│   └── maporyAuth/       # 授权云函数
├── src/                  # Web 端源码 (Vue 3)
│   ├── App.vue
│   ├── main.ts
│   ├── style.css
│   └── utils/cloudbase.ts
├── background/           # 后台服务
├── index.html            # Web 入口
├── package.json          # Web 端依赖
├── vite.config.ts        # Vite 配置
├── tailwind.config.js    # Tailwind 配置
├── cloudbaserc.json      # CloudBase 配置
└── README.md             # 项目说明
```

## 功能特性

### 微信小程序
- 📱 11 个页面，涵盖完整旅行记录流程
- 🗺️ 旅行打卡与足迹记录
- 📝 旅行日记管理
- 📊 足迹报告与数据洞察（航旅纵横风格飞线图）
- 🏅 省份勋章系统（34 省份）
- 🎨 自定义 TabBar
- 🔒 隐私协议合规

### Web 端
- Vue 3 + TypeScript 现代化前端
- Tailwind CSS 响应式设计
- CloudBase Web SDK 集成

## CloudBase 资源

- **云函数**：maporyAuth - 用户授权管理
- **环境类型**：CloudBase 标准环境
- **服务**：云函数、静态托管、NoSQL 数据库（预配置）

## 部署信息

### 小程序
1. 使用微信开发者工具打开 `miniprogram/` 目录
2. 配置 `project.config.json` 中的 appid
3. 确保已关联 CloudBase 环境

### Web 端
1. 安装依赖：`npm install`
2. 开发运行：`npm run dev`
3. 构建部署：`npm run build`，然后部署到静态托管

## 开发说明

- 小程序数据当前使用本地存储，可升级为 CloudBase NoSQL 数据库
- Web 端已集成 CloudBase SDK，登录后可同步数据
- 云函数 `maporyAuth` 用于处理用户授权逻辑
