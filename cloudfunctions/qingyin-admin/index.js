const cloudbase = require('@cloudbase/node-sdk');

const app = cloudbase.init({
  env: cloudbase.SYMBOL_CURRENT_ENV
});

const db = app.database();

exports.main = async (event, context) => {
  const { action, data } = event;

  try {
    switch (action) {
      // ─── 反馈管理 ───
      case 'getFeedback': {
        const { page = 1, pageSize = 20, status } = data || {};
        let query = db.collection('qingyin_feedback');
        if (status) query = query.where({ status });
        const total = (await query.count()).total;
        const list = await query
          .orderBy('createdAt', 'desc')
          .skip((page - 1) * pageSize)
          .limit(pageSize)
          .get();
        return { success: true, data: { list: list.data, total, page, pageSize } };
      }

      case 'updateFeedback': {
        const { feedbackId, status, note } = data || {};
        await db.collection('qingyin_feedback')
          .doc(feedbackId)
          .update({ status, adminNote: note || '', updatedAt: new Date().toISOString() });
        return { success: true };
      }

      case 'deleteFeedback': {
        await db.collection('qingyin_feedback').doc(data.feedbackId).remove();
        return { success: true };
      }

      // ─── 同步反馈（小程序端提交）───
      case 'syncFeedback': {
        await db.collection('qingyin_feedback').add({
          type: data.type || '其他',
          content: data.content || '',
          contact: data.contact || '',
          status: 'pending',
          createdAt: new Date().toISOString(),
          nickName: data.nickname || '',
          userId: data.userId || ''
        });
        return { success: true };
      }

      // ─── 数据统计 ───
      case 'getDashboardStats': {
        // 反馈统计
        const feedbackTotal = (await db.collection('qingyin_feedback').count()).total;
        const feedbackPending = (await db.collection('qingyin_feedback')
          .where({ status: 'pending' }).count()).total;

        // 分析事件统计
        const analyticsTotal = (await db.collection('qingyin_analytics').count()).total;

        // 用户统计
        const userTotal = (await db.collection('qingyin_users').count()).total;

        // 近7天趋势
        const recentFeedbacks = await db.collection('qingyin_feedback')
          .orderBy('createdAt', 'desc')
          .limit(50)
          .get();

        // 按日期分组
        const dateMap = {};
        recentFeedbacks.data.forEach(f => {
          const d = (f.createdAt || '').split('T')[0];
          if (d) dateMap[d] = (dateMap[d] || 0) + 1;
        });

        const trend = Object.entries(dateMap)
          .sort((a, b) => a[0].localeCompare(b[0]))
          .slice(-14);

        return {
          success: true,
          data: {
            feedbackTotal,
            feedbackPending,
            analyticsTotal,
            userTotal,
            trend: trend.map(([date, count]) => ({ date, count }))
          }
        };
      }

      // ─── 获取分析事件列表 ───
      case 'getAnalytics': {
        const { page = 1, pageSize = 20, eventType } = data || {};
        let query = db.collection('qingyin_analytics');
        if (eventType) query = query.where({ eventType });
        const total = (await query.count()).total;
        const list = await query
          .orderBy('createdAt', 'desc')
          .skip((page - 1) * pageSize)
          .limit(pageSize)
          .get();
        return { success: true, data: { list: list.data, total, page, pageSize } };
      }

      case 'getAnalyticsSummary': {
        // 按事件类型分组统计
        const all = (await db.collection('qingyin_analytics').limit(500).get()).data;
        const eventTypeMap = {};
        const dateMap = {};
        all.forEach(e => {
          eventTypeMap[e.eventType] = (eventTypeMap[e.eventType] || 0) + 1;
          const d = (e.createdAt || '').split('T')[0];
          if (d) dateMap[d] = (dateMap[d] || 0) + 1;
        });

        const dailyTrend = Object.entries(dateMap)
          .sort((a, b) => a[0].localeCompare(b[0]))
          .slice(-30);

        return {
          success: true,
          data: {
            totalEvents: all.length,
            eventTypes: Object.entries(eventTypeMap).map(([type, count]) => ({ type, count })),
            dailyTrend: dailyTrend.map(([date, count]) => ({ date, count }))
          }
        };
      }

      // ─── 用户管理 ───
      case 'getUsers': {
        const { page = 1, pageSize = 20, search } = data || {};
        let query = db.collection('qingyin_users');
        if (search) {
          query = query.where({
            $or: [
              { nickname: db.RegExp({ regexp: search, options: 'i' }) },
              { phone: db.RegExp({ regexp: search, options: 'i' }) }
            ]
          });
        }
        const total = (await query.count()).total;
        const list = await query
          .orderBy('createdAt', 'desc')
          .skip((page - 1) * pageSize)
          .limit(pageSize)
          .get();
        return { success: true, data: { list: list.data, total, page, pageSize } };
      }

      case 'getUserDetail': {
        const user = await db.collection('qingyin_users').doc(data.userId).get();
        const feedbacks = await db.collection('qingyin_feedback')
          .where({ userId: data.userId })
          .orderBy('createdAt', 'desc')
          .get();
        return { 
          success: true, 
          data: { user: user.data[0], feedbacks: feedbacks.data } 
        };
      }

      case 'setAdminRole': {
        const { userId, role } = data || {};
        await db.collection('qingyin_users').doc(userId).update({ role });
        return { success: true };
      }

      default:
        return { success: false, error: `未知操作: ${action}` };
    }
  } catch (err) {
    console.error('Admin API Error:', err);
    return { success: false, error: err.message };
  }
};
