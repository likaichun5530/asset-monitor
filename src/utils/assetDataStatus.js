export function getInitialAssetStatus(storage = globalThis.localStorage) {
  try {
    if (storage?.getItem('youshu-demo-mode') === 'true') return { source: 'demo', syncedAt: null }
    const cached = JSON.parse(storage?.getItem('asset-monitor:holdings') || 'null')
    if (cached?.holdings?.length) return { source: 'cache', syncedAt: cached.syncedAt || null }
  } catch {
    // 缓存损坏时交给正常加载流程处理
  }
  return { source: 'empty', syncedAt: null }
}
