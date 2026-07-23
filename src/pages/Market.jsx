import { useState, useEffect, useMemo } from 'react'
import { formatNumber } from '../utils/format.js'

const API_BASE = import.meta.env.VITE_API_BASE || ''

const GROUP_ORDER = ['汇率', 'A股', '数字货币', '境外']
const GROUP_COLORS = {
  '汇率': 'border-l-yellow-500',
  'A股': 'border-l-red-500',
  '数字货币': 'border-l-orange-500',
  '境外': 'border-l-blue-500',
  '其他': 'border-l-gray-400',
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
    // 按指定顺序排列
    const ordered = []
    for (const key of GROUP_ORDER) {
      if (map.has(key)) ordered.push({ name: key, items: map.get(key) })
    }
    // 追加未在列表中的组
    for (const [key, items] of map.entries()) {
      if (!GROUP_ORDER.includes(key)) ordered.push({ name: key, items })
    }
    return ordered
  }, [data])

  return (
    <div className="space-y-2">
      <div className="card">
        <h3 className="text-base font-semibold text-gray-800 mb-3">自选行情</h3>
        {loading ? (
          <div className="text-sm text-gray-400 py-4 text-center">加载中...</div>
        ) : groups.length > 0 ? (
          <div className="space-y-3">
            {groups.map((group, gi) => (
              <div key={gi}>
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">{group.name}</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {group.items.map((item, idx) => (
                    <div
                      key={idx}
                      className={`border-l-4 ${GROUP_COLORS[group.name] || 'border-l-gray-400'} bg-gray-50 rounded-lg p-3 flex flex-col justify-between min-h-[72px]`}
                    >
                      <div className="text-xs text-gray-500 truncate">{item.name}</div>
                      <div className="text-lg font-bold text-gray-900 mt-1">
                        {item.price ? formatNumber(item.price, item.price < 1 ? 4 : 2) : '—'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
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