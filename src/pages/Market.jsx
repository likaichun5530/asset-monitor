import { useState, useEffect, useMemo } from 'react'
import { formatNumber } from '../utils/format.js'

const API_BASE = import.meta.env.VITE_API_BASE || ''

const GROUP_ORDER = ['汇率', 'A股', '期货', '境外', '数字货币']
const GROUP_STYLE = {
  '汇率':    { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-700', icon: '💱' },
  'A股':    { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-700', icon: '📈' },
  '期货':    { bg: 'bg-cyan-50', border: 'border-cyan-300', text: 'text-cyan-700', icon: '📊' },
  '境外':    { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700', icon: '🌍' },
  '数字货币': { bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-700', icon: '₿' },
  '其他':    { bg: 'bg-gray-50', border: 'border-gray-300', text: 'text-gray-600', icon: '📌' },
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
              const style = GROUP_STYLE[group.name] || GROUP_STYLE['其他']
              return (
                <div key={gi}>
                  {/* 分组标题 */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm">{style.icon}</span>
                    <span className={`text-xs font-semibold uppercase tracking-wider ${style.text}`}>{group.name}</span>
                  </div>
                  {/* 卡片网格 */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                    {group.items.map((item, idx) => (
                      <div
                        key={idx}
                        className={`${style.bg} ${style.border} border rounded-xl px-3 py-3 flex flex-col items-center justify-center min-h-[76px]`}
                      >
                        <div className="text-xs text-gray-500 text-center leading-tight">{item.name}</div>
                        <div className="text-base font-extrabold text-gray-900 mt-1.5">
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