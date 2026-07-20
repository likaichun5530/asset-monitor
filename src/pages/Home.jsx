import { useMemo, useState, useCallback } from 'react'
import TrendChart from '../components/TrendChart.jsx'
import AllocationChart from '../components/AllocationChart.jsx'
import HoldingsOverview from '../components/HoldingsOverview.jsx'
import {
  currentTotal,
  change7d,
  change30d,
  drawdownFromPeak,
  lastUpdateDate,
  generateSnapshot,
  hasBackend,
} from '../utils/asset.js'
import { getPendingCount } from '../utils/dataStore.js'
import { formatCurrency, formatPercent, formatChange, formatDateLong, formatDateMid } from '../utils/format.js'

export default function Home({ loading, refreshKey, onSnapshot, onRefresh }) {
  const [snapshotLoading, setSnapshotLoading] = useState(false)
  const [snapshotMsg, setSnapshotMsg] = useState(null)

  const total = useMemo(() => currentTotal(), [refreshKey])
  const c7 = useMemo(() => change7d(), [refreshKey])
  const c30 = useMemo(() => change30d(), [refreshKey])
  const dd = useMemo(() => drawdownFromPeak(), [refreshKey])
  const updateDate = useMemo(() => lastUpdateDate(), [refreshKey])
  const pendingCount = useMemo(() => getPendingCount(), [refreshKey])

  const handleSnapshot = useCallback(async () => {
    setSnapshotLoading(true)
    setSnapshotMsg(null)
    try {
      const result = await generateSnapshot(total)
      onSnapshot()
      if (result.synced) {
        setSnapshotMsg({ type: 'success', text: `快照已生成（${result.date}）并同步至 Google Sheets` })
      } else if (hasBackend()) {
        setSnapshotMsg({ type: 'warn', text: `快照已生成（${result.date}），离线暂存` })
      } else {
        setSnapshotMsg({ type: 'success', text: `快照已生成（${result.date}）` })
      }
    } catch (e) {
      setSnapshotMsg({ type: 'error', text: '生成快照失败：' + (e?.message || String(e)) })
    } finally {
      setSnapshotLoading(false)
      setTimeout(() => setSnapshotMsg(null), 4000)
    }
  }, [total, onSnapshot])

  return (
    <div className="space-y-4">
      {/* 总资产左半 + 三个卡片右半平分 */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 左：总资产（生成快照放右上角，总金额字号变大） */}
        <div className="card py-8 px-8 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs text-gray-500">总资产（人民币）</div>
                <div className="text-4xl font-bold mt-1 text-gray-900">
                  {formatCurrency(total)}
                </div>
                <div className="mt-1 text-xs text-gray-400">
                  更新于 {updateDate ? formatDateLong(updateDate) : '--'}
                </div>
              </div>
              {/* 生成快照按钮（右上角） */}
              <button
                onClick={handleSnapshot}
                disabled={snapshotLoading}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium transition-colors disabled:opacity-60 shrink-0"
              >
                {snapshotLoading ? (
                  <>
                    <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" />
                      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                    生成中
                  </>
                ) : (
                  <>
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                    生成快照
                  </>
                )}
              </button>
            </div>
          </div>
          {/* 提示信息 */}
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            {pendingCount > 0 && (
              <span className="text-xs text-yellow-600">{pendingCount} 条待同步</span>
            )}
            {snapshotMsg && (
              <span
                className={`text-xs truncate ${
                  snapshotMsg.type === 'error'
                    ? 'text-red-500'
                    : snapshotMsg.type === 'warn'
                    ? 'text-yellow-600'
                    : 'text-green-600'
                }`}
              >
                {snapshotMsg.text}
              </span>
            )}
          </div>
        </div>

        {/* 右：三个卡片平分（近7天 / 近1月 / 最高点回撤） */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatMini
            label="近 7 天"
            change={c7.change}
            changePct={c7.changePct}
            sub={`${formatDateMid(c7.start)} → ${formatDateMid(c7.end)}`}
          />
          <StatMini
            label="近 1 个月"
            change={c30.change}
            changePct={c30.changePct}
            sub={`${formatDateMid(c30.start)} → ${formatDateMid(c30.end)}`}
          />
          <StatMini
            label="较高点回撤"
            change={dd.change}
            changePct={dd.changePct}
            sub={`高点 ${formatDateMid(dd.peakDate)}`}
          />
        </div>
      </section>

      {/* 趋势图 */}
      <TrendChart refreshKey={refreshKey} />

      {/* 资产配置 */}
      <AllocationChart refreshKey={refreshKey} />

      {/* 持仓概况 */}
      <HoldingsOverview refreshKey={refreshKey} />
    </div>
  )
}

// 紧凑涨跌卡片（高度增加1/6）
function StatMini({ label, change, changePct, sub }) {
  const isUp = Number(change) > 0
  const isDown = Number(change) < 0
  const color = isUp ? 'text-red-500' : isDown ? 'text-green-600' : 'text-gray-500'
  const bg = isUp ? 'bg-red-50' : isDown ? 'bg-green-50' : 'bg-gray-50'
  const arrow = isUp ? '▲' : isDown ? '▼' : '—'

  return (
    <div className="card aspect-square flex flex-col justify-center items-center text-center p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`text-base font-semibold mt-1.5 ${color}`}>{formatChange(change)}</div>
      <div className="mt-1.5 flex items-center gap-1.5">
        <span className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-xs ${bg} ${color}`}>
          <span>{arrow}</span>
          {formatPercent(Math.abs(changePct))}
        </span>
      </div>
      <div className="text-xs text-gray-400 truncate mt-1.5 w-full">{sub}</div>
    </div>
  )
}