import { useMemo, useState, useCallback, useRef, useEffect } from 'react'
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

const CARD_KEY = 'youshu-home-cards'

function readCardConfig() {
  try {
    const raw = localStorage.getItem(CARD_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return { statCards: true, trend: true, allocation: true, holdings: true }
}

function writeCardConfig(cfg) {
  try { localStorage.setItem(CARD_KEY, JSON.stringify(cfg)) } catch { /* ignore */ }
}

export default function Home({ loading, refreshKey, onSnapshot, onRefresh }) {
  const [snapshotLoading, setSnapshotLoading] = useState(false)
  const [snapshotMsg, setSnapshotMsg] = useState(null)
  const [cardConfig, setCardConfig] = useState(readCardConfig)
  const [editMode, setEditMode] = useState(false)
  const longPressTimer = useRef(null)

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

  // 长按触发编辑模式
  const startLongPress = useCallback(() => {
    longPressTimer.current = setTimeout(() => {
      setEditMode(true)
    }, 800)
  }, [])

  const cancelLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }, [])

  useEffect(() => {
    return () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current)
    }
  }, [])

  function toggleCard(key) {
    const next = { ...cardConfig, [key]: !cardConfig[key] }
    setCardConfig(next)
    writeCardConfig(next)
  }

  function exitEditMode() {
    setEditMode(false)
  }

  const anyStat = cardConfig.statCards

  return (
    <div className="space-y-[4px]">
      {/* 编辑模式提示条 */}
      {editMode && (
        <div className="card py-2 px-4 flex items-center justify-between bg-brand-50 border-brand-200">
          <span className="text-xs text-brand-700 font-medium">编辑模式 — 点击下方按钮增减卡片</span>
          <button onClick={exitEditMode} className="text-xs text-brand-600 font-medium">
            完成
          </button>
        </div>
      )}

      {/* 总资产 + 统计卡片 */}
      <section className="grid grid-cols-1 lg:grid-cols-8 gap-2 lg:gap-4">
        <div
          className={`card py-5 px-6 lg:col-span-3 flex flex-col justify-center min-h-[100px] lg:min-h-[150px] relative ${editMode ? 'animate-[wiggle_0.3s_ease-in-out_infinite]' : ''}`}
        >
          <div>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs text-gray-500">总资产（人民币）</div>
                <div className="text-3xl sm:text-4xl font-bold mt-1 text-gray-900">
                  {formatCurrency(total)}
                </div>
                <div className="mt-1 text-xs text-gray-400">
                  更新于 {updateDate ? formatDateLong(updateDate) : '--'}
                </div>
              </div>
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
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                      <circle cx="12" cy="13" r="4"/>
                    </svg>

                  </>
                )}
              </button>
            </div>
          </div>
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

        {anyStat && (
          <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:col-span-5">
            <div
              onMouseDown={startLongPress}
              onMouseUp={cancelLongPress}
              onMouseLeave={cancelLongPress}
              onTouchStart={startLongPress}
              onTouchEnd={cancelLongPress}
              className={`${editMode ? 'animate-[wiggle_0.3s_ease-in-out_infinite]' : ''} relative`}
            >
              <StatMini
                label="近 7 天"
                change={c7.change}
                changePct={c7.changePct}
                sub={`${formatDateMid(c7.start)} → ${formatDateMid(c7.end)}`}
              />
              {editMode && (
                <button
                  onClick={(e) => { e.stopPropagation(); toggleCard('statCards') }}
                  className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center shadow"
                >−</button>
              )}
            </div>
            <div className={editMode ? 'animate-[wiggle_0.4s_ease-in-out_infinite]' : ''}>
              <StatMini
                label="近 1 个月"
                change={c30.change}
                changePct={c30.changePct}
                sub={`${formatDateMid(c30.start)} → ${formatDateMid(c30.end)}`}
              />
            </div>
            <div className={editMode ? 'animate-[wiggle_0.35s_ease-in-out_infinite]' : ''}>
              <StatMini
                label="较高点回撤"
                change={dd.change}
                changePct={dd.changePct}
                sub={`高点 ${formatDateMid(dd.peakDate)}`}
              />
            </div>
          </div>
        )}
        {!anyStat && editMode && (
          <div className="lg:col-span-5 flex items-center justify-center">
            <button
              onClick={() => toggleCard('statCards')}
              className="px-4 py-2 rounded-lg border-2 border-dashed border-gray-300 text-gray-400 text-sm hover:border-brand-400 hover:text-brand-500 transition-colors"
            >+ 添加涨跌卡片</button>
          </div>
        )}
      </section>

      {/* 资产趋势 */}
      {cardConfig.trend && (
        <div className={editMode ? 'animate-[wiggle_0.3s_ease-in-out_infinite]' : ''}>
          <div className="relative">
            <TrendChart refreshKey={refreshKey} />
            {editMode && (
              <button
                onClick={() => toggleCard('trend')}
                className="absolute top-2 right-2 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center shadow z-10"
              >−</button>
            )}
          </div>
        </div>
      )}
      {!cardConfig.trend && editMode && (
        <button
          onClick={() => toggleCard('trend')}
          className="w-full py-8 rounded-2xl border-2 border-dashed border-gray-300 text-gray-400 text-sm hover:border-brand-400 hover:text-brand-500 transition-colors"
        >+ 添加资产趋势图</button>
      )}

      {/* 资产配置 */}
      {cardConfig.allocation && (
        <div className={editMode ? 'animate-[wiggle_0.35s_ease-in-out_infinite]' : ''}>
          <div className="relative">
            <AllocationChart refreshKey={refreshKey} />
            {editMode && (
              <button
                onClick={() => toggleCard('allocation')}
                className="absolute top-2 right-2 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center shadow z-10"
              >−</button>
            )}
          </div>
        </div>
      )}
      {!cardConfig.allocation && editMode && (
        <button
          onClick={() => toggleCard('allocation')}
          className="w-full py-8 rounded-2xl border-2 border-dashed border-gray-300 text-gray-400 text-sm hover:border-brand-400 hover:text-brand-500 transition-colors"
        >+ 添加资产配置</button>
      )}

      {/* 持仓概况 */}
      {cardConfig.holdings && (
        <div className={editMode ? 'animate-[wiggle_0.4s_ease-in-out_infinite]' : ''}>
          <div className="relative">
            <HoldingsOverview refreshKey={refreshKey} />
            {editMode && (
              <button
                onClick={() => toggleCard('holdings')}
                className="absolute top-2 right-2 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center shadow z-10"
              >−</button>
            )}
          </div>
        </div>
      )}
      {!cardConfig.holdings && editMode && (
        <button
          onClick={() => toggleCard('holdings')}
          className="w-full py-8 rounded-2xl border-2 border-dashed border-gray-300 text-gray-400 text-sm hover:border-brand-400 hover:text-brand-500 transition-colors"
        >+ 添加持仓概况</button>
      )}
    </div>
  )
}

// 紧凑涨跌卡片
function StatMini({ label, change, changePct, sub }) {
  const isUp = Number(change) > 0
  const isDown = Number(change) < 0
  const color = isUp ? 'text-red-500' : isDown ? 'text-green-600' : 'text-gray-500'
  const bg = isUp ? 'bg-red-50' : isDown ? 'bg-green-50' : 'bg-gray-50'
  const arrow = isUp ? '▲' : isDown ? '▼' : '—'

  return (
    <div className="card flex flex-col justify-center items-center text-center p-4 min-h-[100px] lg:min-h-[150px]">
      <div className="text-xs sm:text-sm text-gray-500">{label}</div>
      <div className={`text-base sm:text-xl font-bold mt-2 ${color}`}>{formatChange(change)}</div>
      <div className="mt-2 flex items-center gap-1.5">
        <span className={`inline-flex items-center gap-0.5 px-1.5 sm:px-2 py-1 rounded text-xs sm:text-sm ${bg} ${color}`}>
          <span>{arrow}</span>
          {formatPercent(Math.abs(changePct))}
        </span>
      </div>
    </div>
  )
}