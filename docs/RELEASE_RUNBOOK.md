# 最小成本发布流程

## 先判断是否需要发布

| 变更类型 | 版本号 | 测试 / 构建 | 部署 |
| --- | --- | --- | --- |
| 仅文档、注释、维护索引、协作规范 | 不变 | 通常只检查 diff | 不部署 |
| 前端、API、PWA 运行代码或公开配置 | 按用户指定；否则补丁位 +1 | 相关测试、版本检查、生产构建 | 默认部署生产 |
| Android 原生代码 / 配置 | 应用版本同步 | 相关测试、Web 构建；用户要求 APK 时再执行 Gradle | Web 与 APK 分开处理 |
| 只重试同一批失败发布 | 不重复升级 | 复用已通过的本地结果，失败原因涉及代码时再构建 | 重试原批次 |

纯文档变更不进入 Vercel，避免没有运行差异的构建和版本号。运行代码发生变化时仍按项目约定默认部署，除非用户明确说不部署。

## 发布前最短路径

1. `git status --short`，确认只包含本批次和用户已有改动。
2. 按 `docs/MAINTENANCE_MAP.md` 运行相关测试。小范围 UI 文案 / 样式不需要重复跑无关后端测试；跨模块或高风险变更运行完整 `npm test`。
3. 一批变更只升级一次：

```bash
npm version patch --no-git-tag-version
# 用户指定版本时，例如：npm version 2.6.0 --no-git-tag-version
```

4. 更新 `CHANGELOG.md` 和 `PROJECT_STATUS.md`，先标为待发布。
5. 本地执行：

```bash
npm run version:check
npm run build
```

本地构建用于在占用云构建前发现错误。构建已通过且源码未再变化时，不重复执行。

## Vercel 部署

```bash
vercel deploy --prod --yes
```

只接受同时满足以下条件的结果：

- `readyState` 为 `READY`；
- `target` 为 `production`；
- 正式域名已绑定 `https://asset.kenny5530.asia`。

部署成功后只做一次轻量可用性检查：

```bash
curl -sS --retry 2 --retry-delay 1 -o /dev/null -w '%{http_code}\n' https://asset.kenny5530.asia
```

将部署 ID 写回 `CHANGELOG.md` 和 `PROJECT_STATUS.md`。授权或网络瞬时失败可直接重试，不升级第二次版本。不要为了“再确认一次”重复创建生产部署。

## Git 规则

- 未经用户明确要求，不执行 `git push`。
- 已部署的运行代码应保留完整版本文件和发布记录；可创建本地提交以保持部署与源码对应，但不得自动推送。
- 用户明确说“推送”“提交 Git 并推送”或同等意思时，才执行 `git push`。
- 推送前检查 `git diff --check`；推送后确认远端分支和提交号。
- 不把密钥、`.env*`、个人资产数据、Vercel 登录配置或本机产物加入提交。

## 结果汇报

只报告实际完成的项目：版本、修改内容、相关测试、构建、部署 ID、正式域名状态、本地提交和是否推送。构建通过不能写成真机通过；Web 部署不能写成 APK 已更新。
