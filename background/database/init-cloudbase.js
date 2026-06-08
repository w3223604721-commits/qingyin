/**
 * CloudBase 数据库初始化脚本
 *
 * 运行方式（在 CloudBase 云函数中）:
 *   1. 将此文件上传为云函数 "db-init"
 *   2. 调用云函数完成数据库初始化
 *
 * 或者直接使用 CloudBase MCP 工具创建集合
 */

// === 需要创建的集合 ===
const collections = [
  {
    name: 'journey_categories',
    desc: '日志分类集合',
    indexes: [
      { field: 'sort_order', direction: 1 },
    ],
  },
  {
    name: 'admins',
    desc: '管理员账号集合',
    indexes: [
      { field: 'username', unique: true },
      { field: 'uid' },
    ],
  },
]

// === 预置数据 ===

// 1. 日志分类预置数据
const presetCategories = [
  { name: '自然风光', icon: '🏔️', sort_order: 1, color: '#67C23A', description: '山川湖海、自然景观类旅程', created_at: new Date(), updated_at: new Date() },
  { name: '城市探索', icon: '🏙️', sort_order: 2, color: '#409EFF', description: '都市漫游、城市文化体验', created_at: new Date(), updated_at: new Date() },
  { name: '美食之旅', icon: '🍜', sort_order: 3, color: '#E6A23C', description: '以美食为主题的旅行', created_at: new Date(), updated_at: new Date() },
  { name: '历史文化', icon: '🏛️', sort_order: 4, color: '#909399', description: '古迹探访、博物馆文化之旅', created_at: new Date(), updated_at: new Date() },
  { name: '海岛度假', icon: '🏖️', sort_order: 5, color: '#00BCD4', description: '海滨、海岛休闲度假', created_at: new Date(), updated_at: new Date() },
  { name: '户外徒步', icon: '🥾', sort_order: 6, color: '#8BC34A', description: '徒步、登山、户外运动', created_at: new Date(), updated_at: new Date() },
  { name: '自驾公路', icon: '🚗', sort_order: 7, color: '#FF9800', description: '自驾旅行、公路旅行', created_at: new Date(), updated_at: new Date() },
  { name: '亲子出游', icon: '👨‍👩‍👧', sort_order: 8, color: '#E91E63', description: '家庭亲子旅行', created_at: new Date(), updated_at: new Date() },
]

// 2. 管理员种子账号
// 密码: admin123 (bcrypt hash)
// 部署后请立即修改密码
const adminSeed = {
  username: 'admin',
  password: 'admin123', // 首次部署后请在云函数中通过 login 自动转为 bcrypt hash
  role: 'super_admin',
  created_at: new Date(),
}

/**
 * 云函数入口 - 用于初始化数据库
 *
 * 将以下内容保存为云函数 db-init/index.js 部署后调用
 */
const initScript = `
const cloudbase = require('@cloudbase/node-sdk')
const bcrypt = require('bcryptjs')

const app = cloudbase.init({ env: cloudbase.SYMBOL_CURRENT_ENV })
const db = app.database()

exports.main = async (event) => {
  const results = []

  // 1. 创建日志分类预置数据
  for (const cat of presetCategories) {
    try {
      await db.collection('journey_categories').add(cat)
      results.push({ collection: 'journey_categories', name: cat.name, status: 'created' })
    } catch (e) {
      results.push({ collection: 'journey_categories', name: cat.name, status: 'exists' })
    }
  }

  // 2. 创建管理员账号（如果不存在）
  const existingAdmin = await db.collection('admins').where({ username: 'admin' }).get()
  if (existingAdmin.data.length === 0) {
    const hash = bcrypt.hashSync('admin123', 10)
    await db.collection('admins').add({
      username: 'admin',
      password: hash,
      role: 'super_admin',
      uid: null, // 后续登录时绑定 CloudBase UID
      created_at: new Date(),
    })
    results.push({ collection: 'admins', name: 'admin', status: 'created', note: '默认密码: admin123' })
  } else {
    results.push({ collection: 'admins', name: 'admin', status: 'exists' })
  }

  return { code: 0, message: 'ok', data: { results } }
}
`

console.log('数据库初始化脚本已就绪')
console.log('')
console.log('需要创建的集合:')
collections.forEach(c => console.log(`  - ${c.name} (${c.desc})`))
console.log('')
console.log('预置分类数量:', presetCategories.length)
console.log('管理员默认账号: admin / admin123')
console.log('')
console.log('请通过 CloudBase 控制台或 MCP 工具创建集合并运行 initScript')

export { collections, presetCategories, adminSeed, initScript }
