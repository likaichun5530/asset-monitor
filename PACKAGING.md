# 有数打包与安装

## 版本与 Web 发布

每批运行代码修改执行 `npm version patch --no-git-tag-version`，同步 Android versionName 并递增 versionCode；纯文档和维护规范不升级、不发布。随后执行 `npm run version:check`、适用测试和 `npm run build`。更新 CHANGELOG 与 PROJECT_STATUS，同一批部署重试不再次升级。生产发布使用 `vercel --prod`，完整环境配置见 [README](README.md)，精简步骤见 [发布流程](docs/RELEASE_RUNBOOK.md)。

## PWA

- Android Chrome：打开 [有数](https://asset.kenny5530.asia)，使用菜单中的安装 / 添加到主屏幕入口。
- iPhone Safari：打开应用，分享 → 添加到主屏幕。
- 桌面 Chrome：打开应用，通过浏览器安装入口安装。

`public/manifest.webmanifest` 是唯一 manifest；未设置 theme_color 或 iOS 状态栏样式，系统栏交给系统与浏览器处理。页面可独立选择明暗模式。

Service Worker 使用 autoUpdate；网页缓存和 WebAPK 安装信息可能稍后才更新，部署成功不代表所有设备已经刷新。Android / iPhone 的实际状态栏效果仍需要真机验证。

## Android APK

前置条件：Android Studio、SDK 36，以及与项目 Gradle 兼容的 JDK。需要时设置 `ANDROID_HOME` 为本机 SDK 路径。原生应用加载打包进 APK 的 `dist`，没有配置远程 `server.url`；Vercel 发布不会替换已安装 APK。

构建前将 `.env.local` 的 `VITE_API_BASE` 设置为可访问的服务端地址（生产使用 `https://asset.kenny5530.asia`），不要使用手机自身的 localhost。

```bash
npm ci
npm run version:check
npm run build
npx cap sync android
npx cap open android
```

在 Android Studio 选择生成 APK，或使用命令行：

```bash
cd android
./gradlew assembleDebug
```

调试 APK 输出到 `android/app/build/outputs/apk/debug/app-debug.apk`，可通过 USB 或文件传输到手机安装。正式分发需配置自己的签名，不将签名密钥提交到 Git。

原生状态栏由 Capacitor 插件控制；键盘与安全区处理位于原生 MainActivity、全局 CSS 和弹窗组件。没有执行 Gradle 构建或真机验证时，不应将前端构建成功表述为 APK 验证通过。

## 已移除的平台遗留

旧 Electron 主进程未配置依赖和打包入口，已从现行代码中移除。Git 历史仍可查找；被忽略的本机 `release/` 产物不属于当前发布流程。
