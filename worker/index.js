/**
 * 轻印 (QingYin) - Cloudflare Workers API
 * 
 * 功能: 登录 / 注册 / 鉴权
 * 数据库: Cloudflare D1 (绑定变量名: DB)
 * 环境变量: JWT_SECRET (用于签名 token)
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // ── 全局限流（IP 频率限制） ──
      const clientIP = getClientIP(request);
      if (!checkRateLimit(clientIP)) {
        return new Response(JSON.stringify({
          error: '请求过于频繁，请稍后再试',
          retryAfter: 60
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' },
        });
      }

      // ── 注册 POST /api/register ──
      if (path === '/api/register' && request.method === 'POST') {
        return await handleRegister(request, env, corsHeaders);
      }

      // ── 登录 POST /api/login ──
      if (path === '/api/login' && request.method === 'POST') {
        return await handleLogin(request, env, corsHeaders);
      }

      // ── 获取当前用户 GET /api/me ──
      if (path === '/api/me' && request.method === 'GET') {
        return await handleGetMe(request, env, corsHeaders);
      }

      // ── 忘记密码-查询密保问题 POST /api/forgot-password ──
      if (path === '/api/forgot-password' && request.method === 'POST') {
        return await handleForgotPassword(request, env, corsHeaders);
      }

      // ── 重置密码 POST /api/reset-password ──
      if (path === '/api/reset-password' && request.method === 'POST') {
        return await handleResetPassword(request, env, corsHeaders);
      }

      // ── 探索数据 GET /api/explore ──
      if (path === '/api/explore' && request.method === 'GET') {
        return await handleExplore(env, corsHeaders);
      }

      // ═══════════════════════════════════════════
      // 管理后台 API
      // ═══════════════════════════════════════════

      // ── 管理员登录 POST /api/admin/login ──
      if (path === '/api/admin/login' && request.method === 'POST') {
        return await handleAdminLogin(request, env, corsHeaders);
      }

      // ── 获取所有用户 GET /api/admin/users ──
      if (path === '/api/admin/users' && request.method === 'GET') {
        return await handleAdminUsers(request, env, corsHeaders);
      }

      // ── 获取统计数据 GET /api/admin/stats ──
      if (path === '/api/admin/stats' && request.method === 'GET') {
        return await handleAdminStats(request, env, corsHeaders);
      }

      // ── 软删除用户 DELETE /api/admin/users ──
      if (path === '/api/admin/users' && request.method === 'DELETE') {
        return await handleAdminSoftDeleteUser(request, env, corsHeaders);
      }

      // ── 清空所有用户 DELETE /api/admin/clear-all ──
      if (path === '/api/admin/clear-all' && request.method === 'DELETE') {
        return await handleAdminClearAll(request, env, corsHeaders);
      }

      // ── 回收站列表 GET /api/admin/trash ──
      if (path === '/api/admin/trash' && request.method === 'GET') {
        return await handleAdminTrashList(request, env, corsHeaders);
      }

      // ── 恢复用户 POST /api/admin/user/restore ──
      if (path === '/api/admin/user/restore' && request.method === 'POST') {
        return await handleAdminRestoreUser(request, env, corsHeaders);
      }

      // ── 彻底清除已删除用户 DELETE /api/admin/trash-purge ──
      if (path === '/api/admin/trash-purge' && request.method === 'DELETE') {
        return await handleAdminTrashPurge(request, env, corsHeaders);
      }

      // ── 紧急数据清理（无需认证，一次性使用） GET /api/emergency-clear ──
      if (path === '/api/emergency-clear' && request.method === 'GET') {
        return await handleEmergencyClear(env, corsHeaders);
      }

      // ── 获取单个用户详情（含密保） GET /api/admin/user ──
      if (path === '/api/admin/user' && request.method === 'GET') {
        return await handleAdminUserDetail(request, env, corsHeaders);
      }

      // ── 冻结/解冻用户 POST /api/admin/user/freeze ──
      if (path === '/api/admin/user/freeze' && request.method === 'POST') {
        return await handleAdminFreezeUser(request, env, corsHeaders);
      }

      // ── 重置用户密码 POST /api/admin/user/reset-password ──
      if (path === '/api/admin/user/reset-password' && request.method === 'POST') {
        return await handleAdminResetUserPassword(request, env, corsHeaders);
      }

      // ── 修改管理员密码 POST /api/admin/change-password ──
      if (path === '/api/admin/change-password' && request.method === 'POST') {
        return await handleAdminChangePassword(request, env, corsHeaders);
      }

      return new Response(JSON.stringify({ error: 'Not Found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  },
};

// ──────────────────────────────────────────────
// 密码哈希（简单实现，生产环境建议用 Web Crypto）
// ──────────────────────────────────────────────

async function hashPassword(password) {
  // 使用 Web Crypto API 的 SHA-256 + salt 方式
  const encoder = new TextEncoder();
  const data = encoder.encode(password + '_qingyin_salt_2024');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ──────────────────────────────────────────────
// Token 生成与验证（简单 JWT-like 实现）
// ──────────────────────────────────────────────

async function generateToken(user) {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({
    sub: user.id,
    username: user.username,
    nickname: user.nickname || user.username,
    iat: Date.now(),
    exp: Date.now() + 7 * 24 * 3600 * 1000, // 7天过期
  }));
  
  const secret = 'qingyin_default_secret_2024';
  const signature = btoa(
    Array.from(new Uint8Array(
      await crypto.subtle.digest('SHA-256',
        new TextEncoder().encode(`${header}.${payload}.${secret}`)
      ))
    ).map(b => b.toString(16).padStart(2, '0')).join('')
  );
  
  return `${header}.${payload}.${signature}`;
}

function verifyToken(token) {
  try {
    const [header, payload, signature] = token.split('.');
    const decodedPayload = JSON.parse(atob(payload));
    
    // 检查过期时间
    if (decodedPayload.exp && decodedPayload.exp < Date.now()) {
      return null;
    }
    
    return decodedPayload;
  } catch {
    return null;
  }
}

// ──────────────────────────────────────────────
// 处理函数
// ──────────────────────────────────────────────

async function handleRegister(request, env, corsHeaders) {
  const { username, password, securityQuestion, securityAnswer } = await request.json();

  if (!username || !password) {
    return json({ error: '用户名和密码不能为空' }, 400, corsHeaders);
  }
  if (username.length < 5 || username.length > 24) {
    return json({ error: '用户名需要5-24位' }, 400, corsHeaders);
  }
  if (password.length < 6) {
    return json({ error: '密码至少需要6位' }, 400, corsHeaders);
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return json({ error: '用户名只能包含字母、数字和下划线' }, 400, corsHeaders);
  }
  if (!securityQuestion || !securityAnswer) {
    return json({ error: '请设置密保问题和答案' }, 400, corsHeaders);
  }

  // 检查用户名是否已存在
  const existing = await env.DB.prepare('SELECT id FROM Users WHERE username = ?').bind(username).first();
  if (existing) {
    return json({ error: '用户名已被注册' }, 409, corsHeaders);
  }

  // 哈希密码和密保答案
  const passwordHash = await hashPassword(password);
  const answerHash = await hashPassword(securityAnswer.trim());

  // 检查数据库是否有密保列，无则自动添加
  await ensureSecurityColumns(env, username);

  await env.DB.prepare(
    'INSERT INTO Users (username, password_hash, nickname, security_question, security_answer) VALUES (?, ?, ?, ?, ?)'
  ).bind(username, passwordHash, username, securityQuestion, answerHash).run();

  // 获取新用户
  const user = await env.DB.prepare('SELECT id, username, nickname, avatar_url, created_at FROM Users WHERE username = ?').bind(username).first();
  
  const token = await generateToken(user);

  return json({ ok: true, token, user }, 201, corsHeaders);
}

async function handleLogin(request, env, corsHeaders) {
  const { username, password } = await request.json();

  if (!username || !password) {
    return json({ error: '请输入用户名和密码' }, 400, corsHeaders);
  }

  // 查找用户（排除已删除）
  const user = await env.DB.prepare(
    'SELECT * FROM Users WHERE username = ? AND deleted_at IS NULL'
  ).bind(username).first();

  if (!user) {
    // 检查是否是已删除用户
    await ensureAllColumns(env);
    const deletedCheck = await env.DB.prepare(
      'SELECT id, deleted_at FROM Users WHERE username = ? AND deleted_at IS NOT NULL'
    ).bind(username).first();
    if (deletedCheck) {
      return json({ error: '该账号已被管理员删除，无法登录。如有疑问请联系管理员。', deleted: true }, 401, corsHeaders);
    }
    return json({ error: '用户名或密码错误' }, 401, corsHeaders);
  }

  // 检查是否被冻结（含到期自动解冻逻辑）
  await ensureAllColumns(env);
  const freshUser = await env.DB.prepare('SELECT is_frozen, frozen_until FROM Users WHERE username = ?').bind(username).first();
  if (freshUser && (freshUser.is_frozen === 1 || freshUser.is_frozen === '1')) {
    // 检查是否已到解冻时间
    if (freshUser.frozen_until) {
      const until = new Date(freshUser.frozen_until);
      if (until <= new Date()) {
        // 自动解冻
        await env.DB.prepare('UPDATE Users SET is_frozen = 0, frozen_at = NULL, frozen_until = NULL WHERE username = ?').bind(username).run();
        // 继续正常登录流程
      } else {
        return json({
          error: '该账号已被管理员冻结，无法登录。如有疑问请联系管理员。',
          frozen: true,
          frozen_until: freshUser.frozen_until
        }, 403, corsHeaders);
      }
    } else {
      // 永久冻结
      return json({
        error: '该账号已被管理员永久冻结，无法登录。如有疑问请联系管理员。',
        frozen: true,
        frozen_until: null
      }, 403, corsHeaders);
    }
  }

  // 验证密码
  const inputHash = await hashPassword(password);
  if (inputHash !== user.password_hash) {
    return json({ error: '用户名或密码错误' }, 401, corsHeaders);
  }

  // 生成 token（不返回敏感信息）
  const safeUser = {
    id: user.id,
    username: user.username,
    nickname: user.nickname || user.username,
    avatar_url: user.avatar_url || '',
  };
  const token = await generateToken(safeUser);

  return json({ ok: true, token, user: safeUser }, 200, corsHeaders);
}

async function handleGetMe(request, env, corsHeaders) {
  const authHeader = request.headers.get('Authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  
  const decoded = verifyToken(token);
  if (!decoded) {
    return json({ error: '未登录或token已过期' }, 401, corsHeaders);
  }

  const user = await env.DB.prepare(
    'SELECT id, username, nickname, avatar_url, created_at FROM Users WHERE id = ?'
  ).bind(decoded.sub).first();

  if (!user) {
    return json({ error: '用户不存在' }, 404, corsHeaders);
  }

  return json({ ok: true, user }, 200, corsHeaders);
}

async function handleExplore(env, corsHeaders) {
  // 返回数据库中的用户列表（调试用，用于验证 D1 连接正常）
  const users = await env.DB.prepare(
    'SELECT id, username, nickname, created_at FROM Users ORDER BY id DESC LIMIT 20'
  ).all();

  return json({ ok: true, count: users.results?.length || 0, users: users.results || [] }, 200, corsHeaders);
}

// ── 忘记密码：根据用户名查询密保问题 ──
async function handleForgotPassword(request, env, corsHeaders) {
  const { username } = await request.json();
  if (!username) {
    return json({ error: '请输入用户名' }, 400, corsHeaders);
  }

  // 先确保密保列存在（兼容旧数据）
  try {
    await env.DB.prepare('ALTER TABLE Users ADD COLUMN security_question TEXT DEFAULT NULL').run();
  } catch(e) {}
  try {
    await env.DB.prepare('ALTER TABLE Users ADD COLUMN security_answer TEXT DEFAULT NULL').run();
  } catch(e) {}

  const user = await env.DB.prepare(
    'SELECT id, security_question FROM Users WHERE username = ?'
  ).bind(username).first();

  if (!user) {
    return json({ error: '账号不存在' }, 404, corsHeaders);
  }
  if (!user.security_question) {
    return json({ error: '该账号未设置密保，无法找回密码' }, 400, corsHeaders);
  }

  return json({ ok: true, securityQuestion: user.security_question }, 200, corsHeaders);
}

// ── 重置密码：验证密保答案后更新密码 ──
async function handleResetPassword(request, env, corsHeaders) {
  const { username, securityAnswer, newPassword } = await request.json();
  if (!username || !securityAnswer || !newPassword) {
    return json({ error: '请填写完整信息' }, 400, corsHeaders);
  }
  if (newPassword.length < 6) {
    return json({ error: '新密码至少需要6位' }, 400, corsHeaders);
  }

  const user = await env.DB.prepare(
    'SELECT id, security_answer, security_question FROM Users WHERE username = ?'
  ).bind(username).first();

  if (!user) {
    return json({ error: '该用户名不存在' }, 404, corsHeaders);
  }
  if (!user.security_question || !user.security_answer) {
    return json({ error: '该账号未设置密保，无法重置密码' }, 400, corsHeaders);
  }

  const inputHash = await hashPassword(securityAnswer.trim());
  if (inputHash !== user.security_answer) {
    return json({ error: '密保答案错误' }, 401, corsHeaders);
  }

  const newHash = await hashPassword(newPassword);
  await env.DB.prepare(
    'UPDATE Users SET password_hash = ? WHERE id = ?'
  ).bind(newHash, user.id).run();

  return json({ ok: true, message: '密码重置成功，请使用新密码登录' }, 200, corsHeaders);
}

// ── 自动添加密保列（兼容旧表结构） ──
async function ensureSecurityColumns(env, username) {
  try {
    await env.DB.prepare('ALTER TABLE Users ADD COLUMN security_question TEXT DEFAULT NULL').run();
  } catch(e) { /* 列已存在则忽略 */ }
  try {
    await env.DB.prepare('ALTER TABLE Users ADD COLUMN security_answer TEXT DEFAULT NULL').run();
  } catch(e) { /* 列已存在则忽略 */ }
}

// ═══════════════════════════════════════════
// 管理后台处理函数
// ═══════════════════════════════════════════

const ADMIN_SECRET = 'qingyin_admin_secret_v4_2028';

async function generateAdminToken() {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({
    sub: 0,
    username: 'admin',
    role: 'admin',
    iat: Date.now(),
    exp: Date.now() + 24 * 3600 * 1000, // 24小时过期
  }));
  const signature = btoa(
    Array.from(new Uint8Array(
      await crypto.subtle.digest('SHA-256',
        new TextEncoder().encode(`${header}.${payload}.${ADMIN_SECRET}`)
      ))
    ).map(b => b.toString(16).padStart(2, '0')).join('')
  );
  return `${header}.${payload}.${signature}`;
}

function verifyAdminToken(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    if (payload.role !== 'admin') return null;
    if (payload.exp && payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function requireAdmin(request) {
  const authHeader = request.headers.get('Authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  return verifyAdminToken(token);
}

// ── 管理员登录 ──
async function handleAdminLogin(request, env, corsHeaders) {
  const { password } = await request.json();
  // 管理员密码：优先从环境变量 ADMIN_PASSWORD 读取，否则使用默认值
  const adminPassword = env.ADMIN_PASSWORD || '2028wshzkjdx';
  if (!password || password !== adminPassword) {
    return json({ error: '管理员密码错误' }, 401, corsHeaders);
  }
  const token = await generateAdminToken();
  return json({ ok: true, token, message: '管理员登录成功，Token有效期24小时' }, 200, corsHeaders);
}

// ── 获取所有用户（支持过滤：all/today/week/month/frozen，排除已删除） ──
async function handleAdminUsers(request, env, corsHeaders) {
  const admin = requireAdmin(request);
  if (!admin) {
    return json({ error: '未授权访问' }, 401, corsHeaders);
  }

  const url = new URL(request.url);
  const search = url.searchParams.get('search') || '';
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '20');
  const filter = url.searchParams.get('filter') || 'all'; // all/today/week/month/frozen
  const offset = (page - 1) * limit;

  await ensureAllColumns(env);

  // 基础条件：排除已删除用户
  let whereClause = 'WHERE deleted_at IS NULL';
  let countWhereClause = 'WHERE deleted_at IS NULL';
  let params = [limit, offset];
  let countParams = [];

  // 过滤条件
  if (filter === 'today') {
    whereClause += " AND date(created_at) = date('now')";
    countWhereClause += " AND date(created_at) = date('now')";
  } else if (filter === 'week') {
    whereClause += " AND created_at >= datetime('now', '-7 days')";
    countWhereClause += " AND created_at >= datetime('now', '-7 days')";
  } else if (filter === 'month') {
    whereClause += " AND created_at >= datetime('now', '-30 days')";
    countWhereClause += " AND created_at >= datetime('now', '-30 days')";
  } else if (filter === 'frozen') {
    whereClause += ' AND is_frozen = 1';
    countWhereClause += ' AND is_frozen = 1';
  }

  // 搜索条件
  if (search) {
    whereClause += ' AND username LIKE ?';
    countWhereClause += ' AND username LIKE ?';
    params.unshift(`%${search}%`);
    countParams.push(`%${search}%`);
  }

  const query = `SELECT id, username, nickname, created_at, updated_at, is_frozen FROM Users ${whereClause} ORDER BY id DESC LIMIT ? OFFSET ?`;
  const countQuery = `SELECT COUNT(*) as total FROM Users ${countWhereClause}`;

  const usersResult = await env.DB.prepare(query).bind(...params).all();
  const countResult = countParams.length > 0
    ? await env.DB.prepare(countQuery).bind(...countParams).first()
    : await env.DB.prepare(countQuery).first();

  return json({
    ok: true,
    users: usersResult.results || [],
    total: countResult ? countResult.total : 0,
    page,
    limit,
    filter,
  }, 200, corsHeaders);
}

// ── 获取统计数据（排除软删除用户） ──
async function handleAdminStats(request, env, corsHeaders) {
  const admin = requireAdmin(request);
  if (!admin) {
    return json({ error: '未授权访问' }, 401, corsHeaders);
  }

  await ensureAllColumns(env);

  // 总用户数（排除已删除）
  const totalResult = await env.DB.prepare("SELECT COUNT(*) as total FROM Users WHERE deleted_at IS NULL").first();

  // 今日注册
  const todayResult = await env.DB.prepare(
    "SELECT COUNT(*) as total FROM Users WHERE date(created_at) = date('now') AND deleted_at IS NULL"
  ).first();

  // 本周注册
  const weekResult = await env.DB.prepare(
    "SELECT COUNT(*) as total FROM Users WHERE created_at >= datetime('now', '-7 days') AND deleted_at IS NULL"
  ).first();

  // 本月注册
  const monthResult = await env.DB.prepare(
    "SELECT COUNT(*) as total FROM Users WHERE created_at >= datetime('now', '-30 days') AND deleted_at IS NULL"
  ).first();

  // 冻结用户数（排除已删除）
  const frozenResult = await env.DB.prepare('SELECT COUNT(*) as total FROM Users WHERE is_frozen = 1 AND deleted_at IS NULL').first();

  // 已删除用户数（回收站）
  const deletedResult = await env.DB.prepare('SELECT COUNT(*) as total FROM Users WHERE deleted_at IS NOT NULL').first();

  // 最近7天每日注册数
  const dailyResult = await env.DB.prepare(
    "SELECT date(created_at) as date, COUNT(*) as count FROM Users WHERE created_at >= datetime('now', '-7 days') AND deleted_at IS NULL GROUP BY date(created_at) ORDER BY date(created_at) ASC"
  ).all();

  // 最近注册的10个用户（含冻结状态，排除已删除）
  const recentResult = await env.DB.prepare(
    'SELECT id, username, nickname, created_at, is_frozen FROM Users WHERE deleted_at IS NULL ORDER BY id DESC LIMIT 10'
  ).all();

  return json({
    ok: true,
    stats: {
      total: totalResult ? totalResult.total : 0,
      today: todayResult ? todayResult.total : 0,
      week: weekResult ? weekResult.total : 0,
      month: monthResult ? monthResult.total : 0,
      frozen: frozenResult ? frozenResult.total : 0,
      deleted: deletedResult ? deletedResult.total : 0,
      daily: dailyResult.results || [],
      recent: recentResult.results || [],
    },
  }, 200, corsHeaders);
}

// ── 软删除用户（移入回收站，7天保留期） ──
async function handleAdminSoftDeleteUser(request, env, corsHeaders) {
  const admin = requireAdmin(request);
  if (!admin) {
    return json({ error: '未授权访问' }, 401, corsHeaders);
  }

  const url = new URL(request.url);
  const userId = url.searchParams.get('id');
  const username = url.searchParams.get('username');

  if (!userId && !username) {
    return json({ error: '请提供用户ID或用户名' }, 400, corsHeaders);
  }

  let target;
  if (userId) {
    target = await env.DB.prepare('SELECT id, username FROM Users WHERE id = ?').bind(parseInt(userId)).first();
  } else {
    target = await env.DB.prepare('SELECT id, username FROM Users WHERE username = ?').bind(username).first();
  }

  if (!target) {
    return json({ error: '用户不存在' }, 404, corsHeaders);
  }

  // 软删除：设置 deleted_at 时间戳
  await ensureAllColumns(env);
  const now = new Date().toISOString();
  await env.DB.prepare('UPDATE Users SET deleted_at = ? WHERE id = ?')
    .bind(now, target.id).run();

  return json({
    ok: true,
    message: `用户「${target.username}」已移入回收站（7天内可恢复）`,
    deleted_at: now,
    restore_deadline: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
    username: target.username
  }, 200, corsHeaders);
}

// ── 回收站列表 ──
async function handleAdminTrashList(request, env, corsHeaders) {
  const admin = requireAdmin(request);
  if (!admin) return json({ error: '未授权访问' }, 401, corsHeaders);

  await ensureAllColumns(env);

  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '20');
  const offset = (page - 1) * limit;

  const usersResult = await env.DB.prepare(
    'SELECT id, username, nickname, created_at, deleted_at, is_frozen FROM Users WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC LIMIT ? OFFSET ?'
  ).bind(limit, offset).all();

  const countResult = await env.DB.prepare(
    'SELECT COUNT(*) as total FROM Users WHERE deleted_at IS NOT NULL'
  ).first();

  // 计算每个用户的剩余恢复时间
  const users = (usersResult.results || []).map(u => {
    const deletedAt = new Date(u.deleted_at);
    const expireAt = new Date(deletedAt.getTime() + 7 * 24 * 3600 * 1000);
    const remainingMs = expireAt - Date.now();
    return {
      ...u,
      expires_at: expireAt.toISOString(),
      can_restore: remainingMs > 0,
      remaining_hours: Math.max(0, Math.ceil(remainingMs / 3600000)),
      expired: remainingMs <= 0,
    };
  });

  return json({
    ok: true,
    users,
    total: countResult ? countResult.total : 0,
    page,
    limit,
  }, 200, corsHeaders);
}

// ── 恢复用户（从回收站还原） ──
async function handleAdminRestoreUser(request, env, corsHeaders) {
  const admin = requireAdmin(request);
  if (!admin) return json({ error: '未授权访问' }, 401, corsHeaders);

  const { user_id, username } = await request.json();
  if (!user_id && !username) {
    return json({ error: '请提供 user_id 或 username' }, 400, corsHeaders);
  }

  let target;
  if (user_id) {
    target = await env.DB.prepare('SELECT id, username, deleted_at FROM Users WHERE id = ?').bind(parseInt(user_id)).first();
  } else {
    target = await env.DB.prepare('SELECT id, username, deleted_at FROM Users WHERE username = ?').bind(username).first();
  }

  if (!target) {
    return json({ error: '用户不存在' }, 404, corsHeaders);
  }
  if (!target.deleted_at) {
    return json({ error: '该用户未被删除，无需恢复' }, 400, corsHeaders);
  }

  // 检查是否已过7天
  const deletedAt = new Date(target.deleted_at);
  const expireAt = new Date(deletedAt.getTime() + 7 * 24 * 3600 * 1000);
  if (expireAt <= new Date()) {
    return json({ error: '该用户已超过7天保留期，无法恢复。如需找回请联系数据库管理员', expired: true }, 400, corsHeaders);
  }

  await env.DB.prepare('UPDATE Users SET deleted_at = NULL WHERE id = ?')
    .bind(target.id).run();

  return json({
    ok: true,
    message: `用户「${target.username}」已成功恢复`,
    username: target.username
  }, 200, corsHeaders);
}

// ── 彻底清除已删除用户（不可恢复） ──
async function handleAdminTrashPurge(request, env, corsHeaders) {
  const admin = requireAdmin(request);
  if (!admin) return json({ error: '未授权访问' }, 401, corsHeaders);

  const url = new URL(request.url);
  const userId = url.searchParams.get('id'); // 指定用户ID，不传则全部清除

  await ensureAllColumns(env);

  if (userId) {
    // 清除指定用户
    const target = await env.DB.prepare('SELECT id, username FROM Users WHERE id = ? AND deleted_at IS NOT NULL')
      .bind(parseInt(userId)).first();
    if (!target) {
      return json({ error: '该用户不在回收站中' }, 404, corsHeaders);
    }
    await env.DB.prepare('DELETE FROM Users WHERE id = ?').bind(userId).run();
    return json({
      ok: true,
      message: `用户「${target.username}」已被彻底清除，数据无法恢复`,
      purged: [target.username]
    }, 200, corsHeaders);
  } else {
    // 清除所有已删除用户
    const result = await env.DB.prepare(
      'SELECT id, username FROM Users WHERE deleted_at IS NOT NULL'
    ).all();
    const toPurge = result.results || [];
    
    if (toPurge.length === 0) {
      return json({ ok: true, message: '回收站为空，无需清除', purged: [], count: 0 }, 200, corsHeaders);
    }

    const names = toPurge.map(u => u.username);
    await env.DB.prepare('DELETE FROM Users WHERE deleted_at IS NOT NULL').run();

    return json({
      ok: true,
      message: `已彻底清除 ${toPurge.length} 个用户数据，全部不可恢复`,
      purged: names,
      count: toPurge.length
    }, 200, corsHeaders);
  }
}

// ── 清空所有用户 ──
async function handleAdminClearAll(request, env, corsHeaders) {
  const admin = requireAdmin(request);
  if (!admin) {
    return json({ error: '未授权访问' }, 401, corsHeaders);
  }

  // 先统计数量
  const countResult = await env.DB.prepare('SELECT COUNT(*) as total FROM Users').first();
  const total = countResult ? countResult.total : 0;

  if (total === 0) {
    return json({ ok: true, message: '数据库中没有用户数据', deleted: 0 }, 200, corsHeaders);
  }

  await env.DB.prepare('DELETE FROM Users').run();

  return json({ ok: true, message: `已清空全部 ${total} 个用户`, deleted: total }, 200, corsHeaders);
}

// ═══════════════════════════════════════════
// 强安全保护：IP 访问频率限制（内存中记录）
// ═══════════════════════════════════════════
const ipRecord = new Map(); // { ip: { count, resetAt } }
const RATE_LIMIT_WINDOW = 60 * 1000; // 1分钟内
const RATE_LIMIT_MAX = 100; // 最多100次请求

function checkRateLimit(clientIP) {
  const now = Date.now();
  let record = ipRecord.get(clientIP);
  if (!record || now > record.resetAt) {
    record = { count: 0, resetAt: now + RATE_LIMIT_WINDOW };
    ipRecord.set(clientIP, record);
  }
  record.count++;
  return record.count <= RATE_LIMIT_MAX;
}

function getClientIP(request) {
  return request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
    request.headers.get('X-Real-IP') || 'unknown';
}

// ── 获取单个用户详情（含密保/冻结状态/数据内存） ──
async function handleAdminUserDetail(request, env, corsHeaders) {
  const admin = requireAdmin(request);
  if (!admin) return json({ error: '未授权访问' }, 401, corsHeaders);

  const url = new URL(request.url);
  const userId = url.searchParams.get('id');
  const username = url.searchParams.get('username');

  if (!userId && !username) {
    return json({ error: '请提供用户ID或用户名' }, 400, corsHeaders);
  }

  // 确保列存在
  await ensureAllColumns(env);

  let user;
  if (userId) {
    user = await env.DB.prepare('SELECT * FROM Users WHERE id = ?').bind(parseInt(userId)).first();
  } else {
    user = await env.DB.prepare('SELECT * FROM Users WHERE username = ?').bind(username).first();
  }

  if (!user) {
    return json({ error: '用户不存在' }, 404, corsHeaders);
  }

  // 统计该用户数据内存（估算：token记录数 × 2KB + 用户信息 ~1KB）
  let storageEstimate = 1024; // 基础用户信息
  try {
    const tokenCount = await env.DB.prepare('SELECT COUNT(*) as cnt FROM UserTokens WHERE user_id = ?').bind(user.id).first();
    storageEstimate += (tokenCount ? tokenCount.cnt : 0) * 2048;
  } catch(e) {}

  // 统计该用户的打印记录数
  let printCount = 0;
  try {
    const pc = await env.DB.prepare('SELECT COUNT(*) as cnt FROM PrintJobs WHERE user_id = ?').bind(user.id).first();
    printCount = pc ? pc.cnt : 0;
    storageEstimate += printCount * 512;
  } catch(e) {}

  // 统计该用户的文件记录
  let fileCount = 0;
  try {
    const fc = await env.DB.prepare('SELECT COUNT(*) as cnt FROM UserFiles WHERE user_id = ?').bind(user.id).first();
    fileCount = fc ? fc.cnt : 0;
    storageEstimate += fileCount * 1024;
  } catch(e) {}

  return json({
    ok: true,
    user: {
      id: user.id,
      username: user.username,
      nickname: user.nickname || '',
      avatar_url: user.avatar_url || '',
      password_hash: user.password_hash || '(无)',
      security_question: user.security_question || '(未设置)',
      security_answer: user.security_answer || '(未设置)',
      is_frozen: user.is_frozen === 1 || user.is_frozen === '1',
      frozen_at: user.frozen_at || null,
      frozen_until: user.frozen_until || null,
      created_at: user.created_at,
      updated_at: user.updated_at,
    },
    storage: {
      total_bytes: storageEstimate,
      total_formatted: formatBytes(storageEstimate),
      print_jobs: printCount,
      files: fileCount,
    }
  }, 200, corsHeaders);
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

// ── 冻结/解冻用户（支持选择冻结时长） ──
async function handleAdminFreezeUser(request, env, corsHeaders) {
  const admin = requireAdmin(request);
  if (!admin) return json({ error: '未授权访问' }, 401, corsHeaders);

  await ensureAllColumns(env);

  const { user_id, username, action, duration } = await request.json();
  if (!action || !['freeze', 'unfreeze'].includes(action)) {
    return json({ error: 'action 必须是 freeze 或 unfreeze' }, 400, corsHeaders);
  }

  let target;
  if (user_id) {
    target = await env.DB.prepare('SELECT id, username, is_frozen FROM Users WHERE id = ?').bind(parseInt(user_id)).first();
  } else if (username) {
    target = await env.DB.prepare('SELECT id, username, is_frozen FROM Users WHERE username = ?').bind(username).first();
  } else {
    return json({ error: '请提供 user_id 或 username' }, 400, corsHeaders);
  }

  if (!target) {
    return json({ error: '用户不存在' }, 404, corsHeaders);
  }

  const now = new Date();

  if (action === 'freeze') {
    // 根据时长计算解冻时间
    const durationMap = {
      '12h': 12 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '3d':  3 * 24 * 60 * 60 * 1000,
      '7d':  7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      'permanent': null, // 永久冻结
    };
    const ms = durationMap[duration] || null;
    const frozenUntil = ms ? new Date(now.getTime() + ms).toISOString() : null;

    await env.DB.prepare('UPDATE Users SET is_frozen = ?, frozen_at = ?, frozen_until = ? WHERE id = ?')
      .bind(1, now.toISOString(), frozenUntil, target.id).run();

    const durationLabel = {
      '12h': '12小时', '24h': '24小时', '3d': '3天', '7d': '7天', '30d': '30天', 'permanent': '永久'
    }[duration] || '永久';

    return json({
      ok: true,
      message: `用户「${target.username}」已被冻结（${durationLabel}），冻结后该用户无法登录`,
      frozen: true,
      frozen_until: frozenUntil,
      username: target.username
    }, 200, corsHeaders);
  } else {
    // 解冻
    await env.DB.prepare('UPDATE Users SET is_frozen = 0, frozen_at = NULL, frozen_until = NULL WHERE id = ?')
      .bind(target.id).run();

    return json({
      ok: true,
      message: `用户「${target.username}」已解除冻结`,
      frozen: false,
      username: target.username
    }, 200, corsHeaders);
  }
}

// ── 管理员重置用户密码 ──
async function handleAdminResetUserPassword(request, env, corsHeaders) {
  const admin = requireAdmin(request);
  if (!admin) return json({ error: '未授权访问' }, 401, corsHeaders);

  const { user_id, username, new_password } = await request.json();
  if (!new_password || new_password.length < 6) {
    return json({ error: '新密码至少6位' }, 400, corsHeaders);
  }

  let target;
  if (user_id) {
    target = await env.DB.prepare('SELECT id, username FROM Users WHERE id = ?').bind(parseInt(user_id)).first();
  } else if (username) {
    target = await env.DB.prepare('SELECT id, username FROM Users WHERE username = ?').bind(username).first();
  } else {
    return json({ error: '请提供 user_id 或 username' }, 400, corsHeaders);
  }

  if (!target) {
    return json({ error: '用户不存在' }, 404, corsHeaders);
  }

  const newHash = await hashPassword(new_password);
  await env.DB.prepare('UPDATE Users SET password_hash = ? WHERE id = ?').bind(newHash, target.id).run();

  return json({
    ok: true,
    message: `用户「${target.username}」的密码已重置为：${new_password}（请告知用户）`,
    username: target.username
  }, 200, corsHeaders);
}

// ── 修改管理员密码 ──
async function handleAdminChangePassword(request, env, corsHeaders) {
  const admin = requireAdmin(request);
  if (!admin) return json({ error: '未授权访问' }, 401, corsHeaders);

  const { current_password, new_password } = await request.json();
  if (!current_password || !new_password) {
    return json({ error: '请提供当前密码和新密码' }, 400, corsHeaders);
  }
  if (new_password.length < 6) {
    return json({ error: '新密码至少6位' }, 400, corsHeaders);
  }

  // 验证当前密码（通过 ADMIN_PASSWORD 环境变量）
  const adminPassword = env.ADMIN_PASSWORD || '2028wshzkjdx';
  if (current_password !== adminPassword) {
    return json({ error: '当前管理员密码不正确' }, 401, corsHeaders);
  }

  // 更新环境变量（注意：Workers 环境变量需在 Cloudflare Dashboard 修改）
  // 此处仅记录操作日志，实际密码修改需在 Dashboard 中设置
  return json({
    ok: true,
    message: '请在 Cloudflare Dashboard → Workers → 变量中设置 ADMIN_PASSWORD 环境变量为新密码',
    note: '环境变量修改后下次部署生效'
  }, 200, corsHeaders);
}

// ── 自动确保所有列存在 ──
async function ensureAllColumns(env) {
  const cols = [
    'ALTER TABLE Users ADD COLUMN security_question TEXT DEFAULT NULL',
    'ALTER TABLE Users ADD COLUMN security_answer TEXT DEFAULT NULL',
    'ALTER TABLE Users ADD COLUMN is_frozen INTEGER DEFAULT 0',
    'ALTER TABLE Users ADD COLUMN frozen_at TEXT DEFAULT NULL',
    'ALTER TABLE Users ADD COLUMN frozen_until TEXT DEFAULT NULL',
    'ALTER TABLE Users ADD COLUMN deleted_at TEXT DEFAULT NULL',
  ];
  for (const sql of cols) {
    try { await env.DB.prepare(sql).run(); } catch(e) {}
  }
}

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}

// ── 紧急清理所有数据（无需认证，用于首次部署后清除旧数据） ──
async function handleEmergencyClear(env, corsHeaders) {
  try {
    // 先确保表结构正确
    try { await env.DB.prepare('ALTER TABLE Users ADD COLUMN security_question TEXT DEFAULT NULL').run(); } catch(e) {}
    try { await env.DB.prepare('ALTER TABLE Users ADD COLUMN security_answer TEXT DEFAULT NULL').run(); } catch(e) {}

    const countResult = await env.DB.prepare('SELECT COUNT(*) as total FROM Users').first();
    const total = countResult ? countResult.total : 0;

    if (total === 0) {
      return json({ ok: true, message: '数据库已为空，无需清理', deleted: 0 }, 200, corsHeaders);
    }

    await env.DB.prepare('DELETE FROM Users').run();

    return json({
      ok: true,
      message: `紧急清理完成！已删除 ${total} 条用户数据。请立即删除此端点以确保安全。`,
      deleted: total
    }, 200, corsHeaders);
  } catch(err) {
    return json({ error: '清理失败: ' + err.message }, 500, corsHeaders);
  }
}

