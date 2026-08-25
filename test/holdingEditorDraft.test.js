import test from 'node:test'
import assert from 'node:assert/strict'
import {
  HOLDING_EDITOR_DRAFT_KEY,
  readHoldingEditorDraft,
  writeHoldingEditorDraft,
  clearHoldingEditorDraft,
} from '../src/utils/holdingEditorDraft.js'

function memoryStorage() {
  const data = new Map()
  return {
    getItem(key) { return data.has(key) ? data.get(key) : null },
    setItem(key, value) { data.set(key, value) },
    removeItem(key) { data.delete(key) },
  }
}

test('持仓编辑草稿可以在刷新后恢复并在关闭后清除', () => {
  const storage = memoryStorage()
  const draft = { holding: null, form: { category: '现金', name: '备用金' } }
  writeHoldingEditorDraft(draft, storage)
  assert.deepEqual(readHoldingEditorDraft(storage), draft)
  assert.ok(storage.getItem(HOLDING_EDITOR_DRAFT_KEY))
  clearHoldingEditorDraft(storage)
  assert.equal(readHoldingEditorDraft(storage), null)
})
