# 轻印 (QingYin) - Cloudflare 部署指南

## 概述

本指南指导你完成 **Cloudflare D1 数据库 + Workers API** 的搭建，为轻印应用提供登录/注册后端服务。

---

## 第一步：创建 D1 SQL Database

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 在左侧菜单找到 **Workers 和 Pages**，点击进入
3. 点击左侧的 **D1 SQL Database**
4. 点击 **Create database**（创建数据库）
5. 命名为：`qingyin-db`
6. **Data location** 选择：**APAC (亚太地区)**
7. 点击 **Create**

### 初始化数据库表

1. 进入 `qingyin-db` 详情页
2. 点击顶部的 **Console**（控制台）
3. 将以下代码复制粘贴到输入框中：

```sql
-- 用户表
CREATE TABLE IF NOT EXISTS Users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  phone TEXT,
  password_hash TEXT NOT NULL,
  nickname TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_users_username ON Users(username);
CREATE INDEX IF NOT EXISTS idx_users_phone ON Users(phone);
```

4. 点击执行（或按 Enter）
5. 验证：点击右上角 **Explore Data**，应该能看到空的 Users 表

> ✅ 这一步成功 = D1 搭建完毕

---

## 第二步：创建 Worker

1. 回到 [Workers 和 Pages](https://dash.cloudflare.com/?to=/:account/workers)
2. 点击 **Create application**
3. 选择 **Hello World**（默认模板）
4. 下一步，将名称改为：`qingyin-api`
5. 直接点击底部的 **Deploy**（部署）
6. 部署成功后会跳转到详情页

---

## 第三步：绑定 D1 数据库到 Worker

1. 在 `qingyin-api` 项目详情页
2. 找到 **Settings → Variables and Secrets**（变量和密钥）标签
3. 向下滚动找到 **D1 Database bindings** 部分
4. 点击 **Add Binding**：
   - Variable name: `DB` （必须大写）
   - Database: 选择你刚创建的 `qingyin-db`
5. 点击 **Deploy** 保存并重新部署

---

## 第四步：上传 Worker 代码

### 方式 A：通过 Dashboard 编辑器

1. 在 `qingyin-api` 项目详情页
2. 右上角点击 **Edit code**（编辑代码）
3. **删除所有现有代码**
4. 复制 `worker/index.js` 的全部内容粘贴进去
5. 点击右上角 **Deploy**

### 方式 B：使用 Wrangler CLI（推荐）

```bash
# 安装 wrangler
npm install -g wrangler

# 登录 Cloudflare
wrangler login

# 进入 worker 目录
cd worker

# 创建 D1 数据库（如果还没在网页上创建）
wrangler d1 create qingyin-db

# 编辑 wrangler.toml，填入你的 database_id
# （database_id 在 D1 详情页 URL 中可见）

# 执行初始化 SQL
wrangler d1 execute qingyin-db --file=./schema.sql

# 部署 Worker
wrangler deploy
```

---

## 第五步：获取 Worker 地址

部署完成后，你会得到一个类似这样的地址：

```
https://qingyin-api.xxxxx.workers.dev
```

这就是你的 API 后端地址。

---

## 第六步：配置前端项目

### 6.1 设置环境变量

在前端项目根目录创建 `.env.production` 文件：

```env
VITE_API_URL=https://qingyin-api.xxxxx.workers.dev
```

把 `xxxxx` 替换成你实际的账号标识。

### 6.2 更新 Vercel 配置

编辑 `vercel.json`，将 API 代理地址改为实际地址：

```json
{
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "https://qingyin-api.xxxxx.workers.dev/api/:1"
    },
    ...
  ]
}
```

### 6.3 重新构建部署前端

```bash
npm run build
vercel --prod --yes
```

---

## 第七步：测试登录注册

### 测试注册

```bash
curl -X POST https://qingyin-api.xxxxx.workers.dev/api/register \
  -H "Content-Type: application/json" \
  -d '{"username":"myuser","password":"123456"}'
```

预期返回：
```json
{"ok":true,"token":"eyJ...","user":{"id":1,"username":"myuser","nickname":"myuser"}}
```

### 测试登录

```bash
curl -X POST https://qingyin-api.xxxxx.workers.dev/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"myuser","password":"123456"}'
```

### 验证数据

访问 `https://qingyin-api.xxxxx.workers.dev/api/explore` 应该能看到用户列表。

---

## API 接口文档

| 方法 | 路径 | 说明 | 请求体 |
|------|------|------|--------|
| POST | `/api/register` | 注册 | `{ username, phone?, password }` |
| POST | `/api/login` | 登录 | `{ username, password }` |
| GET | `/api/me` | 获取当前用户 | Header: `Authorization: Bearer <token>` |
| GET | `/api/explore` | 探索数据（调试用） | 无 |

### 返回格式

**成功：**
```json
{ "ok": true, "token": "...", "user": { "id", "username", "nickname" } }
```

**失败：**
```json
{ "error": "错误描述" }
```

---

## 文件结构说明

```
worker/
├── index.js       # Worker 主代码（API 接口实现）
├── schema.sql     # D1 数据库初始化脚本
└── wrangler.toml  # Wrangler CLI 配置文件
```

---

## 常见问题

### Q: 忘了密码怎么办？
当前版本暂不支持密码重置。后续可以添加手机验证码找回功能。

### Q: Token 有效期多久？
7 天。过期后需要重新登录。

### Q: 如何修改 Worker 代码？
Dashboard 中 Edit Code → 改完点 Deploy 即可生效。

### Q: 数据库数据会丢吗？
D1 是 Cloudflare 官方托管的服务，有自动备份。免费额度足够个人项目使用。

---

## 安全提示

- ⚠️ 当前密码哈希使用 SHA-256 + Salt，适合小型项目。生产环境建议升级为 bcrypt/scrypt
- ⚠️ Token 使用简单签名方案，生产建议使用 JWT 库
- ✅ 密码不以明文存储
- ✅ API 返回不包含敏感字段（password_hash 等）
