const crypto = require('crypto');
const fs = require('fs');

// 生成 RSA-2048 密钥对
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});

fs.writeFileSync('remote-config-sdk/private_key.pem', privateKey);
fs.writeFileSync('remote-config-sdk/public_key.pem', publicKey);
console.log('[OK] Keys saved to remote-config-sdk/');

// 读取 update.json 并签名
const updateJson = fs.readFileSync('public/update.json', 'utf8');
const sign = crypto.createSign('SHA256');
sign.update(updateJson);
const signature = sign.sign(privateKey, 'base64');
console.log('[OK] Signature: ' + signature);

// 将签名加入 update.json
const json = JSON.parse(updateJson);
json._signature = signature;
fs.writeFileSync('public/update.json', JSON.stringify(json, null, 2) + '\n');
console.log('[OK] update.json updated with _signature');

// 输出公钥单行格式（供 SDK 使用）
const pubKeyOneLine = publicKey
  .replace('-----BEGIN PUBLIC KEY-----', '')
  .replace('-----END PUBLIC KEY-----', '')
  .replace(/\n/g, '')
  .trim();
console.log('');
console.log('=== PUBLIC KEY FOR SDK (copy this) ===');
console.log(pubKeyOneLine);
console.log('=== END PUBLIC KEY ===');
