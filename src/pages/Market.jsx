import { useState, useEffect, useMemo } from 'react'
import { formatNumber } from '../utils/format.js'

const API_BASE = import.meta.env.VITE_API_BASE || ''

const GROUP_ORDER = ['汇率', 'A股', '期货', '境外', '数字货币']
const GROUP_DOT = {
  '汇率': 'bg-yellow-500',
  'A股': 'bg-red-500',
  '期货': 'bg-cyan-500',
  '境外': 'bg-blue-500',
  '数字货币': 'bg-orange-500',
  '其他': 'bg-gray-400',
}

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

  return (
    <div className="space-y-2">
      <div className="card">
        <h3 className="text-base font-semibold text-gray-800 mb-4">自选行情</h3>
        {loading ? (
          <div className="text-sm text-gray-400 py-4 text-center">加载中...</div>
        ) : groups.length > 0 ? (
          <div className="space-y-4">
            {groups.map((group, gi) => {
              const dot = GROUP_DOT[group.name] || 'bg-gray-400'
              return (
                <div key={gi}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`inline-block w-2 h-2 rounded-full ${dot}`} />
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{group.name}</span>
                  </div>
                  <div className="space-y-1">
                    {group.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-white border border-gray-100 hover:bg-gray-50 transition-colors"
                      >
                        <span className="text-sm text-gray-700">{item.name}</span>
                        <span className="text-sm font-semibold text-gray-900 tabular-nums">
                          {item.price ? formatNumber(item.price, item.price < 1 ? 4 : 2) : '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-sm text-gray-400 py-4 text-center">
            暂无数据，请在 Google Sheets 的 Market 工作表中添加标的
          </div>
        )}
      </div>
    </div>
  )
}
