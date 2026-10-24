import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const root = fileURLToPath(new URL('../', import.meta.url));
const store = fs.readFileSync(path.join(root, 'helpers/store.js'), 'utf8');
const api = fs.readFileSync(path.join(root, 'helpers/extension-api.js'), 'utf8');
const spec = JSON.parse(fs.readFileSync(path.join(root, 'translations/2.9.0.0.json'), 'utf8'));

function context() {
  const result = vm.createContext({ console, require: createRequire(import.meta.url) });
  vm.runInContext(store, result);
  vm.runInContext(api, result);
  result.__rcScopedDisplayZh.overrides = Object.freeze({
    brew: Object.freeze({ Ready: '软件包已就绪', Confirm: '确认软件包操作', 'Pinned Keep English': 'Pinned Keep English' }),
    svgl: Object.freeze({ Ready: '图标已就绪', Confirm: '确认图标操作' }),
    tinypng: Object.freeze({ fit: '适应边界', cover: '填充并裁剪' }),
    github: Object.freeze({ 'Open Issues': '未关闭议题' }),
    'audio-device': Object.freeze({ 'Toggle Favourites': '本轮设备切换' }),
  });
  return result;
}

test('作用域优先级为本轮、局部、通用，并保留非字符串', () => {
  const c = context(), original = { title: 'Ready' };
  assert.equal(c.__rcScopedDisplayZh('Ready', 'brew', { Ready: '局部旧译' }), '软件包已就绪');
  assert.equal(c.__rcScopedDisplayZh('Cancel', 'brew', { Cancel: '局部取消' }), '局部取消');
  assert.equal(c.__rcScopedDisplayZh('Cancel', 'brew'), c.__rcStoreDisplayZh('Cancel'));
  assert.equal(c.__rcScopedDisplayZh(original, 'brew'), original);
  assert.equal(c.__rcScopedDisplayZh(undefined, 'brew'), undefined);
  assert.equal(c.__rcScopedDisplayZh(null, 'brew'), null);
});

test('未知扩展、UUID、非字符串身份及继承键只走通用路径', () => {
  const c = context();
  for (const name of [undefined, null, {}, 'missing', '7f6f20f2-83a6-4aa2-9c77-88fbf150004b', '__proto__', 'constructor', 'toString']) {
    assert.equal(c.__rcScopedDisplayZh('Ready', name), c.__rcStoreDisplayZh('Ready'));
    assert.equal(c.__rcNoticeDisplayZh('Ready', name), c.__rcStoreDisplayZh('Ready'));
  }
  const inherited = Object.create({ Ready: '不能读取继承词条' });
  assert.equal(c.__rcScopedDisplayZh('Ready', 'missing', inherited), c.__rcStoreDisplayZh('Ready'));
});

test('词条可以包含自有原型同名键且不污染原型', () => {
  const c = context();
  c.__rcScopedDisplayZh.overrides = JSON.parse('{"brew":{"__proto__":"原型名称","constructor":"构造器名称"}}');
  assert.equal(c.__rcScopedDisplayZh('__proto__', 'brew'), '原型名称');
  assert.equal(c.__rcScopedDisplayZh('constructor', 'brew'), '构造器名称');
  assert.equal(c.__rcScopedDisplayZh('toString', 'brew'), 'toString');
  assert.equal(Object.prototype.polluted, undefined);
});

test('旧命令局部词典仍在，并由本轮作用域译文优先覆盖', () => {
  const c = context();
  assert.equal(c.__rcStoreCommandDisplayZh('Toggle Favourites', 'audio-device'), '本轮设备切换');
  const value = c.__rcStoreCommandDisplayZh('Next', 'spotify-player');
  assert.equal(typeof value, 'string');
  assert.notEqual(value, 'Next');
  assert.equal(c.__rcStoreCommandDisplayZh('Ready', 'brew'), '软件包已就绪');
});

test('Brew 固定与 Svgl 置顶按扩展区分，动态捕获内容完全保留', () => {
  const c = context();
  const name = '用户图标 🐦 {0} $& https://example.test/Pin?value=Delete\n第二行';
  assert.equal(c.__rcNoticeDisplayZh(`Pinned ${name}`, 'brew'), `已固定 ${name}`);
  assert.equal(c.__rcNoticeDisplayZh(`Pinned ${name}`, 'svgl'), `已置顶 ${name}`);
  assert.equal(c.__rcNoticeDisplayZh(`Pinned ${name}`, 'missing'), c.__rcNoticeDisplayZh(`Pinned ${name}`));
  assert.equal(c.__rcNoticeDisplayZh('Pinned Keep English', 'brew'), 'Pinned Keep English');
  assert.equal(c.__rcNoticeDisplayZh('用户正文提到 Pinned 内容', 'svgl'), '用户正文提到 Pinned 内容');
});

test('动态规则有长度边界，长用户内容不会进入新增正则', () => {
  const c = context(), text = 'Pinned ' + '甲'.repeat(10001);
  assert.equal(c.__rcNoticeDisplayZh(text, 'svgl'), text);
});

test('原生提示首次显示和更新均传递扩展身份', () => {
  const c = context();
  for (const method of ['showHUD', 'showToast', 'showAlert', 'updateToast']) {
    assert.equal(c.__rcNativeMessageZh(method, { title: 'Pinned 用户命名' }, 'brew').title, '已固定 用户命名');
    assert.equal(c.__rcNativeMessageZh(method, { title: 'Pinned 用户命名' }, 'svgl').title, '已置顶 用户命名');
  }
});

test('原生提示仅改显示字段，参数、URL、枚举、回调和用户内容保持原样', () => {
  const c = context(), callback = () => 17;
  const original = {
    title: 'Ready', message: '用户正文：fit https://example.test/Ready?q=Confirm',
    style: 'success', id: 'Ready', url: 'https://example.test/Ready', value: 'fit',
    arguments: { title: 'Ready', token: 'Confirm' }, description: '用户自定义说明',
    primaryAction: { title: 'Confirm', id: 'Confirm', url: 'https://example.test/Confirm', onAction: callback },
    secondaryAction: { title: 'Confirm', value: 'Confirm' }, dismissAction: { title: 'Confirm', style: 'destructive' },
  };
  const result = c.__rcNativeMessageZh('showAlert', original, 'svgl');
  assert.notEqual(result, original);
  assert.equal(result.title, '图标已就绪');
  for (const key of ['message', 'style', 'id', 'url', 'value', 'arguments', 'description']) assert.equal(result[key], original[key]);
  for (const key of ['primaryAction', 'secondaryAction', 'dismissAction']) {
    assert.notEqual(result[key], original[key]);
    assert.equal(result[key].title, '确认图标操作');
    for (const field of Object.keys(original[key]).filter(k => k !== 'title')) assert.equal(result[key][field], original[key][field]);
    assert.equal(original[key].title, 'Confirm');
  }
  assert.equal(original.title, 'Ready');
  assert.equal(c.__rcNativeMessageZh('writeFile', original, 'svgl'), original);
  assert.equal(c.__rcNativeMessageZh('launchCommand', original, 'svgl'), original);
});

test('作用域可以明确保留英文，不能再落入通用精确词典或正则', () => {
  const c = context();
  c.__rcScopedDisplayZh.overrides = { svgl: { Cancel: 'Cancel', 'Pinned 用户命名': 'Pinned 用户命名' } };
  assert.equal(c.__rcNativeMessageZh('showToast', { title: 'Pinned 用户命名', primaryAction: { title: 'Cancel' } }, 'svgl').title, 'Pinned 用户命名');
  assert.equal(c.__rcInterfaceDisplayZh('Cancel', 'svgl'), 'Cancel');
});

test('JSX 仍只处理已识别组件的静态显示文案', () => {
  const c = context(), parser = c.__rcLiteralParser();
  const input = 'const api=require("@raycast/api"),jsx=require("react/jsx-runtime");const data={title:"fit",value:"fit",url:"https://example.test/fit"};jsx.jsx(api.Action,{title:"fit",id:"fit",value:"fit",onAction:()=>data});jsx.jsx(api.List.Item,{title:userText});';
  const result = c.__rcLiteralDisplayTransform(input, parser, value => c.__rcScopedDisplayZh(value, 'tinypng', { fit: '局部旧译' }));
  assert.equal(result.edits.length, 1);
  assert(result.output.includes('title:"适应边界",id:"fit",value:"fit"'));
  assert(result.output.includes('data={title:"fit",value:"fit",url:"https://example.test/fit"}'));
  assert(result.output.includes('title:userText'));
  const shadowed = 'const api=require("@raycast/api"),jsx=require("react/jsx-runtime");function f(api){return jsx.jsx(api.Action,{title:"fit"})}';
  assert.equal(c.__rcLiteralDisplayTransform(shadowed, parser, () => '不能修改').output, shadowed);
});

test('真实 loader 按 GitHub 组件与属性区分浏览器动作和统计标签', () => {
  const c = context(), require = createRequire(import.meta.url);
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'raycast-scoped-loader-'));
  const previousLoader = require('module')._extensions['.js'];
  const source = `
    const api=require("@raycast/api"),jsx=require("react/jsx-runtime"),custom=require("./custom.js");
    const data={title:"Open Issues",value:"Open Pull Requests",url:"https://example.test/Open%20Issues"};
    const userTitle="Open Issues";
    module.exports={data,rows:[
      jsx.jsx(api.Action.OpenInBrowser,{title:"Open Issues",subtitle:"Open Issues",id:"Open Issues",url:"https://github.com/example/repo/issues?state=open"}),
      jsx.jsx(api.MenuBarExtra.Submenu,{title:"Open Issues",id:"issuesOpen"}),
      jsx.jsx(api.Action.OpenInBrowser,{title:"Open Pull Requests",id:"Open Pull Requests",url:"https://github.com/example/repo/pulls"}),
      jsx.jsx(api.MenuBarExtra.Submenu,{title:"Open PRs",id:"prsOpen"}),
      jsx.jsx(api.Action.Push,{title:"Open Issues",id:"push"}),
      jsx.jsx(custom.Submenu,{title:"Open Issues",id:"wrapper"}),
      jsx.jsx(api.Action.OpenInBrowser,{title:userTitle,id:"user-title"})
    ]};
  `;
  try {
    fs.mkdirSync(path.join(directory, 'node_modules/@raycast/api'), { recursive: true });
    fs.mkdirSync(path.join(directory, 'node_modules/react'), { recursive: true });
    fs.writeFileSync(path.join(directory, 'node_modules/@raycast/api/index.js'), 'module.exports={Action:{OpenInBrowser:"浏览器",Push:"推入"},MenuBarExtra:{Submenu:"统计"}};');
    fs.writeFileSync(path.join(directory, 'node_modules/react/jsx-runtime.js'), 'exports.jsx=(type,props)=>({type,props});');
    const load = name => {
      const folder = path.join(directory, name);
      fs.mkdirSync(folder);
      fs.writeFileSync(path.join(folder, 'package.json'), JSON.stringify({ name, type: 'commonjs' }));
      fs.writeFileSync(path.join(folder, 'custom.js'), 'exports.Submenu="自定义包装组件";');
      const filename = path.join(folder, 'command.js');
      fs.writeFileSync(filename, source);
      return c.__rcRequireDisplayCommand(filename);
    };
    const loaded = load('github');
    assert.deepEqual(loaded.rows.map(row => row.props.title), [
      '打开议题', '未关闭议题', '打开拉取请求', c.__rcStoreDisplayZh('Open PRs'), '未关闭议题', 'Open Issues', 'Open Issues',
    ]);
    assert.equal(loaded.rows[0].props.subtitle, '未关闭议题', '仅 title 使用浏览器动作译法');
    assert.equal(loaded.rows[0].props.url, 'https://github.com/example/repo/issues?state=open');
    assert.equal(loaded.rows[2].props.url, 'https://github.com/example/repo/pulls');
    assert.deepEqual(loaded.rows.map(row => row.props.id), ['Open Issues', 'issuesOpen', 'Open Pull Requests', 'prsOpen', 'push', 'wrapper', 'user-title']);
    assert.deepEqual(loaded.data, { title: 'Open Issues', value: 'Open Pull Requests', url: 'https://example.test/Open%20Issues' });
    c.__rcScopedDisplayZh.overrides = { tinypng: { 'Open Issues': '其他扩展的议题标签' } };
    const other = load('tinypng');
    assert.equal(other.rows[0].props.title, '其他扩展的议题标签');
    assert.equal(other.rows[2].props.title, c.__rcStoreDisplayZh('Open Pull Requests'));
    assert.equal(other.rows[5].props.title, 'Open Issues');
    assert.equal(require('module')._extensions['.js'], previousLoader, '加载后恢复原始模块 loader');
  } finally {
    for (const filename of Object.keys(require.cache)) if (filename.startsWith(directory + path.sep)) delete require.cache[filename];
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('作用域接入点都能取得所需 helper，原生拦截覆盖共同发送入口', () => {
  const frontends = new Set();
  for (const file of spec.files) for (const edit of file.edits) {
    if (/__rcScopedDisplayZh|__rcStoreCommandDisplayZh/.test(edit.after)) {
      assert(file.helpers?.includes('store.js'), '调用共享函数的资源缺少 helper：' + file.file);
      if (file.file.includes('/frontend/')) frontends.add(path.basename(file.file));
    }
  }
  for (const name of ['main-window-D93los-u.js', 'model-provider-setup-CbN8DYgJ.js', 'node-extension-settings-view-DHistNWV.js']) assert(frontends.has(name));
  const apiFile = spec.files.find(f => f.file.endsWith('/api/node_modules/@raycast/api/index.js'));
  const hook = apiFile.edits.find(e => e.before === 'function hk(e,t,r,n){');
  assert(hook?.after.includes('__rcNativeMessageZh(e,t,Zs?.extensionName)'));
  assert.equal(apiFile.edits.filter(e => e.after.includes('__rcNativeMessageZh(')).length, 1, '原生请求不得重复翻译');
  assert(apiFile.helpers.includes('extension-api.js'));
});
