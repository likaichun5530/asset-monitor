export const AI_DATA_CACHE_TTL_MS = Object.freeze({
  holdings: 60_000,
  target: 120_000,
  history: 10 * 60_000,
  rules: 120_000,
})

const entries = new Map()
const inFlight = new Map()
const epochs = new Map()

export function readCachedAiData(resource, loader, { now = Date.now() } = {}) {
  const ttlMs = AI_DATA_CACHE_TTL_MS[resource]
  if (!ttlMs) return Promise.resolve().then(loader)
  const cached = entries.get(resource)
  if (cached?.expiresAt > now) return Promise.resolve(cached.value)
  const pending = inFlight.get(resource)
  if (pending) return pending

  const requestEpoch = epochs.get(resource) || 0
  const request = Promise.resolve().then(loader).then((value) => {
    if ((epochs.get(resource) || 0) === requestEpoch) {
      entries.set(resource, { value, expiresAt: Date.now() + ttlMs })
    }
    return value
  }).finally(() => {
    if (inFlight.get(resource) === request) inFlight.delete(resource)
  })
  inFlight.set(resource, request)
  return request
}

export function invalidateAiDataCache(...resources) {
  for (const resource of resources.flat()) {
    entries.delete(resource)
    inFlight.delete(resource)
    epochs.set(resource, (epochs.get(resource) || 0) + 1)
  }
}

export function clearAiDataCache() {
  entries.clear()
  inFlight.clear()
  epochs.clear()
}
