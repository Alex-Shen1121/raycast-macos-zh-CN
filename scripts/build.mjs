import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'acorn';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const sha256 = value => createHash('sha256').update(value).digest('hex');
export function validatePath(relative) {
  assert(relative.startsWith('Contents/Resources/'), '资源必须位于应用资源目录');
  assert(relative.split('/').every(part => part && part !== '.' && part !== '..'), '资源路径越界');
  assert(!/[\t\r\n\\]/.test(relative), '资源路径包含非法字符');
}

export function applyEdits(source, edits) {
  let previousEnd = 0;
  for (const edit of edits) {
    assert(Number.isInteger(edit.start) && Number.isInteger(edit.end), '替换位置必须为整数');
    assert(edit.start >= previousEnd && edit.end >= edit.start && edit.end <= source.length, '替换位置重叠或越界');
    assert.equal(source.slice(edit.start, edit.end), edit.before, '替换原文不匹配');
    assert.equal(typeof edit.after, 'string', '替换译文必须为字符串');
    previousEnd = edit.end;
  }
  for (const edit of [...edits].reverse()) {
    source = source.slice(0, edit.start) + edit.after + source.slice(edit.end);
  }
  return source;
}

export function build(app, destination) {
  app = fs.realpathSync(app);
  destination = path.resolve(destination);
  assert(!fs.existsSync(destination), '输出目录已存在，请使用新的目录');
  assert(!destination.startsWith(app + path.sep), '不能在原版应用内构建补丁');
  const spec = JSON.parse(fs.readFileSync(path.join(root, 'translations/2.9.0.0.json')));
  const version = execFileSync('/usr/libexec/PlistBuddy', ['-c', 'Print CFBundleShortVersionString', path.join(app, 'Contents/Info.plist')], { encoding: 'utf8' }).trim();
  assert.equal(version, spec.version, '原版版本不匹配');
  assert.equal(sha256(fs.readFileSync(path.join(app, 'Contents/MacOS/Raycast'))), spec.nativeSha256, '原生程序指纹不匹配');
  execFileSync('/usr/bin/codesign', ['--verify', '--deep', '--strict', app], { stdio: 'pipe' });
  const prepared = [], paths = new Set();
  for (const file of spec.files) {
    validatePath(file.file);
    assert(!paths.has(file.file), '资源路径重复');
    paths.add(file.file);
    const sourcePath = path.join(app, file.file);
    assert.equal(fs.realpathSync(sourcePath), sourcePath, '资源路径不能经过符号链接');
    const original = fs.readFileSync(sourcePath);
    assert.equal(sha256(original), file.sha256, `原版资源不匹配：${file.file}`);
    let translated = applyEdits(original.toString('utf8'), file.edits);
    for (const helper of file.helpers ?? []) {
      assert(/^[a-z-]+\.js$/.test(helper), '帮助函数路径无效');
      translated += '\n' + fs.readFileSync(path.join(root, 'helpers', helper), 'utf8');
    }
    parse(translated, { ecmaVersion: 'latest', sourceType: 'module' });
    prepared.push({ ...file, translated, translatedSha256: sha256(translated) });
  }
  fs.mkdirSync(destination, { recursive: true });
  fs.cpSync(path.join(root, 'installer'), destination, { recursive: true });
  for (const file of prepared) {
    const target = path.join(destination, 'payload', file.file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, file.translated);
  }
  fs.writeFileSync(path.join(destination, 'manifest.tsv'), prepared.map(file => `${file.sha256}\t${file.translatedSha256}\t${file.file}\n`).join(''));
  fs.writeFileSync(path.join(destination, 'native-sha256.txt'), spec.nativeSha256 + '\n');
  const info = {
    version: spec.version,
    architecture: spec.architecture,
    resourceFiles: prepared.length,
    replacements: prepared.reduce((sum, file) => sum + file.edits.length, 0),
    upstreamVersion: spec.upstreamVersion,
    upstreamPackageSha256: spec.upstreamPackageSha256,
    nativeExecutableUnchanged: true,
    completeLocalization: false,
    sourceScopeDate: '2026-09-21',
    storePlugins: 100,
    retainedOutsideScope: ['Mole'],
    machineDraftsIncluded: false
  };
  fs.writeFileSync(path.join(destination, '包信息.json'), JSON.stringify(info, null, 2) + '\n');
  for (const name of ['patch.sh', '安装汉化.command', '恢复原版.command']) fs.chmodSync(path.join(destination, name), 0o755);
  return info;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert.equal(process.argv.length, 4, '用法：node scripts/build.mjs 原版应用路径 输出目录');
  console.log(JSON.stringify(build(process.argv[2], process.argv[3]), null, 2));
}
