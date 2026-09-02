import { useMemo, useState, useEffect, useRef } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { getActiveHoldings, holdingMarketValue, totalMarketValue } from '../utils/asset.js'
import { formatCurrency, formatNumber } from '../utils/format.js'
import { fetchTarget, TARGET_UPDATED_EVENT } from '../utils/dataStore.js'
import { getTargetAllocationStatus } from '../utils/targetAllocation.js'

const pieColors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#6366f1', '#14b8a6']

export default function Cash({ refreshKey = 0, targetRefreshKey = 0 }) {
  const holdings = useMemo(() => getActiveHoldings(), [refreshKey])
  const total = useMemo(() => totalMarketValue(), [refreshKey])

  const cashHoldings = useMemo(() => {
    return holdings.filter((h) => h.assetType === '现金')
  }, [holdings])

  const sumCash = cashHoldings.reduce((s, r) => s + holdingMarketValue(r), 0)
  const accountCount = new Set(cashHoldings.map((holding) => holding.account).filter(Boolean)).size
  const currencyCount = new Set(cashHoldings.map((holding) => holding.currency).filter(Boolean)).size
  const largestCashAccount = cashHoldings.reduce((largest, holding) => {
    const marketValue = holdingMarketValue(holding)
    return !largest || marketValue > largest.marketValue ? { name: holding.account || holding.name, marketValue } : largest
  }, null)

  // 获取目标配置数据
  const [targetData, setTargetData] = useState([])
  const [targetLoading, setTargetLoading] = useState(false)
  const previousTargetRefreshKeyRef = useRef(targetRefreshKey)

  useEffect(() => {
    const handleTargetUpdated = (event) => setTargetData(event.detail || [])
    window.addEventListener(TARGET_UPDATED_EVENT, handleTargetUpdated)
    return () => window.removeEventListener(TARGET_UPDATED_EVENT, handleTargetUpdated)
  }, [])

  useEffect(() => {
    setTargetLoading(true)
    const forceRefresh = previousTargetRefreshKeyRef.current !== targetRefreshKey
    previousTargetRefreshKeyRef.current = targetRefreshKey
    fetchTarget({ forceRefresh })
      .then((data) => {
        setTargetData(data.target || [])
        setTargetLoading(false)
      })
      .catch(() => setTargetLoading(false))
  }, [refreshKey, targetRefreshKey])

  // 现金明细饼图数据 - 按账户聚合
  const cashPieData = useMemo(() => {
    const map = new Map()
    for (const h of cashHoldings) {
      const key = h.account || '未知'
      map.set(key, (map.get(key) || 0) + holdingMarketValue(h))
    }
    return Array.from(map.entries())
      .map(([name, value], idx) => ({
        name,
        value: Math.round(value * 100) / 100,
        color: pieColors[idx % pieColors.length],
      }))
      .sort((a, b) => b.value - a.value)
  }, [cashHoldings])

  // 低配资产分析：显示当前低于目标配置的资产及需要买入的金额
  const { underWeight, totalDeficit } = useMemo(() => {
    if (!targetData.length) return { underWeight: [], totalDeficit: 0 }

    const under = targetData
      .filter((r) => !r.isTotal
        && r.category !== '现金'
        && getTargetAllocationStatus(r.currentRatio, r.targetRatio).status === 'under')
      .sort((a, b) => a.diff - b.diff)

    const totalDeficit = under.reduce((sum, r) => sum + total * Math.abs(r.diff), 0)

    const items = under.map((r) => {
      const deficitAmount = total * Math.abs(r.diff)
      const ratio = totalDeficit > 0 ? deficitAmount / totalDeficit : 0
      return {
        ...r,
        deficitAmount,
        deficitRatio: ratio,
        suggestToTarget: deficitAmount, // 要达到目标仓位需要的金额
      }
    })

    return { underWeight: items, totalDeficit }
  }, [targetData, total])

  return (
    <div className="space-y-2">
      {/* 概要 */}
      <div className="desktop-summary-strip card grid grid-cols-2 items-stretch overflow-hidden px-4 py-3 sm:grid-cols-4 sm:p-0">
        <div className="sm:p-6">
          <div className="text-xs text-gray-500">现金总市值</div>
          <div className="text-2xl font-bold text-gray-900 mt-0.5 sm:mt-3">{formatCurrency(sumCash)}</div>
        </div>
        <div className="text-right sm:text-left sm:p-6 sm:border-l sm:border-slate-100 dark:sm:border-gray-700">
          <div className="text-xs text-gray-500">占总资产</div>
          <div className="text-lg sm:text-2xl font-semibold mt-0.5 sm:mt-3" style={{ color: '#6b7280', fontWeight: 700 }}>
            {total ? ((sumCash / total) * 100).toFixed(1) : 0}%
          </div>
        </div>
        <div className="hidden sm:block p-6 border-l border-slate-100 dark:border-gray-700">
          <div className="text-xs text-gray-500">账户与币种</div>
          <div className="mt-3 text-2xl font-semibold text-gray-900">{accountCount} <span className="text-sm font-normal text-gray-400">个账户</span></div>
          <div className="mt-1 text-xs text-gray-400">覆盖 {currencyCount} 种币种</div>
        </div>
        <div className="hidden sm:block p-6 border-l border-slate-100 dark:border-gray-700">
          <div className="text-xs text-gray-500">最大现金账户</div>
          <div className="mt-3 truncate text-2xl font-semibold text-gray-900">{largestCashAccount?.name || '—'}</div>
          <div className="mt-1 text-xs text-gray-400">{largestCashAccount ? formatCurrency(largestCashAccount.marketValue) : '暂无现金'}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 lg:grid-cols-2 items-stretch">
        {/* 现金明细饼图 */}
        {cashHoldings.length > 0 && (
          <div className="card">
            <div className="mb-3 sm:mb-5">
              <h3 className="desktop-section-title">现金账户分布</h3>
              <p className="hidden sm:block desktop-section-subtitle">按账户汇总人民币市值</p>
            </div>
            <div className="flex items-center gap-6 sm:gap-10">
              <div className="w-40 h-40 sm:w-52 sm:h-52 flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={cashPieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={75}
                    >
                      {cashPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => formatCurrency(value)}
                      contentStyle={{
                        borderRadius: 12,
                        border: '1px solid #64748b',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        fontSize: 12,
                        backgroundColor: '#1e293b',
                        color: '#f1f5f9',
                      }}
                      itemStyle={{ color: '#f1f5f9' }}
                      labelStyle={{ color: '#cbd5e1' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 min-w-0 space-y-1.5 sm:space-y-3">
                {cashPieData.map((d, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-gray-600 flex items-center gap-1">
                      <span className="inline-block w-2 h-2 rounded-sm" style={{ backgroundColor: d.color }} />
                      {d.name}
                    </span>
                    <span className="text-gray-800 font-medium">{formatCurrency(d.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 配置建议 */}
        <div className={`card ${cashHoldings.length === 0 ? 'lg:col-span-2' : ''}`}>
        <div className="mb-3 sm:mb-5">
          <h3 className="desktop-section-title">配置建议</h3>
          <p className="hidden sm:block desktop-section-subtitle">根据目标缺口估算现金加仓方向</p>
        </div>
        {targetLoading ? (
          <div className="text-sm text-gray-400 py-4 text-center">加载配置数据...</div>
        ) : underWeight.length === 0 ? (
          <div className="text-sm text-gray-400 py-4 text-center">
            {targetData.length > 0 ? '✅ 所有资产已达到或超过目标配置' : '未配置目标比例或无法获取数据'}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-gray-100 whitespace-nowrap">
                    <th className="py-2 px-2 font-medium">类别</th>
                    <th className="py-2 px-2 font-medium text-right">当前</th>
                    <th className="py-2 px-2 font-medium text-right">目标</th>
                    <th className="py-2 px-2 font-medium text-right">缺口</th>
                  </tr>
                </thead>
                <tbody>
                  {underWeight.map((r, idx) => (
                    <tr key={idx} className="border-b border-gray-50 last:border-0 whitespace-nowrap">
                      <td className="py-2.5 px-2 text-gray-800 font-medium">{r.category}</td>
                      <td className="py-2.5 px-2 text-right text-gray-600">{(r.currentRatio * 100).toFixed(1)}%</td>
                      <td className="py-2.5 px-2 text-right text-gray-600">{(r.targetRatio * 100).toFixed(1)}%</td>
                      <td className="py-2.5 px-2 text-right text-red-500 font-medium">
                        {formatNumber(r.deficitAmount, 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-2 text-xs text-gray-400">
              💡 低于目标配置的资产，按缺口分配现金加仓。
            </div>
          </>
        )}
        </div>
      </div>
    </div>
  )
}
