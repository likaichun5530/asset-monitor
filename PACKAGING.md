# 打包指南 · 有数

## ✅ Mac 应用（已完成）

Mac 应用已打包完成，位于 `release/` 目录：

### 文件位置
- **DMG 安装包**：`release/有数-1.0.0-arm64.dmg`（137MB）
- **ZIP 压缩包**：`release/有数-1.0.0-arm64-mac.zip`（138MB）
- **直接运行**：`release/mac-arm64/有数.app`

### 使用方式
1. 双击 `有数-1.0.0-arm64.dmg` 安装
2. 将「有数」拖入 Applications 文件夹
3. 从启动台或 Applications 打开「有数」

> ⚠️ 首次打开可能提示"无法验证开发者"，右键点击 → 打开 → 确认打开即可。

### 重新打包
```bash
npm run electron:build
```

### 工作原理
- Electron 内嵌前端页面（`dist/`）+ 后端服务器（`server/`）
- 启动时自动启动后端服务器（localhost:8787）
- 前端通过 `VITE_API_BASE=http://localhost:8787` 连接后端
- 后端通过 Google Sheets API 读写数据

---

## 📱 Android 应用（需安装 Android Studio）

### 前置条件
1. 安装 [Android Studio](https://developer.android.com/studio)
2. 安装 Android SDK（Android Studio 内自动安装）
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

### Vivo 手机（Chrome/浏览器）
1. 用浏览器打开应用网址
2. 菜单 → 添加到主屏幕
3. 从桌面打开

> PWA 模式需要后端服务器在线运行。

---

## 📂 打包相关文件

```
Asset-Monitor/
├── electron/main.js          # Electron 主进程
├── capacitor.config.json     # Capacitor 配置（Android）
├── public/manifest.json      # PWA manifest
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
| `npm run electron:dev` | Electron 开发模式 |
| `npm run electron:build` | 打包 Mac 应用 |
| `npx cap sync android` | 同步前端到 Android |
| `npx cap open android` | 打开 Android Studio |