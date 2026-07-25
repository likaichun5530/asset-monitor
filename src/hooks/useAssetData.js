import { useState, useEffect, useCallback, useRef } from 'react'
import { loadAll } from '../utils/asset.js'
import { retryPendingSync, hasBackend } from '../utils/dataStore.js'

// 数据加载与刷新的统一 hook
// 返回:
//   loading: 是否正在加载（仅首次为 true，后续无感刷新不触发）
//   refreshing: 是否正在后台刷新
//   source: 数据来源 'online' | 'cache' | 'static'
//   syncedAt: 最后同步时间
//   error: 错误信息
//   refresh: 手动刷新（完成后 bump refreshKey 触发组件更新）
//   bumpRefreshKey: 触发依赖 refreshKey 的组件刷新（用于快照后）
export function useAssetData() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
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
    if (!isFirstLoad) setRefreshing(true)
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
      if (mountedRef.current) {
        if (isFirstLoad) {
          setLoading(false)
          firstLoadDone.current = true
        }
        setRefreshing(false)
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

  // 自动刷新：在线 5 分钟，离线 3 分钟
  useEffect(() => {
    const interval = hasBackend() ? 3 * 60 * 1000 : 5 * 60 * 1000
    const id = setInterval(() => {
      doLoad(false).then(() => {
        if (mountedRef.current) setRefreshKey((k) => k + 1)
      })
    }, interval)
    return () => clearInterval(id)
  }, [doLoad])

  return { loading, refreshing, source, syncedAt, error, refresh, refreshKey, bumpRefreshKey }
}