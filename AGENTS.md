# 有数项目协作规范

## 项目入口

- 优先阅读 docs/MAINTENANCE_MAP.md，按现象定位文件；发布时阅读 docs/RELEASE_RUNBOOK.md。只有任务涉及功能口径、项目状态、历史版本或原生打包时，再读取 README.md、PROJECT_STATUS.md、CHANGELOG.md 或 PACKAGING.md，避免每次重复加载全部文档。
- 生产地址：https://asset.kenny5530.asia 。生产前端和 api/ 由 Vercel 托管；server/ 是本地 API 容器。
- 修改前查看 Git 状态，保留用户已有修改；不把已部署等同于已提交。
- 搜索优先使用 `rg`，从界面原文、组件名、函数名或稳定 class 精确定位；先读相关文件和对应测试，不做无目的全仓扫描。

## 版本与发布（用户明确要求）

- 每批运行代码或公开配置修改都必须升级版本。没有特别指定时，只递增第三位，例如 2.5.10 → 2.5.11；不得沿用旧版本生成升级包，不使用四段版本号。
- 用户没有特别说明时，生成项目内 `public/downloads/` 的 Android 升级包、更新 `public/updates/android.json`，并发布 App 升级通道，使已安装 App 能检测和下载；不额外复制本地 APK，不执行 `git commit` 或 `git push`。
- 用户说“不要部署”时，默认含义是“网页版保持当前版本，但 App 升级包仍需在线发布”。当前升级文件与网页共用 Vercel 项目，技术上仍需创建一次生产部署；应把 App 专属界面改动限制在 `html.native-app` / Capacitor 环境，并固定网页展示版本，避免改变浏览器/PWA 的显示和行为。
- 用户说“只生成项目内升级包，不上传”时，才不发布 App 升级通道。用户说“网页版也部署”时，才把本批网页改动一同发布。
- 只有用户明确要求“提交 Git”时才执行本地提交；只有用户明确要求“推送 Git”时才执行 `git push`。这些动作分别授权，不能相互推定。
- 纯文档、注释、维护索引和协作规范不升级版本、不构建升级包、不部署。
- 执行 `npm version patch --no-git-tag-version`。version 生命周期脚本会同步 Android versionName，并在版本变化时将 versionCode 加一；package.json 和 package-lock.json 由 npm 同步。
- 用户指定版本时执行 `npm version <版本> --no-git-tag-version`，仍使用三段版本号。不要跳过生命周期脚本。
- 一个发布批次只升级一次；同一批次因登录、网络或构建问题重试部署不重复升级。已部署后再新增修改属于下一批次。
- 更新 CHANGELOG.md 与 PROJECT_STATUS.md，明确区分升级包版本、本地未提交状态和线上版本；提交须包含全部相关版本文件。
- 生成升级包前执行 `npm run version:check`、必要的相关测试、Web 构建和 Android 构建。跨模块、认证、缓存、数据口径或大范围重构才运行完整测试。不得将“构建成功”描述为“所有测试通过”。
- 发布 App 升级通道或用户明确要求发布网页版时，只有平台返回 READY、绑定生产域名且在线升级清单与 APK 校验一致后才报告成功并记录部署标识。未发布、未提交或未推送须明确说明。
- 同一源码构建通过后不重复构建；同一批部署失败重试不重复升版本；生产成功后只做一次轻量 HTTP 检查，避免重复云构建和无意义发布。

## 平台和业务约束

- 用户主要使用 Android Chrome 安装的 PWA。Capacitor 插件仅作用于原生应用，Vercel 发布不会更新已安装 APK。
- 系统状态栏与页面顶部导航栏不同。PWA manifest 使用浅灰色 #f9fafb theme_color 作为首次启动回退，index.html 的同步首屏脚本再按已保存的应用主题设置 #f9fafb 或 #000000，避免手机处于系统暗夜模式时白天主题首次启动出现黑色状态栏。Capacitor 原生应用继续使用插件控制系统栏。iPhone 不能无真机证据宣称通过。
- public/manifest.webmanifest 是唯一 PWA manifest；vite-plugin-pwa 只生成 Service Worker。不要按应用主题动态切换 manifest 文件。
- 原生 APK 暗夜普通卡片色为 #151820，状态栏和页面底色为 #0d1017；手机总资产区域与页面底色相同。浏览器/PWA 暗夜普通卡片色仍为 #252e37，状态栏和页面底色仍为 #21262f；白天均使用 #f9fafb。
- 账户健康度为整数，保留从 100 分开始的动画；每日涨跌不计分。评分规则以 src/utils/healthScore.js 为准。
- 现金、期货、黄金不要求细分目标；未设目标的“其他”不警告、不参与细分扣分。不要自行变更用户已确定的评分政策。
- 密钥、令牌、个人持仓数据不得写入文档、提交或日志。
