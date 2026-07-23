import { useState, useEffect } from 'react'
import { formatNumber } from '../utils/format.js'

const API_BASE = import.meta.env.VITE_API_BASE || ''

const CARD_COLORS = [
  'border-l-blue-500', 'border-l-red-500', 'border-l-green-500',
  'border-l-purple-500', 'border-l-orange-500', 'border-l-cyan-500',
  'border-l-pink-500', 'border-l-teal-500', 'border-l-indigo-500',
  'border-l-rose-500',
]

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

  return (
    <div className="space-y-2">
      <div className="card">
        <h3 className="text-base font-semibold text-gray-800 mb-3">自选行情</h3>
        {loading ? (
          <div className="text-sm text-gray-400 py-4 text-center">加载中...</div>
        ) : data.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {data.map((item, idx) => (
              <div
                key={idx}
                className={`border-l-4 ${CARD_COLORS[idx % CARD_COLORS.length]} bg-gray-50 rounded-lg p-3 flex flex-col justify-between min-h-[72px]`}
              >
                <div className="text-xs text-gray-500 truncate">{item.name}</div>
                <div className="text-lg font-bold text-gray-900 mt-1">
                  {item.price ? formatNumber(item.price, item.price < 1 ? 4 : 2) : '—'}
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