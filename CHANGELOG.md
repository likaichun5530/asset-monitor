# 发布记录

## 2.5.20 — 2026-09-19 已发布

- 部署：dpl_5LXwipKxvR4erycKRk4ZVVTjMLi9，READY，已绑定 https://asset.kenny5530.asia 。

- 资产详情页在人民币市值模式下不再显示 `¥` 符号，覆盖顶部总市值、趋势提示、持仓行和桌面端合计。

## 2.5.19 — 2026-09-19 已发布

- 部署：dpl_1priPjy7NFajCe3Ys2eFjVpX4VrD，READY，已绑定 https://asset.kenny5530.asia 。

- 虚拟币详情页持仓列表的数量和单价统一显示两位小数，桌面端与手机端同步生效。

## 2.5.18 — 2026-09-19 已发布

- 部署：dpl_BHVgzQkmaqWJHvgmbdLxemRTqPNZ，READY，已绑定 https://asset.kenny5530.asia 。

- 手机端资产详情页持仓列表字号由 12px 调整为 14px。

## 2.5.17 — 2026-09-19 已发布

- 部署：dpl_4gWi1oAzKSAhKCr318Zp8RmSAnM4，READY，已绑定 https://asset.kenny5530.asia 。

- 手机端资产详情页持仓表格的单元格左右内边距由 12px 缩小为 8px，虚拟币、A 股、港股、美股等共用页面同步生效。

## 2.5.16 — 2026-09-19 已发布

- 部署：dpl_2msgz2pzMmZc4q24SUHedD5D6faD，READY，已绑定 https://asset.kenny5530.asia 。

- 移除 PWA 的 HTML/manifest `theme-color`、动态 manifest 切换和顶部状态栏背景覆盖，让 Android Chrome 按手机系统明暗模式处理状态栏。
- 移除 iOS `black-translucent` 强制样式，由系统处理状态栏；页面自身的明暗选择保持不变。

## 2.5.15 — 2026-09-19 已发布

- 部署：dpl_AMZbvgZaEvDZdsCmy16AkVQTanpN，READY，已绑定 https://asset.kenny5530.asia 。

- 修正白天模式仍使用深色 PWA 默认配置的问题：明亮/暗夜分别使用 #ffffff / #1f2937，启动和切换时同步 manifest、theme-color 与 color-scheme。两个 manifest 保持相同应用标识和启动地址。

- 暗夜状态栏目标色改为普通卡片色 #1f2937；同步 HTML、主题切换、PWA manifest、安全区域背景和 Capacitor 配置。
- 补充项目现状、审查记录及发布规范；新增版本同步与一致性检查命令。
- 修正 README 的刷新周期说明，补充 PWA 与 APK 发布差异。
- 历史说明：上述颜色修改已在线上以 2.5.14 发布过，但当时没有递增版本或提交 Git。本批次补齐版本信息并重新发布为 2.5.15。

## 2.5.14

- 持仓和历史自动刷新周期调整为 60 秒，按请求开始时间计算过期。
- 页面启动、系统主题变化及返回前台时同步主题，补充 PWA 顶部安全区域。
- 首次提交：8172e4b。之后同版本再次部署状态栏颜色修改，见 2.5.15 历史说明。
- Android Chrome PWA 状态栏仍显示白色的用户反馈尚未得到真机闭环验证。

## 2.5.13

- 新增 Capacitor 状态栏设置，补充 iOS 主屏幕应用声明。
- 缓存同日打新提醒，减少页面切回时布局变化。
- 提交：cb627e6；原生 APK 未随 Vercel 发布更新。

## 2.5.12

- 保留健康度从 100 分开始的动画，稳定刷新期间的建议和保证金区域。
- 提交：27adc44。

## 2.5.11

- 稳定主页刷新期间的较高点回撤及健康度显示；分数动画行为随后在 2.5.12 调整。
- 提交：83ab904。

## 2.5.10

- 调整暗夜页面顶部栏样式。此处为页面导航栏，不代表系统状态栏已修复。
- 提交：2f62159。
