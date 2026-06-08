import cloudbase from '@cloudbase/js-sdk'

const ENV_ID = import.meta.env.VITE_TCB_ENV_ID || 'your-env-id'
const REGION = import.meta.env.VITE_TCB_REGION || 'ap-shanghai'

const app = cloudbase.init({
  env: ENV_ID,
  region: REGION,
})

export const tcbAuth = app.auth({ persistence: 'local' })
export const tcbDb = app.database()

export async function callFunction(name: string, data: Record<string, unknown> = {}) {
  console.log('[TCB] 调用云函数:', name, JSON.stringify(data))
  try {
    const res = await app.callFunction({ name, data })
    console.log('[TCB] 云函数响应:', JSON.stringify(res.result))
    if (res.result && res.result.code !== 0) {
      console.error('[TCB] 云函数业务错误:', res.result.message)
      throw new Error(res.result.message || '云函数调用失败')
    }
    return res.result?.data
  } catch (e) {
    console.error('[TCB] 调用异常:', e)
    throw e
  }
}

export { app, ENV_ID }
export default app
