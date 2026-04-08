const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Vercel Token
const VERCEL_TOKEN = process.argv[2];
const PROJECT_NAME = 'shengongji';

// 设置环境变量
process.env.VERCEL_TOKEN = VERCEL_TOKEN;
process.env.VERCEL_ORG_ID = '';
process.env.VERCEL_PROJECT_ID = '';

console.log('🚀 开始部署深宫纪到 Vercel...\n');

// 创建 Vercel 配置文件
const vercelJson = {
  "name": PROJECT_NAME,
  "git": {
    "deploymentEnabled": {
      "main": true
    }
  }
};

fs.writeFileSync(
  path.join(__dirname, 'vercel.json'),
  JSON.stringify(vercelJson, null, 2)
);

try {
  // 使用 Vercel CLI 部署
  const result = execSync(
    `npx vercel --yes --token=${VERCEL_TOKEN}`,
    { cwd: __dirname, encoding: 'utf8' }
  );
  
  console.log('✅ 部署成功!');
  console.log(result);
} catch (error) {
  console.error('❌ 部署失败:', error.message);
  process.exit(1);
}
