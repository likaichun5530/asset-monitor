# 打包指南 · 有数

## 发布版本

每个包含新修改的发布批次都递增版本，未特别指定时执行 `npm version patch --no-git-tag-version`（例如 2.5.10 → 2.5.11）。脚本同步 Android versionName 并递增 versionCode，再执行 `npm run version:check`。更新 CHANGELOG.md 与 PROJECT_STATUS.md；同一批次部署重试不再次升级。

Vercel 发布更新 Web/PWA 及 API，不会替换已安装 APK。当前 Capacitor 使用本地 dist，未配置远程 server.url；原生修改必须重新构建、同步、打包并安装。

## Mac 应用（历史产物）

`release/` 中可能保留既有 Mac 构建产物，但该目录被 Git 忽略。当前 `package.json` 没有声明 Electron、electron-builder 或 `electron:*` 脚本，因此当前仓库不能直接重新生成这些产物。

### 文件位置
- **DMG 安装包**：`release/有数-1.0.0-arm64.dmg`（137MB）
- **ZIP 压缩包**：`release/有数-1.0.0-arm64-mac.zip`（138MB）
- **直接运行**：`release/mac-arm64/有数.app`

### 使用方式
1. 双击 `有数-1.0.0-arm64.dmg` 安装
2. 将「有数」拖入 Applications 文件夹
3. 从启动台或 Applications 打开「有数」

> ⚠️ 首次打开可能提示"无法验证开发者"，右键点击 → 打开 → 确认打开即可。

### 现有主进程代码
- Electron 内嵌前端页面（`dist/`）+ 后端服务器（`server/`）
- 启动时自动启动后端服务器（localhost:8787）
- 前端通过 `VITE_API_BASE=http://localhost:8787` 连接后端
- 后端通过 Google Sheets API 读写数据

如需恢复 Electron 打包，需要先补充 Electron/electron-builder 开发依赖、`main`/`build` 配置和对应 npm scripts；这些配置目前不属于可用构建流程。

---

## 📱 Android 应用（需安装 Android Studio）

### 前置条件
1. 安装 [Android Studio](https://developer.android.com/studio)
2. 安装 Android SDK（Android Studio 内自动安装）
   当前项目 compileSdk/targetSdk 为 36；Gradle 还需要兼容的 Java/JDK，通常可使用 Android Studio 自带环境。此前本机命令行打包因没有可用 Java 运行环境而中止，不能视为 APK 已生成。
3. 设置环境变量：
   ```bash
   echo 'export ANDROID_HOME=~/Library/Android/sdk' >> ~/.zshrc
   source ~/.zshrc
   ```

### 打包步骤
```bash
# 1. 构建前端
npm run build

# 2. 同步到 Android 项目
npx cap sync android

# 3. 打开 Android Studio
npx cap open android

# 4. 在 Android Studio 中：
#    - Build → Build Bundle(s) / APK(s) → Build APK(s)
#    - 生成 APK 在 android/app/build/outputs/apk/
```

### 或用命令行打包（需 Android SDK）
```bash
cd android
./gradlew assembleDebug
# APK 位于 android/app/build/outputs/apk/debug/app-debug.apk
```

### 安装到 Vivo 手机
1. 将 APK 传到手机（微信/QQ/USB）
2. 手机上点击 APK 安装
3. 如提示"未知来源"，设置 → 安全 → 允许安装未知来源应用

---

## 🌐 PWA（渐进式 Web 应用）

已配置 PWA，支持"添加到主屏幕"：

### Mac（Chrome）
1. 用 Chrome 打开应用网址
2. 菜单 → 安装「有数」
3. 从启动台打开

### Android 手机（Chrome）
1. 用浏览器打开应用网址
2. 菜单 → 添加到主屏幕
3. 从桌面打开

### iPhone（Safari）
1. 用 Safari 打开 https://asset.kenny5530.asia
2. 分享 → 添加到主屏幕
3. 从主屏幕打开

### 状态栏与更新说明

- Android PWA 不设置 HTML theme-color 或 manifest theme_color，让 Chrome 按手机系统主题处理状态栏。应用页面主题可以与系统主题不同。
- iPhone 同样不指定状态栏样式，由系统处理；不能依靠 Android 原生插件控制。
- Service Worker 使用 autoUpdate。已安装 PWA 的网页缓存及安装信息更新与部署完成不是同一个时刻；不应承诺部署后所有手机立即使用新版本。
- Android 系统跟随方案及 iPhone 尚未真机验证；详见 PROJECT_STATUS.md。不要将配置变更当作设备实测结果。

> API 不可用时 PWA 可以读取已有本地缓存，但无法获取最新实盘数据或同步快照。

---

## 📂 打包相关文件

```
Asset-Monitor/
├── electron/main.cjs         # Electron 主进程（历史代码）
├── capacitor.config.json     # Capacitor 配置（Android）
├── vite.config.js            # 构建时生成 Service Worker（manifest 位于 public/）
├── release/                  # Mac 打包输出
│   ├── 有数-1.0.0-arm64.dmg
│   └── mac-arm64/有数.app
└── android/                  # Android 项目（Capacitor）
```

## 📋 package.json 脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 构建前端 |
| `npm run dev:server` | 仅启动本地 API |
| `npm run preview` | 预览生产构建 |
| `npm version patch --no-git-tag-version` | 升级应用补丁版本并同步 Android |
| `npm run version:check` | 核对应用、锁文件与 Android 版本一致 |
| `npx cap sync android` | 同步前端到 Android |
| `npx cap open android` | 打开 Android Studio |
