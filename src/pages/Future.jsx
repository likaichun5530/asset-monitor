import { useMemo, useState, useEffect } from 'react'
import { getActiveHoldings, holdingMarketValue, totalMarketValue } from '../utils/asset.js'
import { formatCurrency, formatNumber } from '../utils/format.js'

const API_BASE = import.meta.env.VITE_API_BASE || ''

export default function Future({ refreshKey = 0 }) {
  const holdings = useMemo(() => getActiveHoldings(), [refreshKey])
  const total = useMemo(() => totalMarketValue(), [refreshKey])

  const futures = useMemo(() => {
    return holdings.filter((h) => h.assetType === '期货')
  }, [holdings])

  const sumMarketValue = futures.reduce((s, r) => s + holdingMarketValue(r), 0)

  const MARKET_CACHE_KEY = 'asset-monitor:market'

  // 从 /api/market 获取实时行情数据
  const [marketData, setMarketData] = useState(() => {
    try {
      const cached = localStorage.getItem(MARKET_CACHE_KEY)
      if (cached) return JSON.parse(cached)
    } catch { /* ignore */ }
    return []
  })

  useEffect(() => {
    if (!API_BASE) return
    fetch(`${API_BASE}/api/market`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((res) => {
        const data = res.market || []
        setMarketData(data)
        try { localStorage.setItem(MARKET_CACHE_KEY, JSON.stringify(data)) } catch { /* ignore */ }
      })
      .catch(() => { /* 静默失败，使用缓存 */ })
  }, [refreshKey])

  // 从市场数据中提取中证500现货和期货价格
  const spotZZ500 = useMemo(() => {
    const item = marketData.find((d) => d.name.includes('中证500') && !d.name.includes('期货') && !d.name.includes('IC'))
    return item?.price ?? null
  }, [marketData])

  const futuresContracts = useMemo(() => {
    return marketData.filter((d) => d.name.includes('期货') || d.name.includes('IC'))
  }, [marketData])

  return (
    <div className="space-y-[4px]">
      {/* 概要 */}
      <div className="card py-3 px-4 flex items-center justify-between">
        <div>
          <div className="text-xs text-gray-500">期货总市值</div>
          <div className="text-2xl font-bold text-gray-900 mt-0.5">{formatCurrency(sumMarketValue)}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500">占总资产</div>
          <div className="text-lg font-semibold mt-0.5" style={{ color: '#06b6d4', fontWeight: 700 }}>
            {total ? ((sumMarketValue / total) * 100).toFixed(1) : 0}%
          </div>
        </div>
      </div>

      {/* 持仓列表 - 桌面端 */}
      <div className="card">
        <h3 className="text-base font-semibold text-gray-800 mb-3">持仓列表</h3>
        <div className="hidden sm:block overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-100">
                <th className="py-2 px-2 font-medium">名称</th>
                <th className="py-2 px-2 font-medium">代码</th>
                <th className="py-2 px-2 font-medium">币种</th>
                <th className="py-2 px-2 font-medium text-right">数量</th>
                <th className="py-2 px-2 font-medium text-right">单价</th>
                <th className="py-2 px-2 font-medium text-right">市值</th>
                <th className="py-2 px-2 font-medium text-right">占比</th>
              </tr>
            </thead>
            <tbody>
              {futures.map((h, idx) => (
                <tr key={idx} className="border-b border-gray-50 last:border-0">
                  <td className="py-2.5 px-2 text-gray-800 font-medium">{h.name}</td>
                  <td className="py-2.5 px-2 text-gray-500">{h.symbol === '-' ? '—' : h.symbol}</td>
                  <td className="py-2.5 px-2 text-gray-400">{h.currency}</td>
                  <td className="py-2.5 px-2 text-right text-gray-600">
                    {h.quantity === null ? '—' : formatNumber(h.quantity, 0)}
                  </td>
                  <td className="py-2.5 px-2 text-right text-gray-600">
                    {h.price === null ? '—' : formatNumber(h.price, 1)}
                  </td>
                  <td className="py-2.5 px-2 text-right text-gray-800 font-medium">{formatCurrency(holdingMarketValue(h))}</td>
                  <td className="py-2.5 px-2 text-right text-gray-500">
                    {sumMarketValue ? ((holdingMarketValue(h) / sumMarketValue) * 100).toFixed(2) : 0}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 期现贴水 */}
      <div className="card">
        <h3 className="text-base font-semibold text-gray-800 mb-3">期现贴水</h3>
        {spotZZ500 !== null && futuresContracts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-100 whitespace-nowrap">
                  <th className="py-2 px-2 font-medium">代码</th>
                  <th className="py-2 px-2 font-medium text-right">当前价格</th>
                  <th className="py-2 px-2 font-medium text-right">贴水金额</th>
                  <th className="py-2 px-2 font-medium text-right">贴水率</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-50 bg-blue-50">
                  <td className="py-2.5 px-2 text-blue-700 font-bold">中证500（现货）</td>
                  <td className="py-2.5 px-2 text-right text-blue-700 font-bold">{Number(spotZZ500).toFixed(2)}</td>
                  <td className="py-2.5 px-2 text-right text-gray-500">—</td>
                  <td className="py-2.5 px-2 text-right text-gray-500">—</td>
                </tr>
                {futuresContracts.map((item, idx) => {
                  const spread = spotZZ500 - Number(item.price)
                  const spreadRate = (spread / spotZZ500) * 100
                  return (
                    <tr key={idx} className="border-b border-gray-50 last:border-0 whitespace-nowrap">
                      <td className="py-2.5 px-2 text-gray-800 font-semibold">{item.name}</td>
                      <td className="py-2.5 px-2 text-right text-gray-800">{Number(item.price).toFixed(2)}</td>
                      <td className={`py-2.5 px-2 text-right font-semibold ${spread >= 0 ? 'text-red-500' : 'text-green-600'}`}>
                        {spread >= 0 ? '贴水 ' : '升水 '}{Math.abs(spread).toFixed(2)}
                      </td>
                      <td className={`py-2.5 px-2 text-right font-semibold ${spread >= 0 ? 'text-red-500' : 'text-green-600'}`}>
                        {spread >= 0 ? '' : ''}{spreadRate.toFixed(2)}%
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-sm text-gray-400 py-4 text-center">
            {API_BASE ? '暂无数据' : '需要后端支持才能获取期货数据'}
          </div>
        )}
      </div>
    </div>
  )
}