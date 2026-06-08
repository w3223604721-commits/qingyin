# 轻印（旅行记忆）数据库设计文档

> **版本**：v1.0.0  
> **日期**：2026-06-04  
> **数据库**：MongoDB（推荐，适合灵活的旅程结构）  
> **备选**：MySQL 版本见附录

---

## 一、数据库集合总览

| 集合名称 | 说明 | 预估文档数 |
|----------|------|-----------|
| `users` | 用户账户与个人资料 | N |
| `journeys` | 旅程（行程） | N × 3~5 |
| `journey_days` | 旅程中的每一天（日记） | N × 5~50 |
| `checkins` | 打卡记录 | N × 5~200 |
| `footprint_tracks` | 足迹轨迹记录 | N × 0~10 |
| `medals` | 勋章定义（34省市区 + 特殊勋章） | ~40 |
| `user_medals` | 用户已获取的勋章 | N × 0~40 |
| `share_exports` | 分享导出记录 | N × 0~20 |
| `share_templates` | 自定义分享模板 | N × 0~10 |
| `permissions` | 用户权限授权状态 | N |
| `settings` | 用户设置 | N |
| `trash` | 回收站（软删除） | N × 0~30 |
| `feedback` | 用户反馈与建议 | N × 0~5 |

---

## 二、集合详细设计

### 1. `users` — 用户集合

```javascript
{
  _id: ObjectId,                    // 用户唯一标识
  openid: String,                   // 微信 OpenID（小程序登录）
  unionid: String,                  // 微信 UnionID（多平台统一）
  nickname: String,                 // 昵称（默认"旅行者"）
  avatar_url: String,               // 头像 URL（云存储路径）
  bio: String,                      // 个人简介（默认"探索世界，记录美好"）
  
  // 旅行人格（系统自动计算）
  travel_personality: {
    type: String,                   // "explorer" | "travel_master" | "walking_map" 
                                    // | "backpacker" | "story_collector" | "checkin_master"
    name: String,                   // 中文名称："探索者"
    emoji: String,                  // 对应 emoji："🧭"
  },
  
  // 统计数据（冗余，方便快速查询）
  stats: {
    journey_count: Number,          // 旅程数
    checkin_count: Number,          // 打卡点数
    photo_count: Number,            // 照片数
    province_count: Number,         // 已点亮的省份数
    total_days: Number,             // 累计旅行天数
  },
  
  // 账户状态
  status: String,                   // "active" | "disabled"
  created_at: Date,                 // 注册时间
  updated_at: Date,                 // 最后更新时间
  last_login_at: Date,              // 最后登录时间
}

// 索引
db.users.createIndex({ openid: 1 }, { unique: true });
db.users.createIndex({ unionid: 1 }, { sparse: true });
```

---

### 2. `journeys` — 旅程集合

```javascript
{
  _id: ObjectId,                    // 旅程唯一标识
  user_id: ObjectId,                // 所属用户
  name: String,                     // 旅程名称（如"夏日北海道之旅"）
  city: String,                     // 目的地城市（如"札幌、小樽"）
  province: String,                 // 目的地省份（如"北海道"）
  country: String,                  // 目的地国家（默认"中国"）
  start_date: Date,                 // 开始日期
  end_date: Date,                   // 结束日期
  description: String,              // 旅程简介
  cover_photo: String,              // 封面照片 URL
  
  // 标签（支持多标签）
  tags: [String],                   // ["旅行", "自然", "美食"]
  
  // 旅程状态
  status: String,                   // "active" | "archived" | "deleted"
  
  // 元数据
  day_count: Number,                // 天数（冗余，从 journey_days 统计）
  photo_count: Number,              // 照片数（冗余）
  created_at: Date,                 // 创建时间
  updated_at: Date,                 // 最后更新时间
  deleted_at: Date,                 // 软删除时间（在回收站中）
}

// 索引
db.journeys.createIndex({ user_id: 1, status: 1 });
db.journeys.createIndex({ user_id: 1, created_at: -1 });
db.journeys.createIndex({ user_id: 1, tags: 1 });
db.journeys.createIndex({ user_id: 1, start_date: -1 });
```

---

### 3. `journey_days` — 旅程日记集合

```javascript
{
  _id: ObjectId,                    // 日记唯一标识
  journey_id: ObjectId,             // 所属旅程
  user_id: ObjectId,                // 所属用户（冗余，方便独立查询）
  day_number: Number,               // 第几天（Day 1, Day 2...）
  date: Date,                       // 日期（如 2025-07-15）
  title: String,                    // 标题（如"到达新千岁机场"）
  content: String,                  // 日记正文
  location: String,                 // 地点描述（如"札幌·新千岁机场"）
  
  // 照片列表（关联照片）
  photos: [
    {
      _id: ObjectId,                // 照片 ID
      url: String,                  // 照片 URL（云存储）
      thumbnail_url: String,        // 缩略图 URL
      caption: String,              // 照片说明
      width: Number,                // 图片宽度
      height: Number,               // 图片高度
      sort_order: Number,           // 排序序号
    }
  ],
  
  // 关联的打卡记录
  checkin_ids: [ObjectId],          // 关联的打卡 ID 列表
  
  // 心情/天气
  mood: String,                     // "happy" | "excited" | "calm" | "tired" | "amazed"
  weather: String,                  // "sunny" | "cloudy" | "rainy" | "snowy" | "windy"
  
  created_at: Date,                 // 创建时间
  updated_at: Date,                 // 最后更新时间
}

// 索引
db.journey_days.createIndex({ journey_id: 1, day_number: 1 });
db.journey_days.createIndex({ user_id: 1, date: -1 });
db.journey_days.createIndex({ journey_id: 1, date: 1 }, { unique: true });
```

---

### 4. `checkins` — 打卡集合

```javascript
{
  _id: ObjectId,                    // 打卡唯一标识
  user_id: ObjectId,                // 所属用户
  journey_id: ObjectId,             // 关联旅程（可为 null，独立打卡）
  journey_day_id: ObjectId,         // 关联旅程日记（可为 null）
  
  // 打卡基本信息
  place_name: String,               // 地点名称（如"富良野薰衣草田"）
  city: String,                     // 城市（如"札幌"）
  province: String,                 // 省份/都道府县（如"北海道"）
  country: String,                  // 国家（默认"中国"）
  
  // 坐标
  location: {
    type: "Point",
    coordinates: [Number, Number],  // [经度, 纬度]（如 [141.3469, 43.0642]）
  },
  
  // 打卡内容
  photo: String,                    // 打卡照片 URL
  note: String,                     // 打卡备注
  
  // 打卡类型
  type: String,                     // "scenic" | "food" | "hotel" | "transport" | "shopping" | "other"
  
  // 自定义标签
  tags: [String],
  
  // 打卡时间
  checkin_at: Date,                 // 打卡时间
  created_at: Date,                 // 创建时间
  updated_at: Date,                 // 更新时间
}

// 索引
db.checkins.createIndex({ user_id: 1, checkin_at: -1 });
db.checkins.createIndex({ user_id: 1, province: 1 });
db.checkins.createIndex({ journey_id: 1 });
db.checkins.createIndex({ location: "2dsphere" });  // 地理空间索引
```

---

### 5. `footprint_tracks` — 足迹轨迹集合

```javascript
{
  _id: ObjectId,                    // 轨迹唯一标识
  user_id: ObjectId,                // 所属用户
  journey_id: ObjectId,             // 关联旅程（可为 null）
  name: String,                     // 轨迹名称（如"札幌市区徒步"）
  
  // 轨迹路线（GeoJSON LineString）
  route: {
    type: "LineString",
    coordinates: [[lng, lat], ...], // 轨迹坐标点数组
  },
  
  // 轨迹统计
  stats: {
    total_distance: Number,         // 总距离（米）
    total_duration: Number,         // 总时长（秒）
    average_speed: Number,          // 平均速度（m/s）
    point_count: Number,            // 坐标点数量
  },
  
  // 时间范围
  start_time: Date,                 // 开始记录时间
  end_time: Date,                   // 结束记录时间
  
  // 轨迹状态
  status: String,                   // "recording" | "completed" | "paused"
  
  created_at: Date,
  updated_at: Date,
}

// 索引
db.footprint_tracks.createIndex({ user_id: 1, start_time: -1 });
db.footprint_tracks.createIndex({ route: "2dsphere" });
```

---

### 6. `medals` — 勋章定义集合（系统级，预置数据）

```javascript
{
  _id: ObjectId,                    // 勋章唯一标识
  code: String,                     // 勋章编码（如"province_beijing"）
  name: String,                     // 勋章名称（如"北京"）
  emoji: String,                    // 勋章图标（如"🐿"）
  
  // 勋章类型
  type: String,                     // "province" | "special" | "milestone"
  
  // 省份勋章专属字段
  province_code: String,            // 省份编码（如"110000"）
  province_name: String,            // 省份名称（如"北京市"）
  
  // 解锁条件
  unlock_condition: {
    type: String,                   // "checkin_in_province" | "journey_count" | "day_count" | "photo_count"
    threshold: Number,              // 阈值（如 province 为 1，journey_count 为 10）
  },
  
  // 勋章等级（铜/银/金）
  tier: String,                     // "bronze" | "silver" | "gold"
  
  // 显示信息
  description: String,              // 勋章描述（如"在北京留下足迹"）
  landmark: String,                 // 地标建筑（如"故宫"）
  
  sort_order: Number,               // 排序序号
  is_active: Boolean,               // 是否启用
  created_at: Date,
}

// 索引
db.medals.createIndex({ code: 1 }, { unique: true });
db.medals.createIndex({ type: 1, sort_order: 1 });
```

**预置数据示例**（34 个省级行政区 + 特殊勋章）：

```javascript
// 省份勋章（34个）
const province_medals = [
  { code: "province_beijing",  name: "北京",   emoji: "🐿",  province_code: "110000", landmark: "故宫" },
  { code: "province_shanghai", name: "上海",   emoji: "🌃",  province_code: "310000", landmark: "外滩" },
  { code: "province_guangdong",name: "广东",   emoji: "🐳",  province_code: "440000", landmark: "广州塔" },
  { code: "province_sichuan",  name: "四川",   emoji: "🐼",  province_code: "510000", landmark: "九寨沟" },
  { code: "province_heilongjiang",name:"黑龙江",emoji:"❄️", province_code:"230000", landmark:"冰雪大世界"},
  { code: "province_yunnan",   name: "云南",   emoji: "🦚",  province_code: "530000", landmark: "大理古城" },
  { code: "province_tibet",    name: "西藏",   emoji: "🏔",  province_code: "540000", landmark: "布达拉宫" },
  { code: "province_xinjiang", name: "新疆",   emoji: "💫",  province_code: "650000", landmark: "天山天池" },
  // ... 其余 26 个省份
];

// 特殊勋章
const special_medals = [
  { code: "explorer",     name: "探索者",     emoji: "🧭", type: "special", unlock_condition: { type: "province_count", threshold: 10 }, description: "点亮 10 个省份" },
  { code: "travel_master",name: "旅行大师",   emoji: "👑", type: "special", unlock_condition: { type: "journey_count", threshold: 10 }, description: "创建 10 段旅程" },
  { code: "shutterbug",   name: "快门达人",   emoji: "📸", type: "special", unlock_condition: { type: "photo_count", threshold: 100 }, description: "拍摄 100 张照片" },
  { code: "marathoner",   name: "万里行者",   emoji: "👣", type: "special", unlock_condition: { type: "day_count", threshold: 100 }, description: "累计旅行 100 天" },
  { code: "all_china",    name: "华夏行者",   emoji: "🇨🇳", type: "special", unlock_condition: { type: "province_count", threshold: 34 }, description: "点亮全部 34 个省份" },
];
```

---

### 7. `user_medals` — 用户勋章关联集合

```javascript
{
  _id: ObjectId,
  user_id: ObjectId,                // 所属用户
  medal_id: ObjectId,               // 勋章 ID
  medal_code: String,               // 勋章编码（冗余）
  
  // 解锁信息
  unlocked_at: Date,                // 解锁时间
  unlocked_by_checkin_id: ObjectId, // 通过哪次打卡解锁（省份勋章）
  
  // 进度信息（用于未完全解锁的勋章）
  progress: {
    current: Number,                // 当前进度（如已打卡 3 个省份）
    target: Number,                 // 目标（如 10 个省份）
  },
  
  // 是否已通知用户
  notified: Boolean,                // 是否已弹出解锁通知
  
  created_at: Date,
}

// 索引
db.user_medals.createIndex({ user_id: 1, medal_id: 1 }, { unique: true });
db.user_medals.createIndex({ user_id: 1, unlocked_at: -1 });
```

---

### 8. `share_exports` — 分享导出记录集合

```javascript
{
  _id: ObjectId,
  user_id: ObjectId,                // 所属用户
  journey_id: ObjectId,             // 关联旅程
  
  // 导出类型
  export_type: String,              // "image" | "receipt" | "card" | "timeline" | "magazine"
  
  // 导出内容配置
  config: {
    title: String,                  // 导出标题
    show_date: Boolean,             // 是否显示日期
    show_location: Boolean,         // 是否显示地点
    include_photos: Boolean,        // 是否包含照片
    photo_limit: Number,            // 照片数量限制
    template_id: String,            // 模板 ID（自定义模板时）
  },
  
  // 导出结果
  result_url: String,               // 导出图片的云存储 URL
  file_size: Number,                // 文件大小（字节）
  
  // 分享渠道
  share_channel: String,            // "wechat" | "qq" | "save_album" | "more"
  
  created_at: Date,
}

// 索引
db.share_exports.createIndex({ user_id: 1, created_at: -1 });
db.share_exports.createIndex({ journey_id: 1 });
```

---

### 9. `share_templates` — 自定义分享模板集合

```javascript
{
  _id: ObjectId,
  user_id: ObjectId,                // 所属用户
  
  name: String,                     // 模板名称（如"我的小票风格"）
  type: String,                     // "receipt" | "card" | "timeline" | "magazine"
  
  // 模板配置
  config: {
    background_color: String,       // 背景色（hex）
    text_color: String,             // 文字色（hex）
    accent_color: String,           // 强调色（hex）
    font_family: String,            // 字体
    show_barcode: Boolean,          // 是否显示条码
    layout: String,                 // "grid" | "list" | "masonry"
    watermark: String,              // 水印文字
  },
  
  // 每个图片的自定义文字
  photo_captions: [
    {
      photo_id: ObjectId,           // 关联照片 ID
      custom_text: String,          // 自定义文字
      custom_location: String,      // 自定义地点
      custom_date: Date,            // 自定义日期
    }
  ],
  
  is_default: Boolean,              // 是否系统默认模板
  created_at: Date,
  updated_at: Date,
}

// 索引
db.share_templates.createIndex({ user_id: 1 });
```

---

### 10. `permissions` — 用户权限集合

```javascript
{
  _id: ObjectId,
  user_id: ObjectId,                // 所属用户
  
  permissions: {
    notification: {
      granted: Boolean,             // 是否授权
      granted_at: Date,             // 授权时间
      denied_at: Date,              // 拒绝时间
    },
    location: {
      granted: Boolean,
      granted_at: Date,
      denied_at: Date,
    },
    photo_library: {
      granted: Boolean,
      granted_at: Date,
      denied_at: Date,
    },
    camera: {
      granted: Boolean,
      granted_at: Date,
      denied_at: Date,
    },
  },
  
  updated_at: Date,
}

// 索引
db.permissions.createIndex({ user_id: 1 }, { unique: true });
```

---

### 11. `settings` — 用户设置集合

```javascript
{
  _id: ObjectId,
  user_id: ObjectId,                // 所属用户
  
  // 隐私设置
  privacy: {
    show_location: Boolean,         // 是否公开展示位置（默认 true）
    show_profile: Boolean,          // 是否公开展示个人资料（默认 true）
    show_journeys: Boolean,         // 是否公开展示旅程（默认 true）
  },
  
  // 偏好设置
  preferences: {
    language: String,               // 语言（默认"zh-CN"）
    theme: String,                  // 主题（默认"light"）
    map_provider: String,           // 地图服务商（默认"tianditu"）
    auto_save_draft: Boolean,       // 是否自动保存草稿
    photo_quality: String,          // 照片质量 "high" | "medium" | "low"
  },
  
  // 通知设置
  notifications: {
    medal_unlock: Boolean,          // 勋章解锁通知
    journey_reminder: Boolean,      // 旅程提醒
    app_update: Boolean,            // 应用更新通知
  },
  
  updated_at: Date,
}

// 索引
db.settings.createIndex({ user_id: 1 }, { unique: true });
```

---

### 12. `trash` — 回收站集合

```javascript
{
  _id: ObjectId,
  user_id: ObjectId,                // 所属用户
  
  // 被删除的内容
  item_type: String,                // "journey" | "journey_day" | "checkin" | "photo"
  item_id: ObjectId,                // 原始文档 ID
  
  // 备份数据（删除时的完整快照）
  snapshot: Object,                 // 被删除文档的完整 JSON
  
  // 删除信息
  deleted_at: Date,                 // 删除时间
  expire_at: Date,                  // 过期时间（30天后自动清除）
  
  // 恢复信息
  restored: Boolean,                // 是否已恢复
  restored_at: Date,                // 恢复时间
}

// 索引
db.trash.createIndex({ user_id: 1, item_type: 1 });
db.trash.createIndex({ expire_at: 1 }, { expireAfterSeconds: 0 }); // TTL 索引，30天后自动删除
```

---

### 13. `feedback` — 用户反馈集合

```javascript
{
  _id: ObjectId,
  user_id: ObjectId,                // 所属用户
  contact: String,                  // 联系方式（选填）
  
  type: String,                     // "bug" | "feature" | "suggestion" | "other"
  title: String,                    // 反馈标题
  content: String,                  // 反馈内容
  
  // 附件
  attachments: [String],            // 附件 URL 列表
  
  // 处理状态
  status: String,                   // "pending" | "processing" | "resolved" | "closed"
  admin_reply: String,              // 管理员回复
  replied_at: Date,                 // 回复时间
  
  created_at: Date,
  updated_at: Date,
}

// 索引
db.feedback.createIndex({ user_id: 1, created_at: -1 });
db.feedback.createIndex({ status: 1 });
```

---

## 三、数据关系图

```
users (1)
  ├── journeys (1:N) ─── journey_days (1:N) ─── checkins (N:1)
  │       │                      │
  │       │                      └── photos (嵌套数组)
  │       │
  │       └── share_exports (1:N)
  │
  ├── checkins (1:N) ─── 独立打卡（不关联旅程）
  │
  ├── footprint_tracks (1:N)
  │
  ├── user_medals (1:N) ─── medals (N:1)
  │
  ├── share_templates (1:N)
  │
  ├── permissions (1:1)
  ├── settings (1:1)
  ├── trash (1:N)
  └── feedback (1:N)
```

---

## 四、关键业务规则

### 4.1 勋章自动解锁逻辑

```
当用户创建打卡记录时：
  1. 查询 checkins 表中该用户在该省份的打卡数量
  2. 如果是首次打卡该省份 → 解锁对应省份勋章
  3. 插入 user_medals 记录
  4. 更新 users.stats.province_count
  5. 检查特殊勋章条件是否满足（如省份数 >= 10 → 解锁"探索者"）
```

### 4.2 统计数据更新策略

建议使用**聚合计算 + 定期缓存**：

```javascript
// 每次 CRUD 操作后触发 stats 更新
async function updateUserStats(userId) {
  const [journeys, checkins, medals] = await Promise.all([
    db.journeys.countDocuments({ user_id: userId, status: "active" }),
    db.checkins.countDocuments({ user_id: userId }),
    db.user_medals.countDocuments({ user_id: userId }),
  ]);
  
  // 聚合计算 photo_count, total_days
  const photoAgg = await db.journey_days.aggregate([
    { $match: { user_id: userId } },
    { $unwind: "$photos" },
    { $count: "total" }
  ]);
  
  await db.users.updateOne(
    { _id: userId },
    { $set: { 
      "stats.journey_count": journeys,
      "stats.checkin_count": checkins,
      "stats.province_count": medals,
      "stats.photo_count": photoAgg[0]?.total || 0,
      "stats.total_days": /* 聚合 journey_days 数量 */,
      updated_at: new Date()
    }}
  );
}
```

### 4.3 软删除与回收站

```
删除旅程时：
  1. 将 journeys.status 改为 "deleted"
  2. 设置 journeys.deleted_at = now
  3. 在 trash 集合中创建记录，expire_at = now + 30天
  4. 30天后 TTL 索引自动清理 trash 记录
  5. 可配合定时任务清理 status="deleted" 且超过30天的数据

恢复时：
  1. 将 journeys.status 改回 "active"
  2. 清除 journeys.deleted_at
  3. 将 trash.restored 标记为 true
```

### 4.4 旅行人格计算

```
规则：
- 打卡点数 >= 20 且 旅程数 >= 5 → "旅行大师" 👑
- 省份数 >= 15 → "行走的地图" 🗺️
- 照片数 >= 200 → "故事收藏家" 📚
- 旅程数 >= 10 → "背包客" 🎒
- 打卡点数 >= 30 → "打卡达人" 📍
- 默认 → "探索者" 🧭
```

---

## 五、API 接口设计（参考）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/login` | 微信登录 |
| GET | `/api/users/me` | 获取当前用户信息 |
| PUT | `/api/users/me` | 更新个人资料 |
| GET | `/api/journeys` | 获取旅程列表（支持分页、筛选） |
| POST | `/api/journeys` | 创建旅程 |
| GET | `/api/journeys/:id` | 获取旅程详情 |
| PUT | `/api/journeys/:id` | 更新旅程 |
| DELETE | `/api/journeys/:id` | 软删除旅程 |
| POST | `/api/journeys/:id/restore` | 从回收站恢复旅程 |
| GET | `/api/journeys/:id/days` | 获取旅程日记列表 |
| POST | `/api/journeys/:id/days` | 添加旅程日记 |
| PUT | `/api/journeys/:id/days/:dayId` | 更新旅程日记 |
| DELETE | `/api/journeys/:id/days/:dayId` | 删除旅程日记 |
| POST | `/api/journeys/:id/days/:dayId/photos` | 上传日记照片 |
| DELETE | `/api/journeys/:id/days/:dayId/photos/:photoId` | 删除日记照片 |
| GET | `/api/checkins` | 获取打卡列表 |
| POST | `/api/checkins` | 创建打卡 |
| PUT | `/api/checkins/:id` | 更新打卡 |
| DELETE | `/api/checkins/:id` | 删除打卡 |
| POST | `/api/tracks` | 开始/停止足迹记录 |
| GET | `/api/tracks` | 获取足迹列表 |
| GET | `/api/tracks/:id` | 获取单条轨迹 |
| GET | `/api/medals` | 获取所有勋章定义 |
| GET | `/api/users/me/medals` | 获取用户勋章 |
| GET | `/api/users/me/stats` | 获取用户统计数据 |
| POST | `/api/share/exports` | 创建分享导出 |
| GET | `/api/share/exports` | 获取导出历史 |
| GET | `/api/share/templates` | 获取分享模板 |
| POST | `/api/share/templates` | 创建自定义模板 |
| PUT | `/api/settings` | 更新设置 |
| PUT | `/api/permissions` | 更新权限状态 |
| GET | `/api/trash` | 获取回收站列表 |
| DELETE | `/api/trash/:id` | 永久删除回收站项目 |
| POST | `/api/trash/:id/restore` | 恢复回收站项目 |
| POST | `/api/feedback` | 提交反馈 |

---

## 六、MySQL 建表脚本（附录）

如使用关系型数据库，以下是核心表的 SQL 建表语句：

```sql
-- 用户表
CREATE TABLE users (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  openid VARCHAR(64) NOT NULL UNIQUE,
  unionid VARCHAR(64),
  nickname VARCHAR(50) DEFAULT '旅行者',
  avatar_url VARCHAR(500),
  bio VARCHAR(200) DEFAULT '探索世界，记录美好',
  travel_personality_type VARCHAR(30) DEFAULT 'explorer',
  travel_personality_name VARCHAR(20) DEFAULT '探索者',
  journey_count INT DEFAULT 0,
  checkin_count INT DEFAULT 0,
  photo_count INT DEFAULT 0,
  province_count INT DEFAULT 0,
  total_days INT DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_login_at DATETIME,
  INDEX idx_openid (openid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 旅程表
CREATE TABLE journeys (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  name VARCHAR(100) NOT NULL,
  city VARCHAR(200),
  province VARCHAR(50),
  country VARCHAR(50) DEFAULT '中国',
  start_date DATE,
  end_date DATE,
  description TEXT,
  cover_photo VARCHAR(500),
  status VARCHAR(20) DEFAULT 'active',
  day_count INT DEFAULT 0,
  photo_count INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_user_status (user_id, status),
  INDEX idx_user_created (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 旅程标签关联表（多对多）
CREATE TABLE journey_tags (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  journey_id BIGINT NOT NULL,
  tag VARCHAR(30) NOT NULL,
  FOREIGN KEY (journey_id) REFERENCES journeys(id) ON DELETE CASCADE,
  INDEX idx_journey (journey_id),
  INDEX idx_tag (tag)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 旅程日记表
CREATE TABLE journey_days (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  journey_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  day_number INT NOT NULL,
  date DATE NOT NULL,
  title VARCHAR(200),
  content TEXT,
  location VARCHAR(200),
  mood VARCHAR(20),
  weather VARCHAR(20),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (journey_id) REFERENCES journeys(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE KEY uk_journey_date (journey_id, date),
  INDEX idx_user_date (user_id, date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 日记照片表
CREATE TABLE journey_day_photos (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  journey_day_id BIGINT NOT NULL,
  url VARCHAR(500) NOT NULL,
  thumbnail_url VARCHAR(500),
  caption VARCHAR(200),
  width INT,
  height INT,
  sort_order INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (journey_day_id) REFERENCES journey_days(id) ON DELETE CASCADE,
  INDEX idx_day (journey_day_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 打卡表
CREATE TABLE checkins (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  journey_id BIGINT,
  journey_day_id BIGINT,
  place_name VARCHAR(200) NOT NULL,
  city VARCHAR(100),
  province VARCHAR(50),
  country VARCHAR(50) DEFAULT '中国',
  longitude DECIMAL(10, 7),
  latitude DECIMAL(10, 7),
  photo VARCHAR(500),
  note TEXT,
  type VARCHAR(30) DEFAULT 'scenic',
  checkin_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (journey_id) REFERENCES journeys(id) ON DELETE SET NULL,
  INDEX idx_user_checkin (user_id, checkin_at),
  INDEX idx_user_province (user_id, province),
  INDEX idx_journey (journey_id),
  SPATIAL INDEX idx_location (POINT(longitude, latitude))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 打卡标签关联表
CREATE TABLE checkin_tags (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  checkin_id BIGINT NOT NULL,
  tag VARCHAR(30) NOT NULL,
  FOREIGN KEY (checkin_id) REFERENCES checkins(id) ON DELETE CASCADE,
  INDEX idx_checkin (checkin_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 勋章定义表
CREATE TABLE medals (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(30) NOT NULL,
  emoji VARCHAR(10),
  type VARCHAR(20) NOT NULL,
  province_code VARCHAR(10),
  province_name VARCHAR(30),
  unlock_condition_type VARCHAR(30),
  unlock_condition_threshold INT,
  tier VARCHAR(20) DEFAULT 'bronze',
  description VARCHAR(200),
  landmark VARCHAR(100),
  sort_order INT DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_type_order (type, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 用户勋章表
CREATE TABLE user_medals (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  medal_id BIGINT NOT NULL,
  medal_code VARCHAR(50) NOT NULL,
  unlocked_at DATETIME,
  unlocked_by_checkin_id BIGINT,
  progress_current INT DEFAULT 0,
  progress_target INT DEFAULT 0,
  notified TINYINT(1) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (medal_id) REFERENCES medals(id),
  UNIQUE KEY uk_user_medal (user_id, medal_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 足迹轨迹表
CREATE TABLE footprint_tracks (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  journey_id BIGINT,
  name VARCHAR(100),
  route_json JSON NOT NULL,
  total_distance DECIMAL(10, 2),
  total_duration INT,
  average_speed DECIMAL(6, 2),
  point_count INT,
  start_time DATETIME,
  end_time DATETIME,
  status VARCHAR(20) DEFAULT 'recording',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_user_time (user_id, start_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 设置表
CREATE TABLE user_settings (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL UNIQUE,
  show_location TINYINT(1) DEFAULT 1,
  show_profile TINYINT(1) DEFAULT 1,
  show_journeys TINYINT(1) DEFAULT 1,
  language VARCHAR(10) DEFAULT 'zh-CN',
  theme VARCHAR(20) DEFAULT 'light',
  map_provider VARCHAR(30) DEFAULT 'tianditu',
  auto_save_draft TINYINT(1) DEFAULT 1,
  photo_quality VARCHAR(10) DEFAULT 'high',
  notify_medal_unlock TINYINT(1) DEFAULT 1,
  notify_journey_reminder TINYINT(1) DEFAULT 1,
  notify_app_update TINYINT(1) DEFAULT 1,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 回收站表
CREATE TABLE trash (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  item_type VARCHAR(30) NOT NULL,
  item_id BIGINT NOT NULL,
  snapshot JSON NOT NULL,
  deleted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expire_at DATETIME NOT NULL,
  restored TINYINT(1) DEFAULT 0,
  restored_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_user_type (user_id, item_type),
  INDEX idx_expire (expire_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

## 七、迁移计划（LocalStorage → 云端数据库）

当前版本使用 LocalStorage 存储，数据结构如下：

```javascript
// 当前前端数据结构
{
  journeys: [],
  checkins: [],
  footprintTracks: [],
  profile: {},
  currentJourneyId: null,
  trash: [],
  carouselIndex: {},
}
```

迁移步骤：
1. **建立云端数据库**（按上述 schema）
2. **实现数据导出 API**（已有前端"导出数据"功能，可扩展为上传到云端）
3. **用户登录后自动同步**：首次登录时将 LocalStorage 数据上传到云端
4. **双写过渡期**：同时写入 LocalStorage 和云端
5. **完全迁移后**：移除 LocalStorage 依赖，改为纯云端 + 离线缓存
