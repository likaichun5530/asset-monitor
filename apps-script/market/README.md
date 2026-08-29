# Market Google Apps Script

该目录以单一脚本文件 [`Market.gs`](./Market.gs) 管理 Google Sheets 绑定脚本。把这一个文件的完整内容复制到 Apps Script 即可，不改变 `Market` 表结构：

| 列 | 内容 |
| --- | --- |
| B | Symbol |
| C | Price |
| D | UpdatedAt |
| E | Source |

`Source` 不区分大小写，继续支持：`coinbase`、`finnhub`、`exchange`、`China`、`future`、`fund`。

## 默认刷新规则

| 来源 | 时区与时段 | 最小间隔 |
| --- | --- | --- |
| Coinbase / BTC | 全天 24 小时 | 5 分钟 |
| 汇率 | 全天 24 小时 | 30 分钟 |
| 美股 / Finnhub | 纽约工作日 09:25–16:10，自动适配夏令时和冬令时 | 5 分钟 |
| A股 / Tencent | 北京工作日 09:25–11:35、12:55–15:05 | 5 分钟 |
| 股指期货 / Sina | 北京工作日 09:25–11:35、12:55–15:05 | 5 分钟 |
| 基金净值 | 北京工作日 18:00–23:30 | 60 分钟 |

Apps Script 只安装一个每 5 分钟运行的触发器，各来源的交易时段与最小间隔由 `Market.gs` 顶部规则判断。交易所节假日没有硬编码日历，供应商无新报价时通常会保持最近价格。

## 接入现有绑定脚本

1. 先在现有 Apps Script 编辑器中备份旧代码并删除旧版同名函数，避免新旧代码同时存在；如使用 clasp，再在“项目设置”复制 Script ID。
2. 安装并登录 clasp：`npm install -g @google/clasp`、`clasp login`。
3. 进入本目录，把 `.clasp.json.example` 复制为 `.clasp.json`，填入 Script ID。`.clasp.json` 已被仓库忽略。
4. 在 Apps Script“项目设置 → 脚本属性”中配置 `FINNHUB_API_KEY`。不要把 Key 写进任何 `.gs` 文件。
5. 执行 `clasp push`，将 `Market.gs` 同步到现有绑定脚本；也可以直接将 `Market.gs` 全文复制到在线编辑器。
6. 在 Apps Script 编辑器中手动运行一次 `installMarketRefreshTrigger` 并完成授权。

不需要发布 Web App。修改刷新时段只需编辑 `Market.gs` 顶部的 `MARKET_REFRESH_RULES` 后重新复制或执行 `clasp push`；不要重复创建多个触发器。

## 运维函数

- `updateMarket()`：定时入口，只刷新当前到期的来源。
- `refreshAllMarketNow()`：忽略交易时段，手动强制刷新全部来源。
- `installMarketRefreshTrigger()`：重建唯一的 5 分钟触发器。
- `removeMarketRefreshTriggers()`：移除本脚本创建的刷新触发器。
- `getMarketRefreshStatus()`：查看各来源最后一次尝试时间。
