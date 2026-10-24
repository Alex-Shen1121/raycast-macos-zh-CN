import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { sha256 } from './build.mjs';

assert.equal(process.argv.length, 4, '用法：node scripts/verify-install.mjs 原版应用路径 补丁目录');
const original = fs.realpathSync(process.argv[2]), pack = fs.realpathSync(process.argv[3]);
const testDirectory = fs.mkdtempSync(path.join(path.dirname(pack), '验证-'));
const app = path.join(testDirectory, 'Raycast.app');
execFileSync('/usr/bin/ditto', [original, app]);
const script = path.join(pack, 'patch.sh');
const manifestPath = path.join(pack, 'manifest.tsv');
const manifest = fs.readFileSync(manifestPath, 'utf8');
const rows = manifest.trim().split('\n').map(line => line.split('\t'));
const checks = [];
const backup = path.join(os.homedir(), 'Library/Application Support/Raycast-Chinese-Patch/2.9.0.0', sha256(app));
function check(mode, expected, message, input) {
  const result = spawnSync('/bin/bash', [script, mode, app], { encoding: 'utf8', input });
  const output = result.stdout + result.stderr;
  assert.equal(result.status, expected, output);
  if (message) assert(output.includes(message), output);
  checks.push({ operation: mode, expectedExit: expected, actualExit: result.status, message });
  console.log(`通过：${mode} ${message ?? ''}`);
}
function unchanged(column = 0) {
  for (const row of rows) assert.equal(sha256(fs.readFileSync(path.join(app, row[2]))), row[column], row[2]);
  assert.equal(sha256(fs.readFileSync(path.join(app, 'Contents/MacOS/Raycast'))), fs.readFileSync(path.join(pack, 'native-sha256.txt'), 'utf8').trim());
}
function temporaryChange(file, data, run) {
  const before = fs.readFileSync(file);
  try { fs.writeFileSync(file, data); run(); }
  finally { fs.writeFileSync(file, before); }
}

check('--check', 0, '检查通过');
const plist = path.join(app, 'Contents/Info.plist');
const originalPlist = fs.readFileSync(plist);
try {
  execFileSync('/usr/libexec/PlistBuddy', ['-c', 'Set CFBundleShortVersionString 2.8.2.0', plist]);
  check('--apply', 1, '版本不匹配');
} finally { fs.writeFileSync(plist, originalPlist); }
unchanged();
temporaryChange(path.join(app, rows[0][2]), '损坏的原版资源', () => check('--apply', 1, '原版资源不匹配'));
unchanged();
temporaryChange(path.join(pack, 'payload', rows[0][2]), '损坏的补丁资源', () => check('--apply', 1, '补丁文件校验失败'));
unchanged();
temporaryChange(manifestPath, rows[0][0] + '\t' + rows[0][1] + '\tContents/Resources/../../outside\n', () => check('--apply', 1, '补丁清单格式或路径无效'));
unchanged();
const firstResource = path.join(app, rows[0][2]), linkTarget = path.join(testDirectory, '资源副本.js');
fs.renameSync(firstResource, linkTarget);
try { fs.symlinkSync(linkTarget, firstResource); check('--apply', 1, '符号链接'); }
finally { fs.unlinkSync(firstResource); fs.renameSync(linkTarget, firstResource); }
unchanged();
assert(!fs.existsSync(backup), '失败检查不应创建备份');
check('--interactive-apply', 0, '已取消，未修改应用', app + '\nn\n');
unchanged();
check('--apply', 0, '全部目标文件校验通过');
unchanged(1);
checks.push({ operation: '逐文件与原生程序指纹检查', resourceFiles: rows.length, passed: true });
check('--apply', 1, '原版资源不匹配');
temporaryChange(firstResource, '安装后发生额外更改', () => check('--restore', 1, '应用已更新或另有修改'));
unchanged(1);
temporaryChange(path.join(backup, 'files', rows[0][2]), '损坏的备份', () => check('--restore', 1, '备份损坏'));
unchanged(1);
check('--restore', 0, '完整签名检查通过');
unchanged();
execFileSync('/usr/bin/codesign', ['--verify', '--deep', '--strict', app]);
check('--check', 0, '检查通过');
const report = {
  checkedAt: new Date().toISOString(),
  scope: '在完整官方原版副本上测试安装、保护措施和还原；不代表其他机器的 Gatekeeper 启动验证。',
  passed: true,
  restoredOfficialSignature: true,
  checks
};
fs.writeFileSync(path.join(pack, '验证报告.json'), JSON.stringify(report, null, 2) + '\n');
console.log(`通过全部 ${checks.length} 项检查；副本及恢复备份保留供复核。`);
