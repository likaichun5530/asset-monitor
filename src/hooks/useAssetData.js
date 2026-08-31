import { useState, useEffect, useCallback, useRef } from 'react'
import { loadHistoryData, loadHoldingsData, retryPendingSync } from '../utils/asset.js'
import { getInitialAssetStatus } from '../utils/assetDataStatus.js'
import { shouldAutoRefresh } from '../utils/refreshPolicy.js'

const HOLDINGS_REFRESH_MS = 5 * 60 * 1000
const HISTORY_REFRESH_MS = 5 * 60 * 1000

export function useAssetData({
  enabled = true,
  loadHoldings = true,
  loadHistory = false,
  autoRefreshHoldings = loadHoldings,
  autoRefreshHistory = loadHistory,
} = {}) {
  const initialStatus = useRef(getInitialAssetStatus())
  const [source, setSource] = useState(initialStatus.current.source)
  const [syncedAt, setSyncedAt] = useState(initialStatus.current.syncedAt)
  const [error, setError] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const mountedRef = useRef(true)
  const holdingsLoadedRef = useRef(false)
  const historyLoadedRef = useRef(false)
  const holdingsInFlightRef = useRef(false)
  const historyInFlightRef = useRef(false)
  const pendingSyncAttemptedRef = useRef(false)
  const lastHoldingsRefreshRef = useRef(0)
  const lastHistoryRefreshRef = useRef(0)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const applyHoldingsStatus = useCallback((result) => {
    if (!mountedRef.current) return
    setSource(result.source || result.holdingsSource)
    setSyncedAt(result.syncedAt)
  }, [])

  const refreshHoldings = useCallback(async (force = false) => {
    const visible = typeof document === 'undefined' || document.visibilityState !== 'hidden'
    if (!enabled || (!force && !shouldAutoRefresh({
      visible,
      inFlight: holdingsInFlightRef.current,
      lastFetchedAt: lastHoldingsRefreshRef.current,
      maxAgeMs: HOLDINGS_REFRESH_MS,
    }))) return false
    if (holdingsInFlightRef.current) return false

    holdingsInFlightRef.current = true
    setError(null)
    try {
      const result = await loadHoldingsData({ forceRefresh: force })
      applyHoldingsStatus(result)
      holdingsLoadedRef.current = true
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

  const refreshHistory = useCallback(async (force = false) => {
    const visible = typeof document === 'undefined' || document.visibilityState !== 'hidden'
    if (!enabled || (!force && !shouldAutoRefresh({
      visible,
      inFlight: historyInFlightRef.current,
      lastFetchedAt: lastHistoryRefreshRef.current,
      maxAgeMs: HISTORY_REFRESH_MS,
    }))) return false
    if (historyInFlightRef.current) return false
    historyInFlightRef.current = true
    setError(null)
    try {
      const result = await loadHistoryData({ forceRefresh: force })
      historyLoadedRef.current = true
      const requestSucceeded = result?.source === 'online' || result?.source === 'demo'
      if (requestSucceeded) lastHistoryRefreshRef.current = Date.now()
      if (mountedRef.current) setRefreshKey((key) => key + 1)
      return requestSucceeded
    } catch (loadError) {
      if (mountedRef.current) setError(loadError?.message || String(loadError))
      return false
    } finally {
      historyInFlightRef.current = false
    }
  }, [enabled])

  const bumpRefreshKey = useCallback(() => setRefreshKey((key) => key + 1), [])

  useEffect(() => {
    if (!enabled) return
    if ((loadHoldings || loadHistory) && !pendingSyncAttemptedRef.current) {
      pendingSyncAttemptedRef.current = true
      retryPendingSync().catch(() => {})
    }
    if (loadHoldings && !holdingsLoadedRef.current) refreshHoldings(false)
    if (loadHistory && !historyLoadedRef.current) refreshHistory(false)
  }, [enabled, loadHistory, loadHoldings, refreshHistory, refreshHoldings])

  useEffect(() => {
    if (!enabled || !autoRefreshHoldings) return undefined
    refreshHoldings(false)
    const timer = setInterval(() => { refreshHoldings(false) }, HOLDINGS_REFRESH_MS)
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') refreshHoldings(false)
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [autoRefreshHoldings, enabled, refreshHoldings])

  useEffect(() => {
    if (!enabled || !autoRefreshHistory) return undefined
    refreshHistory(false)
    const timer = setInterval(() => { refreshHistory(false) }, HISTORY_REFRESH_MS)
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') refreshHistory(false)
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [autoRefreshHistory, enabled, refreshHistory])

  return { source, syncedAt, error, refreshHoldings, refreshHistory, refreshKey, bumpRefreshKey }
}
