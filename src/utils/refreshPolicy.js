export function isDataStale(lastFetchedAt, maxAgeMs, now = Date.now()) {
  return !Number.isFinite(lastFetchedAt) || lastFetchedAt <= 0 || now - lastFetchedAt >= maxAgeMs
}

export function shouldAutoRefresh({ visible, inFlight, lastFetchedAt, maxAgeMs, now = Date.now() }) {
  return Boolean(visible) && !inFlight && isDataStale(lastFetchedAt, maxAgeMs, now)
}
