// dist を再帰削除するクリーンスクリプト
// Node 24 + Windows + 日本語パスでは fs.rmSync / Vite の emptyOutDir がクラッシュするため、
// unlinkSync / rmdirSync（非再帰）で手動削除する。
const fs = require('fs');
const path = require('path');

function remove(p) {
  if (!fs.existsSync(p)) return;
  const stat = fs.lstatSync(p);
  if (stat.isDirectory()) {
    for (const entry of fs.readdirSync(p)) remove(path.join(p, entry));
    fs.rmdirSync(p);
  } else {
    fs.unlinkSync(p);
  }
}

remove(path.join(__dirname, '..', 'dist'));
