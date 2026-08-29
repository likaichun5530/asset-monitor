import { useState, useEffect, useCallback, useRef } from 'react'
import { loadHoldingsData, loadInitialData } from '../utils/asset.js'
import { getInitialAssetStatus } from '../utils/assetDataStatus.js'
import { shouldAutoRefresh } from '../utils/refreshPolicy.js'

const HOLDINGS_REFRESH_MS = 5 * 60 * 1000

// 首次进入和手动刷新加载 holdings + history；后台定时任务只刷新 holdings。
export function useAssetData({ enabled = true } = {}) {
  const initialStatus = useRef(getInitialAssetStatus())
  const [source, setSource] = useState(initialStatus.current.source)
  const [syncedAt, setSyncedAt] = useState(initialStatus.current.syncedAt)
  const [error, setError] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [manualRefreshKey, setManualRefreshKey] = useState(0)
  const mountedRef = useRef(true)
  const initialLoadRef = useRef(false)
  const initialInFlightRef = useRef(false)
  const holdingsInFlightRef = useRef(false)
  const lastHoldingsRefreshRef = useRef(0)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const applyHoldingsStatus = useCallback((result) => {
    if (!mountedRef.current) return
    setSource(result.source || result.holdingsSource)
    setSyncedAt(result.syncedAt)
  }, [])

  const loadEverything = useCallback(async () => {
    if (!enabled || initialInFlightRef.current) return false
    initialInFlightRef.current = true
    setError(null)
    try {
      const result = await loadInitialData()
      applyHoldingsStatus(result)
      lastHoldingsRefreshRef.current = Date.now()
      return true
    } catch (loadError) {
      if (mountedRef.current) setError(loadError?.message || String(loadError))
      return false
    } finally {
      initialInFlightRef.current = false
      initialLoadRef.current = true
    }
  }, [applyHoldingsStatus, enabled])

  const refreshHoldings = useCallback(async (force = false) => {
    const visible = typeof document === 'undefined' || document.visibilityState !== 'hidden'
    if (!enabled || (!force && !shouldAutoRefresh({
      visible,
      inFlight: holdingsInFlightRef.current || initialInFlightRef.current,
      lastFetchedAt: lastHoldingsRefreshRef.current,
      maxAgeMs: HOLDINGS_REFRESH_MS,
    }))) return false
    if (holdingsInFlightRef.current || initialInFlightRef.current) return false

    holdingsInFlightRef.current = true
    try {
      const result = await loadHoldingsData()
      applyHoldingsStatus(result)
      lastHoldingsRefreshRef.current = Date.now()
      if (mountedRef.current) setRefreshKey((key) => key + 1)
      return true
    } catch (loadError) {
      if (mountedRef.current) setError(loadError?.message || String(loadError))
      return false
    } finally {
      holdingsInFlightRef.current = false
    }
  }, [applyHoldingsStatus, enabled])

  const refresh = useCallback(async () => {
    const loaded = await loadEverything()
    if (loaded && mountedRef.current) {
      setRefreshKey((key) => key + 1)
      setManualRefreshKey((key) => key + 1)
    }
  }, [loadEverything])

  const bumpRefreshKey = useCallback(() => setRefreshKey((key) => key + 1), [])

  useEffect(() => {
    if (!enabled || initialLoadRef.current) return
    loadEverything().then((loaded) => {
      if (loaded && mountedRef.current) setRefreshKey((key) => key + 1)
    })
  }, [enabled, loadEverything])

  useEffect(() => {
    if (!enabled) return undefined
    const timer = setInterval(() => { refreshHoldings(false) }, HOLDINGS_REFRESH_MS)
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') refreshHoldings(false)
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [enabled, refreshHoldings])

  return { source, syncedAt, error, refresh, refreshKey, manualRefreshKey, bumpRefreshKey }
}
