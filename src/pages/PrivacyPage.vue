<template>
  <div class="privacy-page">
    <div class="top-bar">
      <button class="back-btn" @click="$router.back()">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#333" stroke-width="2" stroke-linecap="round"><path d="M15 18l-6-6 6-6"/></svg>
      </button>
      <span class="top-title">隐私声明</span>
      <div style="width:22px"></div>
    </div>

    <div class="content">
      <h1 class="doc-title">轻印隐私声明</h1>
      <p class="doc-subtitle">版本：2026年6月9日更新 · 生效日期：2026年6月9日</p>

      <div class="highlight-box">
        <p class="highlight-text">我们深知个人信息对您的重要性。本声明旨在向您清晰地说明我们会收集哪些信息、如何使用这些信息以及如何保护您的隐私安全。</p>
      </div>

      <div class="section">
        <h2>一、我们收集的信息</h2>
        
        <h3 class="sub-title">1.1 您主动提供的信息</h3>
        <table class="info-table">
          <tr><th>信息类型</th><th>具体内容</th><th>收集目的</th></tr>
          <tr><td>账号信息</td><td>用户名、手机号码（可选）、密码哈希值</td><td>账号注册与身份识别</td></tr>
          <tr><td>个人资料</td><td>昵称、头像、个性签名</td><td>个性化展示</td></tr>
          <tr><td>旅行内容</td><td>旅程名称、日记文字、照片、打卡地点</td><td>核心功能服务</td></tr>
          <tr><td>反馈信息</td><td>问题描述、建议内容</td><td>产品优化与服务改进</td></tr>
        </table>

        <h3 class="sub-title">1.2 自动收集的信息</h3>
        <table class="info-table">
          <tr><th>信息类型</th><th>具体内容</th><th>收集目的</th></tr>
          <tr><td>设备信息</td><td>设备型号、操作系统、唯一设备标识符</td><td>保障服务正常运行</td></tr>
          <tr><td>日志信息</td><td>IP地址、访问时间、页面操作记录</td><td>故障排查和安全审计</td></tr>
          <tr><td>位置信息</td><td>GPS定位坐标（仅在您主动使用打卡/轨迹功能时）</td><td>地图标记与足迹记录</td></tr>
        </table>
      </div>

      <div class="section">
        <h2>二、我们如何使用信息</h2>
        <p>我们将收集的信息用于以下目的：</p>
        <div class="purpose-grid">
          <div class="purpose-item">
            <span class="purpose-icon">🔐</span>
            <span class="purpose-label">账号管理</span>
            <span class="purpose-desc">身份验证、账号安全防护</span>
          </div>
          <div class="purpose-item">
            <span class="purpose-icon">✍️</span>
            <span class="purpose-label">核心服务</span>
            <span class="purpose-desc">旅程记录、日记管理、地图打卡</span>
          </div>
          <div class="purpose-item">
            <span class="purpose-icon">📊</span>
            <span class="purpose-label">数据分析</span>
            <span class="purpose-desc">旅行统计、数据洞察、勋章系统</span>
          </div>
          <div class="purpose-item">
            <span class="purpose-icon">🛡️</span>
            <span class="purpose-label">安全保障</span>
            <span class="purpose-desc">防范欺诈、检测滥用行为</span>
          </div>
          <div class="purpose-item">
            <span class="purpose-icon">💬</span>
            <span class="purpose-label">客户服务</span>
            <span class="purpose-desc">处理反馈、解答疑问</span>
          </div>
          <div class="purpose-item">
            <span class="purpose-icon">📈</span>
            <span class="purpose-label">产品改进</span>
            <span class="purpose-desc">优化功能体验、修复问题</span>
          </div>
        </div>
        <p class="notice-text">⚠️ 我们不会将您的信息用于本声明未载明的其他目的。如果我们要将信息用于未声明的用途，我们会事先征求您的同意。</p>
      </div>

      <div class="section">
        <h2>三、信息的存储与保护</h2>
        <h3 class="sub-title">3.1 存储地点与期限</h3>
        <ul>
          <li>您的账户信息和旅行数据存储于 Cloudflare D1 数据库服务器（亚太区域）。</li>
          <li>部分临时数据可能存储于您设备的本地浏览器中（LocalStorage）。</li>
          <li>我们将在实现本声明所述目的所需的期限内保留您的个人信息，通常为账号存续期间。账号注销后，您的数据将在30天内彻底删除且无法恢复。</li>
        </ul>

        <h3 class="sub-title">3.2 安全措施</h3>
        <ul>
          <li><strong>加密传输</strong>：所有数据通过 HTTPS 加密传输，防止中间人攻击。</li>
          <li><strong>密码安全</strong>：您的密码经 SHA-256 哈希加盐处理后存储，即使数据库被攻破也无法还原原始密码。</li>
          <li><strong>Token 鉴权</strong>：登录后使用 JWT Token 进行会话验证，有效期7天，过期需重新登录。</li>
          <li><strong>访问控制</strong>：严格限制内部人员对用户数据的访问权限。</li>
        </ul>
      </div>

      <div class="section">
        <h2>四、信息的共享与披露</h2>
        <p>除以下情况外，我们不会向第三方共享您的个人信息：</p>
        <ul>
          <li><strong>获得您的明确同意</strong>：在您主动授权的情况下，我们可能会与第三方服务共享必要信息（如社交平台登录时的身份信息）。</li>
          <li><strong>法律法规要求</strong>：根据法律法规、行政或司法机关的强制性要求进行披露。</li>
          <li><strong>保护合法权益</strong>：为维护我们或关联方的合法权益（包括防止欺诈等违法行为）而有必要披露时。</li>
          <li><strong>服务合作方</strong>：与我们的技术服务商（如 Cloudflare、Vercel 等）共享必要信息以提供服务，这些合作方均有严格的保密义务。</li>
        </ul>
        <p class="notice-text important">🚫 我们<strong>绝不会</strong>向任何第三方出售您的个人信息。</p>
      </div>

      <div class="section">
        <h2>五、Cookie 与同类技术</h2>
        <p>为确保应用正常运行，我们会在本地存储少量数据：</p>
        <ul>
          <li><strong>LocalStorage</strong>：用于存储您的登录状态（Token）、旅行数据、权限设置等，确保离线可用。</li>
          <li><strong>Session 数据</strong>：用于维持当前会话状态，会话结束即失效。</li>
        </ul>
        <p>您可以通过清除浏览器数据来删除这些本地存储的数据，但这可能导致您需要重新登录且丢失未同步的本地数据。</p>
      </div>

      <div class="section">
        <h2>六、您的权利</h2>
        <p>根据相关法律法规，您对个人信息享有以下权利：</p>
        <div class="rights-list">
          <div class="right-item">
            <div class="right-num">01</div>
            <div class="right-content">
              <strong>知情权</strong>
              <p>了解我们收集了哪些信息、如何使用的权利。</p>
            </div>
          </div>
          <div class="right-item">
            <div class="right-num">02</div>
            <div class="right-content">
              <strong>访问权</strong>
              <p>查阅我们持有的关于您个人信息的权利。</p>
            </div>
          </div>
          <div class="right-item">
            <div class="right-num">03</div>
            <div class="right-content">
              <strong>更正权</strong>
              <p>修正不准确或不完整信息的权利。</p>
            </div>
          </div>
          <div class="right-item">
            <div class="right-num">04</div>
            <div class="right-content">
              <strong>删除权</strong>
              <p>在符合法律规定的情况下要求删除个人信息的权利。</p>
            </div>
          </div>
          <div class="right-item">
            <div class="right-num">05</div>
            <div class="right-content">
              <strong>撤回授权</strong>
              <p>随时撤回已给予我们的处理许可的权利。</p>
            </div>
          </div>
          <div class="right-item">
            <div class="right-num">06</div>
            <div class="right-content">
              <strong>注销账号</strong>
              <p>随时申请注销账号并清除所有数据的权利。</p>
            </div>
          </div>
        </div>
        <p>如需行使以上权利，请通过应用内「设置 → 清除所有数据」或联系我们处理。</p>
      </div>

      <div class="section">
        <h2>七、儿童隐私保护</h2>
        <p>我们非常重视对儿童个人信息的保护。若您是18周岁以下的未成年人，请在法定监护人的陪同下阅读本声明，并在取得法定监护人同意后使用我们的服务。</p>
        <p>如果我们发现在未获得可证实的父母/法定监护人同意的情况下收集了儿童的个人信息，我们会尽快删除相关信息。如发现此类情况，请立即联系我们。</p>
      </div>

      <div class="section">
        <h2>八、本声明的更新</h2>
        <p>我们可能会适时对本声明进行更新。重大变更将通过应用内弹窗等方式通知您。建议您定期查看本声明，以便了解最新的隐私政策。</p>
        <p>未经您的明确同意，我们不会降低本声明规定的保护标准。在更新的条款生效前，您的个人信息仍会受到原有条款的保护。</p>
      </div>

      <div class="section last-section">
        <h2>九、联系我们</h2>
        <p>如您对本隐私声明有任何疑问、意见或投诉，欢迎通过以下方式联系我们：</p>
        <div class="contact-card">
          <div class="contact-row"><span class="contact-icon">📮</span>反馈渠道：<span>「我的」→「设置」→「开发者反馈」</span></div>
          <div class="contact-row"><span class="contact-icon">📧</span>邮箱地址：<span>privacy@qingyinapp.cn</span></div>
          <div class="contact-row"><span class="contact-icon">⏰</span>响应时间：<span>一般7个工作日内回复</span></div>
        </div>
      </div>

      <p class="doc-footer">轻印团队 · 2026年6月</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
const router = useRouter()
</script>

<style scoped>
.privacy-page {
  min-height: 100vh;
  background: #FFFFFF;
}
.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: max(12px, env(safe-area-inset-top));
  padding-bottom: 12px;
  padding-left: 16px; padding-right: 16px;
  border-bottom: 1px solid #F0F0F0;
}
.back-btn { background: none; border: none; cursor: pointer; padding: 4px; display: flex; align-items: center; }
.top-title { font-size: 17px; font-weight: 600; color: #333; }

.content {
  padding: 20px 20px 40px;
  max-width: 600px;
  margin: 0 auto;
}
.doc-title {
  text-align: center;
  font-size: 20px;
  font-weight: 700;
  color: #222;
  margin: 0 0 4px;
}
.doc-subtitle {
  text-align: center;
  font-size: 13px;
  color: #999;
  margin: 0 0 20px;
}

.highlight-box {
  background: linear-gradient(135deg, #f0faf0, #e8f5e9);
  border-radius: 12px;
  padding: 16px 18px;
  margin-bottom: 28px;
  border-left: 4px solid #5CB85C;
}
.highlight-text {
  font-size: 14px;
  color: #444;
  line-height: 1.7;
  margin: 0;
}

.section {
  margin-bottom: 26px;
}
.section h2 {
  font-size: 16px;
  font-weight: 700;
  color: #333;
  margin: 0 0 12px;
  position: relative;
  padding-left: 14px;
}
.section h2::before {
  content: '';
  position: absolute;
  left: 0;
  top: 3px;
  width: 4px;
  height: 16px;
  background: #5CB85C;
  border-radius: 2px;
}
.sub-title {
  font-size: 15px;
  font-weight: 600;
  color: #444;
  margin: 16px 0 8px;
}
.section p {
  font-size: 14px;
  color: #555;
  line-height: 1.75;
  margin: 0 0 10px;
  text-align: justify;
}
.section ul {
  margin: 8px 0;
  padding-left: 20px;
}
.section li {
  font-size: 14px;
  color: #555;
  line-height: 1.7;
  margin-bottom: 6px;
}

/* 信息表格 */
.info-table {
  width: 100%;
  border-collapse: collapse;
  margin: 12px 0;
  font-size: 13px;
}
.info-table th {
  background: #F7F8FA;
  padding: 10px 12px;
  text-align: left;
  font-weight: 600;
  color: #444;
  border-bottom: 2px solid #E8EBF0;
}
.info-table td {
  padding: 10px 12px;
  border-bottom: 1px solid #F0F0F0;
  color: #666;
  vertical-align: top;
}

/* 用途网格 */
.purpose-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin: 14px 0;
}
.purpose-item {
  background: #FAFBFC;
  border-radius: 10px;
  padding: 12px;
  display: flex;
  align-items: flex-start;
  gap: 8px;
}
.purpose-icon { font-size: 18px; flex-shrink: 0; margin-top: 1px; }
.purpose-label { font-size: 13px; font-weight: 600; color: #333; display: block; }
.purpose-desc { font-size: 12px; color: #888; display: block; margin-top: 2px; }

.notice-text {
  font-size: 13px !important;
  color: #777 !important;
  background: #FFFBF0;
  padding: 10px 14px;
  border-radius: 8px;
  margin: 12px 0 !important;
}
.notice-text.important {
  background: #FFF5F5;
  color: #C0392B !important;
}

/* 权利列表 */
.rights-list {
  margin: 14px 0;
}
.right-item {
  display: flex;
  gap: 14px;
  padding: 12px 0;
  border-bottom: 1px solid #F5F5F5;
}
.right-item:last-child { border-bottom: none; }
.right-num {
  width: 36px; height: 36px;
  background: linear-gradient(135deg, #7BC96F, #4CAF50);
  color: white;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 13px;
  font-weight: 700;
  flex-shrink: 0;
}
.right-content strong { font-size: 14px; color: #333; display: block; margin-bottom: 2px; }
.right-content p { font-size: 13px; color: #888; margin: 0; }

/* 联系卡片 */
.contact-card {
  background: #F8F9FA;
  border-radius: 12px;
  padding: 16px 18px;
}
.contact-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #555;
  margin-bottom: 10px;
}
.contact-row:last-child { margin-bottom: 0; }
.contact-icon { flex-shrink: 0; }
.contact-row span:last-child { color: #333; font-weight: 500; }

.doc-footer {
  text-align: center;
  font-size: 13px;
  color: #AAA;
  margin-top: 32px;
}
.last-section {
  border-top: 1px solid #EEE;
  padding-top: 20px;
}
</style>
