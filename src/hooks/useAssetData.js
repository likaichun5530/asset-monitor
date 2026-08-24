import { useState, useEffect, useCallback, useRef } from 'react'
import { loadAll } from '../utils/asset.js'

// 数据加载与刷新的统一 hook
// 返回:
//   source: 数据来源 'online' | 'cache' | 'demo' | 'empty'
//   syncedAt: 最后同步时间
//   error: 错误信息
//   refresh: 手动刷新（完成后 bump refreshKey 触发组件更新）
//   bumpRefreshKey: 触发依赖 refreshKey 的组件刷新（用于快照后）
export function useAssetData() {
  const [source, setSource] = useState('empty')
  const [syncedAt, setSyncedAt] = useState(null)
  const [error, setError] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const mountedRef = useRef(true)
  const firstLoadDone = useRef(false)
  const refreshingRef = useRef(false) // 防重入锁

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const doLoad = useCallback(async (isFirstLoad) => {
    // 防重入：本次加载未完成时忽略新的触发
    if (refreshingRef.current && !isFirstLoad) return
    if (isFirstLoad) refreshingRef.current = true
    setError(null)
    try {
      const result = await loadAll()
      if (!mountedRef.current) return
      setSource(result.holdingsSource)
      setSyncedAt(result.syncedAt)
    } catch (e) {
      if (!mountedRef.current) return
      setError(e?.message || String(e))
    } finally {
      refreshingRef.current = false
      if (mountedRef.current) {
        if (isFirstLoad) firstLoadDone.current = true
      }
    }
  }, [])

  const refresh = useCallback(async () => {
    // 先读取缓存数据（已在 dataStore/assets 中管理）
    // 加载新数据
    await doLoad(false)
    // 在数据更新到内存后，bump refreshKey 触发组件重新计算
    if (mountedRef.current) {
      setRefreshKey((k) => k + 1)
    }
  }, [doLoad])

  const bumpRefreshKey = useCallback(() => {
    setRefreshKey((k) => k + 1)
  }, [])

  // 首次加载 — 完成后 bump refreshKey 让组件使用新数据
  useEffect(() => {
    doLoad(true).then(() => {
      if (mountedRef.current) {
        setRefreshKey((k) => k + 1)
      }
    })
  }, [doLoad])

  // 自动刷新：每 5 分钟刷新一次（仅页面可见时，且首次加载完成后）
  useEffect(() => {
    const interval = 5 * 60 * 1000
    const id = setInterval(() => {
      // 首次加载未完成或页面不可见时跳过
      if (!firstLoadDone.current) return
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
      doLoad(false).then(() => {
        if (mountedRef.current) setRefreshKey((k) => k + 1)
      })
    }, interval)
    return () => clearInterval(id)
  }, [doLoad])

  return { source, syncedAt, error, refresh, refreshKey, bumpRefreshKey }
}
