import { useMemo, useState, useEffect } from 'react'
import { getActiveHoldings, holdingMarketValue, totalMarketValue } from '../utils/asset.js'
import { formatCurrency, formatNumber } from '../utils/format.js'

const API_BASE = import.meta.env.VITE_API_BASE || ''

function getMultiplier(symbol) {
  if (!symbol) return 1
  if (symbol.startsWith('IC') || symbol.startsWith('IM')) return 200
  if (symbol.startsWith('IF') || symbol.startsWith('IH')) return 300
  return 1
}

export default function Future({ refreshKey = 0 }) {
  const holdings = useMemo(() => getActiveHoldings(), [refreshKey])
  const total = useMemo(() => totalMarketValue(), [refreshKey])

  const futures = useMemo(() => {
    return holdings.filter((h) => h.assetType === '期货')
  }, [holdings])

  const sumMarketValue = futures.reduce((s, r) => s + holdingMarketValue(r), 0)

  const FUTURES_CACHE_KEY = 'asset-monitor:futures'

  const [futuresData, setFuturesData] = useState(() => {
    try {
      const cached = localStorage.getItem(FUTURES_CACHE_KEY)
      if (cached) return JSON.parse(cached)
    } catch { /* ignore */ }
    return null
  })

  useEffect(() => {
    if (!API_BASE) return
    fetch(`${API_BASE}/api/futures`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((res) => {
        const data = res.futures || null
        setFuturesData(data)
        if (data) {
          try { localStorage.setItem(FUTURES_CACHE_KEY, JSON.stringify(data)) } catch { /* ignore */ }
        }
      })
      .catch(() => { /* 静默失败，使用缓存 */ })
  }, [refreshKey])

  // 现货价格
  const spot = futuresData?.[0]?.price ?? null

  // 期货合约数据（当月/次月/远月）
  const contracts = useMemo(() => {
    if (!futuresData || futuresData.length < 2) return []
    return futuresData.slice(1).map((d) => ({
      name: d.code,
      label: d.type,
      price: d.price,
      spread: d.discount ?? null,
      daysToSettle: d.daysToSettle ?? null,
      settleDate: d.settleDate ?? null,
      annualRate: d.annualRate ?? null,
    }))
  }, [futuresData])

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

      {/* 持仓列表 */}
      <div className="card">
        <h3 className="text-base font-semibold text-gray-800 mb-3">持仓列表</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-100">
                <th className="py-2 px-2 font-medium">代码</th>
                <th className="py-2 px-2 font-medium text-right">价格</th>
                <th className="py-2 px-2 font-medium text-right">市值</th>
                <th className="py-2 px-2 font-medium text-right">保证金使用率</th>
              </tr>
            </thead>
            <tbody>
              {futures.map((h, idx) => {
                const depositMargin = holdingMarketValue(h)
                const multiplier = getMultiplier(h.symbol)
                const contractValue = (h.price || 0) * (h.quantity || 0) * multiplier
                const requiredMargin = contractValue * 0.14
                const usageRate = depositMargin ? (requiredMargin / depositMargin) * 100 : 0
                return (
                  <tr key={idx} className="border-b border-gray-50 last:border-0">
                    <td className="py-2.5 px-2 text-gray-600">{h.symbol === '-' ? '—' : h.symbol}</td>
                    <td className="py-2.5 px-2 text-right text-gray-600">
                      {h.price === null ? '—' : formatNumber(h.price, 1)}
                    </td>
                    <td className="py-2.5 px-2 text-right text-gray-600">{formatCurrency(holdingMarketValue(h))}</td>
                    <td className={`py-2.5 px-2 text-right font-semibold ${usageRate > 75 ? 'text-red-500' : 'text-green-600'}`}>
                      {usageRate.toFixed(1)}%
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 期现贴水 */}
      <div className="card">
        <h3 className="text-base font-semibold text-gray-800 mb-3">期现贴水</h3>
        {spot !== null && contracts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-100 whitespace-nowrap">
                  <th className="py-2 px-2 font-medium">合约</th>
                  <th className="py-2 px-2 font-medium text-right">价格</th>
                  <th className="py-2 px-2 font-medium text-right">贴水</th>
                  <th className="py-2 px-2 font-medium text-right">交割日</th>
                  <th className="py-2 px-2 font-medium text-right">到期天数</th>
                  <th className="py-2 px-2 font-medium text-right">年化率</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-50">
                  <td className="py-2.5 px-2 text-gray-600 font-medium">中证500（现货）</td>
                  <td className="py-2.5 px-2 text-right text-gray-600">{Number(spot).toFixed(2)}</td>
                  <td className="py-2.5 px-2 text-right text-gray-600">—</td>
                  <td className="py-2.5 px-2 text-right text-gray-600">—</td>
                  <td className="py-2.5 px-2 text-right text-gray-600">—</td>
                  <td className="py-2.5 px-2 text-right text-gray-600">—</td>
                </tr>
                {contracts.map((item, idx) => {
                  const spread = item.spread
                  const spreadPositive = spread !== null && spread > 0
                  return (
                    <tr key={idx} className="border-b border-gray-50 last:border-0 whitespace-nowrap">
                      <td className="py-2.5 px-2">
                        <span className="text-gray-600">{item.label}</span>
                        <span className="text-gray-400 ml-1 text-xs">{item.name}</span>
                      </td>
                      <td className="py-2.5 px-2 text-right text-gray-600">{Number(item.price).toFixed(2)}</td>
                      <td className={`py-2.5 px-2 text-right font-semibold ${spreadPositive ? 'text-red-500' : 'text-gray-500'}`}>
                        {spread !== null ? Math.abs(spread).toFixed(2) : '—'}
                      </td>
                      <td className="py-2.5 px-2 text-right text-gray-600 text-xs">{item.settleDate || '—'}</td>
                      <td className="py-2.5 px-2 text-right text-gray-600">{item.daysToSettle !== null ? `${item.daysToSettle}天` : '—'}</td>
                      <td className={`py-2.5 px-2 text-right font-semibold ${spreadPositive ? 'text-red-500' : 'text-gray-500'}`}>
                        {item.annualRate !== null ? `${item.annualRate.toFixed(2)}%` : '—'}
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