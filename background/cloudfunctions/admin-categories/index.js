const cloudbase = require('@cloudbase/node-sdk')

const app = cloudbase.init({
  env: cloudbase.SYMBOL_CURRENT_ENV,
})

const db = app.database()
const _ = db.command

exports.main = async (event, context) => {
  const { action } = event

  // 验证管理员身份
  const { auth } = context
  if (!auth || !auth.uid) {
    return { code: -1, message: '未登录，请先登录', data: null }
  }

  const adminCheck = await db.collection('admins')
    .where({ uid: auth.uid })
    .get()

  if (!adminCheck.data.length) {
    return { code: -1, message: '无管理员权限', data: null }
  }

  switch (action) {
    case 'list':
      return listCategories()
    case 'create':
      return createCategory(event)
    case 'update':
      return updateCategory(event)
    case 'delete':
      return deleteCategory(event)
    default:
      return { code: -1, message: '无效操作', data: null }
  }
}

async function listCategories() {
  const res = await db.collection('journey_categories')
    .orderBy('sort_order', 'asc')
    .orderBy('created_at', 'desc')
    .get()

  return {
    code: 0,
    message: 'ok',
    data: {
      list: res.data,
      total: res.data.length,
    },
  }
}

async function createCategory(event) {
  const { name, icon, sort_order, color, description } = event

  if (!name || !icon) {
    return { code: -1, message: '分类名称和图标不能为空', data: null }
  }

  const res = await db.collection('journey_categories').add({
    name,
    icon: icon || '🏷️',
    sort_order: sort_order || 0,
    color: color || '#409EFF',
    description: description || '',
    created_at: new Date(),
    updated_at: new Date(),
  })

  return {
    code: 0,
    message: '分类创建成功',
    data: { id: res.id },
  }
}

async function updateCategory(event) {
  const { id, name, icon, sort_order, color, description } = event

  if (!id) {
    return { code: -1, message: '缺少分类ID', data: null }
  }

  await db.collection('journey_categories').doc(id).update({
    name,
    icon,
    sort_order,
    color,
    description,
    updated_at: new Date(),
  })

  return { code: 0, message: '分类更新成功', data: null }
}

async function deleteCategory(event) {
  const { id } = event

  if (!id) {
    return { code: -1, message: '缺少分类ID', data: null }
  }

  // 检查是否有关联旅程
  const linked = await db.collection('journeys')
    .where({ category_id: id })
    .count()

  // 删除分类
  await db.collection('journey_categories').doc(id).remove()

  // 如果有旅程关联此分类，清空它们的 category_id
  if (linked.total > 0) {
    await db.collection('journeys')
      .where({ category_id: id })
      .update({ category_id: '', updated_at: new Date() })
  }

  return { code: 0, message: '分类已删除', data: { affectedJourneys: linked.total } }
}
