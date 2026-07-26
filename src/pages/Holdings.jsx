import { useMemo, useState } from 'react'
import { categoryColors, marketLabels, marketColors, assetColors } from '../data/holdings.js'
import { holdingMarketValue, totalMarketValue, getActiveHoldings } from '../utils/asset.js'
import { formatCurrency, formatNumber } from '../utils/format.js'

// 筛选标签（股票按市场拆分）
const FILTERS = ['全部', '美股', 'A股', '港股', '日股', '数字货币', '黄金', '现金', '债券', '期货']

const colorMap = {
  美股: assetColors.美股,
  A股: assetColors.A股,
  港股: assetColors.港股,
  日股: assetColors.日股,
  数字货币: assetColors.数字货币,
  黄金: assetColors.黄金,
  债券: assetColors.债基,
  期货: assetColors.期货,
  现金: assetColors.现金,
}

function getCategory(h) {
  if (h.assetType === '股票') {
    if (h.market === 'US') return '美股'
    if (h.market === 'CN') return 'A股'
    if (h.market === 'HK') return '港股'
    if (h.market === 'JP') return '日股'
    return '股票'
  }
  return h.assetType
}

function getColor(h) {
  const cat = getCategory(h)
  return colorMap[cat] || '#94a3b8'
}

export default function Holdings({ loading, refreshKey }) {
  const [activeCategory, setActiveCategory] = useState('全部')
  const [sortBy, setSortBy] = useState('marketValueCNY')
  const [sortDir, setSortDir] = useState('desc')

  const total = useMemo(() => totalMarketValue(), [refreshKey])
  const holdings = useMemo(() => getActiveHoldings(), [refreshKey])

  const rows = useMemo(() => {
    let list = holdings.map((h) => ({
      ...h,
      marketValueCNY: holdingMarketValue(h),
      ratio: total ? (holdingMarketValue(h) / total) * 100 : 0,
    }))
    if (activeCategory !== '全部') {
      list = list.filter((h) => getCategory(h) === activeCategory)
    }
    list.sort((a, b) => {
      let av = a[sortBy]
      let bv = b[sortBy]
      if (av === null || av === undefined) av = 0
      if (bv === null || bv === undefined) bv = 0
      if (typeof av === 'string') {
        return sortDir === 'asc' ? String(av).localeCompare(String(bv), 'zh') : String(bv).localeCompare(String(av), 'zh')
      }
      return sortDir === 'asc' ? av - bv : bv - av
    })
    return list
  }, [holdings, activeCategory, sortBy, sortDir, total])

  function toggleSort(field) {
    if (sortBy === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortDir('desc')
    }
  }

  const sumMarketValue = rows.reduce((s, r) => s + r.marketValueCNY, 0)

  return (
    <div className="space-y-[4px]">
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-800">明细</h2>
          <span className="text-sm text-gray-500">共 {rows.length} 项</span>
        </div>

        {/* 类别筛选 */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
          {FILTERS.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                activeCategory === cat
                  ? 'bg-brand-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 表格（移动端可左右滚动，名称列冻结） */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto max-w-full">
          <table className="w-full text-sm">
            <colgroup>
              <col className="w-[120px] min-w-[120px]" />
              <col />
              <col />
              <col />
              <col />
              <col />
              <col />
              <col />
              <col />
              <col />
              <col />
            </colgroup>
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-100 whitespace-nowrap">
                <Th label="名称" field="name" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} sticky />
                <Th label="代码" field="symbol" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
                <Th label="类别" field="assetType" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
                <Th label="市场" field="market" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
                <Th label="账户" field="account" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
                <Th label="币种" field="currency" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
                <Th label="数量" field="quantity" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} align="right" />
                <Th label="单价" field="price" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} align="right" />
                <Th label="原币市值" field="marketValue" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} align="right" />
                <Th label="人民币市值" field="marketValueCNY" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} align="right" />
                <Th label="占比" field="ratio" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} align="right" />
              </tr>
            </thead>
            <tbody>
              {rows.map((h, idx) => {
                const color = getColor(h)
                return (
                  <tr key={`${h.symbol}-${idx}`} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 whitespace-nowrap">
                    <td className="py-2 px-1.5 text-gray-600 sticky left-0 bg-white dark:bg-gray-800 z-10">{h.name}</td>
                    <td className="py-2 px-1.5 text-gray-600">{h.symbol === '-' ? '—' : h.symbol}</td>
                    <td className="py-2 px-1.5">
                      <span className="inline-flex items-center gap-1">
                        <span className="inline-block w-1.5 h-1.5 rounded-sm shrink-0" style={{ backgroundColor: color }} />
                        <span className="text-gray-600">{getCategory(h)}</span>
                      </span>
                    </td>
                    <td className="py-2 px-1.5 text-gray-600">{marketLabels[h.market] || h.market}</td>
                    <td className="py-2 px-1.5 text-gray-600">{h.account}</td>
                    <td className="py-2 px-1.5 text-gray-600">{h.currency}</td>
                    <td className="py-2 px-1.5 text-right text-gray-600">
                      {h.quantity === null || h.quantity === undefined ? '—' : formatNumber(h.quantity, h.quantity < 1 ? 6 : 2)}
                    </td>
                    <td className="py-2 px-1.5 text-right text-gray-600">
                      {h.price === null || h.price === undefined ? '—' : formatNumber(h.price, h.price < 1 ? 6 : 2)}
                    </td>
                    <td className="py-2 px-1.5 text-right text-gray-600">
                      {h.marketValue === null || h.marketValue === undefined ? '—' : formatNumber(h.marketValue, 2)}
                    </td>
                    <td className="py-2 px-1.5 text-right text-gray-600">{formatCurrency(h.marketValueCNY)}</td>
                    <td className="py-2 px-1.5 text-right text-gray-600">{h.ratio.toFixed(2)}%</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="font-semibold border-t-2 border-gray-100 whitespace-nowrap">
                <td className="py-2 px-1.5 text-gray-600 sticky left-0 bg-white dark:bg-gray-800 z-10" colSpan={1}>合计</td>
                <td className="py-2 px-1.5 text-gray-600" colSpan={8}>—</td>
                <td className="py-2 px-1.5 text-right text-gray-600">{formatCurrency(sumMarketValue)}</td>
                <td className="py-2 px-1.5 text-right text-gray-600">100%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

    </div>
  )
}

function Th({ label, field, sortBy, sortDir, onSort, align = 'left', sticky }) {
  const active = sortBy === field
  return (
    <th className={`py-2 px-1.5 font-medium whitespace-nowrap ${align === 'right' ? 'text-right' : 'text-left'} ${sticky ? 'sticky left-0 z-20 bg-white dark:bg-gray-800' : ''}`}>
      <button
        onClick={() => onSort(field)}
        className={`inline-flex items-center gap-1 ${active ? 'text-brand-600' : 'text-gray-400 hover:text-gray-600'}`}
      >
        {label}
        {active && <span className="text-sm">{sortDir === 'asc' ? '↑' : '↓'}</span>}
      </button>
    </th>
  )
}