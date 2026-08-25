import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getActiveHoldings, holdingMarketValue, totalMarketValue } from '../utils/asset.js'
import { categoryColors, marketColors, marketLabels } from '../data/holdings.js'
import { formatCurrency, formatWan } from '../utils/format.js'

const colorMap = {
  ...categoryColors,
  美股: marketColors.US,
  A股: marketColors.CN,
  港股: marketColors.HK,
  日股: marketColors.JP,
}

// 筛选标签（股票按市场拆分）
const FILTERS = ['全部', '美股', 'A股', '港股', '日股', '虚拟币', '黄金', '现金', '债基', '期货']

export default function HoldingsOverview({ refreshKey = 0 }) {
  const navigate = useNavigate()
  const [activeFilter, setActiveFilter] = useState('全部')

  const holdings = useMemo(() => getActiveHoldings(), [refreshKey])
  const total = useMemo(() => totalMarketValue(), [refreshKey])

  // 筛选 + 排序 + 取前5
  const top5 = useMemo(() => {
    let list = holdings.map((h) => ({
      ...h,
      marketValueCNY: holdingMarketValue(h),
      ratio: total ? (holdingMarketValue(h) / total) * 100 : 0,
    }))
    if (activeFilter !== '全部') {
      list = list.filter((h) => getCategory(h) === activeFilter)
    }
    list.sort((a, b) => b.marketValueCNY - a.marketValueCNY)
    return list.slice(0, 5)
  }, [holdings, total, activeFilter])

  function getCategory(h) {
    if (h.assetType === '股票') return stockLabel(h.market)
    return h.assetType
  }

  function getColor(h) {
    const cat = getCategory(h)
    return colorMap[cat] || '#94a3b8'
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-gray-800">持仓概况</h3>
        <span className="text-xs text-gray-400">前 5 大市值</span>
      </div>

      {/* 类别筛选 */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1 mb-3">
        {FILTERS.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveFilter(cat)}
            className={`px-2.5 py-1 rounded-full text-xs whitespace-nowrap transition-colors ${
              activeFilter === cat
                ? 'bg-brand-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* 桌面端表格 */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 border-b border-gray-100">
              <th className="py-2 px-2 font-medium">#</th>
              <th className="py-2 px-2 font-medium">名称</th>
              <th className="py-2 px-2 font-medium">类别</th>
              <th className="py-2 px-2 font-medium">市场</th>
              <th className="py-2 px-2 font-medium text-right">人民币市值</th>
              <th className="py-2 px-2 font-medium text-right">占比</th>
            </tr>
          </thead>
          <tbody>
            {top5.map((h, idx) => {
              const color = getColor(h)
              return (
                <tr key={idx} className="border-b border-gray-50 last:border-0">
                  <td className="py-2.5 px-2 text-gray-400 text-xs">{idx + 1}</td>
                  <td className="py-2.5 px-2 text-gray-800 font-medium">{h.name}</td>
                  <td className="py-2.5 px-2">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="inline-block w-2 h-2 rounded-sm" style={{ backgroundColor: color }} />
                      <span className="text-gray-600 text-xs">{getCategory(h)}</span>
                    </span>
                  </td>
                  <td className="py-2.5 px-2 text-gray-500 text-xs">{marketLabels[h.market] || h.market}</td>
                  <td className="py-2.5 px-2 text-right text-gray-800 font-medium">{formatCurrency(h.marketValueCNY)}</td>
                  <td className="py-2.5 px-2 text-right text-gray-500 text-xs">{h.ratio.toFixed(2)}%</td>
                </tr>
              )
            })}
            {top5.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-gray-400 text-xs">该类别暂无持仓</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 移动端卡片列表 */}
      <div className="sm:hidden space-y-[4px]">
        {top5.map((h, idx) => {
          const color = getColor(h)
          return (
            <div key={idx} className="flex items-center gap-2 py-1.5 border-b border-gray-50 last:border-0">
              <span className="text-gray-400 text-xs w-4">{idx + 1}</span>
              <span className="inline-block w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: color }} />
              <span className="text-gray-800 text-sm flex-1 truncate">{h.name}</span>
              <span className="text-gray-500 text-xs">{getCategory(h)}</span>
              <span className="text-gray-800 font-medium text-sm">{formatWan(h.marketValueCNY)}</span>
            </div>
          )
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-gray-100 flex justify-center">
        <button
          onClick={() => navigate('/holdings')}
          className="inline-flex items-center gap-1 px-4 py-1.5 rounded-lg bg-gray-50 hover:bg-brand-50 text-gray-600 hover:text-brand-600 text-xs font-medium transition-colors"
        >
          更多信息
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>
    </div>
  )
}

function stockLabel(market) {
  if (market === 'US') return '美股'
  if (market === 'CN') return 'A股'
  if (market === 'HK') return '港股'
  if (market === 'JP') return '日股'
  return '股票'
}
