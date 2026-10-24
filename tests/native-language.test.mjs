import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';
import { parse } from 'acorn';

const spec = JSON.parse(fs.readFileSync(new URL('../translations/2.9.0.0.json', import.meta.url), 'utf8'));
const main = 'main-window-D93los-u.js';
const windows = 'window-shell-hosts-CNPE0cCf.js';

function editsFor(filename) {
  const files = spec.files.filter(file => file.file.endsWith('/frontend/' + filename));
  assert.equal(files.length, 1, `资源不存在或不唯一：${filename}`);
  return files[0].edits;
}

function translatedExpressions(filename, before) {
  const edits = editsFor(filename).filter(edit => edit.before === before);
  assert(edits.length > 0, `缺少原生译文：${filename} / ${before}`);
  return edits.map(edit => edit.after);
}

function evaluate(expression, globals = {}) {
  const code = '(' + expression + ')';
  parse(code, { ecmaVersion: 'latest' });
  return vm.runInNewContext(code, globals, { timeout: 1000 });
}

// 原版最小片段仅提供未改动的调用上下文；范围内的代码全部使用实际补丁重建。
function patchedFragment(filename, original, anchor, unchangedIsValid = false) {
  const edits = editsFor(filename);
  const anchors = edits.filter(edit => edit.before.includes(anchor));
  if (unchangedIsValid && anchors.length === 0) return original;
  assert(anchors.length > 0, `缺少修订锚点，可能尚未合入 extras：${filename} / ${anchor}`);
  assert.equal(original.indexOf(anchor), original.lastIndexOf(anchor), '原版片段中的锚点必须唯一');
  const starts = new Set(anchors.map(edit => edit.start + edit.before.indexOf(anchor) - original.indexOf(anchor)));
  assert.equal(starts.size, 1, `修订锚点不唯一：${filename} / ${anchor}`);
  const start = [...starts][0];
  const end = start + original.length;
  const relevant = edits.filter(edit => edit.start < end && start < edit.end || edit.start === edit.end && start <= edit.start && edit.start < end);
  relevant.sort((a, b) => b.start - a.start);
  let output = original;
  let boundary = end;
  for (const edit of relevant) {
    assert(edit.start >= start && edit.end <= end, '修订越出原版片段，请同步更新测试上下文');
    assert(edit.end <= boundary, '片段内修订重叠');
    assert.equal(output.slice(edit.start - start, edit.end - start), edit.before, '原版片段与 before 不匹配');
    output = output.slice(0, edit.start - start) + edit.after + output.slice(edit.end - start);
    boundary = edit.start;
  }
  return output;
}

function functionPair(name, globals) {
  const edits = editsFor(main).filter(edit => edit.before.includes(`function ${name}(e){`));
  assert.equal(edits.length, 1, `缺少或重复的时间函数修订：${name}，请确认 extras 已合入`);
  return ['before', 'after'].map(side => {
    const code = edits[0][side];
    const functions = parse(code, { ecmaVersion: 'latest' }).body.filter(node => node.type === 'FunctionDeclaration' && node.id.name === name);
    assert.equal(functions.length, 1, `无法提取实际 ${side} 函数：${name}`);
    const node = functions[0];
    return evaluate(code.slice(node.start, node.end), globals);
  });
}

test('超级键根据英文 active 状态判断，只翻译显示分支', () => {
  const before = '`Hyper Key is ${X===`active`?`active`:`not active`}. Open diagnostics.`';
  const expressions = translatedExpressions('keyboard-settings-view-B1i2jDoa.js', before);
  assert.equal(expressions.length, 2, '提示与无障碍标签都需要覆盖');
  for (const expression of expressions) {
    assert.equal(evaluate(expression, { X: 'active' }), '超级键已生效。打开诊断。');
    for (const state of ['inactive', 'not active', '已生效', 'active ', '', null, undefined]) {
      assert.equal(evaluate(expression, { X: state }), '超级键未生效。打开诊断。');
    }
  }
});

test('线程选择保留真实线程数，单个线程也使用中文单位', () => {
  const code = patchedFragment('file-search-settings-view-D79ka_yy.js', 'e===1?`1 thread`:`${e} threads`', '`1 thread`');
  for (const count of [0, 1, 2, 4, 8, 64]) {
    assert.equal(evaluate(code, { e: count }), `${count} 个线程`);
  }
});

test('用量重置显示可用次数，隐藏用量时不读取真实数字', () => {
  const code = patchedFragment('usage-provider-selector-RiyJtn1s.js', '[F?`—`:j.availableResets,` available`]', '` available`');
  for (const count of [0, 1, 2, 12]) {
    const j = Object.freeze({ availableResets: count });
    const parts = evaluate(code, { F: false, j });
    assert.equal(parts[0], count, '数量仍是原始数字，不能变成状态或丢失');
    assert.equal(parts.join(''), `${count} 次可用`);
  }
  const hidden = evaluate(code, { F: true, j: { get availableResets() { throw new Error('隐藏状态不应读取用量'); } } });
  assert.equal(hidden.join(''), '— 次可用');
});

test('删除英文复数尾缀后，零、单个和多个项目均保留数量及用户分组名', () => {
  const cases = [
    ['`Captured ${e.filePaths.length} memory dump${e.filePaths.length===1?``:`s`}`', n => ({ e: { filePaths: { length: n } } }), n => `已获取 ${n} 份内存转储`],
    ['`Results (${o.length} item${o.length===1?``:`s`})`', n => ({ o: { length: n } }), n => `结果（${n} 个项目）`],
    ['`${i} (${e.length} item${e.length===1?``:`s`})`', n => ({ i: 'News ${保留} 🧪', e: { length: n } }), n => `News \${保留} 🧪（${n} 个项目）`],
    ['`Import ${e} Quicklink${e===1?``:`s`}`', n => ({ e: n }), n => `导入 ${n} 个快捷链接`],
    ['`Import ${e} Snippet${e===1?``:`s`}`', n => ({ e: n }), n => `导入 ${n} 个文本片段`],
  ];
  for (const [before, globals, expected] of cases) {
    for (const expression of translatedExpressions(main, before)) {
      for (const count of [0, 1, 2, 1234]) assert.equal(evaluate(expression, globals(count)), expected(count));
    }
  }
});

test('导入提示保留 importedCount 与 skippedCount，未跳过时不显示附加说明', () => {
  const types = [
    ['quicklinks', '个快捷链接', '个'],
    ['snippets', '个文本片段', '个'],
    ['notes', '篇笔记', '篇'],
  ];
  for (const [type, noun, unit] of types) {
    const before = '`${t.importedCount} ' + type + ' imported${t.skippedCount>0?`, ${t.skippedCount} skipped`:``}`';
    const cases = [
      [0, 0, `已导入 0 ${noun}`],
      [1, 0, `已导入 1 ${noun}`],
      [7, 2, `已导入 7 ${noun}，已跳过 2 ${unit}`],
      [0, 3, `已导入 0 ${noun}，已跳过 3 ${unit}`],
      [12000, 109, `已导入 12000 ${noun}，已跳过 109 ${unit}`],
    ];
    for (const expression of translatedExpressions(main, before)) {
      for (const [importedCount, skippedCount, expected] of cases) {
        assert.equal(evaluate(expression, { t: Object.freeze({ importedCount, skippedCount }) }), expected);
      }
    }
  }
});

test('缺省桌面名称汉化，但自定义名称、空名称和原序号不变', () => {
  const original = 'function Ol(e){return e.name??`Desktop ${e.index}`}';
  const displayName = evaluate(patchedFragment(windows, original, 'Desktop '));
  for (const index of [0, 1, 12, 100]) {
    assert.equal(displayName({ index }), `桌面 ${index}`);
    assert.equal(displayName({ name: null, index }), `桌面 ${index}`);
  }
  for (const name of ['', '工作 🧪', 'Desktop 42', 'Desktop 自定义', 'null']) {
    assert.equal(displayName({ name, index: 12 }), name);
  }
});

test('Grid 无选中项不出现 null，但真实标题中的 null 不被清除', () => {
  const original = '`Grid Stress Test${r?` – ${r?.title}`:null}`';
  const expression = patchedFragment(main, original, 'Grid Stress Test');
  for (const r of [null, undefined, false]) assert.equal(evaluate(expression, { r }), '网格压力测试');
  assert.equal(evaluate(expression, { r: { title: '自定义 🧪' } }), '网格压力测试 – 自定义 🧪');
  assert.equal(evaluate(expression, { r: { title: 'null' } }), '网格压力测试 – null');
});

const now = Date.UTC(2026, 9, 25, 12, 0, 0);
function frozenDate(locale = 'zh-CN', timeZone = 'Asia/Shanghai') {
  return class extends Date {
    constructor(...args) { super(...(args.length ? args : [now])); }
    static now() { return now; }
    toLocaleString() { return super.toLocaleString(locale, { timeZone }); }
  };
}
const relativeBoundaries = [
  [0, '0 秒'], [999, '0 秒'], [1000, '1 秒'], [59999, '59 秒'],
  [60000, '1 分钟'], [3599999, '59 分钟'], [3600000, '1 小时'], [86399999, '23 小时'],
];

test('上次运行时间按原边界显示秒、分、时，一天后保留原地区日期', () => {
  for (const [locale, timeZone] of [['zh-CN', 'Asia/Shanghai'], ['de-DE', 'Europe/Berlin']]) {
    const [original, translated] = functionPair('Afe', { Date: frozenDate(locale, timeZone) });
    for (const [delta, label] of relativeBoundaries) assert.equal(translated(now - delta), label + '前');
    assert.equal(translated(new Date(now - 60000).toISOString()), '1 分钟前');
    for (const empty of [undefined, null, '', 0]) assert.equal(translated(empty), '—');
    for (const delta of [86400000, 172800000]) {
      const timestamp = now - delta;
      assert.equal(translated(timestamp), original(timestamp));
      assert.equal(translated(timestamp), new Date(timestamp).toLocaleString(locale, { timeZone }));
    }
  }
});

test('下次运行区分已到期和零秒，保留计划边界与原地区日期', () => {
  for (const [locale, timeZone] of [['zh-CN', 'Asia/Shanghai'], ['de-DE', 'Europe/Berlin']]) {
    const [original, translated] = functionPair('jfe', { Date: frozenDate(locale, timeZone) });
    assert.equal(translated(now - 1), '即将');
    for (const [delta, label] of relativeBoundaries) assert.equal(translated(now + delta), label + '后');
    assert.equal(translated(new Date(now + 60000).toISOString()), '1 分钟后');
    for (const empty of [undefined, null, '', 0]) assert.equal(translated(empty), '—');
    for (const delta of [86400000, 172800000]) {
      const timestamp = now + delta;
      assert.equal(translated(timestamp), original(timestamp));
      assert.equal(translated(timestamp), new Date(timestamp).toLocaleString(locale, { timeZone }));
    }
  }
});

test('刷新时间只本地化 now，保留数字与单位且格式化只执行一次', () => {
  for (const expression of translatedExpressions(main, 'eo(e)')) {
    for (const value of ['now', 'nowhere', '12m', '5h', '1d', '2026/10/25 14:32', 0, 42, 1.25, NaN, null, undefined]) {
      let calls = 0;
      const timestamp = now - 1000;
      const result = evaluate(expression, { e: timestamp, eo(input) { calls++; assert.equal(input, timestamp); return value; } });
      assert.equal(result, value === 'now' ? '刚刚' : value);
      assert.equal(calls, 1);
    }
  }
});

test('声音设备埋点恢复原 packageName，同时保留操作 ID', () => {
  const original = 'function p7(e,t){return{quickActionId:t,packageName:e===`output`?`Set Sound Output Device`:`Set Sound Input Device`}}';
  // 没有对应编辑意味着原始机器字段未被修改，同样是正确结果。
  const anchor = editsFor(main).some(edit => edit.before.includes('`Set Sound Output Device`'))
    ? '`Set Sound Output Device`' : '`Set Sound Input Device`';
  const analytics = evaluate(patchedFragment(main, original, anchor, true));
  for (const [direction, expected] of [['output', 'Set Sound Output Device'], ['input', 'Set Sound Input Device']]) {
    for (const id of ['select', 'setFormat', 'toggleEnabled']) {
      const result = analytics(direction, id);
      assert.equal(result.packageName, expected);
      assert.equal(result.quickActionId, id);
    }
  }
});
