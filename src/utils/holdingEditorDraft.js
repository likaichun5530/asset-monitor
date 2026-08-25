export const HOLDING_EDITOR_DRAFT_KEY = 'youshu-holding-editor-draft'

export function readHoldingEditorDraft(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(HOLDING_EDITOR_DRAFT_KEY)
    if (!raw) return null
    const draft = JSON.parse(raw)
    if (!draft || typeof draft !== 'object') return null
    return draft
  } catch {
    return null
  }
}

export function writeHoldingEditorDraft(draft, storage = globalThis.localStorage) {
  try {
    storage?.setItem(HOLDING_EDITOR_DRAFT_KEY, JSON.stringify(draft))
  } catch {
    // localStorage 不可用时不影响正常编辑
  }
}

export function clearHoldingEditorDraft(storage = globalThis.localStorage) {
  try {
    storage?.removeItem(HOLDING_EDITOR_DRAFT_KEY)
  } catch {
    // ignore
  }
}
