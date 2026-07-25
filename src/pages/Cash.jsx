import { useMemo, useState, useEffect } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { getActiveHoldings, holdingMarketValue, totalMarketValue } from '../utils/asset.js'
import { formatCurrency, formatNumber } from '../utils/format.js'
import { fetchTarget } from '../utils/dataStore.js'

const pieColors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#6366f1', '#14b8a6']

export default function Cash({ refreshKey = 0 }) {
  const holdings = useMemo(() => getActiveHoldings(), [refreshKey])
  const total = useMemo(() => totalMarketValue(), [refreshKey])

  const cashHoldings = useMemo(() => {
    return holdings.filter((h) => h.assetType === '现金')
  }, [holdings])

  const sumCash = cashHoldings.reduce((s, r) => s + holdingMarketValue(r), 0)

  // 获取目标配置数据（后端代理优先，无后端时浏览器端直连 Google Sheets）
  const [targetData, setTargetData] = useState([])
  const [targetLoading, setTargetLoading] = useState(false)

  useEffect(() => {
    setTargetLoading(true)
    fetchTarget()
      .then((data) => {
        setTargetData(data.target || [])
        setTargetLoading(false)
      })
      .catch(() => setTargetLoading(false))
  }, [refreshKey])

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

  // 低配资产分析
  const { underWeight, allocations, totalShortfall } = useMemo(() => {
    if (!targetData.length) return { underWeight: [], allocations: [], totalShortfall: 0 }

    const under = targetData
      .filter((r) => !r.isTotal && r.targetRatio !== null && r.diff !== null && r.diff < -0.01 && r.category !== '现金')
      .sort((a, b) => a.diff - b.diff)

    const totalDeficit = under.reduce((sum, r) => {
      const deficitAmount = total * Math.abs(r.diff)
      return sum + deficitAmount
    }, 0)

    const allocs = under.map((r) => {
      const deficitAmount = total * Math.abs(r.diff)
      const ratio = totalDeficit > 0 ? deficitAmount / totalDeficit : 0
      const suggestAllocate = sumCash * ratio
      return {
        ...r,
        deficitAmount,
        deficitRatio: ratio,
        suggestAllocate,
      }
    })

    return { underWeight: under, allocations: allocs, totalShortfall: totalDeficit }
  }, [targetData, total, sumCash])

  // 分配后剩余现金
  const allocatedTotal = allocations.reduce((s, r) => s + Math.round(r.suggestAllocate / 100) * 100, 0)
  const remaining = sumCash - allocatedTotal

  return (
    <div className="space-y-[3px]">
      {/* 概要 */}
      <div className="card py-3 px-4 flex items-center justify-between">
        <div>
          <div className="text-xs text-gray-500">现金总市值</div>
          <div className="text-2xl font-bold text-gray-900 mt-0.5">{formatCurrency(sumCash)}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500">占总资产</div>
          <div className="text-lg font-semibold mt-0.5" style={{ color: '#6b7280', fontWeight: 700 }}>
            {total ? ((sumCash / total) * 100).toFixed(1) : 0}%
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 现金明细饼图 */}
        {cashHoldings.length > 0 && (
          <div className="card">
            <h3 className="text-base font-semibold text-gray-800 mb-3">现金明细</h3>
            <div className="flex items-center gap-6 sm:gap-[130px]">
              <div className="w-40 h-40 sm:w-48 sm:h-48 flex-shrink-0">
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
              <div className="flex-1 space-y-1.5">
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
        <div className="card">
        <h3 className="text-base font-semibold text-gray-800 mb-3">配置建议</h3>
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
                    <th className="py-2 px-2 font-medium text-right">占比</th>
                    <th className="py-2 px-2 font-medium text-right">目标</th>
                    <th className="py-2 px-2 font-medium text-right">建议</th>
                    <th className="py-2 px-2 font-medium text-right">缺口</th>
                  </tr>
                </thead>
                <tbody>
                  {allocations.map((r, idx) => (
                    <tr key={idx} className="border-b border-gray-50 last:border-0 whitespace-nowrap">
                      <td className="py-2.5 px-2 text-gray-800 font-medium">{r.category}</td>
                      <td className="py-2.5 px-2 text-right text-gray-600">{(r.currentRatio * 100).toFixed(1)}%</td>
                      <td className="py-2.5 px-2 text-right text-gray-600">{(r.targetRatio * 100).toFixed(1)}%</td>
                      <td className="py-2.5 px-2 text-right text-green-600 font-medium">
                        {r.suggestAllocate > 0 ? formatCurrency(Math.round(r.suggestAllocate / 100) * 100) : '—'}
                      </td>
                      <td className="py-2.5 px-2 text-right text-red-500 font-medium">
                        {formatNumber(r.deficitAmount, 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-2 text-xs text-gray-400">
              💡 按各资产低配缺口比例分配现金。建议配置金额取整到百元。
            </div>
          </>
        )}
        </div>
      </div>
    </div>
  )
}