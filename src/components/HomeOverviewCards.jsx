import { useEffect, useMemo, useState } from 'react'
import { fetchTarget } from '../utils/dataStore.js'
import { formatChange, formatPercent } from '../utils/format.js'
import { getActiveHoldings, holdingMarketValue } from '../utils/asset.js'
import { getTargetAllocationStatus } from '../utils/targetAllocation.js'

export function StatMini({ label, change, changePct }) {
  const isUp = Number(change) > 0
  const isDown = Number(change) < 0
  const color = isUp ? 'text-red-500' : isDown ? 'text-green-600' : 'text-gray-500'
  const bg = isUp ? 'bg-red-50' : isDown ? 'bg-green-50' : 'bg-gray-50'
  return (
    <div className="card w-full flex flex-col justify-center items-center sm:items-start text-center sm:text-left p-2 sm:p-5 min-h-[85px] sm:min-h-[132px]">
      <div className="flex w-full items-center justify-between">
        <div className="text-xs sm:text-sm font-medium text-gray-500">{label}</div>
        <span className={`hidden sm:block h-2 w-2 rounded-full ${isUp ? 'bg-red-400' : isDown ? 'bg-green-500' : 'bg-slate-300'}`} />
      </div>
      <div className={`text-base sm:text-2xl font-bold mt-2 sm:mt-3 ${color}`}>{formatChange(change)}</div>
      <div className="mt-2 flex items-center gap-1.5">
        <span className={`inline-flex items-center gap-0.5 px-1.5 sm:px-2.5 py-1 rounded sm:rounded-lg text-xs sm:text-sm ${bg} ${color}`}>
          {isUp && <span>▲</span>} {isDown && <span>▼</span>} {formatPercent(Math.abs(changePct))}
        </span>
      </div>
    </div>
  )
}

export function CurrencyCard({ refreshKey = 0 }) {
  const holdings = useMemo(() => getActiveHoldings(), [refreshKey])
  const pieData = useMemo(() => {
    const cryptoAmount = holdings.filter((holding) => holding.assetType === '虚拟币')
      .reduce((sum, holding) => sum + holdingMarketValue(holding), 0)
    let cnyAmount = 0
    let usdAmount = 0
    let hkdAmount = 0
    for (const holding of holdings) {
      if (holding.assetType === '虚拟币') continue
      const value = holdingMarketValue(holding)
      if (holding.currency === 'CNY') cnyAmount += value
      else if (holding.currency === 'USD') usdAmount += value
      else if (holding.currency === 'HKD') hkdAmount += value
    }
    const items = [
      { name: '人民币', value: Math.round(cnyAmount), color: '#ef4444' },
      { name: '美元', value: Math.round(usdAmount), color: '#3b82f6' },
      { name: '港币', value: Math.round(hkdAmount), color: '#8b5cf6' },
      { name: '虚拟币', value: Math.round(cryptoAmount), color: '#f97316' },
    ].filter((item) => item.value > 0).sort((a, b) => b.value - a.value)
    const total = items.reduce((sum, item) => sum + item.value, 0)
    return items.map((item) => ({ ...item, ratio: total ? (item.value / total) * 100 : 0 }))
  }, [holdings])

  const halfRing = useMemo(() => {
    const halfCircumference = Math.PI * 50
    let offset = 0
    const segments = pieData.map((item) => {
      const segment = { color: item.color, len: (item.ratio / 100) * halfCircumference, offset }
      offset += segment.len
      return segment
    })
    return { segments, totalLen: offset || halfCircumference }
  }, [pieData])

  return (
    <div className="card w-full h-[200px] flex flex-col px-3 pt-2 pb-2 sm:p-5">
      <div className="text-base sm:text-sm font-semibold text-gray-800 dark:text-gray-200">货币比例</div>
      <div className="flex-1 flex flex-col justify-center items-center gap-2 min-h-0">
        <svg viewBox="0 0 128 64" className="w-32 h-16 shrink-0">
          <path d="M 14 60 A 50 50 0 0 1 114 60" fill="none" stroke="#e5e7eb" strokeWidth="14" />
          {halfRing.segments.map((segment, index) => (
            <path key={index} d="M 14 60 A 50 50 0 0 1 114 60" fill="none" stroke={segment.color} strokeWidth="14"
              strokeDasharray={`${segment.len} ${halfRing.totalLen - segment.len}`} strokeDashoffset={-segment.offset} />
          ))}
        </svg>
        <div className="w-full flex flex-col gap-0.5 shrink-0">
          {pieData.map((item) => (
            <div key={item.name} className="flex items-center justify-between px-8 text-[10px]">
              <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400 min-w-0">
                <span className="w-2 h-2 rounded-full inline-block shrink-0" style={{ backgroundColor: item.color }} />
                <span className="truncate">{item.name}</span>
              </span>
              <span className="text-gray-800 dark:text-gray-200 font-medium shrink-0">{Math.round(item.ratio)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function futuresMultiplier(symbol) {
  if (!symbol) return 1
  if (symbol.startsWith('IC') || symbol.startsWith('IM')) return 200
  if (symbol.startsWith('IF') || symbol.startsWith('IH')) return 300
  return 1
}

export function HealthCard({ refreshKey = 0, targetRefreshKey = 0 }) {
  const [targetData, setTargetData] = useState([])
  useEffect(() => {
    fetchTarget().then((data) => setTargetData(data.target || [])).catch(() => {})
  }, [targetRefreshKey])
  const holdings = useMemo(() => getActiveHoldings(), [refreshKey])

  const { overCategories, underCategories, futureUsageRate } = useMemo(() => {
    const over = []
    const under = []
    for (const row of targetData) {
      if (row.isTotal || row.targetRatio === null || row.diff === null) continue
      const { status } = getTargetAllocationStatus(row.currentRatio, row.targetRatio)
      if (status === 'over') over.push(row.category)
      if (status === 'under') under.push(row.category)
    }
    let maxUsage = 0
    for (const holding of holdings.filter((item) => item.assetType === '期货')) {
      const margin = holdingMarketValue(holding)
      const contractValue = (holding.price || 0) * (holding.quantity || 0) * futuresMultiplier(holding.symbol)
      const usageRate = margin ? (contractValue * 0.14 / margin) * 100 : 0
      if (usageRate > maxUsage) maxUsage = usageRate
    }
    return { overCategories: over, underCategories: under, futureUsageRate: maxUsage }
  }, [holdings, targetData])

  const usageColor = futureUsageRate > 75 ? '#ef4444' : futureUsageRate > 70 ? '#eab308' : '#10b981'
  const usageText = futureUsageRate > 75 ? '危险' : futureUsageRate > 70 ? '警戒' : '安全'
  return (
    <div className="card w-full h-[200px] flex flex-col px-3 pt-2 pb-2 sm:p-5">
      <div className="text-base sm:text-sm font-semibold text-gray-800 dark:text-gray-200">账户健康度</div>
      <div className="flex-1 flex flex-col justify-center gap-1.5 text-xs">
        <div className="text-gray-500">现金建议：</div>
        <div><span className="text-gray-500">减持：</span>{overCategories.length ? overCategories.map((category, index) => <span key={category} className="text-red-500 font-medium">{index > 0 ? '、' : ''}{category}</span>) : <span className="text-gray-400">无</span>}</div>
        <div><span className="text-gray-500">加仓：</span>{underCategories.length ? underCategories.map((category, index) => <span key={category} className="text-green-600 font-medium">{index > 0 ? '、' : ''}{category}</span>) : <span className="text-gray-400">无</span>}</div>
        <div className="border-t border-gray-100 my-1" />
        <div className="flex justify-between items-center"><span className="text-gray-500">期货保证金</span><span className="font-medium" style={{ color: usageColor }}>{futureUsageRate.toFixed(1)}%</span></div>
        <div className="flex justify-between items-center"><span className="text-gray-500">状态</span><span className="font-medium" style={{ color: usageColor }}>{usageText}</span></div>
        <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: Math.min(futureUsageRate, 100) + '%', backgroundColor: usageColor }} /></div>
      </div>
    </div>
  )
}
