import { useState, useEffect, useMemo } from 'react'
import { formatNumber } from '../utils/format.js'

const API_BASE = import.meta.env.VITE_API_BASE || ''

const GROUP_ORDER = ['汇率', 'A股', '期货', '境外', '数字货币']

export default function Market({ refreshKey = 0 }) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!API_BASE) return
    setLoading(true)
    fetch(`${API_BASE}/api/market`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((res) => {
        setData(res.market || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [refreshKey])

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        <svg className="animate-spin w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" />
          <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
        加载中...
      </div>
    )
  }

  return (
    <div className="space-y-6 px-1 sm:px-0">
      {groups.map((group, gi) => (
        <section key={gi}>
          <h2 className="text-[13px] font-semibold text-gray-400 uppercase tracking-wider px-4 sm:px-0 mb-2">
            {group.name}
          </h2>
          <div className="bg-white rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)]">
            {group.items.map((item, idx) => (
              <div
                key={idx}
                className={`flex items-center justify-between px-5 py-4 ${
                  idx < group.items.length - 1 ? 'border-b border-gray-100' : ''
                }`}
              >
                <span className="text-[15px] text-gray-900 font-medium tracking-[-0.01em]">
                  {item.name}
                </span>
                <span className="text-[15px] text-gray-900 font-semibold tabular-nums tracking-[-0.01em]">
                  {item.price ? formatNumber(item.price, adaptPrecision(item.price)) : '—'}
                </span>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

function adaptPrecision(val) {
  if (val >= 1000) return 2
  if (val >= 1) return 4
  return 4
}