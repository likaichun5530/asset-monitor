# 有数维护地图

这份文件用于修改和排错时快速定位。先按“现象 → 文件”查找，再读取相关文件和测试；不要每次从头扫描整个仓库。

## 30 秒入口

```bash
git status --short
rg -n "界面文字或函数名" src api test
node --test test/对应测试.test.js
```

- 路由入口：`src/App.jsx`
- 页面外壳、导航、在线状态、AI 入口：`src/components/Layout.jsx`
- 全局样式、桌面响应式布局：`src/index.css`
- 前端数据加载与刷新：`src/hooks/useAssetData.js`、`src/utils/dataStore.js`、`src/utils/api.js`
- 生产 API：`api/`；本地 API 只由 `server/index.js` 转发到同一批处理器
- 版本同步：`scripts/sync-version.mjs`
- 发布流程：`docs/RELEASE_RUNBOOK.md`

## 页面与路由

| URL | 页面入口 | 主要关联文件 |
| --- | --- | --- |
| `#/` | `src/pages/Home.jsx` | `HomeAssetHero.jsx`、`HomeOverviewCards.jsx`、`TrendChart.jsx`、`SubscriptionTicker.jsx`、`AllocationChart.jsx`、`HoldingsOverview.jsx`、`CalendarHeatmap.jsx` |
| `#/holdings` | `src/pages/Holdings.jsx` | `HoldingEditor.jsx`、`holdingEditorDraft.js`、`holdingScope.js` |
| `#/target` | `src/pages/Target.jsx` | `TargetAllocationScale.jsx`、三个 `Target*Dialog.jsx`、`targetAllocation.js` |
| `#/market` | `src/pages/Market.jsx` | `quoteData.js`、`api/market.js` |
| `#/us`、`#/cn`、`#/hk`、`#/jp`、`#/gold`、`#/bond`、`#/crypto` | `src/pages/AssetDetail.jsx` | 文件内 `ASSET_CONFIG`、`asset.js`、`holdingScope.js` |
| `#/future` | `src/pages/Future.jsx` | `quoteData.js`、`api/futures.js` |
| `#/cash` | `src/pages/Cash.jsx` | `asset.js`、`dataStore.js` |
| `#/settings/*` | `src/pages/Settings.jsx` | `AboutApp.jsx`、`AiModelSettingsDialog.jsx`、`ChangePasswordDialog.jsx` |
| `#/login` | `src/pages/Login.jsx` | `src/hooks/useAuth.js`、`api/auth/*` |

所有页面共用 `Layout.jsx`。新增页面时同时检查其中的 `navItems`、`pageTitles`、`pageDescriptions`、`mobileDetailPages` 和 `App.jsx` 路由。

## 首页卡片定位

| 可见区域 | 文件 / 标识 |
| --- | --- |
| 总资产、今日盈亏、隐藏金额 | `HomeAssetHero.jsx` |
| 卡片顺序、隐藏、拖动、手机与桌面差异 | `Home.jsx`；`ALL_KEYS`、`readCardOrder`、Sortable 初始化、`isDesktopLayout` |
| 近 7 日 / 近 1 月 / 今年 / 回撤 | `HomeOverviewCards.jsx` 的 `StatMini`；计算在 `asset.js` |
| 货币比例 | `HomeOverviewCards.jsx` 的 `CurrencyCard` |
| 账户健康度、保证金风险尺 | `HomeOverviewCards.jsx` 的 `HealthCard`；规则在 `healthScore.js` |
| 资产趋势、坐标轴、时间范围 | `TrendChart.jsx`；桌面组合卡样式在 `index.css` 的 `.home-hero-*` |
| 今日打新 | `SubscriptionTicker.jsx`；数据在 `api/market.js`、`api/_subscription-data.js` |
| 资产配置 | `AllocationChart.jsx`；偏差计算在 `targetAllocation.js` 和 `shared/allocation.js` |
| 持仓概况 | `HoldingsOverview.jsx` |
| 收益日历、每日详情、备注 | `CalendarHeatmap.jsx`；变化计算在 `historyChanges.js`，保存走 `api/history.js` |

首页断点以 `1024px` 区分完整桌面卡片布局。手机趋势是可排序普通卡片；桌面趋势固定嵌入总资产卡片。修改一端时必须确认另一端没有被同一条件误伤。

## 按故障现象反查

| 现象 | 首查文件 | 再查 |
| --- | --- | --- |
| 顶栏、侧栏、底部导航、在线 / 离线、用户名 | `Layout.jsx` | `index.css`、`useAssetData.js`、`assetDataStatus.js` |
| 手机状态栏颜色 | `Settings.jsx` 的 `syncNativeStatusBar` | `public/manifest.webmanifest`、`capacitor.config.json`、`AGENTS.md` 的平台约束 |
| 首页卡片顺序错误或不能拖动 | `Home.jsx` | `cardSort.js`、`test/cardSort.test.js`、`test/homeCardEditing.test.js` |
| 首页切页后闪动 | 对应卡片组件的初始 state / 模块缓存 | `useAssetData.js`、`dataStore.js`、`snapshot.js` |
| 总资产、盈亏、回撤错误 | `asset.js` | `snapshot.js`、`test/todayChange.test.js` |
| 趋势坐标、范围、峰值错误 | `TrendChart.jsx` | `asset.js`、`index.css` |
| 收益日历重叠或日期错误 | `CalendarHeatmap.jsx` | `index.css` 的 `.calendar-*`、`historyChanges.js` |
| 评分或建议错误 | `healthScore.js`、`HomeOverviewCards.jsx` | `targetAllocation.js`、`test/healthScore.test.js` |
| 目标比例、细分目标或建议金额错误 | `Target.jsx`、`targetAllocation.js` | `shared/allocation.js`、`api/target.js`、`api/_target-config.js` |
| 持仓分类、现金归属、编辑公式错误 | `HoldingEditor.jsx`、`dataStore.js` | `api/_holdings-schema.js`、`_holdings-formulas.js`、`_holdings-service.js` |
| 详情页列表、币种或格式错误 | `AssetDetail.jsx` | `holdingScope.js`、`format.js`、`asset.js` |
| 行情或期货不刷新 | `Market.jsx` / `Future.jsx` | `quoteData.js`、`useVisiblePolling.js`、对应 API |
| 登录失效、401、密码修改 | `useAuth.js`、`api.js` | `api/_auth.js`、`_auth-config.js`、`_password.js`、`_pwned-password.js` |
| AI 入口、模型、对话、流式响应 | `Layout.jsx`、`AiAssistant.jsx`、`ai.js` | `api/ai-chat.js`、`_ai-provider.js`、`_ai-stream.js`、模型供应商文件 |
| PWA 更新、图标、离线壳 | `vite.config.js`、`public/manifest.webmanifest` | `public/`、浏览器 Service Worker |
| Android 状态栏、键盘、安全区 | `capacitor.config.json`、`android/.../MainActivity.java` | `index.css`、`AppDialog.jsx`、`PACKAGING.md` |
| Vercel 发布或 Cron | `vercel.json` | `api/snapshot-auto.js`、`docs/RELEASE_RUNBOOK.md` |

## 数据流

### 持仓与历史

`App.jsx` → `useAssetData.js` → `asset.js` → `dataStore.js` → `api.js` → `/api/holdings` 或 `/api/history`。

- `useAssetData.js`：页面可见性、60 秒轮询、并发刷新、`refreshKey`。
- `asset.js`：当前内存数据、总资产、区间盈亏、回撤、今日变化。
- `dataStore.js`：本地缓存、接口数据归一化、写入持仓 / 目标 / 备注。
- `api.js`：JWT、GET 去重、短 TTL、写入后的缓存失效、401 会话清理。
- `snapshot.js`：历史快照内存缓存与峰值。

### 目标与评分

`api/target.js` 读取 Google Sheets → `dataStore.js` 归一化 → `targetAllocation.js` 计算展示偏差 → `healthScore.js` 计算账户分数 → `Target.jsx` / `HealthCard` 展示。

共享分类和配置规则位于 `shared/`，同时被前端和 API 使用。修改分类名、容忍区间或权重时，先检查共享文件，避免前后端口径分叉。

### 行情

`Market.jsx` / `Future.jsx` → `quoteData.js` → `/api/market` / `/api/futures`。首页打新复用 `/api/market?view=subscriptions`，但有独立 5 分钟缓存。

## API 索引

| API | 入口 | 主要实现 |
| --- | --- | --- |
| 登录 / 改密 | `api/auth/login.js`、`api/auth/change-password.js` | `_auth.js`、`_auth-config.js`、`_password.js`、`_pwned-password.js` |
| 持仓 | `api/holdings.js` | `_holdings-service.js`、`_holdings-schema.js`、`_holdings-formulas.js` |
| 历史 / 备注 | `api/history.js` | `_google.js`、`_http.js` |
| 快照 / 定时快照 | `api/snapshot.js`、`snapshot-auto.js` | `_snapshot.js`、`_allocation.js` |
| 目标 | `api/target.js` | `_target-config.js`、`shared/` |
| 行情 / 打新 | `api/market.js` | `_subscription-data.js`、`_google.js` |
| 期货 | `api/futures.js` | `_google.js` |
| AI 对话 | `api/ai-chat.js` | `_ai-context.js`、`_ai-data-cache.js`、`_ai-provider.js`、`_ai-stream.js`、`_gemini.js`、`_deepseek.js` |
| AI 规则 / 模型 | `api/ai-rules.js` | `_ai-rules.js`、`_ai-models.js`、`_system-settings.js` |
| 健康检查 | `api/health.js` | 环境可用性，不读取私人资产数据 |

下划线开头的 API 文件是共享实现，不是独立 HTTP 路由。本地 `server/index.js` 必须在新增公开路由时同步登记。

## 测试定位

| 改动 | 优先测试 |
| --- | --- |
| 首页卡片与桌面布局 | `test/homeCardEditing.test.js`、`test/homeHealthCard.test.js` |
| 卡片拖动算法 | `test/cardSort.test.js` |
| 资产计算 | `test/todayChange.test.js`、`test/historyChanges.test.js` |
| 评分 | `test/healthScore.test.js`、`test/targetAllocation.test.js` |
| 持仓编辑与分类 | `test/holdings.test.js`、`test/accountScope.test.js`、`test/holdingEditorDraft.test.js` |
| 缓存与刷新 | `test/apiCache.test.js`、`test/assetDataStatus.test.js`、`test/refreshPolicy.test.js` |
| 打新 | `test/subscriptions.test.js` |
| 登录与密码 | `test/securityAuth.test.js`、`test/passwordChange.test.js` |
| AI | `test/aiAssistant.test.js`、`test/settingsAiToggle.test.js` |
| PWA / Android | `test/pwaKeyboardViewport.test.js`、`test/androidKeyboardInsets.test.js` |

优先运行相关测试；只有跨模块、认证、缓存、数据口径或大规模清理才运行完整 `npm test`。任何生产部署前仍需执行 `npm run version:check` 和 `npm run build`。

## 搜索约定

- 界面问题先搜屏幕上的原文：`rg -n "账户健康度" src`。
- 样式问题搜稳定 class，例如 `home-hero`、`calendar-`、`desktop-sidebar`，不要只搜 Tailwind 值。
- 数据问题从页面调用的函数名反查，不要先通读 API。
- API 问题先查入口文件，再跟随 import 进入下划线实现。
- 修改前查看同名测试；修改后只扩展能覆盖真实回归的测试。
- 不读取或输出 `.env.local`、`server/.env`、个人表格数据和认证令牌。
