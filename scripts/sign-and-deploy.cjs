#!/usr/bin/env node
/**
 * update.json 自动签名脚本。
 * 每次修改 update.json 后运行此脚本：
 * 1. 用私钥对 JSON 内容签名
 * 2. 将 Base64 签名写入 _signature 字段
 * 3. 提交并推送到 GitHub（触发 Cloudflare/Vercel 自动部署）
 *
 * 用法：
 *   node scripts/sign-and-deploy.cjs
 *   node scripts/sign-and-deploy.cjs "chore: update version to 1.5.0"
 */

const fs = require('fs');
const crypto = require('crypto');
const { execSync } = require('child_process');

// ---- 配置 ----
const UPDATE_JSON_PATH = 'public/update.json';
const PRIVATE_KEY_PATH = 'remote-config-sdk/private_key.pem';
const COMMIT_MESSAGE = process.argv[2] || 'chore: update remote config';

// ---- 签名 ----
function signUpdate() {
  console.log('[1/4] Reading update.json...');
  const rawJson = fs.readFileSync(UPDATE_JSON_PATH, 'utf8');

  // 解析 JSON，移除旧签名后重新签名
  const config = JSON.parse(rawJson);
  delete config._signature;

  // 重新序列化（保证签名一致性：不带签名的纯净 JSON）
  const cleanJson = JSON.stringify(config, null, 2) + '\n';

  console.log('[2/4] Signing with private key...');
  const privateKey = fs.readFileSync(PRIVATE_KEY_PATH, 'utf8');
  const sign = crypto.createSign('SHA256');
  sign.update(cleanJson);
  const signature = sign.sign(privateKey, 'base64');

  // 将签名写回
  config._signature = signature;
  fs.writeFileSync(UPDATE_JSON_PATH, JSON.stringify(config, null, 2) + '\n', 'utf8');
  console.log('  ✓ Signature: ' + signature.slice(0, 40) + '...');
  return signature;
}

// ---- Git 提交推送 ----
function deploy() {
  console.log('[3/4] Committing to git...');
  execSync(`git add "${UPDATE_JSON_PATH}"`, { stdio: 'inherit' });

  // 检查是否有变更
  const status = execSync('git status --porcelain', { encoding: 'utf8' }).trim();
  if (!status.includes(UPDATE_JSON_PATH)) {
    console.log('  ⚠ No changes to commit');
    return false;
  }

  execSync(`git commit -m "${COMMIT_MESSAGE}"`, { stdio: 'inherit' });

  console.log('[4/4] Pushing to GitHub...');
  try {
    execSync('git push', { stdio: 'inherit' });
    console.log('  ✓ Pushed successfully');
  } catch {
    console.log('  ⚠ Push failed (may need to pull first)');
    return false;
  }

  return true;
}

// ---- 执行 ----
try {
  console.log('═══════════════════════════════════');
  console.log('  Remote Config Sign & Deploy');
  console.log('═══════════════════════════════════');
  signUpdate();
  deploy();
  console.log('  ✓ Done! Cloudflare/Vercel will auto-deploy.');
} catch (err) {
  console.error('✗ Error:', err.message);
  process.exit(1);
}
