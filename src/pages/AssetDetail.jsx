import { useMemo, useState, useEffect } from 'react'
import { getActiveHoldings, holdingMarketValue, totalMarketValue, getCategoryHistory } from '../utils/asset.js'
import { formatCurrency, formatNumber, formatDateShort, formatDateMid } from '../utils/format.js'
import { assetColors } from '../data/holdings.js'
import { useNavigate } from 'react-router-dom'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts'

const ASSET_CONFIG = {
  us: { label: '美股', filter: (h) => h.assetType === '股票' && h.market === 'US', color: assetColors.美股, showOriginal: true },
  cn: { label: 'A股', filter: (h) => h.assetType === '股票' && h.market === 'CN', color: assetColors.A股, showOriginal: false },
  hk: { label: '港股', filter: (h) => h.assetType === '股票' && h.market === 'HK', color: assetColors.港股, showOriginal: true },
  jp: { label: '日股', filter: (h) => h.assetType === '股票' && h.market === 'JP', color: assetColors.日股, showOriginal: false },
  crypto: { label: '数字货币', filter: (h) => h.assetType === '数字货币', color: assetColors.数字货币, showOriginal: true },
  bond: { label: '债基', filter: (h) => h.assetType === '债券', color: assetColors.债基, showOriginal: false },
  future: { label: '期货', filter: (h) => h.assetType === '期货', color: assetColors.期货, showOriginal: false },
  gold: { label: '黄金', filter: (h) => h.assetType === '黄金', color: assetColors.黄金, showOriginal: false },
  cash: { label: '现金', filter: (h) => h.assetType === '现金', color: assetColors.现金, showOriginal: false },
}

export default function AssetDetail({ refreshKey = 0, assetType }) {
  const assetKey = assetType || window.location.hash.slice(2).split('?')[0]
  const config = ASSET_CONFIG[assetKey]

  const holdings = useMemo(() => getActiveHoldings(), [refreshKey])
  const total = useMemo(() => totalMarketValue(), [refreshKey])

  const rows = useMemo(() => {
    if (!config) return []
    return holdings.filter(config.filter).map((h) => ({
      ...h,
      marketValueCNY: holdingMarketValue(h),
    })).sort((a, b) => b.marketValueCNY - a.marketValueCNY)
  }, [holdings, config])

  const storageKey = `assetDetail_displayMode_${assetKey}`
  const [displayMode, setDisplayMode] = useState(() => {
    try { return localStorage.getItem(storageKey) || 'cny' }
    catch { return 'cny' }
  })

  useEffect(() => {
    try { localStorage.setItem(storageKey, displayMode) }
    catch { /* ignore */ }
  }, [displayMode, storageKey])

  const navigate = useNavigate()

  if (!config) return <div className="text-gray-400 dark:text-gray-500 text-center py-10">未知资产类型</div>

  const sumMarketValue = rows.reduce((s, r) => s + r.marketValueCNY, 0)
  const showToggle = config.showOriginal
  const showOriginalMode = showToggle && displayMode === 'original'

  const originalSummary = useMemo(() => {
    if (!showToggle) return []
    const map = new Map()
    for (const h of rows) {
      const c = h.currency || 'CNY'
      if (!map.has(c)) map.set(c, 0)
      map.set(c, map.get(c) + (Number(h.marketValue) || 0))
    }
    return Array.from(map.entries()).map(([cur, val]) => ({ currency: cur, value: val }))
  }, [rows, showToggle])

  // 各类资产趋势图
  const categoryHistory = useMemo(() => getCategoryHistory(assetKey), [refreshKey, assetKey])
  const [catRange, setCatRange] = useState('all')
  const CAT_RANGES = [
    { key: '1m', label: '近1月', days: 30 },
    { key: '3m', label: '近3月', days: 90 },
    { key: 'all', label: '全部', days: Infinity },
  ]

  const filteredHistory = useMemo(() => {
    if (!categoryHistory.length) return []
    const rangeCfg = CAT_RANGES.find((r) => r.key === catRange) || CAT_RANGES[2]
    if (rangeCfg.days === Infinity) return categoryHistory
    const lastDate = categoryHistory[categoryHistory.length - 1].date
    const lastMs = new Date(lastDate).getTime()
    const targetMs = lastMs - rangeCfg.days * 24 * 60 * 60 * 1000
    return categoryHistory.filter((d) => new Date(d.date).getTime() >= targetMs)
  }, [categoryHistory, catRange])

  const chartData = useMemo(() => {
    return filteredHistory.map((d) => ({
      ...d,
      timestamp: new Date(d.date).getTime(),
    }))
  }, [filteredHistory])

  const yTicks = useMemo(() => {
    if (!chartData.length) return []
    const values = chartData.map((d) => d.total)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const step = 10000
    const tickMin = Math.floor(min / step) * step
    const tickMax = Math.ceil(max / step) * step
    const ticks = []
    for (let v = tickMin; v <= tickMax; v += step) {
      ticks.push(v)
    }
    return ticks
  }, [chartData])

  function toWanNum(v) {
    return (Number(v) / 10000).toFixed(0)
  }

  const xTicks = useMemo(() => {
    if (!chartData.length) return []
    const startMs = chartData[0].timestamp
    const endMs = chartData[chartData.length - 1].timestamp
    const spanMs = endMs - startMs
    const ticks = []
    const msPerDay = 24 * 60 * 60 * 1000
    let interval
    if (spanMs < 60 * msPerDay) {
      interval = 7 * msPerDay
    } else if (spanMs < 365 * msPerDay) {
      interval = 30 * msPerDay
    } else {
      interval = 90 * msPerDay
    }
    let tick = Math.ceil(startMs / interval) * interval
    while (tick <= endMs) {
      ticks.push(tick)
      tick += interval
    }
    return ticks
  }, [chartData])

  return (
    <div className="space-y-[4px]">
      {/* 移动端返回按钮 */}
      <button
        onClick={() => navigate('/my')}
        className="sm:hidden flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        返回
      </button>
      <div className="card dark:bg-gray-800 dark:border-gray-700 py-3 px-4 flex items-center justify-between">
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{config.label}总市值</div>
          <div className="text-3xl font-bold text-gray-900 dark:text-gray-200 mt-0.5">
            {showOriginalMode
              ? formatNumber(originalSummary.reduce((sum, s) => sum + s.value, 0), 2)
              : formatCurrency(sumMarketValue)
            }
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500 dark:text-gray-400">占总资产</div>
          <div className="text-lg font-semibold mt-0.5" style={{ color: config.color, fontWeight: 700 }}>
            {total ? ((sumMarketValue / total) * 100).toFixed(1) : 0}%
          </div>
        </div>
      </div>

      {/* 各类资产趋势卡片 */}
      {categoryHistory.length >= 1 && (
        <div className="card dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2 px-3 sm:px-0">
            <div>
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">趋势</h3>
              <p className="text-xs text-gray-400 dark:text-gray-500">单位：万元</p>
            </div>
            <div className="flex items-center gap-[1px] bg-gray-100 dark:bg-gray-700 rounded-lg">
              {CAT_RANGES.map((r) => (
                <button
                  key={r.key}
                  onClick={() => setCatRange(r.key)}
                  className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                    catRange === r.key
                      ? 'bg-white dark:bg-gray-600 text-brand-600 dark:text-brand-400 shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          <div className="w-full h-[140px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 16, right: 12, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="catTrendFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={config.color} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={config.color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="timestamp"
                  type="number"
                  scale="time"
                  domain={['dataMin', 'dataMax']}
                  ticks={xTicks.length ? xTicks : undefined}
                  tickFormatter={(ts) => formatDateShort(new Date(ts).toISOString().slice(0, 10))}
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                />
                <YAxis
                  ticks={yTicks}
                  domain={[yTicks[0], yTicks[yTicks.length - 1]]}
                  tickFormatter={toWanNum}
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  tickLine={false}
                  axisLine={false}
                  width={40}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    fontSize: 12,
                  }}
                  labelFormatter={(label) => `日期 ${formatDateMid(new Date(label).toISOString().slice(0, 10))}`}
                  formatter={(value) => [formatCurrency(value), config.label]}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke={config.color}
                  strokeWidth={2}
                  fill="url(#catTrendFill)"
                  dot={false}
                  activeDot={{ r: 4, stroke: '#fff', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="card dark:bg-gray-800 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200">持仓列表</h3>
          <div className="flex items-center gap-2">
            {showToggle && (
              <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5 text-xs">
                <button
                  onClick={() => setDisplayMode('cny')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${displayMode === 'cny' ? 'bg-white dark:bg-gray-600 text-gray-800 dark:text-gray-200 shadow-sm font-medium' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
                >人民币</button>
                <button
                  onClick={() => setDisplayMode('original')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${displayMode === 'original' ? 'bg-white dark:bg-gray-600 text-gray-800 dark:text-gray-200 shadow-sm font-medium' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
                >原币</button>
              </div>
            )}
            <span className="text-xs text-gray-400 dark:text-gray-500">共 {rows.length} 项</span>
          </div>
        </div>

        {/* 桌面端表格 */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-gray-700">
                <th className="py-2 px-2 font-medium">名称</th>
                <th className="py-2 px-2 font-medium">代码</th>
                <th className="py-2 px-2 font-medium">币种</th>
                <th className="py-2 px-2 font-medium text-right">数量</th>
                <th className="py-2 px-2 font-medium text-right">单价</th>
                <th className="py-2 px-2 font-medium text-right">{showOriginalMode ? '原币市值' : '人民币市值'}</th>
                <th className="py-2 px-2 font-medium text-right">占比</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((h, idx) => (
                <tr key={idx} className="border-b border-gray-50 dark:border-gray-700 last:border-0">
                  <td className="py-2.5 px-2 text-gray-800 dark:text-gray-200 font-medium">{h.name}</td>
                  <td className="py-2.5 px-2 text-gray-500 dark:text-gray-400">{h.symbol === '-' ? '—' : h.symbol}</td>
                  <td className="py-2.5 px-2 text-gray-400 dark:text-gray-500">{h.currency}</td>
                  <td className="py-2.5 px-2 text-right text-gray-600 dark:text-gray-300">
                    {h.quantity === null ? '—' : formatNumber(h.quantity, assetKey === 'crypto' ? 4 : 0)}
                  </td>
                  <td className="py-2.5 px-2 text-right text-gray-600 dark:text-gray-300">
                    {h.price === null ? '—' : formatNumber(h.price, h.price < 1 ? 6 : 2)}
                  </td>
                  <td className="py-2.5 px-2 text-right text-gray-800 dark:text-gray-200 font-medium">
                    {showOriginalMode ? (h.marketValue === null ? '—' : formatNumber(h.marketValue, 2)) : formatCurrency(h.marketValueCNY)}
                  </td>
                  <td className="py-2.5 px-2 text-right text-gray-500 dark:text-gray-400">
                    {sumMarketValue ? ((h.marketValueCNY / sumMarketValue) * 100).toFixed(2) : 0}%
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-semibold border-t-2 border-gray-100 dark:border-gray-600">
                <td className="py-3 px-2 text-gray-800 dark:text-gray-200" colSpan={5}>合计</td>
                <td className="py-3 px-2 text-right text-gray-800 dark:text-gray-200">
                  {showOriginalMode ? formatNumber(originalSummary.reduce((sum, s) => sum + s.value, 0), 2) : formatCurrency(sumMarketValue)}
                </td>
                <td className="py-3 px-2 text-right text-gray-500 dark:text-gray-400">100%</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* 移动端 */}
        <div className="sm:hidden overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
          <table className="min-w-full text-xs whitespace-nowrap">
            <thead>
              <tr className="text-left text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-gray-700">
                <th className="py-2.5 px-3 font-medium sticky left-0 bg-white dark:bg-gray-800 z-[2]" style={{ boxShadow: '2px 0 4px rgba(0,0,0,0.04)' }}>名称</th>
                <th className="py-2.5 px-3 font-medium text-right">数量</th>
                <th className="py-2.5 px-3 font-medium text-right">单价</th>
                <th className="py-2.5 px-3 font-medium text-right">{showOriginalMode ? '原币市值' : '人民币市值'}</th>
                <th className="py-2.5 px-3 font-medium text-right">占比</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((h, idx) => (
                <tr key={idx} className="border-b border-gray-50 dark:border-gray-700 last:border-0">
                  <td className="py-2.5 px-3 text-gray-800 dark:text-gray-200 font-medium sticky left-0 bg-white dark:bg-gray-800 z-[2]" style={{ boxShadow: '2px 0 4px rgba(0,0,0,0.04)' }}>{h.name}</td>
                  <td className="py-2.5 px-3 text-right text-gray-600 dark:text-gray-300">
                    {h.quantity === null ? '—' : formatNumber(h.quantity, assetKey === 'crypto' ? 4 : 0)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-gray-600 dark:text-gray-300">
                    {h.price === null ? '—' : formatNumber(h.price, h.price < 1 ? 6 : 2)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-gray-800 dark:text-gray-200 font-medium">
                    {showOriginalMode ? (h.marketValue === null ? '—' : formatNumber(h.marketValue, 2)) : formatCurrency(h.marketValueCNY)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-gray-500 dark:text-gray-400">
                    {sumMarketValue ? ((h.marketValueCNY / sumMarketValue) * 100).toFixed(1) : 0}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}