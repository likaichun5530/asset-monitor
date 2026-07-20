import { formatPercent, formatChange } from '../utils/format.js'

// 紧凑版涨跌展示组件
export default function StatCard({ label, change, changePct, sub }) {
  const isUp = Number(change) > 0
  const isDown = Number(change) < 0
  const color = isUp ? 'text-red-500' : isDown ? 'text-green-600' : 'text-gray-500'
  const bg = isUp ? 'bg-red-50' : isDown ? 'bg-green-50' : 'bg-gray-50'
  const arrow = isUp ? '▲' : isDown ? '▼' : '—'

  return (
    <div className="card py-2.5 px-4 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="text-xs text-gray-500">{label}</div>
        <div className="flex items-baseline gap-2 mt-0.5">
          <span className={`text-base font-semibold ${color}`}>{formatChange(change)}</span>
          <span className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-xs ${bg} ${color}`}>
            <span>{arrow}</span>
            {formatPercent(Math.abs(changePct))}
          </span>
        </div>
      </div>
      {sub && <div className="text-xs text-gray-400 text-right shrink-0">{sub}</div>}
    </div>
  )
}