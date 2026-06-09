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

      // ── 删除用户 DELETE /api/admin/users ──
      if (path === '/api/admin/users' && request.method === 'DELETE') {
        return await handleAdminDeleteUser(request, env, corsHeaders);
      }

      // ── 清空所有用户 DELETE /api/admin/clear-all ──
      if (path === '/api/admin/clear-all' && request.method === 'DELETE') {
        return await handleAdminClearAll(request, env, corsHeaders);
      }

      // ── 紧急数据清理（无需认证，一次性使用） GET /api/emergency-clear ──
      if (path === '/api/emergency-clear' && request.method === 'GET') {
        return await handleEmergencyClear(env, corsHeaders);
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

  // 查找用户
  const user = await env.DB.prepare(
    'SELECT * FROM Users WHERE username = ?'
  ).bind(username).first();

  if (!user) {
    return json({ error: '用户名或密码错误' }, 401, corsHeaders);
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

const ADMIN_SECRET = 'qingyin_admin_secret_2024';

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
  const adminPassword = env.ADMIN_PASSWORD || 'qingyin2024admin';
  if (!password || password !== adminPassword) {
    return json({ error: '管理员密码错误' }, 401, corsHeaders);
  }
  const token = await generateAdminToken();
  return json({ ok: true, token, message: '管理员登录成功' }, 200, corsHeaders);
}

// ── 获取所有用户 ──
async function handleAdminUsers(request, env, corsHeaders) {
  const admin = requireAdmin(request);
  if (!admin) {
    return json({ error: '未授权访问' }, 401, corsHeaders);
  }

  const url = new URL(request.url);
  const search = url.searchParams.get('search') || '';
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '20');
  const offset = (page - 1) * limit;

  let query, countQuery, params;
  if (search) {
    query = 'SELECT id, username, nickname, created_at, updated_at FROM Users WHERE username LIKE ? ORDER BY id DESC LIMIT ? OFFSET ?';
    countQuery = 'SELECT COUNT(*) as total FROM Users WHERE username LIKE ?';
    params = [`%${search}%`, limit, offset];
  } else {
    query = 'SELECT id, username, nickname, created_at, updated_at FROM Users ORDER BY id DESC LIMIT ? OFFSET ?';
    countQuery = 'SELECT COUNT(*) as total FROM Users';
    params = [limit, offset];
  }

  const usersResult = await env.DB.prepare(query).bind(...params).all();
  const countResult = search
    ? await env.DB.prepare(countQuery).bind(`%${search}%`).first()
    : await env.DB.prepare(countQuery).first();

  return json({
    ok: true,
    users: usersResult.results || [],
    total: countResult ? countResult.total : 0,
    page,
    limit,
  }, 200, corsHeaders);
}

// ── 获取统计数据 ──
async function handleAdminStats(request, env, corsHeaders) {
  const admin = requireAdmin(request);
  if (!admin) {
    return json({ error: '未授权访问' }, 401, corsHeaders);
  }

  // 总用户数
  const totalResult = await env.DB.prepare('SELECT COUNT(*) as total FROM Users').first();

  // 今日注册
  const todayResult = await env.DB.prepare(
    "SELECT COUNT(*) as total FROM Users WHERE date(created_at) = date('now')"
  ).first();

  // 本周注册
  const weekResult = await env.DB.prepare(
    "SELECT COUNT(*) as total FROM Users WHERE created_at >= datetime('now', '-7 days')"
  ).first();

  // 本月注册
  const monthResult = await env.DB.prepare(
    "SELECT COUNT(*) as total FROM Users WHERE created_at >= datetime('now', '-30 days')"
  ).first();

  // 最近7天每日注册数
  const dailyResult = await env.DB.prepare(
    "SELECT date(created_at) as date, COUNT(*) as count FROM Users WHERE created_at >= datetime('now', '-7 days') GROUP BY date(created_at) ORDER BY date(created_at) ASC"
  ).all();

  // 最近注册的10个用户
  const recentResult = await env.DB.prepare(
    'SELECT id, username, nickname, created_at FROM Users ORDER BY id DESC LIMIT 10'
  ).all();

  return json({
    ok: true,
    stats: {
      total: totalResult ? totalResult.total : 0,
      today: todayResult ? todayResult.total : 0,
      week: weekResult ? weekResult.total : 0,
      month: monthResult ? monthResult.total : 0,
      daily: dailyResult.results || [],
      recent: recentResult.results || [],
    },
  }, 200, corsHeaders);
}

// ── 删除用户 ──
async function handleAdminDeleteUser(request, env, corsHeaders) {
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

  await env.DB.prepare('DELETE FROM Users WHERE id = ?').bind(target.id).run();

  return json({ ok: true, message: `用户「${target.username}」已删除`, deleted: target }, 200, corsHeaders);
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

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}
