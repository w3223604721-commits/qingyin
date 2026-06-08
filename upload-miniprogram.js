/**
 * 轻印小程序 - CI 自动上传脚本
 * 使用方法：
 * 1. 从微信小程序后台下载代码上传密钥（.key 文件）放到项目根目录
 *    路径：微信小程序后台 -> 开发 -> 开发管理 -> 开发设置 -> 小程序代码上传密钥
 * 2. 运行：node upload-miniprogram.js
 */
const ci = require('miniprogram-ci');
const path = require('path');

const PROJECT_PATH = path.resolve(__dirname);
const PRIVATE_KEY_PATH = path.resolve(__dirname, 'private.wxf4a03848abf825e6.key');

// 检查密钥文件
const fs = require('fs');
if (!fs.existsSync(PRIVATE_KEY_PATH)) {
  console.error('❌ 未找到 CI 上传密钥文件！');
  console.error('');
  console.error('请按以下步骤获取密钥：');
  console.error('1. 登录微信小程序后台：https://mp.weixin.qq.com/');
  console.error('2. 进入：开发 -> 开发管理 -> 开发设置');
  console.error('3. 找到"小程序代码上传密钥"，点击"生成"或"下载"');
  console.error('4. 将下载的 .key 文件重命名为 private.wxf4a03848abf825e6.key');
  console.error('5. 放到项目根目录下');
  console.error('');
  console.error('或者通过微信开发者工具手动上传：');
  console.error('1. 用微信开发者工具打开当前项目');
  console.error('2. 点击工具栏"上传"按钮');
  console.error('3. 填写版本号：1.0.0，描述：内测2.0');
  process.exit(1);
}

(async () => {
  const project = new ci.Project({
    appid: 'wxf4a03848abf825e6',
    type: 'miniProgram',
    projectPath: PROJECT_PATH,
    privateKeyPath: PRIVATE_KEY_PATH,
    ignores: ['node_modules/**/*', '.git/**/*', 'dist/**/*', 'background/**/*', 
              'prototype/**/*', 'figma-plugin/**/*', 'rules/**/*', 'codebuddy-plugin/**/*',
              'wechat/**/*', 'public/**/*', 'src/**/*'],
  });

  try {
    console.log('📦 正在上传小程序代码...');
    const uploadResult = await ci.upload({
      project,
      version: '1.0.0',
      desc: '内测2.0 - 新增登录系统、用户协议、足迹报告、勋章弹窗、全屏地图、全局更名轻印',
      setting: {
        es6: true,
        es7: true,
        minify: true,
        autoPrefixWXSS: true,
      },
      onProgressUpdate: (progress) => {
        if (progress.status === 'doing') {
          console.log(`  ⏳ 上传中... ${progress.message || ''}`);
        }
      },
    });
    console.log('✅ 小程序上传成功！');
    console.log('');
    console.log('下一步：');
    console.log('1. 登录微信小程序后台：https://mp.weixin.qq.com/');
    console.log('2. 进入：管理 -> 版本管理');
    console.log('3. 找到刚上传的版本（v1.0.0），设置为"体验版"');
    console.log('4. 将体验版二维码分享给测试人员');
  } catch (err) {
    console.error('❌ 上传失败:', err.message);
    process.exit(1);
  }
})();
