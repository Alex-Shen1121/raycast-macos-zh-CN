import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { test } from 'node:test';

const require = createRequire(import.meta.url);
const context = vm.createContext({ require, console });
for (const name of ['store.js', 'extension-api.js']) vm.runInContext(fs.readFileSync(new URL('../helpers/' + name, import.meta.url), 'utf8'), context);

test('实际扩展加载路径按包名区分格式、地区、存储卷和音量', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'raycast-译文-'));
  const previous = require('module')._extensions['.js'];
  try {
    fs.mkdirSync(path.join(directory, 'node_modules/@raycast/api'), { recursive: true });
    fs.mkdirSync(path.join(directory, 'node_modules/react'), { recursive: true });
    fs.writeFileSync(path.join(directory, 'node_modules/@raycast/api/index.js'), 'exports.Action={};');
    fs.writeFileSync(path.join(directory, 'node_modules/react/jsx-runtime.js'), 'exports.jsx=(component,props)=>props;');
    const cases = [
      ['json-format', 'Format', '格式化'], ['apple-notes', 'Format', '格式'],
      ['weather', 'Area', '地区'], ['things', 'Area', '领域'],
      ['docker', 'Volume', '存储卷'], ['audio-device', 'Volume', '音量'],
      ['unreviewed-extension', 'Format', 'Format'],
    ];
    for (const [name, source, expected] of cases) {
      const folder = path.join(directory, name);
      fs.mkdirSync(folder);
      fs.writeFileSync(path.join(folder, 'package.json'), JSON.stringify({ name }));
      const command = path.join(folder, 'command.js');
      fs.writeFileSync(command, `const api=require("@raycast/api"),jsx=require("react/jsx-runtime");module.exports=jsx.jsx(api.Action,{title:${JSON.stringify(source)},id:${JSON.stringify(source)},onAction:()=>${JSON.stringify(source)}});`);
      const result = context.__rcRequireDisplayCommand(command);
      assert.equal(result.title, expected, name);
      assert.equal(result.id, source, '机器标识必须保持原文');
      assert.equal(result.onAction(), source, '操作参数必须保持原文');
      assert.equal(require('module')._extensions['.js'], previous, '加载完成必须恢复原加载器');
    }
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('同一译文经过商店、设置和通知入口时保持场景含义', () => {
  for (const translate of [context.__rcScopedDisplayZh, context.__rcStoreCommandDisplayZh, context.__rcNoticeDisplayZh, context.__rcInterfaceDisplayZh]) {
    assert.equal(translate('Format', 'json-format'), '格式化');
    assert.equal(translate('Area', 'weather'), '地区');
    assert.equal(translate('Volume', 'docker'), '存储卷');
  }
  assert.equal(context.__rcNativeMessageZh('updateToast', { title: 'Pinned 用户自定义 🧪' }, 'brew').title, '已固定 用户自定义 🧪');
  assert.equal(context.__rcNativeMessageZh('updateToast', { title: 'Pinned 用户自定义 🧪' }, 'svgl').title, '已置顶 用户自定义 🧪');
});
