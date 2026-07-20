# Asset Monitor · 个人资产管理

一个响应式的个人资产管理 Web 应用，支持网页与手机查看。基于 React + Vite + Tailwind CSS + Recharts 构建。数据来源于 Google Sheets。

## 功能特性

### 🏠 首页
- **总资产卡片**：当前总资产（人民币）、数据更新日期、较高点回撤，并提供「生成快照」按钮
- **涨跌卡片组**：
  - 近 7 天资产涨跌金额与涨跌幅
  - 近 1 个月资产涨跌金额与涨跌幅
  - 较高点回撤金额与百分比
- **资产趋势图**：历史资产快照曲线，支持「月 / 季 / 半年 / 年 / 全部」时间范围切换，标注历史高点，hover 显示金额与备注（如「付房款」「我爸给10w」）
- **资产配置**：合并饼图与金额列表，支持三种维度切换：
  - 按类别（股票 / 数字货币 / 黄金 / 现金 / 债券 / 期货）
  - 按市场（美股 / A股 / 港股 / 日股 / 全球）
  - 按币种（人民币 / 美元 / 港币）
- **账户分布**：按账户/平台（IBKR / Snowball / Binance 等）展示资产分布与进度条

### 📸 生成快照
- 点击首页「生成快照」按钮，会以当前持仓汇总的总资产生成一条当日快照
- 快照会立即追加到趋势图中（本地浏览器保存）
- **可选**：配置后端后，可同步写入 Google Sheets 的「历史」表

### 📋 持仓明细
- 类别筛选（全部 / 股票 / 数字货币 / 黄金 / 现金 / 债券 / 期货）
- 桌面端表格：名称、代码、类别、市场、账户、币种、数量、单价、原币市值、人民币市值、占比，支持列排序
- 移动端卡片式列表
- 合计行汇总

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
| Express + googleapis | 可选后端，用于写入 Google Sheets |

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

### 后端（可选，用于「生成快照」写入 Google Sheets）

```bash
cd server
cp .env.example .env
# 编辑 .env 填入 Google Sheets 凭据
npm install
npm start
```

然后在前端项目根目录创建 `.env.local`：

```
VITE_API_BASE=http://localhost:8787
```

未配置后端时，「生成快照」按钮仍可用，快照会保存在浏览器 localStorage 中并实时更新趋势图。

## 目录结构

```
Asset-Monitor/
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── .env.example              # 前端环境变量示例
├── public/
│   └── favicon.svg
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── index.css
│   ├── components/
│   │   ├── Layout.jsx           # 顶部导航 + 同步状态 + 底部 Tab
│   │   ├── StatCard.jsx
│   │   ├── TrendChart.jsx       # 趋势图（含时间范围切换、高点标注）
│   │   └── AllocationChart.jsx  # 资产配置（按类别/市场/币种切换）
│   ├── pages/
│   │   ├── Home.jsx             # 首页（含「生成快照」按钮）
│   │   └── Holdings.jsx
│   ├── data/
│   │   ├── holdings.js          # 持仓明细（对应 Holdings 表，静态兜底）
│   │   └── history.js           # 历史快照（对应 history 表，静态兜底）
│   ├── hooks/
│   │   └── useAssetData.js      # 数据加载/刷新/自动同步 hook
│   └── utils/
│       ├── asset.js             # 资产计算（支持动态数据）
│       ├── format.js            # 格式化
│       ├── snapshot.js          # 快照内存缓存管理
│       └── dataStore.js         # 离线优先数据存储（Google Sheets + localStorage）
└── server/                      # 可选后端
    ├── index.js                 # Express API（holdings/history/snapshot）
    ├── package.json
    └── .env.example
```

## 数据维护

数据来源于 Google Sheets，已内置为前端示例数据，位于 `src/data/`。

### 持仓数据 `holdings.js`（对应 `Holdings` 表）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `assetType` | string | 资产大类（股票 / 数字货币 / 黄金 / 现金 / 债券 / 期货） |
| `market` | string | 市场（US / CN / HK / JP / GLOBAL） |
| `account` | string | 账户/平台 |
| `symbol` | string | 代码（现金类为 `-`） |
| `name` | string | 名称 |
| `currency` | string | 计价币种（CNY / USD / HKD） |
| `quantity` | number/null | 持仓数量（现金类为 null） |
| `price` | number/null | 单价（现金类为 null） |
| `marketValue` | number | 原币市值 |
| `marketValueCNY` | number | 人民币市值 |

文件底部还维护：`categoryOrder`、`categoryColors`、`exchangeRates`、`marketLabels`、`marketColors`、`marketOrder`、`currencyColors`、`currencyLabels`

### 历史数据 `history.js`（对应 `历史` 表）

每日一条 `{ date, total, note? }` 快照：
- `total`：当日资产总额（不含高风险资产）
- `note`：可选备注

文件底部维护 `peakValue` / `peakDate`（历史最高点）。

> **注意**：通过「生成快照」按钮追加的快照保存在浏览器 localStorage 中，会覆盖同日静态数据。若需持久化到 Google Sheets，请配置后端。

## 离线优先（Offline-First）架构

应用实现了离线优先的数据同步策略，确保无网络时仍可使用：

### 数据读取优先级
1. **在线模式**：从后端 API（Google Sheets）拉取最新数据 → 更新本地缓存
2. **离线模式**：使用本地缓存（localStorage）中的最近一次数据
3. **首次使用**：使用内置静态数据（`src/data/*`）

### 数据写入策略（生成快照）
1. **立即写入本地**：快照保存到 localStorage 的待同步队列，趋势图立即更新
2. **尝试同步云端**：若后端可用，POST 到 Google Sheets；成功则从待同步队列移除
3. **自动重试**：下次成功连接后端时，自动重试推送待同步的快照

### 同步状态显示
- 顶部导航栏显示数据来源徽章：🟢在线 / 🟡离线缓存 / ⚪示例数据
- 首页快照按钮旁显示「N 条待同步」提示
- 每 5 分钟自动刷新一次（在线时拉取最新数据）
- 支持手动点击刷新按钮

### 本地缓存键（localStorage）
| 键 | 内容 |
| --- | --- |
| `asset-monitor:holdings` | 持仓数据缓存 |
| `asset-monitor:history` | 历史快照缓存 |
| `asset-monitor:pendingSync` | 待同步到 Google Sheets 的快照队列 |
| `asset-monitor:lastSyncAt` | 最后成功同步时间 |

## 配色说明

遵循国内市场习惯：**红涨绿跌**。

## 后端 API 说明

| 接口 | 方法 | 说明 |
| --- | --- | --- |
| `/api/health` | GET | 健康检查，返回是否已配置 Google 凭据 |
| `/api/holdings` | GET | 读取 Google Sheets「Holdings」表，返回 JSON 数组 |
| `/api/history` | GET | 读取 Google Sheets「history」表，返回 JSON 数组 |
| `/api/snapshot` | POST | 追加一条快照到「history」表，body: `{ date, total }` |

### Google Sheets 凭据获取

1. 在 [Google Cloud Console](https://console.cloud.google.com/) 创建项目
2. 启用 Google Sheets API
3. 创建服务账号并下载 JSON 密钥
4. 把服务账号邮箱（形如 `xxx@xxx.iam.gserviceaccount.com`）分享给你的 Google Sheets（编辑权限）
5. 将 `client_email` 和 `private_key` 填入 `server/.env`