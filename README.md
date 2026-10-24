# Raycast macOS 汉化｜简体中文界面与扩展汉化包

为 **Raycast 2.9.0.0 · macOS Apple Silicon（arm64）** 提供非官方简体中文补丁，包含主界面、设置、部分提示及扩展文案，附带安装和恢复原版工具。

本仓库基于 [zwjtano/raycast-macos-zh-CN](https://github.com/zwjtano/raycast-macos-zh-CN) 继续维护，当前版本为 **2.9.0.0 R2**。补丁不包含 Raycast 应用安装程序。

**[下载 R2 安装包 ZIP](https://github.com/Alex-Shen1121/raycast-macos-zh-CN/releases/download/v2.9.0.0-r2/Raycast-2.9.0.0-arm64-r2.zip)** · [发布页](https://github.com/Alex-Shen1121/raycast-macos-zh-CN/releases/latest) · [安装教程](#安装教程) · [恢复与更新](#恢复与更新) · [扩展清单](#扩展汉化列表) · [常见问题](#常见问题)

| 项目 | 支持情况 |
| --- | --- |
| Raycast 版本 | **2.9.0.0**，同时校验版本和文件指纹 |
| 设备 | Apple Silicon Mac（M 系列芯片），arm64 |
| 语言 | 简体中文（zh-CN） |
| 扩展范围 | 上游商店快照中的 100 个扩展及 Mole，部分文案和界面 |
| 安装环境 | 无须 Python、Node.js 或开发工具 |
| 恢复 | 安装前自动备份，提供恢复原版工具 |

## 安装教程

### 1. 下载正确的文件

打开 [R2 发布页](https://github.com/Alex-Shen1121/raycast-macos-zh-CN/releases/tag/v2.9.0.0-r2)，在 **Assets（附件）** 中下载：

- **[Raycast-2.9.0.0-arm64-r2.zip](https://github.com/Alex-Shen1121/raycast-macos-zh-CN/releases/download/v2.9.0.0-r2/Raycast-2.9.0.0-arm64-r2.zip)**：安装包。
- [Raycast-2.9.0.0-arm64-r2.zip.sha256](https://github.com/Alex-Shen1121/raycast-macos-zh-CN/releases/download/v2.9.0.0-r2/Raycast-2.9.0.0-arm64-r2.zip.sha256)：可选的校验文件。

GitHub 自动生成的 **Source code (zip)** 和 **Source code (tar.gz)** 是仓库源码，不是安装包。请完整解压安装包，保留整个文件夹，不要单独下载或移动 `.command` 文件。

### 2. 确认当前状态

在 Raycast 的“关于”页面检查完整版本号。

| 当前状态 | 操作 |
| --- | --- |
| 官方原版 2.9.0.0 arm64 | 按下一节直接安装 |
| 已安装本仓库的 2.9.0.0 R1 汉化 | 先用 **R1 原包**的“恢复原版.command”还原，再安装 R2；[R1 旧包](downloads/Raycast-2.9.0.0-arm64.zip)仅供旧版恢复使用 |
| 已安装 R2 | 无须重复安装；原安装包“包信息.json”中的 `patchRevision` 为 `2` |
| 其他 Raycast 版本或 Intel Mac | 本包不适用，请寻找与版本、架构对应的补丁 |

### 3. 安装并启动

1. 将对应的官方 Raycast 2.9.0.0 放在“应用程序”中，先正常打开一次。
2. 从 **Raycast 菜单 → Quit Raycast** 完全退出应用，不能只关闭窗口。
3. 在解压后的文件夹中双击 **“安装汉化.command”**。
4. 应用路径处直接回车，使用默认的 `/Applications/Raycast.app`；确认安装时再回车。输入 `n` 可取消。
5. 出现“汉化资源安装完成，全部目标文件校验通过”后，重新打开 Raycast。

安装器不会自动提权。若提示版本不匹配、资源不匹配或备份属于另一版补丁，请按提示核对原版及旧补丁，不要绕过检查。

<details>
<summary>可选：校验下载文件</summary>

将 ZIP 和 `.sha256` 文件放在同一目录，在该目录打开终端，运行：

```sh
shasum -a 256 -c Raycast-2.9.0.0-arm64-r2.zip.sha256
```

应显示 `Raycast-2.9.0.0-arm64-r2.zip: OK`。

</details>

## 恢复与更新

完全退出 Raycast，双击**当前已安装补丁对应包**中的“恢复原版.command”，在路径和确认提示处分别回车。恢复后会检查完整官方签名。

备份位于 `~/Library/Application Support/Raycast-Chinese-Patch/2.9.0.0/`，按应用路径隔离。请保留整个补丁包和备份，不要移动已经汉化的应用。

- **同一 Raycast 版本升级汉化包：** 先用旧包恢复，再安装新包；R1 和 R2 的恢复工具不能混用。
- **准备升级 Raycast：** 建议先恢复原版，再进行官方更新，之后安装与新版本匹配的补丁。
- **Raycast 已自动更新：** 先核对版本；不要在新版应用上运行旧补丁的恢复工具，也不要用旧备份覆盖新版资源。

本包不修改自动更新设置；应用更新后可能恢复英文。

## 本次更新：2.9.0.0 R2

- 在上游 2.8.2.0 汉化基础上适配 2.9.0.0，覆盖 **213 个资源文件**，保留英文命令检索。
- 全量审校 **18,248 个有效审校项、28,841 处出现位置**；其中 **1,166 项**修改或按场景处理；**4,339 项**表情名称与固定版本 CLDR 逐项核对一致。
- 修正 JSON“格式化”、天气“地区”、Docker“存储卷”、索引“线程”、用量“重置次数”等错译，统一扩展、对话、听写、积分和快速修正等术语。
- 将场景译文接通商店、设置、扩展界面和通知，并修正实机发现的 JSON 操作指引。
- **34 项回归检查、14 项安装与还原检查通过**；已验证本机启动、设置、中英文搜索、计算器和实际 JSON 格式化。

[审校报告](docs/translation-review-r2.md) · [完整逐项记录](docs/translation-review-r2.jsonl) · [验证报告](docs/verification-2.9.0.0-r2.json)

## 与上游的关系

本仓库是上游项目的衍生维护版本，继承其翻译、扩展范围、截图与第三方来源。主要新增工作是 **2.9.0.0 适配、全量语言审校，以及可重建的翻译源码和验证工具**；上游已有的扩展覆盖继续保留。

| 项目 | 对应版本与用途 |
| --- | --- |
| [上游 macOS 项目](https://github.com/zwjtano/raycast-macos-zh-CN) | 本次移植基于其 **2.8.2.0** 版本；历史包请查上游 Releases |
| 本仓库 | **2.9.0.0 R2**，独立提供下载、修订记录与验证结果 |
| [上游 Windows 项目](https://github.com/zwjtano/raycast-windows-zh-CN) | Windows 用户请按该项目说明选择对应版本，本仓库的 macOS 包不可使用 |

首页面向安装和使用；构建流程、资源结构等维护细节移至[开发文档](docs/development.md)。

## 汉化效果截图

以下沿用上游 **Raycast 2.4.1.0 R4** 的实机截图，仅供了解界面效果；**不是 2.9.0.0 R2 的截图**。R2 的实际验收范围见验证报告。

<details>
<summary>查看主界面、通用设置与扩展商店截图</summary>

### 主界面

![中文搜索框与命令列表，Command 类型标签保留英文](docs/screenshots/main.jpg)

### 通用设置

![中文外观、界面大小与窗口模式设置](docs/screenshots/settings.jpg)

### Mole 商店详情

![Mole 商店命令说明汉化](docs/screenshots/mole-store.jpg)

商店截图不代表扩展内部全部流程均已汉化。

</details>

## 扩展汉化列表

继承上游 **2026-09-21** 商店默认排序快照前十页的 **100 个扩展**，另保留 **Mole**，合计 **101 个**。这不是商店的实时排名。

覆盖已复核的商店介绍、命令说明、设置项和部分内部界面；未逐一登录并验收所有扩展的所有功能。未知文字、动态内容和部分登录后页面可能仍为英文。

<details>
<summary>展开完整 101 项名单</summary>

| 页码 | 扩展（商店链接） |
| --- | --- |
| 1 | [Color Picker](https://www.raycast.com/thomas/color-picker) |
| 1 | [Kill Process](https://www.raycast.com/rolandleth/kill-process) |
| 1 | [Google Chrome](https://www.raycast.com/Codely/google-chrome) |
| 1 | [Spotify Player](https://www.raycast.com/mattisssa/spotify-player) |
| 1 | [Google Translate](https://www.raycast.com/gebeto/translate) |
| 1 | [Visual Studio Code](https://www.raycast.com/thomas/visual-studio-code) |
| 1 | [Linear](https://www.raycast.com/linear/linear) |
| 1 | [Slack](https://www.raycast.com/mommertf/slack) |
| 1 | [1Password](https://www.raycast.com/khasbilegt/1password) |
| 1 | [Brew](https://www.raycast.com/nhojb/brew) |
| 2 | [Notion](https://www.raycast.com/notion/notion) |
| 2 | [Arc](https://www.raycast.com/the-browser-company/arc) |
| 2 | [GitHub](https://www.raycast.com/raycast/github) |
| 2 | [Coffee](https://www.raycast.com/mooxl/coffee) |
| 2 | [Speedtest](https://www.raycast.com/tonka3000/speedtest) |
| 2 | [Obsidian](https://www.raycast.com/marcjulian/obsidian) |
| 2 | [ChatGPT](https://www.raycast.com/abielzulio/chatgpt) |
| 2 | [Apple Notes](https://www.raycast.com/raycast/apple-notes) |
| 2 | [Apple Reminders](https://www.raycast.com/raycast/apple-reminders) |
| 2 | [Video Downloader](https://www.raycast.com/vimtor/video-downloader) |
| 3 | [Warp](https://www.raycast.com/warpdotdev/warp) |
| 3 | [System Monitor](https://www.raycast.com/hossammourad/raycast-system-monitor) |
| 3 | [GIF Search](https://www.raycast.com/josephschmitt/gif-search) |
| 3 | [Google Search](https://www.raycast.com/mblode/google-search) |
| 3 | [Timers](https://www.raycast.com/ThatNerd/timers) |
| 3 | [Lorem Ipsum](https://www.raycast.com/AntonNiklasson/lorem-ipsum) |
| 3 | [Zoom](https://www.raycast.com/raycast/zoom) |
| 3 | [Clean Keyboard](https://www.raycast.com/ike-gg/clean-keyboard) |
| 3 | [Format JSON](https://www.raycast.com/destiner/json-format) |
| 3 | [CleanShot X](https://www.raycast.com/Aayush9029/cleanshotx) |
| 4 | [Remove Paywall](https://www.raycast.com/tegola/remove-paywall) |
| 4 | [Music](https://www.raycast.com/fedevitaledev/music) |
| 4 | [Pomodoro](https://www.raycast.com/asubbotin/pomodoro) |
| 4 | [Todoist](https://www.raycast.com/doist/todoist) |
| 4 | [Set Audio Device](https://www.raycast.com/benvp/audio-device) |
| 4 | [Downloads Manager](https://www.raycast.com/thomas/downloads-manager) |
| 4 | [Google Calendar](https://www.raycast.com/thomas/google-calendar) |
| 4 | [Port Manager](https://www.raycast.com/lucaschultz/port-manager) |
| 4 | [YouTube](https://www.raycast.com/tonka3000/youtube) |
| 4 | [Google Gemini](https://www.raycast.com/EvanZhouDev/raycast-gemini) |
| 5 | [Browser Bookmarks](https://www.raycast.com/raycast/browser-bookmarks) |
| 5 | [Shell](https://www.raycast.com/asubbotin/shell) |
| 5 | [Tailwind CSS](https://www.raycast.com/vimtor/tailwindcss) |
| 5 | [Image Modification](https://www.raycast.com/HelloImSteven/sips) |
| 5 | [ScreenOCR](https://www.raycast.com/huzef44/screenocr) |
| 5 | [Bitwarden Vault](https://www.raycast.com/jomifepe/bitwarden) |
| 5 | [Jira](https://www.raycast.com/raycast/jira) |
| 5 | [Toothpick](https://www.raycast.com/VladCuciureanu/toothpick) |
| 5 | [Change Case](https://www.raycast.com/erics118/change-case) |
| 5 | [Emoji Search](https://www.raycast.com/FezVrasta/emoji) |
| 6 | [Perplexity](https://www.raycast.com/third774/perplexity) |
| 6 | [Docker](https://www.raycast.com/priithaamer/docker) |
| 6 | [Messages](https://www.raycast.com/thomaslombart/messages) |
| 6 | [Safari](https://www.raycast.com/loris/safari) |
| 6 | [Google Workspace](https://www.raycast.com/raycast/google-workspace) |
| 6 | [Quit Applications](https://www.raycast.com/mackopes/quit-applications) |
| 6 | [ray.so](https://www.raycast.com/garrett/ray-so) |
| 6 | [Installed Extensions](https://www.raycast.com/pernielsentikaer/installed-extensions) |
| 6 | [Folder Search](https://www.raycast.com/GastroGeek/folder-search) |
| 6 | [Cursor](https://www.raycast.com/degouville/cursor-recent-projects) |
| 7 | [App Cleaner](https://www.raycast.com/dziad/appcleaner) |
| 7 | [Word Count](https://www.raycast.com/itsmingjie/word-count) |
| 7 | [MyIP](https://www.raycast.com/Kang/myip) |
| 7 | [Google Maps Search](https://www.raycast.com/ratoru/google-maps-search) |
| 7 | [Password Generator](https://www.raycast.com/joshuaiz/password-generator) |
| 7 | [QR Code Generator](https://www.raycast.com/Melvynx/qrcode-generator) |
| 7 | [Base64](https://www.raycast.com/DanielSinclair/base64) |
| 7 | [Svgl](https://www.raycast.com/1weiho/svgl) |
| 7 | [Ruler](https://www.raycast.com/anwarulislam/ruler) |
| 7 | [Apple Mail](https://www.raycast.com/yug2005/mail) |
| 8 | [iTerm](https://www.raycast.com/ron-myers/iterm) |
| 8 | [Claude](https://www.raycast.com/florisdobber/claude) |
| 8 | [Raycast Explorer](https://www.raycast.com/raycast/raycast-explorer) |
| 8 | [Google Meet](https://www.raycast.com/vitoorgomes/google-meet) |
| 8 | [Apple Intelligence](https://www.raycast.com/EvanZhouDev/raycast-apple-intelligence) |
| 8 | [UUID Generator](https://www.raycast.com/jmaeso/uuid-generator) |
| 8 | [Quick Event](https://www.raycast.com/mblode/quick-event) |
| 8 | [Easy Dictionary](https://www.raycast.com/isfeng/easydict) |
| 8 | [Wikipedia](https://www.raycast.com/vimtor/wikipedia) |
| 8 | [WhatsApp](https://www.raycast.com/vimtor/whatsapp) |
| 9 | [Deepcast](https://www.raycast.com/mooxl/deepcast) |
| 9 | [Model Context Protocol Registry](https://www.raycast.com/raycast/model-context-protocol-registry) |
| 9 | [TinyPNG](https://www.raycast.com/kawamataryo/tinypng) |
| 9 | [2FA Code Finder](https://www.raycast.com/yuercl/imessage-2fa) |
| 9 | [Ollama AI](https://www.raycast.com/massimiliano_pasquini/raycast-ollama) |
| 9 | [Raindrop.io](https://www.raycast.com/lardissone/raindrop-io) |
| 9 | [Amphetamine](https://www.raycast.com/gstvds/amphetamine) |
| 9 | [Random Data Generator](https://www.raycast.com/loris/random) |
| 9 | [Gmail](https://www.raycast.com/tonka3000/gmail) |
| 9 | [Figma File Search](https://www.raycast.com/michaelschultz/figma-files-raycast-extension) |
| 10 | [Weather](https://www.raycast.com/tonka3000/weather) |
| 10 | [Cheatsheets](https://www.raycast.com/destiner/cheatsheets) |
| 10 | [Unix Timestamp](https://www.raycast.com/destiner/unix-timestamp) |
| 10 | [Visual Studio Code - Project Manager](https://www.raycast.com/MarkusLanger/vscode-project-manager) |
| 10 | [Dropover](https://www.raycast.com/jag-k/dropover) |
| 10 | [Screenshot](https://www.raycast.com/Aayush9029/screenshot) |
| 10 | [Media Converter](https://www.raycast.com/leandro.maia/media-converter) |
| 10 | [JetBrains Toolbox Recent Projects](https://www.raycast.com/gdsmith/jetbrains) |
| 10 | [Things](https://www.raycast.com/loris/things) |
| 10 | [Home Assistant](https://www.raycast.com/tonka3000/homeassistant) |
| 补充 | [Mole](https://www.raycast.com/jlrochin/mole) |

</details>

[上游快照的固定文案命中记录](installer/插件清单.md) · [本轮审校范围与限制](docs/translation-review-r2.md)

## 常见问题

### 这是官方中文版或语言设置开关吗？

这是非官方资源补丁，需要先安装对应的官方 Raycast。安装完成后指定界面会显示中文，无须再选择语言。

### 为什么仍有英文？

本包属于部分汉化。应用、扩展及模型名称、原生菜单栏、主搜索结果中的 `Command` 标签，以及未覆盖的动态内容可能仍为英文。继承的 2.6、2.7、2.8 更新说明翻译保留，2.9 更新说明正文尚未完整汉化。全量审校已有译文不等于所有英文内容都已覆盖。

### 汉化后提示“已损坏”或无法打开怎么办？

资源修改会使完整官方签名失效，部分机器可能被 macOS 拦截。请先用对应补丁包恢复原版；恢复失败时重新安装相应官方原版。不要重置用户数据库，也不要关闭系统安全保护。

本包不修改原生可执行文件、不重新签名、不移除隔离标记，也不修改账户、数据库或扩展设置。

### 安装器为什么拒绝安装？

常见原因包括 Raycast 仍在运行、版本或架构不符、已有其他补丁，或资源另有修改。按安装器提示处理；已经安装 R1 的用户应先用 R1 原包恢复。不要直接覆盖旧补丁或手动修改校验值。

### 如何反馈问题？

到[本仓库 Issues](https://github.com/Alex-Shen1121/raycast-macos-zh-CN/issues)提供 Raycast 完整版本、macOS 版本、芯片类型、补丁版本和问题截图。截图或日志请遮住账户、密钥及个人内容。

## 开发与第三方来源

[从源码构建与验证](docs/development.md) · [上游项目](https://github.com/zwjtano/raycast-macos-zh-CN) · [Unicode 数据来源](installer/Unicode来源.json)

上游 2.8.2.0 包 SHA-256：`825d5921e3f83c0e4b242dde48e63b39979ff5940ebaa3cb36bcdd4b2203896b`。

本项目与 Raycast 官方无隶属关系，Raycast 及其应用资源的权利归原权利人所有；本仓库不对第三方资源重新授予许可。Unicode 数据与 Acorn 许可随包提供。仓库和安装包不包含个人配置、数据库、应用备份或 Raycast 原生主程序。
