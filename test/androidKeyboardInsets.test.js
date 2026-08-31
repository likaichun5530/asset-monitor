import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), 'utf8')

test('Android Capacitor 8 使用 IME resize 与 keyboard-aware safe area', () => {
  const manifest = read('../android/app/src/main/AndroidManifest.xml')
  const variables = read('../android/variables.gradle')
  const capacitorConfig = JSON.parse(read('../capacitor.config.json'))
  const indexHtml = read('../index.html')
  const styles = read('../src/index.css')

  assert.match(manifest, /android:windowSoftInputMode="adjustResize"/)
  assert.match(variables, /targetSdkVersion = 36/)
  assert.match(variables, /androidxActivityVersion = '1\.11\.0'/)
  assert.equal(capacitorConfig.plugins?.SystemBars?.insetsHandling, 'css')
  assert.match(indexHtml, /viewport-fit=cover/)
  assert.match(styles, /var\(--safe-area-inset-bottom, env\(safe-area-inset-bottom, 0px\)\)/)
})
