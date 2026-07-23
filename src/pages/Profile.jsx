import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { getActiveHoldings, holdingMarketValue, totalMarketValue, lastUpdateDate } from '../utils/asset.js'
import { assetColors } from '../data/holdings.js'
import { formatCurrency, formatWan, formatDateLong } from '../utils/format.js'

const ASSETS = [
  { key: 'us', label: '美股', color: assetColors.美股, filter: (h) => h.assetType === '股票' && h.market === 'US' },
  { key: 'cn', label: 'A股', color: assetColors.A股, filter: (h) => h.assetType === '股票' && h.market === 'CN' },
  { key: 'hk', label: '港股', color: assetColors.港股, filter: (h) => h.assetType === '股票' && h.market === 'HK' },
  { key: 'jp', label: '日股', color: assetColors.日股, filter: (h) => h.assetType === '股票' && h.market === 'JP' },
  { key: 'bond', label: '债基', color: assetColors.债基, filter: (h) => h.assetType === '债券' },
  { key: 'crypto', label: '数字货币', color: assetColors.数字货币, filter: (h) => h.assetType === '数字货币' },
  { key: 'future', label: '期货', color: assetColors.期货, filter: (h) => h.assetType === '期货' },
  { key: 'gold', label: '黄金', color: assetColors.黄金, filter: (h) => h.assetType === '黄金' },
  { key: 'cash', label: '现金', color: assetColors.现金, filter: (h) => h.assetType === '现金' },
]

export default function Profile({ refreshKey = 0 }) {
  const holdings = useMemo(() => getActiveHoldings(), [refreshKey])
  const total = useMemo(() => totalMarketValue(), [refreshKey])
  const navigate = useNavigate()

  const items = useMemo(() => {
    return ASSETS.map((asset) => {
      const filtered = holdings.filter(asset.filter)
      const sum = filtered.reduce((s, h) => s + holdingMarketValue(h), 0)
      return {
        ...asset,
        count: filtered.length,
        marketValue: sum,
        ratio: total ? sum / total : 0,
      }
    }).filter((item) => item.count > 0)
  }, [holdings, total])

  const updateDate = useMemo(() => lastUpdateDate(), [refreshKey])

  return (
    <div className="space-y-3">
      {/* 移动端总资产卡片 */}
      <div className="card py-5 px-6 sm:hidden">
        <div className="text-xs text-gray-500">总资产（人民币）</div>
        <div className="text-3xl font-bold mt-1 text-gray-900">
          {formatCurrency(total)}
        </div>
        <div className="mt-1 text-xs text-gray-400">
          更新于 {updateDate ? formatDateLong(updateDate) : '--'}
        </div>
      </div>
      {items.map((item) => (
        <button
          key={item.key}
          onClick={() => navigate(`/${item.key}`)}
          className="card w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:shadow-md transition-shadow dark:bg-gray-800 dark:border-gray-700"
        >
          <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: item.color }} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{item.label}</span>
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{formatWan(item.marketValue)}</span>
            </div>
            <div className="flex items-center justify-between mt-0.5">
              <span className="text-xs text-gray-400 dark:text-gray-500">{item.count} 项</span>
              <span className="text-xs text-gray-400 dark:text-gray-500">{(item.ratio * 100).toFixed(1)}%</span>
            </div>
          </div>
          <svg className="w-3.5 h-3.5 text-gray-300 dark:text-gray-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      ))}
    </div>
  )
}