import { useMemo, useState, useEffect } from 'react'
import { getActiveHoldings, holdingMarketValue, totalMarketValue } from '../utils/asset.js'
import { formatCurrency, formatNumber } from '../utils/format.js'
import { getApiJson } from '../utils/api.js'

function getMultiplier(symbol) {
  if (!symbol) return 1
  if (symbol.startsWith('IC') || symbol.startsWith('IM')) return 200
  if (symbol.startsWith('IF') || symbol.startsWith('IH')) return 300
  return 1
}

// 交割日 "2026-08-21" → "08-21"
function formatSettleDate(dateStr) {
  if (!dateStr) return '—'
  const parts = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (parts) return `${parts[2]}-${parts[3]}`
  return dateStr
}

export default function Future({ refreshKey = 0 }) {
  const holdings = useMemo(() => getActiveHoldings(), [refreshKey])
  const total = useMemo(() => totalMarketValue(), [refreshKey])

  const futures = useMemo(() => {
    return holdings.filter((h) => h.assetType === '期货')
  }, [holdings])

  const sumMarketValue = futures.reduce((s, r) => s + holdingMarketValue(r), 0)

  const FUTURES_CACHE_KEY = 'asset-monitor:futures'
  const MARKET_CACHE_KEY = 'asset-monitor:market'

  const [futuresData, setFuturesData] = useState(() => {
    try {
      const cached = localStorage.getItem(FUTURES_CACHE_KEY)
      if (cached) return JSON.parse(cached)
    } catch { /* ignore */ }
    return null
  })

  const [marketData, setMarketData] = useState(() => {
    try {
      const cached = localStorage.getItem(MARKET_CACHE_KEY)
      if (cached) return JSON.parse(cached)
    } catch { /* ignore */ }
    return []
  })

  useEffect(() => {
    getApiJson('futures')
      .then((res) => {
        const data = res.futures || null
        setFuturesData(data)
        if (data) {
          try { localStorage.setItem(FUTURES_CACHE_KEY, JSON.stringify(data)) } catch { /* ignore */ }
        }
      })
      .catch(() => { /* 静默失败，使用缓存 */ })
  }, [refreshKey])

  // 同时拉取行情数据获取实时价格
  useEffect(() => {
    getApiJson('market')
      .then((res) => {
        const data = res.market || []
        setMarketData(data)
        if (data.length) {
          try { localStorage.setItem(MARKET_CACHE_KEY, JSON.stringify(data)) } catch { /* ignore */ }
        }
      })
      .catch(() => { /* 静默失败，使用缓存 */ })
  }, [refreshKey])

  // 从行情数据中查找合约价格（按 symbol 匹配）
  const marketPriceMap = useMemo(() => {
    const map = new Map()
    for (const item of marketData) {
      if (item.group === '期货' && item.symbol && item.price != null) {
        map.set(item.symbol, Number(item.price))
      }
    }
    return map
  }, [marketData])

  // 现货价格（从行情数据获取，优先用 symbol='CSI500' 或名称含中证500的）
  const spot = useMemo(() => {
    const csi = marketData.find((d) => d.symbol === 'CSI500')
    if (csi?.price != null) return Number(csi.price)
    const item = marketData.find((d) => d.name.includes('中证500') && !d.name.includes('期货') && !d.name.includes('IC'))
    return item?.price != null ? Number(item.price) : null
  }, [marketData])

  // 期货合约数据（前端自行计算年化率，保留正负号）
  const contracts = useMemo(() => {
    if (!futuresData || futuresData.length < 2) return []
    return futuresData.slice(1).map((d) => {
      const code = d.code
      // 优先用行情数据中的实时价格
      const realPrice = marketPriceMap.get(code)
      const price = realPrice ?? d.price
      const spread = spot != null ? spot - price : null
      // 按交割日动态计算剩余天数（避免后端/缓存固定值过期）
      const daysToSettle = d.settleDate
        ? Math.max(0, Math.ceil((new Date(d.settleDate) - new Date()) / 86400000))
        : (d.daysToSettle ?? null)
      // 年化率 = (贴水/价格) * (365/到期天数)，贴水正、升水负
      const annualRate = spread !== null && daysToSettle && daysToSettle > 0
        ? (spread / price) * (365 / daysToSettle) * 100
        : null
      return {
        name: code,
        price,
        spread,
        daysToSettle,
        settleDate: d.settleDate ?? null,
        annualRate,
      }
    })
  }, [futuresData, marketPriceMap, spot])

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
                      {h.price === null ? '—' : Math.round(h.price)}
                    </td>
                    <td className="py-2.5 px-2 text-right text-gray-600">{formatCurrency(holdingMarketValue(h))}</td>
                    <td className={`py-2.5 px-2 text-right font-semibold ${usageRate > 75 ? 'text-red-500' : usageRate > 70 ? 'text-yellow-500' : 'text-green-600'}`}>
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
                  <th className="py-2 px-2 font-medium">标的</th>
                  <th className="py-2 px-2 font-medium text-right">价格</th>
                  <th className="py-2 px-2 font-medium text-right">贴水</th>
                  <th className="py-2 px-2 font-medium text-right">交割日</th>
                  <th className="py-2 px-2 font-medium text-right">到期天数</th>
                  <th className="py-2 px-2 font-medium text-right">年化率</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-50">
                  <td className="py-2.5 px-2 text-gray-600 font-medium">中证500</td>
                  <td className="py-2.5 px-2 text-right text-gray-600">{Math.round(spot)}</td>
                  <td className="py-2.5 px-2 text-right text-gray-600">—</td>
                  <td className="py-2.5 px-2 text-right text-gray-600">—</td>
                  <td className="py-2.5 px-2 text-right text-gray-600">—</td>
                  <td className="py-2.5 px-2 text-right text-gray-600">—</td>
                </tr>
                {contracts.map((item, idx) => {
                  const isDiscount = item.spread !== null && item.spread > 0 // 贴水（期货低于现货）
                  const isPremium = item.spread !== null && item.spread < 0 // 升水（期货高于现货）
                  return (
                    <tr key={idx} className="border-b border-gray-50 last:border-0 whitespace-nowrap">
                      <td className="py-2.5 px-2">
                        <span className="text-gray-600">{item.name}</span>
                      </td>
                      <td className="py-2.5 px-2 text-right text-gray-600">{Math.round(item.price)}</td>
                      <td className={`py-2.5 px-2 text-right font-semibold ${isDiscount ? 'text-red-500' : isPremium ? 'text-green-600' : 'text-gray-500'}`}>
                        {item.spread !== null ? Math.round(item.spread) : '—'}
                      </td>
                      <td className="py-2.5 px-2 text-right text-gray-600 text-xs">{formatSettleDate(item.settleDate)}</td>
                      <td className="py-2.5 px-2 text-right text-gray-600">{item.daysToSettle !== null ? `${item.daysToSettle}天` : '—'}</td>
                      <td className={`py-2.5 px-2 text-right font-semibold ${isDiscount ? 'text-red-500' : isPremium ? 'text-green-600' : 'text-gray-500'}`}>
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
            暂无数据
          </div>
        )}
      </div>
    </div>
  )
}
