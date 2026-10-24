import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';
import { parse } from 'acorn';
import { applyEdits, validatePath } from '../scripts/build.mjs';

test('替换使用原始 UTF-16 位置，拒绝错位和重叠', () => {
  assert.equal(applyEdits('😀 title: `Hello`', [{ start: 10, end: 17, before: '`Hello`', after: '"你好"' }]), '😀 title: "你好"');
  assert.equal(applyEdits('`${name}`', [{ start: 8, end: 8, before: '', after: ' 个' }]), '`${name} 个`');
  assert.throws(() => applyEdits('abc', [{ start: 0, end: 1, before: 'z', after: 'x' }]));
  assert.throws(() => applyEdits('abc', [{ start: 0, end: 2, before: 'ab', after: 'x' }, { start: 1, end: 3, before: 'bc', after: 'y' }]));
  assert.throws(() => applyEdits('abc', [{ start: -1, end: 3, before: 'c', after: 'x' }]));
});

test('资源路径不能越界', () => {
  validatePath('Contents/Resources/frontend/main.js');
  for (const name of ['/tmp/file', 'Contents/Resources/../../Info.plist', 'Contents/Resources//main.js', 'Contents/Resources/a\nfile']) {
    assert.throws(() => validatePath(name));
  }
});

const context = vm.createContext({ console });
vm.runInContext(fs.readFileSync(new URL('../helpers/store.js', import.meta.url), 'utf8'), context);
vm.runInContext(fs.readFileSync(new URL('../helpers/extension-api.js', import.meta.url), 'utf8'), context);

test('插件翻译只改已识别组件的显示文案，保留数据、网址和协议字段', () => {
  const source = 'const api=require("@raycast/api"),jsx=require("react/jsx-runtime");const data={title:"Delete",value:"Delete",url:"https://example.com/Delete"};jsx.jsx(api.Action,{title:"Delete",id:"Delete",onAction:()=>data});';
  const result = context.__rcLiteralDisplayTransform(source, { parse }, text => text === 'Delete' ? '删除' : text);
  assert.equal(result.edits.length, 1);
  assert.match(result.output, /api.Action,\{title:"删除",id:"Delete"/);
  assert.match(result.output, /data=\{title:"Delete",value:"Delete",url:"https:\/\/example.com\/Delete"\}/);
});

test('插件本地同名变量、重赋值和动态用户文字不被翻译', () => {
  const sources = [
    'const api=require("@raycast/api"),jsx=require("react/jsx-runtime");function f(api){return jsx.jsx(api.Action,{title:"Delete"})}',
    'let api=require("@raycast/api");const jsx=require("react/jsx-runtime");api=other;jsx.jsx(api.Action,{title:"Delete"});',
    'const api=require("@raycast/api"),jsx=require("react/jsx-runtime");jsx.jsx(api.Action,{title:userText});'
  ];
  for (const source of sources) assert.equal(context.__rcLiteralDisplayTransform(source, { parse }, () => '删除').output, source);
});

test('原生提示翻译不改写原对象或非显示 API 参数', () => {
  const original = { title: 'Delete', id: 'Delete', primaryAction: { title: 'Cancel', id: 'Cancel' } };
  assert.equal(context.__rcNativeMessageZh('writeFile', original), original);
  const translated = context.__rcNativeMessageZh('showAlert', original);
  assert.equal(translated.title, '删除');
  assert.equal(translated.primaryAction.title, '取消');
  assert.equal(translated.primaryAction.id, 'Cancel');
  assert.equal(original.primaryAction.title, 'Cancel');
});

test('运行时内置解析器可处理实际插件代码', () => {
  const parser = context.__rcLiteralParser();
  assert.equal(parser.parse('const value = item?.name ?? "";', { ecmaVersion: 'latest' }).type, 'Program');
});

test('2.9 关键文案覆盖前后端，导入路径和机器标识不在新增译文中', () => {
  const spec = JSON.parse(fs.readFileSync(new URL('../translations/2.9.0.0.json', import.meta.url)));
  const keys = ['Restart Frontmost App', 'Manage Sound Output Devices'];
  for (const key of keys) {
    const files = spec.files.filter(file => file.edits.some(edit => edit.before === '`' + key + '`'));
    assert(files.some(file => file.file.endsWith('/backend/index.mjs')));
    assert(files.some(file => file.file.includes('/frontend/internal-extensions-')));
  }
  const newStrings = JSON.parse(fs.readFileSync(new URL('../translations/2.9-new-strings.json', import.meta.url)));
  for (const value of Object.keys(newStrings)) assert(!/^(?:https?:|\.\/|restart-frontmost-app$)/.test(value));
});

test('实机发现的搜索框、窗口模式和快捷键辅助标签已覆盖', () => {
  const spec = JSON.parse(fs.readFileSync(new URL('../translations/2.9.0.0.json', import.meta.url)));
  const edits = spec.files.flatMap(file => file.edits);
  assert(edits.some(edit => edit.before === '`Search for apps or commands…`' && edit.after === '"搜索应用或命令…"'));
  assert(edits.some(edit => edit.before === '`Compact`' && edit.after === '"紧凑"'));
  assert(edits.some(edit => edit.before === '`Expanded`' && edit.after === '"展开"'));
  assert(edits.some(edit => edit.before === '`${N} for ${i.label}`' && edit.after === '`为 ${i.label} ${N}`'));
  assert(edits.some(edit => edit.before === '`Add Hotkey`' && edit.after === '"添加快捷键"'));
});

test('英文命令名加入搜索词并保留原有关键词', () => {
  const spec = JSON.parse(fs.readFileSync(new URL('../translations/2.9.0.0.json', import.meta.url)));
  for (const suffix of ['/backend/index.mjs', '/frontend/internal-extensions-CPayyaPp.js']) {
    const file = spec.files.find(file => file.file.endsWith(suffix));
    const edit = file.edits.find(edit => edit.after.startsWith('[') && edit.after.includes('"Restart Frontmost App"'));
    assert(edit, '缺少英文检索词');
    const original = vm.runInNewContext(edit.before);
    const translated = vm.runInNewContext(edit.after);
    assert.deepEqual([...translated], [...original, 'Restart Frontmost App']);
  }
});
