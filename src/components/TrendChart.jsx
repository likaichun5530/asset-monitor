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
  { key: '1m', label: '近1月', days: 30 },
  { key: '3m', label: '近3月', days: 90 },
  { key: '1y', label: '近1年', days: 365 },
  { key: 'ytd', label: '今年', days: null },
  { key: 'all', label: '全部', days: Infinity },
]

// 把数值格式化为「万」的纯数字（不带单位）
function toWanNum(v) {
  return (Number(v) / 10000).toFixed(0)
}

export default function TrendChart({ refreshKey = 0 }) {
  const [range, setRange] = useState('ytd')

  const allData = useMemo(() => getHistory(), [refreshKey])
  const peak = useMemo(() => getPeak(), [refreshKey])

  const data = useMemo(() => {
    if (!allData.length) return []
    const rangeCfg = RANGES.find((r) => r.key === range) || RANGES[2]
    if (rangeCfg.days === Infinity) return allData
    const lastDate = allData[allData.length - 1].date
    const lastMs = new Date(lastDate).getTime()
    // 今年以来：从当年1月1日开始
    if (rangeCfg.days === null) {
      const yearStart = new Date(lastDate).getFullYear() + '-01-01'
      return allData.filter((d) => d.date >= yearStart)
    }
    const targetMs = lastMs - rangeCfg.days * 24 * 60 * 60 * 1000
    return allData.filter((d) => new Date(d.date).getTime() >= targetMs)
  }, [allData, range])

  // 给数据添加 timestamp 数值字段，用于 X 轴时间刻度
  const chartData = useMemo(() => {
    return data.map((d) => ({
      ...d,
      timestamp: new Date(d.date).getTime(),
    }))
  }, [data])

  // 根据时间跨度生成 X 轴刻度（按月或按年）
  const xTicks = useMemo(() => {
    if (!chartData.length) return []
    const startMs = chartData[0].timestamp
    const endMs = chartData[chartData.length - 1].timestamp
    const spanMs = endMs - startMs
    const ticks = []
    // 少于 60 天：每 7 天一个刻度；60~365 天：每月；超过 365 天：每季度或半年
    const msPerDay = 24 * 60 * 60 * 1000
    let interval
    if (spanMs < 60 * msPerDay) {
      interval = 7 * msPerDay // 一周
    } else if (spanMs < 365 * msPerDay) {
      interval = 30 * msPerDay // 一个月左右
    } else if (spanMs < 730 * msPerDay) {
      interval = 60 * msPerDay // 两个月
    } else {
      interval = 90 * msPerDay // 季度
    }
    // 从起始时间取整
    let tick = Math.ceil(startMs / interval) * interval
    while (tick <= endMs) {
      ticks.push(tick)
      tick += interval
    }
    return ticks
  }, [chartData])

  // 纵坐标 ticks：使用 D3 风格的 tickStep 算法
  // 自动选择美观的步长：1、2、5 × 10ⁿ，适配任意数据范围
  function tickStep(range, targetCount) {
    const rawStep = range / targetCount
    const exponent = Math.floor(Math.log10(rawStep))
    const base = rawStep / Math.pow(10, exponent)
    // 将基数映射到最接近的美观值 1、2、5、10
    let niceBase
    if (base <= 1.5) niceBase = 1
    else if (base <= 3.5) niceBase = 2
    else if (base <= 7.5) niceBase = 5
    else niceBase = 10
    return niceBase * Math.pow(10, exponent)
  }

  const yTicks = useMemo(() => {
    if (!data.length) return []
    const values = data.map((d) => d.total)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const range = max - min
    if (range === 0) {
      // 单值情况：以该值为中心，上下各扩展半步长
      const step = tickStep(Math.abs(min) || 10000, 6)
      return [Math.floor(min / step) * step, Math.ceil(max / step) * step]
    }

    // 目标 5~7 个刻度
    const targetSteps = 6
    const step = tickStep(range, targetSteps)

    const tickMin = Math.floor(min / step) * step
    const tickMax = Math.ceil(max / step) * step
    const ticks = []
    for (let v = tickMin; v <= tickMax + step * 0.01; v += step) {
      ticks.push(Math.round(v))
    }
    return ticks
  }, [data])

  const yDomain = useMemo(() => {
    if (!yTicks.length) return ['dataMin - 20000', 'dataMax + 20000']
    return [yTicks[0], yTicks[yTicks.length - 1]]
  }, [yTicks])

  return (
    <div className="card pb-[1px] sm:pb-6 px-[1px] sm:px-6">
      <div className="flex items-center justify-between mb-[1px] flex-wrap gap-2 px-3 sm:px-0">
        <div>
          <h3 className="text-base font-semibold text-gray-800">资产趋势</h3>
          <p className="text-xs text-gray-400 mt-0.5">单位：万元</p>
        </div>
        <div className="flex items-center gap-[1px] bg-gray-100 rounded-lg">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
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
      <div className="w-full h-[160px] lg:h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 24, right: 12, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="timestamp"
              type="number"
              scale="time"
              domain={['dataMin', 'dataMax']}
              ticks={xTicks.length ? xTicks : undefined}
              tickFormatter={(ts) => formatDateShort(new Date(ts).toISOString().slice(0, 10))}
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
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
              labelFormatter={(label) => `日期 ${formatDateMid(new Date(label).toISOString().slice(0, 10))}`}
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
            {peak && chartData.some((d) => d.timestamp === new Date(peak.date).getTime()) && (
              <ReferenceDot
                x={new Date(peak.date).getTime()}
                y={peak.value}
                r={5}
                fill="#ef4444"
                stroke="#fff"
                strokeWidth={2}
                label={{
                  value: toWanNum(peak.value),
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
    </div>
  )
}