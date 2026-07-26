import { useState, useEffect, useMemo } from 'react'
import { formatNumber } from '../utils/format.js'

const API_BASE = import.meta.env.VITE_API_BASE || ''
const CACHE_KEY = 'asset-monitor:market'

const GROUP_ORDER = ['汇率', 'A股', '期货', '境外', '数字货币']

function adaptPrecision(val) {
  if (val >= 1000) return 2
  if (val >= 1) return 4
  return 4
}

export default function Market({ refreshKey = 0 }) {
  const [data, setData] = useState(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY)
      if (cached) return JSON.parse(cached)
    } catch { /* ignore */ }
    return []
  })
  const [loading, setLoading] = useState(!data.length)

  useEffect(() => {
    if (!API_BASE) return
    fetch(`${API_BASE}/api/market`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((res) => {
        const marketData = res.market || []
        setData(marketData)
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(marketData)) } catch { /* ignore */ }
        setLoading(false)
      })
      .catch(() => {
        if (!data.length) setLoading(false)
      })
  }, [refreshKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // 找中证500现货价格，用于计算期货贴水
  const zz500Spot = useMemo(() => {
    const item = data.find((d) => d.name === '中证500')
    return item?.price ?? null
  }, [data])

  const groups = useMemo(() => {
    const map = new Map()
    for (const item of data) {
      const g = item.group || '其他'
      if (!map.has(g)) map.set(g, [])
      map.get(g).push(item)
    }
    const ordered = []
    for (const key of GROUP_ORDER) {
      if (map.has(key)) ordered.push({ name: key, items: map.get(key) })
    }
    for (const [key, items] of map.entries()) {
      if (!GROUP_ORDER.includes(key)) ordered.push({ name: key, items })
    }
    return ordered
  }, [data])

  return (
    <div className="space-y-4 px-1 sm:px-0">
      {groups.map((group, gi) => (
        <section key={gi}>
          <h2 className="text-[13px] font-semibold text-gray-400 uppercase tracking-wider px-4 sm:px-0 mb-1">
            {group.name}
          </h2>
          <div className="grid grid-cols-3 gap-1">
            {group.items.map((item, idx) => {
              const isFutures = item.name.includes('中证500期货') && zz500Spot !== null
              const spread = isFutures ? zz500Spot - item.price : null
              return (
                <div key={idx}
                  className="card flex flex-col justify-center items-center text-center p-2 min-h-[85px]"
                >
                  <div className="text-sm text-gray-900">{item.name}</div>
                  <div className="text-sm font-semibold text-gray-900 mt-1">
                    {item.price ? formatNumber(item.price, adaptPrecision(item.price)) : '—'}
                  </div>
                  {spread !== null && (
                    <div className="text-xs text-gray-500 font-normal mt-0.5">
                      {spread >= 0 ? '贴水 ' : '升水 '}
                      {formatNumber(Math.abs(spread), 2)}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
