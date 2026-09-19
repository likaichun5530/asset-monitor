import { useState, useEffect, useCallback, useRef } from 'react'
import { loadHistoryData, loadHoldingsData } from '../utils/asset.js'
import { retryPendingSync } from '../utils/dataStore.js'
import { getInitialAssetStatus } from '../utils/assetDataStatus.js'
import { shouldAutoRefresh } from '../utils/refreshPolicy.js'

const HOLDINGS_REFRESH_MS = 60 * 1000
const HISTORY_REFRESH_MS = 60 * 1000

export function useAssetData({
  enabled = true,
  loadHoldings = true,
  loadHistory = false,
  autoRefreshHoldings = loadHoldings,
  autoRefreshHistory = loadHistory,
} = {}) {
  const initialStatus = useRef(getInitialAssetStatus())
  const [source, setSource] = useState(initialStatus.current.source)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const mountedRef = useRef(true)
  const activeRefreshesRef = useRef(0)
  const holdingsLoadedRef = useRef(false)
  const historyLoadedRef = useRef(false)
  const holdingsInFlightRef = useRef(null)
  const historyInFlightRef = useRef(null)
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
  }, [])

  const beginRefresh = useCallback(() => {
    activeRefreshesRef.current += 1
    if (mountedRef.current) setIsRefreshing(true)
  }, [])

  const endRefresh = useCallback(() => {
    activeRefreshesRef.current = Math.max(0, activeRefreshesRef.current - 1)
    if (mountedRef.current && activeRefreshesRef.current === 0) setIsRefreshing(false)
  }, [])

  const refreshHoldings = useCallback(async (force = false) => {
    const visible = typeof document === 'undefined' || document.visibilityState !== 'hidden'
    if (!enabled || (!force && !shouldAutoRefresh({
      visible,
      inFlight: holdingsInFlightRef.current,
      lastFetchedAt: lastHoldingsRefreshRef.current,
      maxAgeMs: HOLDINGS_REFRESH_MS,
    }))) return false
    if (holdingsInFlightRef.current) return holdingsInFlightRef.current
    beginRefresh()
    const startedAt = Date.now()
    const request = (async () => {
      try {
        const result = await loadHoldingsData({ forceRefresh: force })
        applyHoldingsStatus(result)
        holdingsLoadedRef.current = true
        lastHoldingsRefreshRef.current = startedAt
        if (mountedRef.current) setRefreshKey((key) => key + 1)
        return true
      } catch {
        return false
      }
    })()
    holdingsInFlightRef.current = request
    try { return await request } finally {
      if (holdingsInFlightRef.current === request) holdingsInFlightRef.current = null
      endRefresh()
    }
  }, [applyHoldingsStatus, beginRefresh, enabled, endRefresh])

  const refreshHistory = useCallback(async (force = false) => {
    const visible = typeof document === 'undefined' || document.visibilityState !== 'hidden'
    if (!enabled || (!force && !shouldAutoRefresh({
      visible,
      inFlight: historyInFlightRef.current,
      lastFetchedAt: lastHistoryRefreshRef.current,
      maxAgeMs: HISTORY_REFRESH_MS,
    }))) return false
    if (historyInFlightRef.current) return historyInFlightRef.current
    beginRefresh()
    const startedAt = Date.now()
    const request = (async () => {
      try {
        const result = await loadHistoryData({ forceRefresh: force })
        historyLoadedRef.current = true
        const requestSucceeded = result?.source === 'online' || result?.source === 'demo'
        if (requestSucceeded) lastHistoryRefreshRef.current = startedAt
        if (mountedRef.current) setRefreshKey((key) => key + 1)
        return requestSucceeded
      } catch {
        return false
      }
    })()
    historyInFlightRef.current = request
    try { return await request } finally {
      if (historyInFlightRef.current === request) historyInFlightRef.current = null
      endRefresh()
    }
  }, [beginRefresh, enabled, endRefresh])

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

  return { source, isRefreshing, refreshHoldings, refreshHistory, refreshKey }
}
