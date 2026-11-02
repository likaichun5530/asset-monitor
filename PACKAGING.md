# 有数打包与安装

## 版本与 Web 发布

每批运行代码修改执行 `npm version patch --no-git-tag-version`，同步 Android versionName 并递增 versionCode；纯文档和维护规范不升级、不发布。随后执行 `npm run version:check`、适用测试和 `npm run build`。更新 CHANGELOG 与 PROJECT_STATUS，同一批部署重试不再次升级。生产发布使用 `vercel --prod`，完整环境配置见 [README](README.md)，精简步骤见 [发布流程](docs/RELEASE_RUNBOOK.md)。

## PWA

- Android Chrome：打开 [有数](https://asset.kenny5530.asia)，使用菜单中的安装 / 添加到主屏幕入口。
- iPhone Safari：打开应用，分享 → 添加到主屏幕。
- 桌面 Chrome：打开应用，通过浏览器安装入口安装。

`public/manifest.webmanifest` 是唯一 manifest；以页面浅灰色作为首次启动回退，页面脚本随后按保存的主题同步状态栏。页面可独立选择明暗模式。

Service Worker 使用 autoUpdate；网页缓存和 WebAPK 安装信息可能稍后才更新，部署成功不代表所有设备已经刷新。Android / iPhone 的实际状态栏效果仍需要真机验证。

## Android APK

前置条件：Android Studio、SDK 36，以及与项目 Gradle 兼容的 JDK。需要时设置 `ANDROID_HOME` 为本机 SDK 路径。原生应用加载打包进 APK 的 `dist`，没有配置远程 `server.url`；Vercel 发布不会替换已安装 APK。

构建前通过 `VITE_API_BASE` 指定手机可访问的服务端地址（生产使用 `https://asset.kenny5530.asia`），不要使用手机自身的 localhost。

```bash
npm ci
npm run version:check
VITE_API_BASE=https://asset.kenny5530.asia npm run build
npx cap sync android
npx cap open android
```

在 Android Studio 选择生成 APK，或使用命令行：

```bash
cd android
./gradlew assembleDebug
```

调试 APK 输出到 `android/app/build/outputs/apk/debug/app-debug.apk`，可通过 USB 或文件传输到手机安装。正式分发需配置自己的签名，不将签名密钥提交到 Git。

### 应用内升级

2.6.15 起，APK 会读取 `https://asset.kenny5530.asia/updates/android.json`，下载其中指定的版本化 APK，校验 SHA-256 后调起系统安装器。服务器 APK 位于 `public/downloads/`，该目录中的 APK 不提交 Git，但通过 `.vercelignore` 保留在 Vercel CLI 部署源中；版本清单提交 Git。

每次发布 APK 的顺序必须是：先完成 Web 构建和 `cap sync`，再构建 APK；将 APK 复制到 `public/downloads/youshu-<version>.apk`，计算 SHA-256 和字节数并更新 `public/updates/android.json`；重新执行 Web 构建后部署。部署后同时校验 JSON、APK 响应、文件大小和 SHA-256。

覆盖升级必须保持 `com.youshu.app`、相同签名证书和递增的 versionCode。**从 2.9.6 / 205 起固定使用正式 release 签名，后续不得重新生成或改回 debug 签名。** 旧 2.7.0 debug 证书与本批不同，不能覆盖安装；首次必须卸载旧 App，再手动安装 2.9.6，本地设置/登录/缓存可能丢失，Google 原表不受影响。此后可沿用同一正式签名覆盖升级，无需用户自行签名。Android 不允许普通应用静默安装，首次升级需要用户在系统设置中允许“有数”安装未知应用，每次安装仍由系统界面确认。

### 固定正式签名（2.9.6 起）

- 证书：`CN=Youshu Android Release, O=Youshu, C=CN`，RSA 3072，非 Android Debug。
- 证书 SHA-256：`9ea9719dce4588c14d0b236b4c6d522035f62b09795baed2701a01711156db8e`。
- 当前用户私有目录：`/vol1/@appdata/trim.hermes/home/.config/youshu-android/`（目录 0700）；`release.p12`、`signing.properties` 均为 0600。随机强密码仅在该私有配置内，禁止输出、提交或打入 APK。
- 同目录 `backup/` 保存受限备份（0700/0600），用于误删恢复；与主密钥同磁盘，不等于异地灾备。不可公开上传或直接通过聊天发送私钥。
- `android/app/build.gradle` 默认从 `$HOME/.config/youshu-android/signing.properties` 加载；可用 `YOUSHU_SIGNING_PROPERTIES` 指向另一受限私有位置。配置项为 `storeFile`、`storePassword`、`keyAlias`、`keyPassword`。release assemble/bundle 在配置缺失时失败，不生成冒充正式版的 unsigned 包。
- 当前机器工具链：`/vol1/@appdata/trim.hermes/workspace/deploy-tools/android-toolchain/`，Java 21 / SDK 36 / Gradle 8.14.3。工作区构建入口 `python3 /vol1/@appdata/trim.hermes/workspace/android-gradle-build.py`；可显式加 `YOUSHU_SIGNING_PROPERTIES=/vol1/@appdata/trim.hermes/home/.config/youshu-android/signing.properties`。入口含本机代理准备逻辑；其 Gradle 私有配置可能含代理密码，禁止读出或提交。
- 正式产物为 `android/app/build/outputs/apk/release/app-release.apk`，先执行 `apksigner verify --verbose --print-certs` 对照上述指纹，再以 `aapt dump badging` 核验包名和版本，之后发布；密钥遗失不能仅凭证书恢复签名。
- 本批仅发布 App 通道，Web/Settings 展示保持 2.9.5：Web 构建使用 `VITE_WEB_VERSION=2.9.5`，部署使用 `vercel deploy --prod --yes --build-env VITE_WEB_VERSION=2.9.5`。原生 Settings 继续显示原生版本 2.9.6。后续仅 App 批次须继续显式固定当时网页版；只有授权发布网页版才取消/调整覆盖。

原生状态栏由 Capacitor 插件控制；键盘与安全区处理位于原生 MainActivity、全局 CSS 和弹窗组件。当前工程不使用 Google Services 构建插件，运行时依赖不包含 Google Play Services 或 Firebase；仍需要手机提供可用的 Android System WebView。没有执行 Gradle 构建或真机验证时，不应将前端构建成功表述为 APK 验证通过。

Capacitor 页面来源固定为 `https://localhost`，生产 API 的 CORS 只额外允许这一来源；修改 `androidScheme` 或主机名时必须同步更新 `vercel.json` 并验证登录接口的 OPTIONS 响应。

## 已移除的平台遗留

旧 Electron 主进程未配置依赖和打包入口，已从现行代码中移除。Git 历史仍可查找；被忽略的本机 `release/` 产物不属于当前发布流程。
