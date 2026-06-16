const ci = require('miniprogram-ci');
const path = require('path');
const fs = require('fs');

const PROJECT_PATH = path.resolve(__dirname, 'miniprogram');
const KEY_PATH = path.resolve(__dirname, 'private.wxf4a03848abf825e6.key');

console.log('Key exists:', fs.existsSync(KEY_PATH));
console.log('Project path:', PROJECT_PATH);
console.log('Project dir exists:', fs.existsSync(PROJECT_PATH));

const project = new ci.Project({
  appid: 'wxf4a03848abf825e6',
  type: 'miniProgram',
  projectPath: PROJECT_PATH,
  privateKeyPath: KEY_PATH,
  ignores: ['node_modules/**/*', '.git/**/*', 'dist/**/*', 'background/**/*', 
            'prototype/**/*', 'figma-plugin/**/*', 'wechat/**/*', 'src/**/*'],
});

console.log('Project created, uploading...');

ci.upload({
  project,
  version: '2.0.1',
  desc: '轻印旅行记忆 v2.0.1 | Developer: WEI',
  setting: {
    es6: true,
    es7: true,
    minify: true,
    autoPrefixWXSS: true,
  },
  onProgressUpdate: (progress) => {
    if (progress.status === 'doing') console.log('  ', progress.message || '');
  },
}).then((result) => {
  console.log('✅ Upload success!');
  console.log(JSON.stringify(result));
}).catch((err) => {
  console.error('❌ Upload failed:');
  console.error(err.message || err);
  if (err.errCode) console.error('Error code:', err.errCode);
});
