import { useState, useEffect, useMemo } from 'react'
import { formatNumber } from '../utils/format.js'

const API_BASE = import.meta.env.VITE_API_BASE || ''
const CACHE_KEY = 'asset-monitor:market'

const GROUP_ORDER = ['汇率', '数字货币', '期货', '境外', 'A股']

function adaptPrecision(val) {
  if (val >= 1000) return 2
  if (val >= 1) return 4
  return 4
}

// 标的名 -> 图标映射
function getNameIcon(name) {
  if (name === 'USD' || name === '纳斯达克指数') return <span>🇺🇸</span>
  if (name === 'HKD') return <span>🇭🇰</span>
  if (name === 'JPY' || name === '日经225指数') return <span>🇯🇵</span>
  if (name === 'BTC') {
    return (
      <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="11" fill="#f7931a" />
        <path d="M14.3 7.3c.8.3 1.3.9 1.1 1.8-2 .2-2-.2-3.9-.4-.4 0-.5.2-.5.5v.7c1.5.2 3.1.4 4.6.7 1.5.3 2.5 1.2 2.7 2.8.2 1.3-.3 2.1-1 2.7-.7.6-1.5.8-2.6.9v1.2h-1.1v-1.2h-.7v1.2H10v-1.2c-.7 0-1.5 0-2.2-.1v-1.1h.7c.5 0 .7-.2.7-.7v-4.8c0-.5-.2-.7-.7-.7h-.7V7.4h2.2V6.2h1.1v1.2h.7V6.2h1.1v1.1h.4zm-.2 5.3c0-.9-.8-1.2-1.9-1.3v2.6c1-.1 1.9-.4 1.9-1.3zm-3-2c0-.7-.6-1-1.4-1.1v2.3c.8 0 1.4-.4 1.4-1.2z" fill="#fff" />
      </svg>
    )
  }
  if (name === 'ETH') {
    return (
      <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="12" fill="#627eea" />
        <path d="M12 3v6.7l5.5 2.4L12 3z" fill="#fff" opacity="0.6" />
        <path d="M12 3L6.5 12.1 12 9.7V3z" fill="#fff" />
        <path d="M12 16.5v4.5l5.5-7.6L12 16.5z" fill="#fff" opacity="0.6" />
        <path d="M12 21v-4.5L6.5 13.4 12 21z" fill="#fff" />
        <path d="M12 15.2l5.5-3.1L12 9.7v5.5z" fill="#fff" opacity="0.2" />
        <path d="M6.5 12.1l5.5 3.1V9.7l-5.5 2.4z" fill="#fff" opacity="0.5" />
      </svg>
    )
  }
  if (name.includes('中证') || name.includes('上证') || name.includes('沪深') || name.includes('期货') || name === 'IC') return <span>🇨🇳</span>
  if (name === 'SGE黄金9999') return <span>🥇</span>
  return null
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

  // 找中证500现货价格（Google Sheets 可能存为"中证500"或包含"中证500"的名称）
  const zz500Spot = useMemo(() => {
    const item = data.find((d) => d.name.includes('中证500') && !d.name.includes('期货') && !d.name.includes('IC'))
    return item?.price != null ? Number(item.price) : null
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
          <h2 className="text-[13px] font-semibold text-gray-900 uppercase tracking-wider px-4 sm:px-0 mb-1">
            {group.name}
          </h2>
          <div className="grid grid-cols-3 gap-1">
            {group.items.map((item, idx) => {
              const isFutures = (item.name.includes('期货') || item.name === 'IC') && zz500Spot !== null && item.price != null
              const spread = isFutures ? zz500Spot - Number(item.price) : null
              const icon = getNameIcon(item.name)
              return (
                <div key={idx}
                  className="card flex flex-col justify-center items-center text-center p-2 min-h-[85px]"
                >
                  <div className="text-sm text-gray-900 flex items-center gap-1">
                    {icon}
                    <span>{item.name}</span>
                  </div>
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