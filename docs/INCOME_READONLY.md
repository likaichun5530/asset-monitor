# 收入只读模块（2.8.1 历史记录）

> 以下为 2.8.1 当时的实现和发布状态，非当前状态。2.9.2 已有实时读取、受保护录入、分类月明细与往年同期；当前规则见 [INCOME_WRITE.md](INCOME_WRITE.md) 及 [CHANGELOG](../CHANGELOG.md)。

## 范围与口径

- `#/income`：年度选择、年度总额、已记录累计、完整年度同比、年度柱状图、分类明细、公积金切换。私人数据只在登录后读取，演示模式不展示。
- 2026-11-01 已直接通过 Google Sheets API 只读读取原表 2014～2026 共 13 年。2026 覆盖 1～10 月，仍为未完整年度，不年化、不与上一全年直接同比。历史 2014～2025 年度总额与旧快照一致。
- 使用 `UNFORMATTED_VALUE`，人民币整数分运算；年度“合计”为权威口径，保留分类舍入差额。月份覆盖依据真实分类输入识别，不把仅有合计公式的未来月份算作已记录。
- 原表有真实月度行，但当前页面仍只展示年度汇总，尚未接入月度趋势/同期比较；不摊算月份，不提供写入。
- 收入柱图与资产趋势共用视觉参数：紧凑左右边距、44px Y 轴、12px/500 灰色刻度、淡横网格和一致 Tooltip。手机图高 200px，桌面 255px；年份自动稀疏，保留不完整年星号与说明。

## 本地只读刷新（已真实执行）

已有主 profile 的专用 Sheets 只读 OAuth 可以读取原表，无须重新授权。脚本不使用资产服务账号、不扩大 scope、不更改表格或共享权限；不复制凭据到 Vercel/浏览器。

```sh
INCOME_OAUTH_PATH=/absolute/private/readonly-token.json \
INCOME_SNAPSHOT_PATH=/absolute/private/income.json \
node scripts/refresh-income-snapshot.mjs
```

- `INCOME_OAUTH_PATH` 可选；默认 `$HERMES_HOME/google-sheets-private/token.json`（未设 HERMES_HOME 时为 `~/.hermes`）。本机请显式传入既有主 profile 路径，不搬迁凭据。
- 仅接受 `spreadsheets.readonly` scope；读取固定收入原表的数字年度工作表，按标题映射真实列名并校验 schema。
- 使用宿主已有 curl 支持 HTTPS_PROXY；敏感配置经 stdin 输入，不写命令参数、日志。未安装大 SDK。
- 输出必须在仓库外，临时文件 0600、校验后原子替换；不把金额写入文档/public/dist。
- 本次已刷新现有 `income-dashboard/private/income.json`，最终采集时间 `2026-11-01T10:49:26.661Z`（北京时间 18:49:26），并保留本次核验副本 `income-latest.json`。这不是浏览器实时读取，也未设置定时刷新。

## API 配置与后续发布待办

`GET /api/income` 复用既有 JWT/tokenVersion 鉴权，`private, no-store`；除 OPTIONS 外拒绝非 GET 请求。快照不持久存浏览器，不加入 Service Worker 缓存。

| 服务端变量（禁止 VITE_ 前缀） | 用途 |
| --- | --- |
| `INCOME_SNAPSHOT_JSON` | Vercel/生产使用；优先级高于 PATH，需要后续授权发布时安全替换成最新快照 |
| `INCOME_SNAPSHOT_PATH` | 本地 API 使用仓库外私有文件绝对路径；可继续指向原 `income.json` |
| `INCOME_SNAPSHOT_AT` | 仅供无内嵌时间的旧数据回退；新快照优先使用自身 `snapshotAt` |

Schema：`{ unit: 'CNY_cents', snapshotAt: ISO时间, years: [{ year, categories: {分类名: 整数分}, total, without_fund, coverage, complete }] }`。

生产仍明确标识“已核验年度快照（非实时）”，前端展示北京时间读取时间。将本机用户 OAuth 复制到公网服务会扩展凭据驻留和可访问范围，本次未获此授权，不作此操作。真正在线实时接入仍需设计独立、专用的服务端只读授权与刷新策略；当前交付为可实际重复执行的安全本地刷新流程。

**未更改任何线上环境变量、部署或 App 通道。** 因此线上旧快照不会被这次本地修改自动替换；后续授权发布时，应注入最新 `INCOME_SNAPSHOT_JSON` 并发布 2.8.1。

## 验证记录

- 真实 API 刷新成功，13 年；2026 覆盖 10 个月，源表总额及公积金口径完成核验，历史年度总额与旧快照一致。真实金额仅私下报告，不进入仓库文档。
- `node --test test/income*.test.js test/securityAuth.test.js test/apiCache.test.js`：25/25 通过。
- `npm test`：171 项，169 通过，2 项已有失败（旧 Logo 断言、旧设置导航断言，与 2.8.0 已记录失败一致），未修改无关实现或测试。
- `npm run version:check`：2.8.1 / Android versionCode 197 一致；`npm run build`：成功，904 modules。
- 图表测试为源码布局回归检查，不代替手机/桌面视觉或真机测试；本批没有真机证据。
- Android 环境在上批已确认缺 Java/SDK，本批不安装大依赖、不生成新 APK，不改在线升级清单。
- 未部署、未 commit、未 push。保留原有未提交收入功能改动。
