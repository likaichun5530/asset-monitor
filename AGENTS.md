# 有数项目协作规范

## 项目入口

- 优先阅读 docs/MAINTENANCE_MAP.md，按现象定位文件；发布时阅读 docs/RELEASE_RUNBOOK.md。只有任务涉及功能口径、项目状态、历史版本或原生打包时，再读取 README.md、PROJECT_STATUS.md、CHANGELOG.md 或 PACKAGING.md，避免每次重复加载全部文档。
- 生产地址：https://asset.kenny5530.asia 。生产前端和 api/ 由 Vercel 托管；server/ 是本地 API 容器。
- 修改前查看 Git 状态，保留用户已有修改；不把已部署等同于已提交。
- 搜索优先使用 `rg`，从界面原文、组件名、函数名或稳定 class 精确定位；先读相关文件和对应测试，不做无目的全仓扫描。

## 版本与发布（用户明确要求）

- 每次包含新修改的提交并部署，都必须升级版本。没有特别指定时，只递增第三位，例如 2.5.10 → 2.5.11；不得沿用旧版本发布新修改，不使用四段版本号。
- 运行代码或公开配置修改后默认部署生产环境；纯文档、注释、维护索引和协作规范不升级版本、不构建、不部署。用户明确要求“不部署”时保留本地修改。
- 未经用户明确要求不得执行 `git push`。运行代码部署成功后可本地提交以保持版本与源码对应；只有用户明确要求推送 Git 时才执行 `git push`。
- 执行 `npm version patch --no-git-tag-version`。version 生命周期脚本会同步 Android versionName，并在版本变化时将 versionCode 加一；package.json 和 package-lock.json 由 npm 同步。
- 用户指定版本时执行 `npm version <版本> --no-git-tag-version`，仍使用三段版本号。不要跳过生命周期脚本。
- 一个发布批次只升级一次；同一批次因登录、网络或构建问题重试部署不重复升级。已部署后再新增修改属于下一批次。
- 更新 CHANGELOG.md 与 PROJECT_STATUS.md，区分待发布、本地版本和线上版本；提交须包含全部相关版本文件。
- 发布前执行 `npm run version:check` 和 `npm run build`。优先运行与改动直接相关的测试；跨模块、认证、缓存、数据口径或大范围重构才运行完整测试。不得将“构建成功”描述为“所有测试通过”。
- 获得部署授权后发布生产环境，只有平台返回 READY 并绑定生产域名后才报告成功；记录部署标识。未部署或未推送须明确说明。
- 同一源码构建通过后不重复构建；同一批部署失败重试不重复升版本；生产成功后只做一次轻量 HTTP 检查，避免重复云构建和无意义发布。

## 平台和业务约束

- 用户主要使用 Android Chrome 安装的 PWA。Capacitor 插件仅作用于原生应用，Vercel 发布不会更新已安装 APK。
- 系统状态栏与页面顶部导航栏不同。PWA 不设置 theme-color，由 Android Chrome 跟随手机系统主题；应用页面仍可独立选择明暗模式。Capacitor 原生应用继续使用插件控制系统栏。iPhone 不能无真机证据宣称通过。
- public/manifest.webmanifest 是唯一 PWA manifest，故意不包含 theme_color；vite-plugin-pwa 只生成 Service Worker。不要再按应用主题动态切换 manifest。
- 暗夜普通卡片色为 #1f2937，页面底色 #111827；这些页面颜色不用于主动控制 PWA 系统状态栏。
- 账户健康度为整数，保留从 100 分开始的动画；每日涨跌不计分。评分规则以 src/utils/healthScore.js 为准。
- 现金、期货、黄金不要求细分目标；未设目标的“其他”不警告、不参与细分扣分。不要自行变更用户已确定的评分政策。
- 密钥、令牌、个人持仓数据不得写入文档、提交或日志。
