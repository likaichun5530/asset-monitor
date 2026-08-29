# Asset Monitor · 个人资产管理

一个响应式的个人资产管理应用，支持 Web、PWA 和 Capacitor Android。前端基于 React + Vite + Tailwind CSS + Recharts，实盘数据来自 Google Sheets。

## 功能特性

### 🏠 首页
- **总资产卡片**：当前总资产（人民币）、数据更新日期、较高点回撤，并提供「生成快照」按钮
- **涨跌卡片组**：
  - 近 7 天资产涨跌金额与涨跌幅
  - 近 1 个月资产涨跌金额与涨跌幅
  - 较高点回撤金额与百分比
- **资产趋势图**：历史资产快照曲线，支持「月 / 季 / 半年 / 年 / 全部」时间范围切换，标注历史高点，hover 显示金额与备注（如「付房款」「我爸给10w」）
- **资产配置**：合并饼图与金额列表，支持三种维度切换：
  - 按类别（股票 / 虚拟币 / 黄金 / 现金 / 债基 / 期货）
  - 按市场（美股 / A股 / 港股 / 日股 / 全球）
  - 按币种（人民币 / 美元 / 港币）
- **账户分布**：按账户/平台（IBKR / Snowball / Binance 等）展示资产分布与进度条
- **收益日历**：展示每日总资产变化；点击日期可查看各类资产相对上一条快照的变化金额，并可将当天备注保存到 History 表最后一列
- **卡片编辑**：长按首页进入编辑模式，卡片会轻微抖动；按住卡片即可拖动排序，也可隐藏或恢复卡片

### 📸 生成快照
- 点击首页「生成快照」按钮，会以当前持仓汇总的总资产生成一条当日快照
- 快照会立即追加到趋势图中（本地浏览器保存）
- **可选**：配置后端后，可同步写入 Google Sheets 的「历史」表

### 📈 行情 / 期货
- **行情页**：展示汇率 / 虚拟币 / A 股 / 期货等行情（数据来自 Google Sheets「Market」表）
- **期货页**：中证500期现贴水、到期天数与年化率（合约代码与价格来自 Market 表）

### 📋 持仓明细
- 类别筛选（全部 / 美股 / A股 / 港股 / 日股 / 虚拟币 / 黄金 / 现金 / 债基 / 期货）
- 桌面端表格：名称、代码、类别、市场、账户、币种、数量、单价、原币市值、人民币市值、占比，支持列排序
- 移动端卡片式列表
- 在线实盘模式支持新增、编辑和整行删除持仓，按类别动态显示可填写字段
- `AssetType` 表示资产归属，`Market` 表示市场，`Account` 表示托管账户；名称中出现“现金”不会改变资产归属
- A股/美股/港股/日股可选“证券持仓”或“账户现金”；账户现金仍保存为 `Stock + Market`，名称自动使用“人民币现金 / 美元现金 / 港币现金 / 日元现金”，并计入对应证券账户
- 债基可按代码和数量估值，也可直接填写原币市值；两者都保存为 `Bond`，不计入可用现金
- “现金”保存为 `Cash`，用于银行卡、微信、支付宝和手头现金；市场、账户和币种均可按实际情况选择
- 证券、黄金、虚拟币根据 `Market` 表中的代码自动计算单价与市值；直接金额按汇率换算；期货原币市值支持 Google Sheets 公式
- 合计行汇总

### 🎯 配置目标
- 对比各类资产的当前占比与目标占比
- 相对目标偏离达到 ±40%，或绝对偏离达到 ±2 个百分点时，提醒超配或低配
- 对已触发提醒的类别，按照当前总资产与目标比例给出建议增加或减少的金额
- 首页账户健康度与现金加仓建议使用相同的偏差判断口径

### 🤖 AI 资产助手
- 设置中可独立开启或关闭；开启后仅在登录状态的首页显示机器人入口，拖动松手后自动吸附到距离最近的屏幕左侧或右侧；长按入口可显示关闭按钮
- Vercel 后端实时读取 Holdings、History 和 target，将规范化后的资产数据交给 DeepSeek 分析
- 支持流式多轮对话和当前页面快捷问题，对话仅保存在当前浏览器
- 设置页使用一个统一编辑框维护全部 AI 回答规则；点击顶部保存按钮后写入 Google Sheets 的 `AIConfig` 表，保存成功会清空旧对话并在下一次提问生效
- 规则可统一配置助手身份、收益口径、事实边界、回答风格和分析偏好；登录鉴权和密钥隔离仍由服务端代码强制执行
- DeepSeek API Key、Google 凭据、登录令牌、表格公式和内部行信息不会发送到浏览器或模型
- AI 分析仅作资产整理与风险提示，不会修改持仓或执行交易

### 🔐 账号安全
- 登录状态下可在“设置 → 账号安全”修改密码，不修改用户名
- 首次修改前继续使用服务端 `AUTH_PASSWORD`；修改成功后仅在 Google Sheets `AuthConfig` 保存 scrypt hash、随机 salt 和 tokenVersion
- 修改前通过 HIBP Pwned Passwords 的 k-anonymity 范围接口拦截公开泄漏密码；只发送 SHA-1 前 5 位，不发送密码或完整哈希
- 修改密码会使旧 JWT 失效，并自动退出到登录页；密码不会写入浏览器存储或日志

### 📱 响应式设计
- 桌面端：顶部导航 + 宽屏布局
- 移动端：底部 Tab 导航 + 单列卡片布局

## 技术栈

| 技术 | 说明 |
| --- | --- |
| React 18 | UI 框架 |
| Vite 5 | 构建工具 |
| React Router 6 | 路由 |
| Tailwind CSS 3 | 原子化样式 |
| Recharts 2 | 图表库 |
| Vercel Functions | 生产 API，读写 Google Sheets |
| Express | 本地 API 容器，直接复用 Vercel Functions |
| vite-plugin-pwa / Capacitor | PWA 与 Android 封装 |

## 快速开始

### 前端

```bash
# 安装依赖
npm install

# 启动开发服务器（默认 http://localhost:5173）
npm run dev

# 构建生产版本
npm run build
```

开发服务器启用了 `--host`，可在局域网内通过手机直接访问（例如 `http://<本机IP>:5173`）。

### 本地 API

本地 Express 服务器：

```bash
cp server/.env.example server/.env
# 编辑 server/.env，填入 Google Sheets 与登录凭据
npm install
cd server && npm install && cd ..
npm run dev
```

在前端项目根目录创建 `.env.local`：

```
VITE_API_BASE=http://localhost:8787
```

`npm run dev` 会同时启动前端（5173）和本地 API（8787）。本地 Express 只负责 HTTP 服务，路由处理器直接复用 `api/` 中的 Vercel Functions，避免两套后端行为不一致。

### Vercel Serverless Functions（推荐生产环境）

无需额外运行服务器，API 路由位于 `api/` 目录下，部署到 Vercel 后自动生效。

API 不可用时，应用会读取浏览器中最近一次成功同步的缓存；快照会先写入 localStorage，待 API 恢复后重试同步。

> 所有包含个人资产数据的 API（包括读取接口）都必须携带登录 JWT。健康检查以及仅包含公开行情的 Market、Futures 接口保持公开。前端请求由统一 API 客户端自动附加令牌，并一致处理登录失效。

## 🚀 部署上线（通过域名访问）

### 部署到 Vercel（推荐）

Vercel 原生支持前端静态托管 + Serverless Functions，无需额外配置服务器。

#### 1. 安装 Vercel CLI

```bash
npm i -g vercel
```

#### 2. 部署

```bash
# 在项目根目录执行
vercel
```

每次提交并部署时递增四位版本号的最后一位（例如 `1.3.0.1` → `1.3.0.2`），并同步更新 `package.json`、`package-lock.json` 和 Android 版本信息。

首次使用会提示登录 Vercel 账号，按提示操作即可。部署完成后会得到一个预览 URL（如 `your-app.vercel.app`）。

#### 3. 配置环境变量

在 [Vercel Dashboard](https://vercel.com/dashboard) 进入项目 → Settings → Environment Variables，添加以下变量：

| 变量名 | 说明 | 示例 |
| --- | --- | --- |
| `SPREADSHEET_ID` | Google Sheets 文件 ID | `1abc...` |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | 服务账号邮箱 | `xxx@xxx.iam.gserviceaccount.com` |
| `GOOGLE_PRIVATE_KEY` | 服务账号私钥 | `-----BEGIN PRIVATE KEY-----\n...` |
| `JWT_SECRET` | JWT 签名密钥（必填；缺失时登录和私人 API 均拒绝工作） | 使用密码管理器生成的长随机字符串 |
| `AUTH_USERNAME` | 登录用户名 | 自定义 |
| `AUTH_PASSWORD` | 登录密码 | 自定义 |
| `CRON_SECRET` | 自动快照 Cron 调用密钥 | 长随机字符串 |
| `DEEPSEEK_API_KEY` | DeepSeek 开放平台 API Key，仅供服务端调用 | 从 DeepSeek 控制台创建后仅存入服务端环境变量 |
| `DEEPSEEK_BASE_URL` | DeepSeek OpenAI 兼容接口地址；官方平台可不填 | `https://api.deepseek.com` |
| `DEEPSEEK_MODEL` | DeepSeek 模型名称 | `deepseek-v4-flash` |
| `AI_ASSISTANT_ENABLED` | 服务端 AI 总开关；设为 `false` 时禁用接口 | `true` |

配置后重新部署使环境变量生效：

```bash
vercel --prod
```

#### 4. 绑定自定义域名

1. 在 Vercel Dashboard 进入项目 → Settings → Domains
2. 输入你的域名（如 `your-domain.com`）
3. 按提示在域名 DNS 服务商处添加记录：
   - **根域名**：添加 A 记录指向 `76.76.21.21`
   - **www 子域名**：添加 CNAME 记录指向 `cname.vercel-dns.com`
4. 等待 DNS 生效（通常几分钟到几小时）

绑定成功后即可通过 `https://your-domain.com` 访问。

#### 5. 配置前端 API 地址（前后端分离时才需要）

同域部署会自动使用当前域名下的 `/api/*`，无需设置 `VITE_API_BASE`。

如果前端和 API 分离部署，可在 Vercel 项目设置中添加环境变量 `VITE_API_BASE` 指向 API 地址，然后重新构建部署。

### 部署到其他平台（静态托管）

前端可部署到任意静态托管平台，API 需继续部署在 Vercel 或其他兼容服务上：

1. **构建生产版本**：
   ```bash
   npm run build
   ```
   产物在 `dist/` 目录。

2. **部署 `dist/` 到任意静态托管**（如 Netlify、Cloudflare Pages、Nginx 等）

3. 设置 `VITE_API_BASE` 指向独立部署的 API 地址后重新构建。项目使用 `HashRouter`，页面路由不依赖服务器回退规则。

## 目录结构

```
Asset-Monitor/
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── vercel.json                # Vercel 部署配置
├── .env.example              # 前端环境变量示例
├── api/                       # Vercel Serverless Functions（生产环境 API）
│   ├── _google.js             # Google Service Account JWT 认证（零外部依赖）
│   ├── _auth.js               # JWT 签发与私人 API 统一鉴权（无默认密钥）
│   ├── _auth-config.js        # AuthConfig 读写、校验与 20 秒短缓存
│   ├── _password.js           # scrypt 密码哈希、校验与恒定时间比较
│   ├── _pwned-password.js     # 公开泄漏密码 k-anonymity 检查
│   ├── _login-rate-limit.js   # 登录失败延迟与暖实例轻量限流
│   ├── _http.js               # Serverless / Express 通用请求解析
│   ├── _holdings-schema.js    # Holdings schema、归一化与输入校验
│   ├── _holdings-formulas.js  # Holdings Google Sheets 公式和行生成
│   ├── _holdings-service.js   # Holdings 读取、版本校验与编辑选项
│   ├── _snapshot.js           # 手动与定时快照的共享逻辑
│   ├── auth/
│   │   ├── login.js           # POST /api/auth/login（签发 JWT）
│   │   └── change-password.js # POST /api/auth/change-password
│   ├── futures.js             # GET  /api/futures
│   ├── health.js              # GET  /api/health
│   ├── holdings.js            # GET  /api/holdings
│   ├── history.js             # GET  /api/history
│   ├── snapshot.js            # POST /api/snapshot
│   ├── market.js              # GET  /api/market
│   ├── snapshot-auto.js       # GET  /api/snapshot-auto（Vercel Cron）
│   └── target.js              # GET  /api/target
├── apps-script/market/
│   └── Market.gs              # 可整段复制的单文件 Market 行情刷新脚本
├── public/
│   ├── icon.png
│   └── 品牌图片
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── index.css
│   ├── components/
│   │   ├── HomeAssetHero.jsx    # 首页总资产区域
│   │   ├── HomeOverviewCards.jsx # 首页稳定概览卡片
│   │   ├── ChangePasswordDialog.jsx # 修改密码弹窗
│   │   ├── Layout.jsx           # 桌面侧边栏 + 移动端顶部栏/底部 Tab
│   │   ├── StatCard.jsx
│   │   ├── TrendChart.jsx       # 趋势图（月/季/半年/年/全部 + 高点标注）
│   │   ├── AllocationChart.jsx  # 资产配置横向条形图（按类别）
│   │   └── HoldingsOverview.jsx # 账户分布进度条
│   ├── pages/
│   │   ├── Home.jsx             # 首页（总资产 + 涨跌卡片 + 生成快照）
│   │   ├── Holdings.jsx         # 持仓明细（表格 + 移动端卡片）
│   │   ├── Target.jsx           # 配置目标（超配/低配提醒）
│   │   ├── AssetDetail.jsx      # 资产详情（美股/A股/港股/日股/债基/虚拟币/期货/黄金）
│   │   ├── Cash.jsx             # 现金分布
│   │   ├── Login.jsx            # 登录页
│   │   ├── Market.jsx           # 行情页
│   │   ├── Future.jsx           # 期货页（期现贴水）
│   │   └── Settings.jsx         # 设置（数据模式、AI、账号安全、主题）
│   ├── data/
│   │   ├── demo.js              # 演示模式数据
│   │   └── holdings.js          # 分类、市场和币种的显示配置
│   ├── hooks/
│   │   ├── useAssetData.js      # 数据加载/刷新/自动同步 hook
│   │   ├── useVisiblePolling.js # 独立数据源的可见性轮询与并发保护
│   │   └── useAuth.js           # 登录状态 / JWT 管理
│   └── utils/
│       ├── asset.js             # 资产计算（聚合/涨跌/回撤）
│       ├── dataStore.js         # 离线优先数据存储（Google Sheets + localStorage）
│       ├── api.js               # API 地址、鉴权头、401 与 GET 去重
│       ├── password.js          # 前端修改密码基础校验
│       ├── refreshPolicy.js     # 可见性、过期时间和并发刷新判断
│       ├── snapshot.js          # 快照内存缓存管理
│       └── format.js            # 数值/日期格式化
├── server/                      # 本地 Express 后端（开发环境可选）
│   ├── index.js
│   ├── package.json
│   ├── setup-target.mjs        # target 表初始化脚本
│   └── .env.example
├── electron/                    # 历史 Electron 主进程代码（当前未配置打包依赖/脚本）
│   └── main.cjs
└── android/                     # Capacitor Android 原生项目
```

## 数据维护

实盘数据来源于 Google Sheets；演示数据位于 `src/data/demo.js`。

### Market 行情刷新脚本

Google Sheets 的 Market 行情刷新脚本以单文件形式保存在 [`apps-script/market/Market.gs`](./apps-script/market/Market.gs)，可完整复制到绑定的 Apps Script 项目。默认按来源和市场当地时区调度；数字货币与汇率全天运行，美股使用纽约时区并自动适配夏令时和冬令时。安装触发器、脚本属性和 clasp 的具体步骤见 [`apps-script/market/README.md`](./apps-script/market/README.md)。

### 持仓数据（`Holdings` 表）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `assetType` | string | 资产大类（股票 / 虚拟币 / 黄金 / 现金 / 债基 / 期货） |
| `market` | string | 市场（US / CN / HK / JP / GLOBAL） |
| `account` | string | 账户/平台 |
| `symbol` | string | 代码（现金类为 `-`） |
| `name` | string | 名称 |
| `currency` | string | 计价币种（CNY / USD / HKD） |
| `quantity` | number/null | 持仓数量（现金类为 null） |
| `price` | number/null | 单价（现金类为 null） |
| `marketValue` | number | 原币市值 |
| `marketValueCNY` | number | 人民币市值 |

`src/data/holdings.js` 只维护资产颜色、市场颜色和市场标签，不包含实盘持仓。

### 历史数据（`History` 表）

每日一条 `{ date, total, categories?, note? }` 快照。手动和定时快照都会从 `Holdings` 实时汇总总资产与九类资产数据；美股历史按账户口径包含 US 现金，A股和港股历史只包含股票（现金列仍保留全部现金，总资产只累计一次），同日已有记录时覆盖并保留原备注，否则追加。

### 认证配置（`AuthConfig` 表）

首次成功修改密码时自动创建，使用固定 key/value 结构：`username`、`passwordHash`、`passwordSalt`、`tokenVersion`、`updatedAt`。其中密码使用 Node.js 原生 scrypt 和随机 salt 生成，表中不保存明文密码；`JWT_SECRET` 仍只存在服务端环境变量。AuthConfig 未初始化时登录继续验证 `AUTH_PASSWORD`，实现无感迁移。

## 离线优先（Offline-First）架构

应用实现了离线优先的数据同步策略，确保无网络时仍可使用：

### 数据读取优先级
1. **在线模式**：从后端 API（Google Sheets）拉取最新数据 → 更新本地缓存
2. **离线模式**：使用本地缓存（localStorage）中的最近一次数据
3. **无可用数据**：实盘模式显示空状态；演示模式使用 `src/data/demo.js`

在线 GET 另有一层仅存在于当前页面进程的短 TTL 缓存，用于避免快速切换页面时重复访问 Google Sheets：Holdings 和 Target 为 15 秒，Market 和 Futures 为 20 秒。它不使用浏览器/CDN HTTP Cache，不缓存写请求；写入数据、手动刷新、登录会话切换时会按数据源立即失效。History 仍不做周期 TTL 缓存。

### 数据写入策略（生成快照）
1. **立即写入本地**：快照保存到 localStorage 的待同步队列，趋势图立即更新
2. **尝试同步云端**：若后端可用，POST 到 Google Sheets；成功则从待同步队列移除
3. **自动重试**：下次成功连接后端时，自动重试推送待同步的快照

### 同步状态显示
- 顶部导航栏显示在线、离线缓存或演示状态
- 首页快照按钮旁显示「N 条待同步」提示
- Holdings、Market、Futures 按各自周期独立刷新；页面隐藏时暂停，重新可见且缓存过期后再刷新
- History 首次进入时读取，生成快照、修改历史或手动刷新后才重新读取，不再固定每 5 分钟请求
- 支持手动点击刷新按钮

### 本地缓存键（localStorage）
| 键 | 内容 |
| --- | --- |
| `asset-monitor:holdings` | 持仓数据缓存 |
| `asset-monitor:history` | 历史快照缓存 |
| `asset-monitor:pendingSync` | 待同步到 Google Sheets 的快照队列 |
| `asset-monitor:lastSyncAt` | 最后成功同步时间 |
| `youshu-ai-enabled` | 是否在页面显示 AI 助手 |
| `youshu-ai-consent` | 是否已确认资产数据会发送给 DeepSeek |
| `youshu-ai-messages` | 当前浏览器最近的 AI 对话 |

JWT 为兼容 Web、Electron 和 Capacitor 当前继续保存在 localStorage。前端不执行动态 HTML、AI 回复只按纯文本渲染，并且 localStorage 不保存密码、API Key 或 Google 凭据。

## 配色说明

遵循国内市场习惯：**红涨绿跌**。

## 后端 API 说明

| 接口 | 方法 | 说明 |
| --- | --- | --- |
| `/api/auth/login` | POST | 登录，返回 JWT token |
| `/api/auth/change-password` | POST | 私人；验证当前密码后写入 AuthConfig，并使旧 JWT 失效 |
| `/api/ai-chat` | POST | 登录后读取资产数据并流式调用 DeepSeek |
| `/api/ai-rules` | GET / PUT | 登录后读取或保存统一 AI 规则；首次保存自动创建 `AIConfig` 表 |
| `/api/health` | GET | 健康检查，返回是否已配置 Google 凭据 |
| `/api/holdings` | GET / POST / PUT / DELETE | 私人；读取、新增、编辑或整行删除 Google Sheets「Holdings」持仓，写操作另有行版本校验 |
| `/api/history` | GET / PUT | 私人；读取 History 或按日期更新当天最后一列备注 |
| `/api/snapshot` | POST | 私人；从 Holdings 重新汇总并写入 History，body: `{ date }`（额外字段会忽略） |
| `/api/snapshot-auto` | GET | 服务调用；每日北京时间 23:00 自动快照，必须使用 `CRON_SECRET` Bearer 鉴权 |
| `/api/target` | GET | 私人；读取 target 表 + 实时持仓计算，返回目标配置对比数据 |
| `/api/market` | GET | 读取 Market 表行情（公开） |
| `/api/futures` | GET | 中证500股指期货贴水（公开） |

登录接口会对连续失败进行延迟和暖实例内的轻量限流。AuthConfig 在每个服务端实例内缓存 20 秒并合并并发读取；修改密码会立即清除当前实例缓存。Vercel Serverless 不保证同一请求落到同一实例，因此登录限流不是跨实例严格限流，其他暖实例也可能在最多 20 秒内继续接受旧 tokenVersion；如需强一致失效，需要外部共享存储或边缘层支持。

### Google Sheets 凭据获取

1. 在 [Google Cloud Console](https://console.cloud.google.com/) 创建项目
2. 启用 Google Sheets API
3. 创建服务账号并下载 JSON 密钥
4. 把服务账号邮箱（形如 `xxx@xxx.iam.gserviceaccount.com`）分享给你的 Google Sheets（编辑权限）
5. 将凭据填入环境变量（见上方部署章节）
