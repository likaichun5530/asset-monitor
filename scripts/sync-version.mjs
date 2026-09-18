import { readFileSync, writeFileSync } from 'node:fs'

const root = new URL('../', import.meta.url)
const read = (path) => readFileSync(new URL(path, root), 'utf8')
const { version } = JSON.parse(read('package.json'))
if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('版本号必须为三段数字，例如 2.5.15')
const lock = JSON.parse(read('package-lock.json'))
if (lock.version !== version || lock.packages?.['']?.version !== version) {
  throw new Error('package-lock.json 版本不一致，请使用 npm version 更新版本')
}
const path = 'android/app/build.gradle'
const source = read(path)
const name = source.match(/\bversionName\s+"([^"]+)"/)
const code = source.match(/\bversionCode\s+(\d+)/)
if (!name || !code) throw new Error('无法读取 Android 版本字段')
if (process.argv.includes('--check')) {
  if (name[1] !== version) throw new Error('Android versionName 与应用版本不一致')
  console.log(`版本一致：${version}；Android versionCode ${code[1]}`)
} else if (name[1] !== version) {
  const next = source.replace(name[0], `versionName "${version}"`)
    .replace(code[0], `versionCode ${Number(code[1]) + 1}`)
  writeFileSync(new URL(path, root), next)
  console.log(`Android 版本已同步：${version}；versionCode ${Number(code[1]) + 1}`)
} else {
  console.log(`Android 已是 ${version}，不重复增加 versionCode`)
}
