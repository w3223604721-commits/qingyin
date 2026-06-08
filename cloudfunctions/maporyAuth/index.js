const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

// 用户数据表名
const USER_COLLECTION = 'mapory_users'

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()

  if (!event.action) return { error: '缺少action参数' }

  switch (event.action) {
    case 'login':
      return handleLogin(OPENID)
    case 'bindPhone':
      return handleBindPhone(OPENID, event)
    case 'syncData':
      return handleSyncData(OPENID, event)
    case 'loadData':
      return handleLoadData(OPENID)
    case 'syncMedals':
      return handleSyncMedals(OPENID, event)
    default:
      return { error: '未知操作' }
  }
}

// 登录：获取或创建用户
async function handleLogin(openid) {
  try {
    const user = await db.collection(USER_COLLECTION).where({ _openid: openid }).get()
    
    if (user.data && user.data.length > 0) {
      // 已存在用户，返回数据
      const u = user.data[0]
      return {
        openid: u._openid,
        phone: u.phone || '',
        nickName: u.nickName || '旅行者',
        avatarUrl: u.avatarUrl || '',
        appData: u.appData || null,
        medals: u.medals || null
      }
    }

    // 新用户，创建记录
    await db.collection(USER_COLLECTION).add({
      data: {
        _openid: openid,
        phone: '',
        nickName: '旅行者',
        avatarUrl: '',
        appData: {
          journeys: [],
          checkins: [],
          footprintTracks: [],
          profile: { name: '旅行者', bio: '探索世界，记录美好', avatar: '' },
          trash: [],
          carouselIndex: {}
        },
        medals: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    })

    return { openid, isNew: true }
  } catch (err) {
    console.error('Login error:', err)
    return { error: err.message }
  }
}

// 绑定手机号
async function handleBindPhone(openid, event) {
  try {
    if (!event.phoneCloudID) return { error: '缺少phoneCloudID' }
    
    // 解密手机号（通过云函数调用时自动解析）
    const result = await cloud.getOpenData({
      list: [event.phoneCloudID]
    })

    if (!result.list || !result.list[0] || !result.list[0].data) {
      return { error: '手机号解密失败' }
    }

    const phoneNumber = result.list[0].data.phoneNumber

    await db.collection(USER_COLLECTION).where({ _openid: openid }).update({
      data: {
        phone: phoneNumber,
        updatedAt: new Date().toISOString()
      }
    })

    return { success: true, phone: phoneNumber }
  } catch (err) {
    console.error('BindPhone error:', err)
    return { error: err.message }
  }
}

// 同步数据到云端
async function handleSyncData(openid, event) {
  try {
    const existing = await db.collection(USER_COLLECTION).where({ _openid: openid }).count()
    if (existing.total === 0) return { error: '用户不存在' }

    const updateData = {
      updatedAt: new Date().toISOString()
    }
    if (event.appData) updateData.appData = event.appData
    if (event.medals) updateData.medals = event.medals

    await db.collection(USER_COLLECTION).where({ _openid: openid }).update({ data: updateData })
    return { success: true }
  } catch (err) {
    console.error('SyncData error:', err)
    return { error: err.message }
  }
}

// 加载数据
async function handleLoadData(openid) {
  try {
    const user = await db.collection(USER_COLLECTION).where({ _openid: openid }).get()
    if (!user.data || user.data.length === 0) return {}
    
    const u = user.data[0]
    return {
      appData: u.appData || null,
      medals: u.medals || null
    }
  } catch (err) {
    console.error('LoadData error:', err)
    return { error: err.message }
  }
}

// 同步勋章
async function handleSyncMedals(openid, event) {
  try {
    await db.collection(USER_COLLECTION).where({ _openid: openid }).update({
      data: {
        medals: event.medals,
        updatedAt: new Date().toISOString()
      }
    })
    return { success: true }
  } catch (err) {
    console.error('SyncMedals error:', err)
    return { error: err.message }
  }
}
