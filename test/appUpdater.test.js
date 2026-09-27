import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { isNewerAndroidVersion, validateUpdateManifest } from '../src/utils/appUpdater.js'

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

test('Android 原生升级器校验下载来源与 SHA-256 后才打开系统安装器', async () => {
  const plugin = await readFile(new URL('../android/app/src/main/java/com/youshu/app/UpdaterPlugin.java', import.meta.url), 'utf8')
  const manifest = await readFile(new URL('../android/app/src/main/AndroidManifest.xml', import.meta.url), 'utf8')
  const activity = await readFile(new URL('../android/app/src/main/java/com/youshu/app/MainActivity.java', import.meta.url), 'utf8')
  assert.match(plugin, /UPDATE_HOST = "asset\.kenny5530\.asia"/)
  assert.match(plugin, /MessageDigest\.getInstance\("SHA-256"\)/)
  assert.match(plugin, /FileProvider\.getUriForFile/)
  assert.match(plugin, /Intent\.ACTION_INSTALL_PACKAGE/)
  assert.match(plugin, /canRequestPackageInstalls/)
  assert.match(manifest, /android\.permission\.REQUEST_INSTALL_PACKAGES/)
  assert.match(activity, /registerPlugin\(UpdaterPlugin\.class\)/)
})

test('App 启动自动检查更新且关于页提供手动入口', async () => {
  const updater = await readFile(new URL('../src/components/AppUpdater.jsx', import.meta.url), 'utf8')
  const about = await readFile(new URL('../src/components/AboutApp.jsx', import.meta.url), 'utf8')
  assert.match(updater, /window\.setTimeout\(\(\) => checkForUpdate\(\), 1600\)/)
  assert.match(updater, /NativeUpdater\.downloadAndInstall/)
  assert.match(updater, /下载并升级/)
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
