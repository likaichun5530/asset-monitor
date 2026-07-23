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

  // 从后端获取贴水数据
  const [premiumData, setPremiumData] = useState([])
  const [premiumLoading, setPremiumLoading] = useState(false)

  useEffect(() => {
    if (!API_BASE) return
    setPremiumLoading(true)
    fetch(`${API_BASE}/api/futures`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        setPremiumData(data.futures || [])
        setPremiumLoading(false)
      })
      .catch(() => setPremiumLoading(false))
  }, [refreshKey])

  return (
    <div className="space-y-2">
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
            <tfoot>
              <tr className="font-semibold border-t-2 border-gray-100">
                <td className="py-3 px-2 text-gray-800" colSpan={5}>合计</td>
                <td className="py-3 px-2 text-right text-gray-800">{formatCurrency(sumMarketValue)}</td>
                <td className="py-3 px-2 text-right text-gray-500">100%</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* 持仓列表 - 移动端 */}
        <div className="sm:hidden overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
          <table className="min-w-full text-xs whitespace-nowrap">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-100">
                <th className="py-2.5 px-3 font-medium sticky left-0 bg-white z-[2]" style={{ boxShadow: '2px 0 4px rgba(0,0,0,0.04)' }}>名称</th>
                <th className="py-2.5 px-3 font-medium">代码</th>
                <th className="py-2.5 px-3 font-medium text-right">数量</th>
                <th className="py-2.5 px-3 font-medium text-right">市值</th>
                <th className="py-2.5 px-3 font-medium text-right">占比</th>
              </tr>
            </thead>
            <tbody>
              {futures.map((h, idx) => (
                <tr key={idx} className="border-b border-gray-50 last:border-0">
                  <td className="py-2.5 px-3 text-gray-800 font-medium sticky left-0 bg-white z-[2]" style={{ boxShadow: '2px 0 4px rgba(0,0,0,0.04)' }}>{h.name}</td>
                  <td className="py-2.5 px-3 text-gray-500">{h.symbol === '-' ? '—' : h.symbol}</td>
                  <td className="py-2.5 px-3 text-right text-gray-600">
                    {h.quantity === null ? '—' : formatNumber(h.quantity, 0)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-gray-800 font-medium">{formatCurrency(holdingMarketValue(h))}</td>
                  <td className="py-2.5 px-3 text-right text-gray-500">
                    {sumMarketValue ? ((holdingMarketValue(h) / sumMarketValue) * 100).toFixed(1) : 0}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 保证金信息 - 桌面端 */}
      <div className="card">
        <h3 className="text-base font-semibold text-gray-800 mb-3">保证金信息</h3>
        <div className="hidden sm:block overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-100">
                <th className="py-2 px-2 font-medium">名称</th>
                <th className="py-2 px-2 font-medium">代码</th>
                <th className="py-2 px-2 font-medium text-right">所需保证金</th>
                <th className="py-2 px-2 font-medium text-right">合约价值</th>
                <th className="py-2 px-2 font-medium text-right">账户资金</th>
                <th className="py-2 px-2 font-medium text-right">使用率</th>
                <th className="py-2 px-2 font-medium text-right">结算日</th>
                <th className="py-2 px-2 font-medium text-right">距结算</th>
              </tr>
            </thead>
            <tbody>
              {futures.map((h, idx) => {
                // 从贴水数据中获取该合约的实时价格和结算信息
                const premium = premiumData.find((p) => p.code === h.symbol)
                const livePrice = premium?.price ?? h.price // 优先用实时价格
                const settleDate = premium?.settleDate || ''
                const daysToSettle = premium?.daysToSettle || 0

                // 合约价值 = 点数 × 数量(手) × 乘数
                // IC 合约乘数 = 200 元/点，IF/IH = 300，IM = 200
                const getMultiplier = (symbol) => {
                  if (!symbol) return 1
                  if (symbol.startsWith('IC') || symbol.startsWith('IM')) return 200
                  if (symbol.startsWith('IF') || symbol.startsWith('IH')) return 300
                  return 1
                }
                const multiplier = getMultiplier(h.symbol)
                // 合约面值 = 点数 × 乘数 / 手 × 手数
                const contractValue = (livePrice || 0) * (h.quantity || 0) * multiplier
                // 所需保证金 = 合约价值 × 保证金率（中证500 IC 为 12%）
                const marginRate = 0.14
                const requiredMargin = contractValue * marginRate
                const usedMargin = contractValue * marginRate
                // 账户实际存入资金（marketValueCNY）
                const depositMargin = holdingMarketValue(h)
                // 保证金使用率 = 所需保证金 / 已存资金 × 100，> 75% 预警
                const usageRate = depositMargin ? (requiredMargin / depositMargin) * 100 : 0

                return (
                  <tr key={idx} className="border-b border-gray-50 last:border-0">
                    <td className="py-2.5 px-2 text-gray-800 font-medium">{h.name}</td>
                    <td className="py-2.5 px-2 text-gray-500">{h.symbol}</td>
                    <td className="py-2.5 px-2 text-right text-gray-600">{formatNumber(usedMargin, 0)}</td>
                    <td className="py-2.5 px-2 text-right text-gray-600">{formatNumber(contractValue, 0)}</td>
                    <td className="py-2.5 px-2 text-right text-gray-600">{formatNumber(depositMargin, 0)}</td>
                    <td className={`py-2.5 px-2 text-right font-medium ${usageRate > 75 ? 'text-red-500' : 'text-green-600'}`}>
                      {usageRate.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-2 text-right text-gray-500">{settleDate || '—'}</td>
                    <td className="py-2.5 px-2 text-right text-gray-500">{daysToSettle > 0 ? `${daysToSettle}天` : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* 保证金信息 - 移动端卡片 */}
        <div className="sm:hidden space-y-2">
          {futures.map((h, idx) => {
            const premium = premiumData.find((p) => p.code === h.symbol)
            const livePrice = premium?.price ?? h.price
            const settleDate = premium?.settleDate || ''
            const daysToSettle = premium?.daysToSettle || 0
            const getMultiplier = (symbol) => {
              if (!symbol) return 1
              if (symbol.startsWith('IC') || symbol.startsWith('IM')) return 200
              if (symbol.startsWith('IF') || symbol.startsWith('IH')) return 300
              return 1
            }
            const multiplier = getMultiplier(h.symbol)
            const contractValue = (livePrice || 0) * (h.quantity || 0) * multiplier
            const requiredMargin = contractValue * 0.14
            const depositMargin = holdingMarketValue(h)
            const usageRate = depositMargin ? (requiredMargin / depositMargin) * 100 : 0
            return (
              <div key={idx} className="border border-gray-100 rounded-lg p-3 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-800">{h.name}</span>
                  <span className="text-gray-400">{h.symbol}</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <div><span className="text-gray-400">保证金：</span><span className="text-gray-700">{formatNumber(requiredMargin, 0)}</span></div>
                  <div><span className="text-gray-400">合约价值：</span><span className="text-gray-700">{formatNumber(contractValue, 0)}</span></div>
                  <div><span className="text-gray-400">账户资金：</span><span className="text-gray-700">{formatNumber(depositMargin, 0)}</span></div>
                  <div>
                    <span className="text-gray-400">使用率：</span>
                    <span className={`font-medium ${usageRate > 75 ? 'text-red-500' : 'text-green-600'}`}>{usageRate.toFixed(1)}%</span>
                  </div>
                  <div><span className="text-gray-400">结算日：</span><span className="text-gray-700">{settleDate || '—'}</span></div>
                  <div><span className="text-gray-400">距结算：</span><span className="text-gray-700">{daysToSettle > 0 ? `${daysToSettle}天` : '—'}</span></div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-2 text-xs text-gray-400">
          ℹ️ 所需保证金 = 合约价值 × 14%（平安期货标准）。使用率 = 所需保证金 ÷ 账户资金，超过 75% 表示保证金紧张。
        </div>
      </div>

      {/* 期限结构 */}
      <div className="card">
        <h3 className="text-base font-semibold text-gray-800 mb-3">合约期限结构</h3>
        {premiumLoading ? (
          <div className="text-sm text-gray-400 py-4 text-center">加载中...</div>
        ) : premiumData.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-100 whitespace-nowrap">
                  <th className="py-2 px-2 font-medium">代码</th>
                  <th className="py-2 px-2 font-medium text-right">当前价格</th>
                  <th className="py-2 px-2 font-medium text-right">贴水金额</th>
                  <th className="py-2 px-2 font-medium text-right">剩余天数</th>
                  <th className="py-2 px-2 font-medium text-right">年化利率</th>
                </tr>
              </thead>
              <tbody>
                {premiumData.map((p, idx) => {
                  const isSpot = p.type === '现货'
                  const discountAbs = p.discount !== null ? Math.abs(p.discount) : null
                  return (
                    <tr key={idx} className={`border-b border-gray-50 last:border-0 whitespace-nowrap ${isSpot ? 'bg-blue-100 border-blue-200' : ''}`}>
                      <td className="py-2.5 px-2 text-gray-800 font-semibold">
                        {isSpot ? <span className="inline-flex items-center gap-1.5 text-blue-700 font-bold">📍 {p.code}</span> : p.code}
                      </td>
                      <td className={`py-2.5 px-2 text-right font-medium ${isSpot ? 'text-blue-700 font-bold' : 'text-gray-800'}`}>
                        {p.price !== null ? formatNumber(p.price, 1) : '—'}
                      </td>
                      <td className={`py-2.5 px-2 text-right font-semibold ${
                        isSpot ? 'text-gray-300' : 'text-red-500'
                      }`}>
                        {isSpot ? '—' : Math.abs(p.discount).toFixed(1)}
                      </td>
                      <td className="py-2.5 px-2 text-right text-gray-500">
                        {isSpot ? '—' : `${p.daysToSettle}天`}
                      </td>
                      <td className={`py-2.5 px-2 text-right font-semibold ${
                        isSpot ? 'text-gray-300' : 'text-red-500'
                      }`}>
                        {isSpot ? '—' : `${Math.abs(p.annualRate).toFixed(2)}%`}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <div className="mt-2 text-xs text-gray-400">
              📍 现货为基准 | 📅 合约价格低于现货为贴水（红色），高于现货为升水（绿色）。年化利率 = (贴水ε ́ 合约价) × (365 ε̈ 剩余天数) × 100%。数据来源：中金所
            </div>
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