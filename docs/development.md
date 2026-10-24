# 构建与验证

面向维护者。直接安装请阅读[首页安装教程](../README.md#安装教程)。

## 从源码构建

需要 macOS 和 Node.js 22 或更高版本。Acorn 仅用于构建时的 JavaScript 语法检查；安装包不依赖系统 Node.js。

```sh
npm ci --ignore-scripts
npm test
node scripts/build.mjs /Applications/Raycast.app build/Raycast-2.9.0.0-arm64-r2
node scripts/verify-install.mjs /Applications/Raycast.app build/Raycast-2.9.0.0-arm64-r2
```

构建必须使用干净的官方 2.9.0.0。输出目录必须不存在，构建不会修改原版应用。安装测试自动创建独立的应用副本，不修改传入的原版应用。

- `translations/2.9.0.0.json`：原版资源指纹、准确替换位置、原文和译文。
- `translations/2.9-new-strings.json`：本次新增译文的对照表。
- `helpers/`：从上游包继承的显示翻译函数、词典和扩展解析器。
- `installer/`：安装、恢复入口和第三方许可。
- `scripts/`：构建和真实应用副本的安装/还原验证。
- `tests/`：替换边界、路径约束、扩展作用域及数据保留测试。

翻译位置使用 JavaScript 的 UTF-16 索引，构建先校验文件 SHA-256，再检查每处原文，最后解析生成的 JavaScript。后续版本必须重新对照资源，不能只改版本号或校验值。

## 发布包与审校依据

发布包内的 manifest.tsv 记录原版与汉化资源的 SHA-256。源文件按原始 UTF-16 坐标替换，替换前校验原文，生成后检查 JavaScript 语法。

- [R2 逐项审校记录](translation-review-r2.jsonl)
- [R2 审校统计与源码指纹](translation-review-r2.json)
- [格式差异的复核依据](translation-review-r2-format-checks.json)
- [安装、还原与实机验证报告](verification-2.9.0.0-r2.json)

R2 的代码与安装测试结果随报告保留。仅修改说明文档或发布入口时，无须重新构建或重新安装已经验证的同一安装包。发布后须重新下载附件，核对校验文件及资源清单。
