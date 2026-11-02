import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const gradle = readFileSync(new URL('../android/app/build.gradle', import.meta.url), 'utf8')
const ignored = readFileSync(new URL('../.gitignore', import.meta.url), 'utf8')

test('正式 release 使用仓库外持久签名，缺失时拒绝 unsigned 发布', () => {
  assert.match(gradle, /YOUSHU_SIGNING_PROPERTIES/)
  assert.match(gradle, /System.getenv\('HOME'\)/)
  assert.match(gradle, /\.config\/youshu-android\/signing.properties/)
  assert.match(gradle, /signingConfig signingConfigs.production/)
  assert.match(gradle, /throw new GradleException\('Missing private production signing.properties/)
  assert.doesNotMatch(gradle, /signingConfig signingConfigs.debug/)
  assert.match(gradle, /storePassword releaseSigning.getProperty\('storePassword'\)/)
})

test('Git 忽略 Android 私钥、密码配置和 APK', () => {
  for (const pattern of ['*.jks', '*.keystore', '*.p12', 'signing.properties', 'keystore.properties', 'public/downloads/*.apk']) {
    assert.ok(ignored.split('\n').includes(pattern), pattern)
  }
})
