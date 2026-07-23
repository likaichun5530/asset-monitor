import { useState, useEffect, useMemo } from 'react'
import { formatNumber } from '../utils/format.js'

const API_BASE = import.meta.env.VITE_API_BASE || ''

const GROUP_ORDER = ['汇率', 'A股', '期货', '境外', '数字货币']
const GROUP_COLOR = {
  '汇率':    { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-800' },
  'A股':    { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800' },
  '期货':    { bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-800' },
  '境外':    { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800' },
  '数字货币': { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-800' },
  '其他':    { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700' },
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
              const c = GROUP_COLOR[group.name] || GROUP_COLOR['其他']
              return (
                <div key={gi}>
                  <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold mb-2 ${c.bg} ${c.text}`}>
                    {group.name}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                    {group.items.map((item, idx) => (
                      <div
                        key={idx}
                        className={`${c.bg} ${c.border} border rounded-xl aspect-square flex flex-col items-center justify-center p-3`}
                      >
                        <div className="text-xs text-gray-500 text-center leading-tight line-clamp-2">{item.name}</div>
                        <div className="text-base font-extrabold text-gray-900 mt-2 tabular-nums">
                          {item.price ? formatNumber(item.price, item.price < 1 ? 4 : 2) : '—'}
                        </div>
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