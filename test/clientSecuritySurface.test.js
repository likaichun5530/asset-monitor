import test from 'node:test'
import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const url = new URL(`${entry.name}${entry.isDirectory() ? '/' : ''}`, directory)
    if (entry.isDirectory()) files.push(...await sourceFiles(url))
    else if (/\.(?:js|jsx)$/.test(entry.name)) files.push(url)
  }
  return files
}

test('前端不使用 HTML 注入、动态脚本或动态代码执行入口', async () => {
  const files = await sourceFiles(new URL('../src/', import.meta.url))
  const source = (await Promise.all(files.map((file) => readFile(file, 'utf8')))).join('\n')
  assert.doesNotMatch(source, /dangerouslySetInnerHTML|\.innerHTML\s*=|insertAdjacentHTML|document\.write\s*\(/)
  assert.doesNotMatch(source, /\beval\s*\(|new\s+Function\s*\(|createElement\s*\(\s*['"]script['"]\s*\)/)
})

test('AI 返回内容保持 React 文本渲染，不作为 HTML 解释', async () => {
  const source = await readFile(new URL('../src/components/AiAssistant.jsx', import.meta.url), 'utf8')
  assert.match(source, /\{message\.content\s*\|\|/)
  assert.doesNotMatch(source, /dangerouslySetInnerHTML|innerHTML|DOMParser|marked\s*\(/)
})

test('localStorage 写入不包含密码、API Key 或 Google 凭据', async () => {
  const files = await sourceFiles(new URL('../src/', import.meta.url))
  const writes = []
  for (const file of files) {
    const source = await readFile(file, 'utf8')
    writes.push(...source.matchAll(/localStorage\.setItem\s*\(\s*([^,\n]+)/g))
  }
  const keys = writes.map((match) => match[1]).join('\n')
  assert.doesNotMatch(keys, /password|passwd|api.?key|google|private.?key|credential/i)
})
