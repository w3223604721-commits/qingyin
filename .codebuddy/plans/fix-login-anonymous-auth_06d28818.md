---
name: fix-login-anonymous-auth
overview: 修复前端调用云函数时的匿名登录问题：CloudBase Web SDK 的 callFunction 需要用户已认证，当前缺少匿名登录步骤导致云函数调用被拒绝。
todos:
  - id: add-anonymous-auth
    content: 在 cloudbase.ts 中添加 ensureAuth 匿名登录保障函数，并在 callFunction 中调用
    status: completed
  - id: rebuild-deploy
    content: 重新构建前端并使用 [integration:tcb] 部署到静态托管
    status: completed
    dependencies:
      - add-anonymous-auth
---

修复 Mapory 后台管理系统登录失败的问题。用户输入正确的账号密码 `admin` / `admin123` 后显示"登录失败，请检查账号密码"。经诊断确认：云函数代码正确、数据库管理员数据正确、前端调用逻辑正确，根本原因是 CloudBase Web SDK 的 `app.callFunction()` 要求用户已登录（至少匿名登录），但当前 `cloudbase.ts` 中从未执行 `signInAnonymously()`，导致 SDK 拒绝云函数调用请求。

## 技术栈

- 前端框架：Vue 3 + TypeScript + Vite
- 云开发 SDK：@cloudbase/js-sdk
- 部署平台：CloudBase 静态托管

## 实现方案

在 `cloudbase.ts` 中新增 `ensureAuth()` 函数，调用 `tcbAuth.signInAnonymously()` 完成匿名登录后，再执行云函数调用。利用 `persistence: 'local'` 持久化登录态，确保用户仅需匿名登录一次，后续调用复用已有会话。

### 核心修改：`background/src/api/cloudbase.ts`

新增匿名登录保障逻辑：

```typescript
// 新增：确保已认证（匿名登录）
async function ensureAuth() {
  try {
    const session = await tcbAuth.getSession()
    if (session?.data?.session) return // 已登录，无需操作
  } catch (_) { /* 无有效会话，执行匿名登录 */ }
  await tcbAuth.signInAnonymously()
}

// 修改 callFunction，调用前先确保已认证
export async function callFunction(name: string, data: Record<string, unknown> = {}) {
  await ensureAuth()
  const res = await app.callFunction({ name, data })
  // ... 后续错误处理保持不变
}
```

### 性能与可靠性

- `ensureAuth()` 首次调用触发一次网络请求（匿名登录），后续通过 `getSession()` 检查本地持久化会话，零额外请求
- 异常安全：getSession 失败时兜底执行 signInAnonymously，确保始终能调用云函数
- 向后兼容：仅修改 `callFunction` 内部实现，不影响外部调用接口

## 部署步骤

1. 修改 `cloudbase.ts` 添加 `ensureAuth`
2. `npm run build` 重新构建前端
3. 通过 CloudBase 集成工具上传 `dist/` 到静态托管

## Agent Extensions

### Integration

- **tcb**
- Purpose：上传重新构建后的前端文件到 CloudBase 静态托管
- Expected outcome：dist/ 目录下的全部文件成功部署到 `ai-native-d5gv1bzqle900971e-1439954016.tcloudbaseapp.com`