import { useState, useEffect } from 'react'
import { formatNumber } from '../utils/format.js'

const API_BASE = import.meta.env.VITE_API_BASE || ''

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
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-100 whitespace-nowrap">
                  <th className="py-2 px-2 font-medium">标的名称</th>
                  <th className="py-2 px-2 font-medium text-right">最新价格</th>
                  <th className="py-2 px-2 font-medium text-right">涨跌额</th>
                  <th className="py-2 px-2 font-medium text-right">涨跌幅</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item, idx) => {
                  const isUp = item.change > 0
                  const isDown = item.change < 0
                  const changeColor = isUp ? 'text-red-500' : isDown ? 'text-green-600' : 'text-gray-400'
                  return (
                    <tr key={idx} className="border-b border-gray-50 last:border-0 whitespace-nowrap">
                      <td className="py-2.5 px-2 text-gray-800 font-medium">{item.name}</td>
                      <td className="py-2.5 px-2 text-right text-gray-800 font-semibold">
                        {item.price ? formatNumber(item.price, item.price < 1 ? 4 : 2) : '—'}
                      </td>
                      <td className={`py-2.5 px-2 text-right font-semibold ${changeColor}`}>
                        {item.change !== 0 ? (item.change > 0 ? '+' : '') + formatNumber(item.change, 2) : '—'}
                      </td>
                      <td className={`py-2.5 px-2 text-right font-semibold ${changeColor}`}>
                        {item.changePct !== 0 ? (item.changePct > 0 ? '+' : '') + formatNumber(item.changePct, 2) + '%' : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
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