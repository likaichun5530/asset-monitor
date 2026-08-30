import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { groupByCategory } from '../utils/asset.js'
import { assetColors } from '../data/holdings.js'
import { formatWan } from '../utils/format.js'

const colorMap = {
  股票: '#3b82f6',
  美股: assetColors.美股,
  A股: assetColors.A股,
  港股: assetColors.港股,
  日股: assetColors.日股,
  虚拟币: assetColors.虚拟币,
  黄金: assetColors.黄金,
  现金: assetColors.现金,
  债基: assetColors.债基,
  期货: assetColors.期货,
  其他: '#14b8a6',
}

// 类别 -> 路由
const categoryRoutes = {
  美股: '/us',
  A股: '/cn',
  港股: '/hk',
  日股: '/jp',
  虚拟币: '/crypto',
  黄金: '/gold',
  现金: '/cash',
  债基: '/bond',
  期货: '/future',
}

export default function AllocationChart({ refreshKey = 0 }) {
  const data = useMemo(() => groupByCategory(), [refreshKey])
  const total = data.reduce((s, d) => s + d.marketValue, 0)
  const maxValue = data.length ? Math.max(...data.map((d) => d.marketValue)) : 0
  const navigate = useNavigate()

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-800">资产配置</h3>
        <span className="text-xs text-gray-400">按类别</span>
      </div>
      <div className="space-y-1">
        {data.map((item) => {
          const color = colorMap[item.category] || '#94a3b8'
          const widthPct = maxValue ? (item.marketValue / maxValue) * 100 : 0
          const ratioPct = total ? (item.marketValue / total) * 100 : 0
          const route = categoryRoutes[item.category]
          return (
            <div
              key={item.category}
              onClick={() => { if (route) navigate(route) }}
              className={`flex items-center gap-0.5 ${route ? 'cursor-pointer hover:bg-gray-50 rounded px-1 -mx-1 py-0.5 transition-colors' : ''}`}
            >
              <div className="flex min-w-[72px] shrink-0 items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-sm" style={{ backgroundColor: color }} />
                <span className="text-sm font-medium text-gray-600">{item.category}</span>
              </div>
              {/* 柱子区域 */}
              <div className="flex-1 h-4 bg-gray-50 rounded overflow-hidden">
                <div
                  className="h-full rounded transition-all"
                  style={{ width: `${widthPct}%`, backgroundColor: color, minWidth: '2px' }}
                />
              </div>
              <div className="flex shrink-0 items-center gap-3">
                {/* 比例（柱子右边外面） */}
                <span className="w-10 whitespace-nowrap text-right text-[13px] font-medium text-gray-500">{ratioPct.toFixed(1)}%</span>
                {/* 金额 */}
                <span className="w-12 whitespace-nowrap text-right text-[13px] font-medium text-gray-800">
                  {formatWan(item.marketValue)}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
