# 轻印后台管理系统 - 部署与运行指南

> ✅ **已部署** | 环境 ID: `ai-native-d5gv1bzqle900971e` | 地域: `ap-shanghai`

## 访问地址

| 类型 | 地址 |
|------|------|
| 🌐 **管理后台** | [https://ai-native-d5gv1bzqle900971e-1439954016.tcloudbaseapp.com/?v=20260604](https://ai-native-d5gv1bzqle900971e-1439954016.tcloudbaseapp.com/?v=20260604) |
| 🔐 **默认账号** | `admin` / `admin123` |

## 已部署资源

| 资源类型 | 名称 | 说明 |
|----------|------|------|
| NoSQL 集合 | `journey_categories` | 8 条预置分类数据 |
| NoSQL 集合 | `admins` | 1 个管理员账号 |
| 云函数 | `admin-auth` | 管理员登录认证 |
| 云函数 | `admin-categories` | 分类 CRUD |
| 云函数 | `admin-journeys` | 旅程管理 |
| 静态托管 | 前端应用 | Vue 3 + Element Plus |

## 控制台管理入口

- [环境概览](https://tcb.cloud.tencent.com/dev?envId=ai-native-d5gv1bzqle900971e#/overview)
- [数据库管理](https://tcb.cloud.tencent.com/dev?envId=ai-native-d5gv1bzqle900971e#/db/doc)
- [云函数管理](https://tcb.cloud.tencent.com/dev?envId=ai-native-d5gv1bzqle900971e#/scf)
- [静态托管](https://tcb.cloud.tencent.com/dev?envId=ai-native-d5gv1bzqle900971e#/static-hosting)

## 一、项目结构

```
background/
├── index.html                          # Vite 入口
├── package.json                        # 项目依赖
├── vite.config.ts                      # Vite 配置
├── tsconfig.json / tsconfig.app.json   # TypeScript 配置
├── postcss.config.js                   # PostCSS 配置
├── tailwind.config.js                  # Tailwind CSS 配置
├── .env                                # 环境变量（需修改）
├── cloudbaserc.json                    # CloudBase 部署配置
│
├── cloudfunctions/                     # 云函数目录
│   ├── admin-auth/                     # 管理员登录认证
│   │   ├── index.js
│   │   └── package.json
│   ├── admin-categories/               # 分类管理 CRUD
│   │   ├── index.js
│   │   └── package.json
│   └── admin-journeys/                 # 旅程管理
│       ├── index.js
│       └── package.json
│
├── database/                           # 数据库初始化脚本
│   ├── init-cloudbase.js              # 初始化脚本（含预置数据）
│   └── seed-categories.json           # 分类种子数据
│
└── src/                                # 前端源码
    ├── App.vue                         # 根组件
    ├── main.ts                         # 入口文件
    ├── api/
    │   └── cloudbase.ts               # CloudBase SDK 封装
    ├── stores/
    │   └── auth.ts                    # Pinia 认证状态管理
    ├── router/
    │   └── index.ts                   # 路由配置 + 守卫
    ├── styles/
    │   └── global.css                 # 全局样式
    └── views/
        ├── Login.vue                   # 管理员登录页
        ├── Layout.vue                  # 管理布局框架
        ├── Dashboard.vue               # 首页仪表盘
        ├── categories/
        │   └── CategoryManage.vue      # 日志分类管理
        └── journeys/
            └── JourneyManage.vue       # 旅程信息维护
```

## 二、快速开始

### 1. 安装依赖

```bash
cd background
npm install
```

### 2. 配置 CloudBase 环境

#### 2.1 获取 CloudBase 环境 ID

1. 访问 [腾讯云 CloudBase 控制台](https://tcb.cloud.tencent.com/)
2. 创建或选择一个环境
3. 复制环境 ID（格式如：`your-env-xxx`）

#### 2.2 修改 .env 文件

```env
VITE_TCB_ENV_ID=your-env-xxx
VITE_TCB_REGION=ap-shanghai
```

#### 2.3 开启登录方式

访问 `https://tcb.cloud.tencent.com/dev?envId=your-env-xxx#/identity/login-manage`

启用以下登录方式：
- ✅ 用户名密码登录
- ✅ 自定义登录（Custom Login）

### 3. 初始化数据库

#### 使用 CloudBase 控制台创建集合

访问 `https://tcb.cloud.tencent.com/dev?envId=your-env-xxx#/db/doc`

创建以下集合：

| 集合名称 | 说明 |
|----------|------|
| `journey_categories` | 日志分类 |
| `admins` | 管理员账号 |

#### 为 journeys 集合添加字段

如果已有 `journeys` 集合，需要添加字段 `category_id`:
- 类型：String
- 说明：关联 journey_categories._id

### 4. 设置安全规则

使用控制台为每个集合设置安全规则：

| 集合 | 安全规则 | 说明 |
|------|---------|------|
| `admins` | ADMINONLY | 仅管理员读写 |
| `journey_categories` | ADMINONLY | 仅管理员读写 |
| `journeys` | ADMINONLY | 仅管理员读写 |
| `users` | ADMINONLY | 仅管理员可读取全部 |

### 5. 部署云函数

#### 5.1 安装 CloudBase CLI（如未安装）

```bash
npm install -g @cloudbase/cli
```

#### 5.2 登录 CLI

```bash
tcb login
```

#### 5.3 部署云函数

```bash
cd background
tcb fn deploy admin-auth --envId your-env-xxx
tcb fn deploy admin-categories --envId your-env-xxx
tcb fn deploy admin-journeys --envId your-env-xxx
```

### 6. 初始化预置数据

部署初始化云函数，或直接在控制台手动插入数据：

#### 插入预置分类

在 `journey_categories` 集合中插入：

```json
[
  { "name": "自然风光", "icon": "🏔️", "sort_order": 1, "color": "#67C23A", "description": "山川湖海、自然景观类旅程", "created_at": { "$date": "now" }, "updated_at": { "$date": "now" } },
  { "name": "城市探索", "icon": "🏙️", "sort_order": 2, "color": "#409EFF", "description": "都市漫游、城市文化体验", "created_at": { "$date": "now" }, "updated_at": { "$date": "now" } },
  { "name": "美食之旅", "icon": "🍜", "sort_order": 3, "color": "#E6A23C", "description": "以美食为主题的旅行", "created_at": { "$date": "now" }, "updated_at": { "$date": "now" } },
  { "name": "历史文化", "icon": "🏛️", "sort_order": 4, "color": "#909399", "description": "古迹探访、博物馆文化之旅", "created_at": { "$date": "now" }, "updated_at": { "$date": "now" } },
  { "name": "海岛度假", "icon": "🏖️", "sort_order": 5, "color": "#00BCD4", "description": "海滨、海岛休闲度假", "created_at": { "$date": "now" }, "updated_at": { "$date": "now" } },
  { "name": "户外徒步", "icon": "🥾", "sort_order": 6, "color": "#8BC34A", "description": "徒步、登山、户外运动", "created_at": { "$date": "now" }, "updated_at": { "$date": "now" } },
  { "name": "自驾公路", "icon": "🚗", "sort_order": 7, "color": "#FF9800", "description": "自驾旅行、公路旅行", "created_at": { "$date": "now" }, "updated_at": { "$date": "now" } },
  { "name": "亲子出游", "icon": "👨‍👩‍👧", "sort_order": 8, "color": "#E91E63", "description": "家庭亲子旅行", "created_at": { "$date": "now" }, "updated_at": { "$date": "now" } }
]
```

#### 插入管理员账号

在 `admins` 集合中插入：

```json
{
  "username": "admin",
  "password": "admin123",
  "role": "super_admin",
  "created_at": { "$date": "now" }
}
```

> ⚠️ **首次登录后请立即修改密码！** 修改通过更新 `admins` 集合中的 `password` 字段完成。

### 7. 启动开发服务

```bash
cd background
npm run dev
```

访问 `http://localhost:5173`

### 8. 登录后台

- 账号：`admin`
- 密码：`admin123`

## 三、页面说明

### 登录页 `/login`
- CloudBase 用户名密码登录
- 登录后获取自定义 ticket，持久化会话

### 首页仪表盘 `/dashboard`
- 旅程总数、分类总数、用户总数统计卡片
- 快捷操作入口

### 日志分类管理 `/categories`
- 分类列表（表格展示名称、图标、序号、创建时间）
- 新增分类（弹窗表单：名称、图标、排序、颜色、描述）
- 编辑分类
- 删除分类（如有关联旅程则自动清空分类关联）

### 旅程信息维护 `/journeys`
- 旅程列表（分页表格 + 关联用户昵称头像 + 分类标签）
- 关键词搜索 + 分类筛选 + 状态筛选
- 旅程编辑（弹窗表单：名称、分类、城市/省份/国家、日期、描述、多标签）
- 状态快捷操作（归档 / 恢复 / 软删除）

## 四、云函数 API 文档

### admin-auth

| 参数 | 说明 | 返回值 |
|------|------|--------|
| `{ action: "login", username, password }` | 管理员登录 | `{ ticket, username, role }` |
| `{ action: "check" }` | 验证管理员身份 | `{ username, role }` |

### admin-categories

| 参数 | 说明 | 返回值 |
|------|------|--------|
| `{ action: "list" }` | 获取分类列表 | `{ list, total }` |
| `{ action: "create", name, icon, ... }` | 新增分类 | `{ id }` |
| `{ action: "update", id, name, ... }` | 更新分类 | `null` |
| `{ action: "delete", id }` | 删除分类 | `{ affectedJourneys }` |

### admin-journeys

| 参数 | 说明 | 返回值 |
|------|------|--------|
| `{ action: "list", keyword, categoryId, status, page, pageSize }` | 旅程列表（分页+联表） | `{ list, total, page, pageSize }` |
| `{ action: "update", id, name, city, ... }` | 更新旅程 | `null` |
| `{ action: "updateStatus", id, status }` | 更改旅程状态 | `null` |
| `{ action: "stats" }` | 获取统计数据 | `{ journeyCount, categoryCount, userCount }` |

## 五、后续扩展

- [ ] 用户管理模块
- [ ] 打卡记录管理
- [ ] 勋章管理
- [ ] 反馈管理
- [ ] 数据导出
- [ ] 操作日志审计

## 六、注意事项

1. **密码安全**：首次登录后务必修改默认密码
2. **CORS 配置**：如果从其他域名访问，需在 CloudBase 控制台配置安全域名
3. **云函数超时**：journeys 云函数默认超时 15 秒，数据量大时可调大
4. **数据库权限**：所有管理集合均设为 ADMINONLY，仅云函数可读写
