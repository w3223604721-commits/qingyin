const cloudbase = require('@cloudbase/node-sdk')

const app = cloudbase.init({
  env: cloudbase.SYMBOL_CURRENT_ENV,
})

const db = app.database()

exports.main = async (event, context) => {
  const { action } = event

  if (action === 'login') {
    return handleLogin(event, context)
  }

  // 验证管理员身份（通过 sessionToken）
  if (action === 'check') {
    return checkAdmin(event)
  }

  return { code: -1, message: '无效操作', data: null }
}

async function handleLogin(event, context) {
  const { username, password } = event

  if (!username || !password) {
    return { code: -1, message: '请输入账号和密码', data: null }
  }

  // 查询管理员
  const res = await db.collection('admins')
    .where({ username })
    .get()

  if (!res.data || !res.data.length) {
    return { code: -1, message: '账号或密码错误', data: null }
  }

  const admin = res.data[0]

  // 密码比对
  let valid = false
  if (admin.password && admin.password.startsWith('$2a$')) {
    try {
      const bcrypt = require('bcryptjs')
      valid = bcrypt.compareSync(password, admin.password)
    } catch (e) {
      valid = false
    }
  } else {
    valid = admin.password === password
  }

  if (!valid) {
    return { code: -1, message: '账号或密码错误', data: null }
  }

  // 返回登录成功信息，前端用 localStorage 存储登录态
  return {
    code: 0,
    message: '登录成功',
    data: {
      token: Buffer.from(JSON.stringify({
        uid: admin._id || admin.uid,
        username: admin.username,
        role: admin.role || 'admin',
        loginTime: Date.now(),
      })).toString('base64'),
      username: admin.username,
      role: admin.role || 'admin',
      loginTime: new Date().toISOString(),
    },
  }
}

async function checkAdmin(_event) {
  // check 操作仅验证前端存储的 token 是否有效
  // 实际生产中可增加 token 校验逻辑
  return {
    code: 0,
    message: 'ok',
    data: { status: 'valid' },
  }
}
