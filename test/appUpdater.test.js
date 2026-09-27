import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import {
  clearAvailableAndroidUpdate,
  clearPendingAndroidUpdate,
  installedUpdateNeedsReload,
  isNewerAndroidVersion,
  markAndroidUpdatePrompted,
  readAvailableAndroidUpdate,
  readPendingAndroidUpdate,
  rememberAvailableAndroidUpdate,
  rememberPendingAndroidUpdate,
  shouldPromptAndroidUpdate,
  splitUpdateNotes,
  validateUpdateManifest,
} from '../src/utils/appUpdater.js'

function createMemoryStorage() {
  const values = new Map()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  }
}

const validManifest = {
  versionCode: 171,
  versionName: '2.6.15',
  apkUrl: 'https://asset.kenny5530.asia/downloads/youshu-2.6.15.apk',
  sha256: 'a'.repeat(64),
  size: 5_000_000,
}

test('升级清单只接受可信生产域名、完整哈希和更高版本', () => {
  assert.equal(validateUpdateManifest(validManifest), true)
  assert.equal(isNewerAndroidVersion(170, validManifest), true)
  assert.equal(isNewerAndroidVersion(171, validManifest), false)
  assert.equal(validateUpdateManifest({ ...validManifest, apkUrl: 'https://example.com/update.apk' }), false)
  assert.equal(validateUpdateManifest({ ...validManifest, sha256: 'bad' }), false)
})

test('升级说明按分号或换行拆成逐条编号内容', () => {
  assert.deepEqual(splitUpdateNotes('第一点；第二点\n3. 第三点'), ['第一点', '第二点', '第三点'])
  assert.deepEqual(splitUpdateNotes(''), ['包含功能改进和问题修复。'])
})

test('安装完成后只在旧网页仍运行时要求重载', () => {
  const storage = createMemoryStorage()
  assert.equal(rememberPendingAndroidUpdate(172, storage), true)
  assert.equal(readPendingAndroidUpdate(storage), 172)
  assert.equal(installedUpdateNeedsReload({ installedVersionCode: 171, installedVersionName: '2.6.15', bundledVersionName: '2.6.15', pendingVersionCode: 172 }), false)
  assert.equal(installedUpdateNeedsReload({ installedVersionCode: 172, installedVersionName: '2.6.16', bundledVersionName: '2.6.15', pendingVersionCode: 172 }), true)
  assert.equal(installedUpdateNeedsReload({ installedVersionCode: 172, installedVersionName: '2.6.16', bundledVersionName: '2.6.16', pendingVersionCode: 172 }), false)
  clearPendingAndroidUpdate(storage)
  assert.equal(readPendingAndroidUpdate(storage), null)
})

test('每个新版本只自动提醒一次，未升级时保留红点状态', () => {
  const storage = createMemoryStorage()
  assert.equal(shouldPromptAndroidUpdate(validManifest.versionCode, storage), true)
  assert.deepEqual(rememberAvailableAndroidUpdate(validManifest, storage), {
    versionCode: validManifest.versionCode,
    versionName: validManifest.versionName,
  })
  assert.deepEqual(readAvailableAndroidUpdate(storage), {
    versionCode: validManifest.versionCode,
    versionName: validManifest.versionName,
  })
  markAndroidUpdatePrompted(validManifest.versionCode, storage)
  assert.equal(shouldPromptAndroidUpdate(validManifest.versionCode, storage), false)
  assert.equal(shouldPromptAndroidUpdate(validManifest.versionCode + 1, storage), true)
  clearAvailableAndroidUpdate(storage)
  assert.equal(readAvailableAndroidUpdate(storage), null)
})

test('Android 原生升级器校验下载来源与 SHA-256 后才打开系统安装器', async () => {
  const plugin = await readFile(new URL('../android/app/src/main/java/com/youshu/app/UpdaterPlugin.java', import.meta.url), 'utf8')
  const manifest = await readFile(new URL('../android/app/src/main/AndroidManifest.xml', import.meta.url), 'utf8')
  const activity = await readFile(new URL('../android/app/src/main/java/com/youshu/app/MainActivity.java', import.meta.url), 'utf8')
  assert.match(plugin, /UPDATE_HOST = "asset\.kenny5530\.asia"/)
  assert.match(plugin, /MessageDigest\.getInstance\("SHA-256"\)/)
  assert.match(plugin, /FileProvider\.getUriForFile/)
  assert.match(plugin, /Intent\.ACTION_INSTALL_PACKAGE/)
  assert.ok(plugin.indexOf('getContext().startActivity(install)') < plugin.indexOf('getActivity().finishAndRemoveTask()'))
  assert.match(plugin, /canRequestPackageInstalls/)
  assert.match(manifest, /android\.permission\.REQUEST_INSTALL_PACKAGES/)
  assert.match(activity, /registerPlugin\(UpdaterPlugin\.class\)/)
})

test('App 启动自动检查更新且关于页提供手动入口', async () => {
  const updater = await readFile(new URL('../src/components/AppUpdater.jsx', import.meta.url), 'utf8')
  const about = await readFile(new URL('../src/components/AboutApp.jsx', import.meta.url), 'utf8')
  assert.match(updater, /window\.setTimeout\(\(\) => checkForUpdate\(\), 1600\)/)
  assert.match(updater, /NativeUpdater\.downloadAndInstall/)
  assert.match(updater, /CapacitorApp\.addListener\('appStateChange'/)
  assert.match(updater, /navigator\.serviceWorker\.getRegistrations\(\)/)
  assert.match(updater, /window\.caches\.delete\(cacheName\)/)
  assert.match(updater, /window\.location\.reload\(\)/)
  assert.match(updater, /updateNotes\.map\(\(note, index\)/)
  assert.match(updater, /下载并升级/)
  assert.match(updater, /role="status"/)
  assert.match(updater, /showToast\(`当前已是最新版本/)
  assert.match(updater, /open=\{open && Boolean\(update\)\}/)
  assert.match(updater, /shouldPromptAndroidUpdate\(manifest\.versionCode\)/)
  assert.match(updater, /rememberAvailableAndroidUpdate\(manifest\)/)
  assert.match(updater, /publishUpdateAvailability\(availableUpdate\)/)
  assert.doesNotMatch(updater, /setMessage\(`当前已是最新版本/)
  assert.match(about, /检查更新/)
  assert.match(about, /APP_UPDATE_CHECK_EVENT/)
})

test('Vercel 不缓存版本清单并长期缓存版本化 APK', async () => {
  const vercel = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'))
  const manifestHeaders = vercel.headers.find(({ source }) => source === '/updates/android.json')?.headers || []
  const apkHeaders = vercel.headers.find(({ source }) => source === '/downloads/(.*)\\.apk')?.headers || []
  assert.ok(manifestHeaders.some(({ key, value }) => key === 'Cache-Control' && value.includes('no-store')))
  assert.ok(manifestHeaders.some(({ key, value }) => key === 'Access-Control-Allow-Origin' && value === 'https://localhost'))
  assert.ok(apkHeaders.some(({ key, value }) => key === 'Cache-Control' && value.includes('immutable')))
  assert.ok(apkHeaders.some(({ key, value }) => key === 'Content-Type' && value === 'application/vnd.android.package-archive'))
})
