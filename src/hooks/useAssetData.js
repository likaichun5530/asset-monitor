import { useState, useEffect, useCallback, useRef } from 'react'
import { loadAll } from '../utils/asset.js'
import { retryPendingSync, hasBackend } from '../utils/dataStore.js'

// 数据加载与刷新的统一 hook
// 返回:
//   loading: 是否正在加载（仅首次为 true，后续无感刷新不触发）
//   source: 数据来源 'online' | 'cache' | 'static'
//   syncedAt: 最后同步时间
//   error: 错误信息
//   refresh: 手动刷新（无感，不显示 loading）
//   bumpRefreshKey: 触发依赖 refreshKey 的组件刷新（用于快照后）
export function useAssetData() {
  const [loading, setLoading] = useState(true)
  const [source, setSource] = useState('static')
  const [syncedAt, setSyncedAt] = useState(null)
  const [error, setError] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const mountedRef = useRef(true)
  const firstLoadDone = useRef(false)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const doLoad = useCallback(async (isFirstLoad) => {
    if (isFirstLoad) setLoading(true)
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
      if (mountedRef.current && isFirstLoad) {
        setLoading(false)
        firstLoadDone.current = true
      }
    }
  }, [])

  const refresh = useCallback(() => {
    doLoad(false)
  }, [doLoad])

  const bumpRefreshKey = useCallback(() => {
    setRefreshKey((k) => k + 1)
  }, [])

  // 首次加载
  useEffect(() => {
    doLoad(true)
  }, [doLoad])

  // 自动刷新：在线 5 分钟，离线 3 分钟
  useEffect(() => {
    const interval = hasBackend() ? 3 * 60 * 1000 : 5 * 60 * 1000
    const id = setInterval(() => {
      doLoad(false)
    }, interval)
    return () => clearInterval(id)
  }, [doLoad])

  return { loading, source, syncedAt, error, refresh, refreshKey, bumpRefreshKey }
}
