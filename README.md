# 有数 · Asset Monitor

个人资产管理应用，支持 Web、PWA 和 Capacitor Android。React + Vite + Tailwind CSS + Recharts 构建前端；实盘数据来自 Google Sheets，生产 API 由 Vercel Functions 提供，本地 Express 直接复用相同处理器。

[生产应用](https://asset.kenny5530.asia) · [当前状态与审查记录](PROJECT_STATUS.md) · [发布记录](CHANGELOG.md) · [协作规范](AGENTS.md) · [PWA / Android 打包](PACKAGING.md)

应用版本来自根目录 `package.json`；`server/package.json` 的版本独立于应用版本。

## 功能与数据口径

- **总览**：人民币总资产、金额隐藏、今日盈亏、近 7 日 / 近 1 月 / 今年盈亏、较高点回撤、货币比例和账户健康度。今日盈亏取最新快照减前一自然日快照，缺少前一日数据时显示 `--`；资产差额包含资金流入流出，不等同于剔除现金流后的投资收益。
- **历史与布局**：趋势范围为近 1 月、近 3 月、近 1 年、今年、全部；收益日历可查看分类变化和编辑备注。手机长按首页进入卡片排序 / 隐藏模式，桌面提供编辑入口。
- **配置与持仓**：首页资产配置为按类别排列的横向条形图；持仓概况按类别筛选并展示前五大持仓。持仓页支持筛选、排序及在线新增 / 编辑 / 删除，详情页展示对应分类持仓和历史走势。
- **目标**：九类资产目标、细分目标、配置思路，以及超配 / 低配提醒和建议调整金额。容忍幅度为目标的 40%，最低 0.5、最高 2 个百分点；达到边界仍算范围内。
- **评分**：账户健康度为 5～100 的整数，扣分来自大类偏差、按大类权重计算的细分偏差和 IC 保证金使用率。每日涨跌不计分；现金、期货、黄金无需细分目标，未设目标的“其他”不参与细分扣分。具体规则见 `src/utils/healthScore.js` 和 [项目状态](PROJECT_STATUS.md)。
- **行情与期货**：行情读取 Market 表；期货页展示持仓、保证金和 IC 期现贴水。合约交割日期按代码推算每月第三个周五，未接入节假日调整日历。
- **打新提醒**：首页展示当日新股 / 新债申购，支持隐藏当天提醒；数据由 `/api/market?view=subscriptions` 提供。
- **AI 助手**：在设置中开启，登录后通过业务页面标题栏用户名左侧的黑白 `AI` 圆环进入；设置页和演示模式不显示入口。支持流式对话、页面快捷问题、Gemini / DeepSeek 模型选择和联网搜索开关。对话、当前模型选择保存在当前浏览器，模型清单和统一回答规则保存到 `SystemSettings`。资产上下文由服务端读取并预先计算，助手不会执行交易或修改持仓。
- **登录与密码**：私人 API 需要 JWT。首次使用服务端 `AUTH_PASSWORD`；修改后保存 scrypt 密码哈希、随机 salt 和 tokenVersion，旧 JWT 随之失效。修改密码前通过 HIBP k-anonymity 接口检查泄漏，只发送 SHA-1 前 5 位；命中后需明确确认才能继续。密钥及认证配置不发送给模型。

## 本地开发

使用支持内置 `fetch`、`node --test` 的现代 Node.js；本次验证使用 Node.js 24。首次安装需要分别安装前后端依赖：

```bash
npm ci
npm ci --prefix server
cp .env.example .env.local
cp server/.env.example server/.env
# 编辑 server/.env，填写服务端凭据
npm run dev
```

`npm run dev` 同时启动前端（5173）与 API（8787）；前端通过 `.env.local` 中的 `VITE_API_BASE=http://localhost:8787` 访问 API。开发服务监听局域网，手机访问时需将该地址改为开发机的局域网地址。

```bash
npm run dev:server    # 单独启动本地 API
npm test             # Node 测试，包括计算规则、鉴权和源码回归检查
npm run version:check
npm run build        # 生成 dist/ 和 Service Worker
npm run preview      # 预览已构建前端，不启动 API
```

没有服务端配置时可从登录页进入演示模式。实盘模式请求失败会尝试读取该浏览器的缓存，没有缓存则显示空状态。

## 服务端配置

将 Google 服务账号以编辑权限分享给表格。服务端变量配置在 Vercel 或 `server/.env`，完整示例见 [server/.env.example](server/.env.example)。不要放进 `VITE_*` 变量。

| 变量 | 用途 |
| --- | --- |
| `SPREADSHEET_ID` | Google Sheets 文件 ID |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL`、`GOOGLE_PRIVATE_KEY` | 服务账号；私钥支持字面量 `\n` 换行 |
| `AUTH_USERNAME`、`AUTH_PASSWORD` | 登录用户名及尚未设置哈希密码时的初始密码 |
| `JWT_SECRET` | JWT 签名密钥，缺失时拒绝登录及私人请求 |
| `CRON_SECRET` | 定时快照鉴权，使用独立随机值 |
| `GEMINI_API_KEY`、`DEEPSEEK_API_KEY` | 对应模型服务密钥；未配置的服务商不可用 |
| `DEEPSEEK_BASE_URL`、`DEEPSEEK_MODEL` | 可选服务地址与模型回退值，通常优先使用保存的模型清单 |
| `GEMINI_MAX_OUTPUT_TOKENS` | 1024～32768，默认 8192 |
| `GEMINI_THINKING_LEVEL` | `low` / `medium` / `high`，默认 `low` |
| `AI_ASSISTANT_ENABLED` | 设为 `false` 时关闭服务端 AI |
| `PORT` | 仅本地 API 使用，默认 8787 |

## Google Sheets 结构

- **Holdings**：表头为 `AssetType, Market, Account, Symbol, Name, Currency, Quantity, Price, MarketValue, MarketValueCNY`。存储类型包括 `Stock / Crypto / Gold / Cash / Bond / Future`，API 转换成中文显示类别；兼容旧基金名称。证券账户现金使用 `Stock + Market`，独立现金使用 `Cash`，基金使用 `Bond`。金额换算、编辑校验和表格公式分别见 `api/_holdings-schema.js`、`api/_holdings-formulas.js`。
- **History**：A～L 列依次为日期、总额、美股、虚拟币、基金、期货、A股、黄金、日股、港股、现金、备注。快照按 AssetType / Market 分类；证券账户现金归属对应股票市场，Cash 只归入现金，总额累计一次。历史旧行不会自动重算。
- **target**：A 列类别，B 列大类目标比例，C 列配置思路；从 D 列开始每三列一个细分组，前两列为名称 / 代码和目标比例。首次配置需预建表头和九类资产行：美股、A股、港股、日股、虚拟币、黄金、基金、期货、现金。大类合计必须为 100%，细分合计不能超过 100%。不要使用旧版“金额 / 实际占比 / 目标”初始化模板覆盖此结构。
- **Market**：A 列名称、B 列代码、C 列价格、F 列类别、G 列显示标识；行情页仅展示 G 列为 `y` 的条目，期货接口按名称和类别识别相关合约。
- **SystemSettings**：`key | value | updatedAt | description`。保存 `auth.*`、`ai.rules`、`ai.models`；`appsScript.marketCode` 用于存放行情脚本文本，实际运行仍需放入 Google Apps Script 编辑器。旧 `AuthConfig` / `AIConfig` 只作读取回退，迁移后的保存写入新表。

## 快照、缓存与刷新

当前首页没有手动生成快照按钮。服务端保留已鉴权的 `POST /api/snapshot`；Vercel Cron 配置为每天 UTC 15:00（北京时间 23:00）调用 `/api/snapshot-auto`。快照从服务端 Holdings 汇总，同日覆盖时保留备注。自动任务不在总额为零时写入。实际定时执行以平台记录为准。

持仓和历史在需要它们的页面可见时每 60 秒刷新；Market / Futures 独立轮询默认 5 分钟。手动刷新优先当前页面数据，再依次刷新其他数据源。此处如实记录当前实现，尚未完全统一为一分钟。

浏览器保存最近成功的持仓、历史、目标和行情缓存；在线 GET 的内存缓存分别为 Holdings / Target 15 秒、Market / Futures 20 秒、打新提醒 5 分钟，History 无周期 TTL。写入和登录会话切换会失效相关内存缓存。保留旧版本待同步快照队列的重试与合并，不清除用户历史数据。持仓、目标和备注编辑仍要求联网。

## 发布与目录

默认完成修改后部署生产环境、提交并推送 Git，除非用户明确要求不部署。每批新修改递增补丁版本一次：

```bash
npm version patch --no-git-tag-version
npm run version:check
npm test
npm run build
vercel --prod
```

版本脚本同步根目录锁文件与 Android versionName / versionCode。更新 CHANGELOG 与 PROJECT_STATUS，只有 Vercel 返回 READY 且绑定生产域名才记录已发布；部署失败重试不重复升版本。部署配置见 `vercel.json`。DNS 按 Vercel 项目提供的记录配置。

同域部署不需要 `VITE_API_BASE`；独立前端或 APK 需在构建前设置它指向实际 API。项目使用 HashRouter，页面路由不依赖服务端回退。PWA 的 `public/manifest.webmanifest` 是唯一 manifest，故意不设置 theme_color；系统栏交给系统与浏览器处理，页面主题独立切换。

| 目录 | 职责 |
| --- | --- |
| `src/pages/`、`src/components/` | 页面与 UI 组件 |
| `src/hooks/`、`src/utils/` | 数据加载、缓存、格式化、交互与评分 |
| `src/data/` | 显示配置和演示数据，不保存实盘持仓 |
| `shared/` | 前后端共用的资产分类和配置偏差规则 |
| `api/` | 生产 API；下划线模块为共享实现 |
| `server/` | 本地 Express 容器，无独立业务实现 |
| `public/` | 正在使用的应用图标、品牌图、助手头像和 manifest |
| `android/` | Capacitor 原生项目；发布 Web 不更新 APK |
| `scripts/`、`test/` | 版本同步与自动化验证 |

当前不提供 Electron 构建流程。历史发布记录保留在 Git 与 CHANGELOG，不作为现行功能说明。
