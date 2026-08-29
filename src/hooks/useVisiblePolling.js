import { useCallback, useEffect, useRef } from 'react'
import { shouldAutoRefresh } from '../utils/refreshPolicy.js'

export function useVisiblePolling(task, { enabled = true, intervalMs = 5 * 60 * 1000, refreshKey = 0 } = {}) {
  const taskRef = useRef(task)
  const inFlightRef = useRef(false)
  const lastRunAtRef = useRef(0)
  taskRef.current = task

  const run = useCallback(async (force = false) => {
    if (!enabled || inFlightRef.current) return false
    const visible = typeof document === 'undefined' || document.visibilityState !== 'hidden'
    if (!force && !shouldAutoRefresh({
      visible,
      inFlight: inFlightRef.current,
      lastFetchedAt: lastRunAtRef.current,
      maxAgeMs: intervalMs,
    })) return false

    inFlightRef.current = true
    lastRunAtRef.current = Date.now()
    try {
      await taskRef.current()
      return true
    } finally {
      inFlightRef.current = false
    }
  }, [enabled, intervalMs])

  useEffect(() => { run(true).catch(() => {}) }, [refreshKey, run])

  useEffect(() => {
    if (!enabled) return undefined
    const timer = setInterval(() => { run(false).catch(() => {}) }, intervalMs)
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') run(false).catch(() => {})
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [enabled, intervalMs, run])
}
