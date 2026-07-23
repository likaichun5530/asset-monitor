import { useMemo, useState } from 'react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceDot,
} from 'recharts'
import { getHistory, getPeak } from '../utils/asset.js'
import { formatCurrency, formatDateShort, formatDateMid, formatWan } from '../utils/format.js'

const RANGES = [
  { key: '1m', label: '月', days: 30 },
  { key: '3m', label: '季', days: 90 },
  { key: '6m', label: '半年', days: 180 },
  { key: '1y', label: '年', days: 365 },
  { key: 'all', label: '全部', days: Infinity },
]

// 把数值格式化为「万」的纯数字（不带单位）
function toWanNum(v) {
  return (Number(v) / 10000).toFixed(0)
}

export default function TrendChart({ refreshKey = 0 }) {
  const [range, setRange] = useState('1y')

  const allData = useMemo(() => getHistory(), [refreshKey])
  const peak = useMemo(() => getPeak(), [refreshKey])

  const data = useMemo(() => {
    if (!allData.length) return []
    const rangeCfg = RANGES.find((r) => r.key === range) || RANGES[3]
    if (rangeCfg.days === Infinity) return allData
    const lastDate = allData[allData.length - 1].date
    const lastMs = new Date(lastDate).getTime()
    const targetMs = lastMs - rangeCfg.days * 24 * 60 * 60 * 1000
    return allData.filter((d) => new Date(d.date).getTime() >= targetMs)
  }, [allData, range])

  // 纵坐标 ticks：按 50 万一格
  const yTicks = useMemo(() => {
    if (!data.length) return []
    const values = data.map((d) => d.total)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const step = 500000
    const tickMin = Math.floor(min / step) * step
    const tickMax = Math.ceil(max / step) * step
    const ticks = []
    for (let v = tickMin; v <= tickMax; v += step) {
      ticks.push(v)
    }
    return ticks
  }, [data])

  const yDomain = useMemo(() => {
    if (!yTicks.length) return ['dataMin - 20000', 'dataMax + 20000']
    return [yTicks[0], yTicks[yTicks.length - 1]]
  }, [yTicks])

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h3 className="text-base font-semibold text-gray-800">资产趋势</h3>
        </div>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                range === r.key
                  ? 'bg-white text-brand-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
      <div className="w-full h-[180px] lg:h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 24, right: 36, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              tickFormatter={formatDateShort}
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
              minTickGap={24}
            />
            <YAxis
              ticks={yTicks}
              domain={yDomain}
              tickFormatter={toWanNum}
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={false}
              width={44}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                fontSize: 12,
              }}
              labelFormatter={(label) => `日期 ${formatDateMid(label)}`}
              formatter={(value, name, props) => {
                const note = props?.payload?.note
                const text = formatCurrency(value)
                return [note ? `${text}（${note}）` : text, '资产总额']
              }}
            />
            <Area
              type="monotone"
              dataKey="total"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#trendFill)"
              dot={false}
              activeDot={{ r: 4, stroke: '#fff', strokeWidth: 2 }}
            />
            {peak && data.some((d) => d.date === peak.date) && (
              <ReferenceDot
                x={peak.date}
                y={peak.value}
                r={5}
                fill="#ef4444"
                stroke="#fff"
                strokeWidth={2}
                label={{
                  value: `高点 ${toWanNum(peak.value)}`,
                  position: 'top',
                  fill: '#1f2937',
                  fontSize: 11,
                  fontWeight: 600,
                  offset: 10,
                }}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
        <span>单位：万元</span>
        <span>共 {data.length} 个快照</span>
      </div>
    </div>
  )
}