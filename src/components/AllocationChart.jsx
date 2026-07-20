import { useMemo } from 'react'
import { groupByCategory } from '../utils/asset.js'
import { categoryColors, marketColors } from '../data/holdings.js'
import { formatCurrency, formatWan } from '../utils/format.js'

const colorMap = {
  ...categoryColors,
  美股: marketColors.US,
  A股: marketColors.CN,
  港股: marketColors.HK,
  日股: marketColors.JP,
}

export default function AllocationChart({ refreshKey = 0 }) {
  const data = useMemo(() => groupByCategory(), [refreshKey])
  const total = data.reduce((s, d) => s + d.marketValue, 0)
  const maxValue = data.length ? Math.max(...data.map((d) => d.marketValue)) : 0

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-800">资产配置</h3>
        <span className="text-xs text-gray-400">按类别</span>
      </div>
      <div className="space-y-2">
        {data.map((item) => {
          const color = colorMap[item.category] || '#94a3b8'
          const widthPct = maxValue ? (item.marketValue / maxValue) * 100 : 0
          const ratioPct = total ? (item.marketValue / total) * 100 : 0
          return (
            <div key={item.category} className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 w-16 shrink-0">
                <span className="inline-block w-2 h-2 rounded-sm" style={{ backgroundColor: color }} />
                <span className="text-xs text-gray-600">{item.category}</span>
              </div>
              {/* 柱子区域 */}
              <div className="flex-1 h-4 bg-gray-50 rounded overflow-hidden">
                <div
                  className="h-full rounded transition-all"
                  style={{ width: `${widthPct}%`, backgroundColor: color, minWidth: '2px' }}
                />
              </div>
              {/* 比例（柱子右边外面） */}
              <span className="w-12 text-right text-xs text-gray-500 shrink-0">{ratioPct.toFixed(1)}%</span>
              {/* 金额 */}
              <span className="w-24 text-right text-xs text-gray-800 font-medium shrink-0">
                {formatWan(item.marketValue)}
              </span>
            </div>
          )
        })}
      </div>
      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
        <span className="text-gray-500 font-medium">合计</span>
        <span className="text-gray-800 font-semibold">{formatCurrency(total)}</span>
      </div>
    </div>
  )
}