import { useState, useEffect, useCallback, useRef } from 'react'
import { loadAll } from '../utils/asset.js'
import { retryPendingSync } from '../utils/dataStore.js'

// 数据加载与刷新的统一 hook
// 返回:
//   loading: 是否正在加载
//   source: 数据来源 'online' | 'cache' | 'static'
//   syncedAt: 最后同步时间
//   error: 错误信息
//   refresh: 手动刷新
//   bumpRefreshKey: 触发依赖 refreshKey 的组件刷新（用于快照后）
export function useAssetData() {
  const [loading, setLoading] = useState(true)
  const [source, setSource] = useState('static')
  const [syncedAt, setSyncedAt] = useState(null)
  const [error, setError] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const refresh = useCallback(async () => {
    setLoading(true)
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
      if (mountedRef.current) setLoading(false)
    }
  }, [])

  const bumpRefreshKey = useCallback(() => {
    setRefreshKey((k) => k + 1)
  }, [])

  // 首次加载
  useEffect(() => {
    refresh()
  }, [refresh])

  // 每 5 分钟自动刷新一次（在线时拉取最新 Google Sheets 数据）
  useEffect(() => {
    const id = setInterval(() => {
      refresh()
    }, 5 * 60 * 1000)
    return () => clearInterval(id)
  }, [refresh])

  return { loading, source, syncedAt, error, refresh, refreshKey, bumpRefreshKey }
}