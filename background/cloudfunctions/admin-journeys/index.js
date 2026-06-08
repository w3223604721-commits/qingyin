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
      return listJourneys(event)
    case 'update':
      return updateJourney(event)
    case 'updateStatus':
      return updateJourneyStatus(event)
    case 'stats':
      return getStats()
    default:
      return { code: -1, message: '无效操作', data: null }
  }
}

async function listJourneys(event) {
  const {
    keyword,
    categoryId,
    status,
    page = 1,
    pageSize = 20,
  } = event

  // 构建查询条件
  const conditions = {}

  if (keyword) {
    conditions.name = db.RegExp({
      regexp: keyword,
      options: 'i',
    })
  }

  if (categoryId) {
    conditions.category_id = categoryId
  }

  if (status) {
    conditions.status = status
  }

  // 查询总数
  const countRes = await db.collection('journeys')
    .where(conditions)
    .count()

  // 分页查询
  const res = await db.collection('journeys')
    .where(conditions)
    .orderBy('created_at', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get()

  const journeys = res.data

  // 批量获取用户信息
  const userIds = [...new Set(journeys.map(j => j.user_id).filter(Boolean))]
  const userMap: Record<string, { nickname: string; avatar_url: string }> = {}

  if (userIds.length > 0) {
    const userRes = await db.collection('users')
      .where({
        _id: _.in(userIds),
      })
      .get()

    userRes.data.forEach((u: { _id: string; nickname: string; avatar_url: string }) => {
      userMap[u._id] = { nickname: u.nickname, avatar_url: u.avatar_url }
    })
  }

  // 批量获取分类信息
  const categoryIds = [...new Set(journeys.map(j => j.category_id).filter(Boolean))]
  const categoryMap: Record<string, { name: string; icon: string; color: string }> = {}

  if (categoryIds.length > 0) {
    const catRes = await db.collection('journey_categories')
      .where({
        _id: _.in(categoryIds),
      })
      .get()

    catRes.data.forEach((c: { _id: string; name: string; icon: string; color: string }) => {
      categoryMap[c._id] = { name: c.name, icon: c.icon, color: c.color }
    })
  }

  const list = journeys.map(j => ({
    ...j,
    user_nickname: userMap[j.user_id]?.nickname || '未知用户',
    user_avatar: userMap[j.user_id]?.avatar_url || '',
    category_name: categoryMap[j.category_id]?.name || '',
    category_icon: categoryMap[j.category_id]?.icon || '',
    category_color: categoryMap[j.category_id]?.color || '',
  }))

  return {
    code: 0,
    message: 'ok',
    data: {
      list,
      total: countRes.total,
      page,
      pageSize,
    },
  }
}

async function updateJourney(event) {
  const {
    id,
    name,
    city,
    province,
    country,
    start_date,
    end_date,
    description,
    tags,
    category_id,
  } = event

  if (!id) {
    return { code: -1, message: '缺少旅程ID', data: null }
  }

  await db.collection('journeys').doc(id).update({
    name,
    city: city || '',
    province: province || '',
    country: country || '中国',
    start_date: start_date || null,
    end_date: end_date || null,
    description: description || '',
    tags: tags || [],
    category_id: category_id || '',
    updated_at: new Date(),
  })

  return { code: 0, message: '旅程更新成功', data: null }
}

async function updateJourneyStatus(event) {
  const { id, status } = event

  if (!id || !status) {
    return { code: -1, message: '缺少参数', data: null }
  }

  const updateData: Record<string, unknown> = {
    status,
    updated_at: new Date(),
  }

  if (status === 'deleted') {
    updateData.deleted_at = new Date()
  } else if (status === 'active') {
    updateData.deleted_at = null
  }

  await db.collection('journeys').doc(id).update(updateData)

  return { code: 0, message: '状态更新成功', data: null }
}

async function getStats() {
  const [journeyCount, categoryCount, userCount] = await Promise.all([
    db.collection('journeys').where({ status: _.neq('deleted') }).count(),
    db.collection('journey_categories').count(),
    db.collection('users').count(),
  ])

  return {
    code: 0,
    message: 'ok',
    data: {
      journeyCount: journeyCount.total,
      categoryCount: categoryCount.total,
      userCount: userCount.total,
    },
  }
}
