const fs = require("fs");
const crypto = require("crypto");
const cp = require("child_process");

const tmp = process.env.TEMP + "\\old-update.json";
cp.execSync('git show HEAD~1:public/update.json > "' + tmp + '"', { encoding: "utf8" });

// 从 RemoteConfigProvider.jsx 提取硬编码公钥
const src = fs.readFileSync("src/components/RemoteConfigProvider.jsx", "utf8");
const m = src.match(/PUBLIC_KEY_PEM = \[([\s\S]*?)\].join/);
if (!m) { console.log("未找到 PUBLIC_KEY_PEM"); process.exit(1); }
const lines = [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
const pubKey = lines.join("\n");

const verify = (path) => {
  const cfg = JSON.parse(fs.readFileSync(path, "utf8"));
  const sig = cfg._signature;
  delete cfg._signature;
  const clean = JSON.stringify(cfg, null, 2) + "\n";
  const v = crypto.createVerify("SHA256");
  v.update(clean);
  return v.verify(pubKey, sig, "base64");
};

console.log("旧签名(客户端公钥):", verify(tmp) ? "有效" : "无效");
console.log("新签名(客户端公钥):", verify("public/update.json") ? "有效" : "无效");
