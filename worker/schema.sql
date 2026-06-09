-- qingyin-db 初始化脚本
-- 用户表
CREATE TABLE IF NOT EXISTS Users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  phone TEXT,
  password_hash TEXT NOT NULL,
  nickname TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_users_username ON Users(username);
CREATE INDEX IF NOT EXISTS idx_users_phone ON Users(phone);

-- 插入一条测试用户（密码: test123，bcrypt hash）
INSERT OR IGNORE INTO Users (username, password_hash, nickname) VALUES ('test', '$2a$10$N9qo8uLOickg2ZmSRp9peO0VslSfX7TbMFKJhGjDrfqR8H5k5e2Y6', '测试用户');
