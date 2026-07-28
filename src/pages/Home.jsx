import { useMemo, useState, useCallback, useRef, useEffect } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import Sortable from 'sortablejs'
import TrendChart from '../components/TrendChart.jsx'
import AllocationChart from '../components/AllocationChart.jsx'
import HoldingsOverview from '../components/HoldingsOverview.jsx'
import {
  currentTotal, change7d, change30d, changeYtd, drawdownFromPeak,
  lastUpdateDate, generateSnapshot, hasBackend,
  groupByCurrency, getActiveHoldings, holdingMarketValue, totalMarketValue,
} from '../utils/asset.js'
import { getPendingCount, fetchTarget } from '../utils/dataStore.js'
import { formatCurrency, formatPercent, formatChange, formatDateLong, formatDateMid, formatNumber } from '../utils/format.js'

const CARD_KEY = 'youshu-home-cards'
const ORDER_KEY = 'youshu-home-order'
const ALL_KEYS = ['change7d', 'change30d', 'changeYtd', 'drawdown', 'currency', 'health', 'trend', 'allocation', 'holdings']
const STAT_KEYS = ['change7d', 'change30d', 'changeYtd', 'drawdown']
const HALF_KEYS = ['currency', 'health']

function readCardConfig() {
  try {
    const raw = localStorage.getItem(CARD_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed.statCards !== undefined && parsed.change7d === undefined) {
        const cfg = {}; ALL_KEYS.forEach((k) => { cfg[k] = true }); writeCardConfig(cfg); return cfg
      }
      const cfg = { ...parsed }
      ALL_KEYS.forEach((k) => { if (cfg[k] === undefined) cfg[k] = true }); return cfg
    }
  } catch {}
  const cfg = {}; ALL_KEYS.forEach((k) => { cfg[k] = true }); return cfg
}
function writeCardConfig(cfg) { try { localStorage.setItem(CARD_KEY, JSON.stringify(cfg)) } catch {} }
function readCardOrder() {
  try {
    const raw = localStorage.getItem(ORDER_KEY)
    if (raw) {
      const p = JSON.parse(raw)
      if (p.includes('statCards')) { writeCardOrder([...ALL_KEYS]); return [...ALL_KEYS] }
      const full = [...p]
      let changed = false
      for (const k of ALL_KEYS) { if (!full.includes(k)) { full.push(k); changed = true } }
      if (changed) writeCardOrder(full)
      return full
    }
  } catch {}
  return [...ALL_KEYS]
}
function writeCardOrder(o) { try { localStorage.setItem(ORDER_KEY, JSON.stringify(o)) } catch {} }

const CARD_LABELS = {
  change7d: '近7天涨跌', change30d: '近1月涨跌', changeYtd: '今年涨跌',
  drawdown: '较高点回撤', currency: '货币比例', health: '账户健康度',
  trend: '资产趋势图', allocation: '资产配置', holdings: '持仓概况',
}

function StatMini({ label, change, changePct }) {
  const isUp = Number(change) > 0; const isDown = Number(change) < 0
  const color = isUp ? 'text-red-500' : isDown ? 'text-green-600' : 'text-gray-500'
  const bg = isUp ? 'bg-red-50' : isDown ? 'bg-green-50' : 'bg-gray-50'
  return (
    <div className="card w-full flex flex-col justify-center items-center text-center p-2 min-h-[85px] lg:min-h-[150px]">
      <div className="text-xs sm:text-sm text-gray-500">{label}</div>
      <div className={`text-base sm:text-xl font-bold mt-2 ${color}`}>{formatChange(change)}</div>
      <div className="mt-2 flex items-center gap-1.5">
        <span className={`inline-flex items-center gap-0.5 px-1.5 sm:px-2 py-1 rounded text-xs sm:text-sm ${bg} ${color}`}>
          {isUp && <span>▲</span>} {isDown && <span>▼</span>} {formatPercent(Math.abs(changePct))}
        </span>
      </div>
    </div>
  )
}

function getMultiplier(symbol) {
  if (!symbol) return 1
  if (symbol.startsWith('IC') || symbol.startsWith('IM')) return 200
  if (symbol.startsWith('IF') || symbol.startsWith('IH')) return 300
  return 1
}

// 货币比例卡片（环形图）
function CurrencyCard() {
  const holdings = useMemo(() => getActiveHoldings(), [])
  const total = useMemo(() => totalMarketValue(), [])

  const pieData = useMemo(() => {
    // 从持仓中计算数字货币总额（按 assetType），从法币中排除
    const cryptoHoldings = holdings.filter(h => h.assetType === '数字货币')
    const cryptoAmount = cryptoHoldings.reduce((s, h) => s + holdingMarketValue(h), 0)

    // 法币金额：从所有持仓中排除数字货币后，按 currency 汇总
    const fiatHoldings = holdings.filter(h => h.assetType !== '数字货币')
    let cnyAmount = 0, usdAmount = 0, hkdAmount = 0
    for (const h of fiatHoldings) {
      const mv = holdingMarketValue(h)
      if (h.currency === 'CNY') cnyAmount += mv
      else if (h.currency === 'USD') usdAmount += mv
      else if (h.currency === 'HKD') hkdAmount += mv
    }

    const items = [
      { name: '人民币', value: Math.round(cnyAmount), color: '#ef4444' },
      { name: '美元', value: Math.round(usdAmount), color: '#3b82f6' },
      { name: '港币', value: Math.round(hkdAmount), color: '#8b5cf6' },
      { name: '数字货币', value: Math.round(cryptoAmount), color: '#f97316' },
    ].filter(d => d.value > 0).sort((a, b) => b.value - a.value)

    const totalVal = items.reduce((s, d) => s + d.value, 0)
    return items.map(d => ({ ...d, ratio: totalVal ? (d.value / totalVal) * 100 : 0 }))
  }, [holdings, total])

  return (
    <div className="card w-full aspect-square flex flex-col px-3 pt-2 pb-4">
      <div className="text-base font-semibold text-gray-800 dark:text-gray-200">货币比例</div>
      <div className="flex-1 flex flex-col justify-center items-center min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={36} outerRadius={54}
              startAngle={90} endAngle={-270} isAnimationActive={false}
            >
              {pieData.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="w-full grid grid-cols-2 gap-x-2">
          {pieData.map((d) => (
            <div key={d.name} className="flex items-center justify-between text-[10px]">
              <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0" style={{ backgroundColor: d.color }} />
                {d.name}
              </span>
              <span className="text-gray-800 dark:text-gray-200 font-medium">{Math.round(d.ratio)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// 账户健康度卡片
function HealthCard({ refreshKey }) {
  const [targetData, setTargetData] = useState([])
  useEffect(() => {
    fetchTarget()
      .then((data) => setTargetData(data.target || []))
      .catch(() => {})
  }, [refreshKey])

  const holdings = useMemo(() => getActiveHoldings(), [])
  const total = useMemo(() => totalMarketValue(), [])

  // 超配/低配类别名（只显示名称，不显示金额）
  const { overCategories, underCategories, futureUsageRate } = useMemo(() => {
    const overs = []
    const unders = []

    if (targetData.length) {
      for (const r of targetData) {
        if (r.isTotal || r.targetRatio === null || r.diff === null) continue
        if (r.diff > 0.02) overs.push(r.category)
        if (r.diff < -0.02) unders.push(r.category)
      }
    }

    // 期货保证金使用率（与 Future.jsx 计算方式一致）
    const futures = holdings.filter(h => h.assetType === '期货')
    let maxUsage = 0
    for (const h of futures) {
      const depositMargin = holdingMarketValue(h)
      const multiplier = getMultiplier(h.symbol)
      const contractValue = (h.price || 0) * (h.quantity || 0) * multiplier
      const requiredMargin = contractValue * 0.14
      const usageRate = depositMargin ? (requiredMargin / depositMargin) * 100 : 0
      if (usageRate > maxUsage) maxUsage = usageRate
    }

    return { overCategories: overs, underCategories: unders, futureUsageRate: maxUsage }
  }, [holdings, total, targetData])

  const usageColor = futureUsageRate > 75 ? '#ef4444' : futureUsageRate > 60 ? '#eab308' : '#10b981'
  const usageText = futureUsageRate > 75 ? '红色预警' : futureUsageRate > 60 ? '黄色警告' : '正常'

  return (
    <div className="card w-full aspect-square flex flex-col px-3 pt-2 pb-4">
      <div className="text-base font-semibold text-gray-800 dark:text-gray-200">账户健康度</div>
      <div className="flex-1 flex flex-col justify-center gap-1.5 text-xs">
        <div className="text-gray-500">现金建议：</div>
        <div>
          <span className="text-gray-500">减持：</span>
          {overCategories.length ? (
            overCategories.map((c, i) => <span key={c} className="text-red-500 font-medium">{i > 0 ? '、' : ''}{c}</span>)
          ) : <span className="text-gray-400">无</span>}
        </div>
        <div>
          <span className="text-gray-500">加仓：</span>
          {underCategories.length ? (
            underCategories.map((c, i) => <span key={c} className="text-green-600 font-medium">{i > 0 ? '、' : ''}{c}</span>)
          ) : <span className="text-gray-400">无</span>}
        </div>
        <div className="border-t border-gray-100 my-1" />
        <div className="flex justify-between items-center">
          <span className="text-gray-500">期货保证金</span>
          <span className="font-medium" style={{ color: usageColor }}>{futureUsageRate.toFixed(1)}%</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-500">状态</span>
          <span className="font-medium" style={{ color: usageColor }}>{usageText}</span>
        </div>
        <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full" style={{ width: Math.min(futureUsageRate, 100) + '%', backgroundColor: usageColor }} />
        </div>
      </div>
    </div>
  )
}

export default function Home({ loading, refreshKey, onSnapshot, onRefresh }) {
  const [snapshotLoading, setSnapshotLoading] = useState(false)
  const [snapshotMsg, setSnapshotMsg] = useState(null)
  const [cardConfig, setCardConfig] = useState(readCardConfig)
  const [cardOrder, setCardOrder] = useState(readCardOrder)
  const [editMode, setEditMode] = useState(false)
  const longPressTimer = useRef(null)
  const sortRef = useRef(null)
  const sortInstance = useRef(null)
  const dragActive = useRef(false)

  const total = useMemo(() => currentTotal(), [refreshKey])
  const c7 = useMemo(() => change7d(), [refreshKey])
  const c30 = useMemo(() => change30d(), [refreshKey])
  const ytd = useMemo(() => changeYtd(), [refreshKey])
  const dd = useMemo(() => drawdownFromPeak(), [refreshKey])
  const updateDate = useMemo(() => lastUpdateDate(), [refreshKey])
  const pendingCount = useMemo(() => getPendingCount(), [refreshKey])
  const demoMode = typeof window !== 'undefined' ? (localStorage.getItem('youshu-demo-mode') === 'true') : false

  const handleSnapshot = useCallback(async () => {
    if (demoMode) { setSnapshotMsg({ type: 'warn', text: '演示模式不支持生成快照' }); setTimeout(() => setSnapshotMsg(null), 2000); return }
    setSnapshotLoading(true); setSnapshotMsg(null)
    try {
      const result = await generateSnapshot(total); onSnapshot()
      if (result.synced) setSnapshotMsg({ type: 'success', text: `快照已生成（${result.date}）并同步至 Google Sheets` })
      else if (hasBackend()) setSnapshotMsg({ type: 'warn', text: `快照已生成（${result.date}），离线暂存` })
      else setSnapshotMsg({ type: 'success', text: `快照已生成（${result.date}）` })
    } catch (e) { setSnapshotMsg({ type: 'error', text: '生成快照失败：' + (e?.message || String(e)) })
    } finally { setSnapshotLoading(false); setTimeout(() => setSnapshotMsg(null), 4000) }
  }, [total, onSnapshot])

  const startLongPress = useCallback((e) => {
    if (e?.target?.closest?.('.recharts-wrapper')) return
    longPressTimer.current = setTimeout(() => { setEditMode(true) }, 2000)
  }, [])
  const cancelLongPress = useCallback(() => { if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null } }, [])
  useEffect(() => { return () => { if (longPressTimer.current) clearTimeout(longPressTimer.current) } }, [])

  function toggleCard(key) { const next = { ...cardConfig, [key]: !cardConfig[key] }; setCardConfig(next); writeCardConfig(next) }
  function exitEditMode() { setEditMode(false); document.body.style.overflow = '' }

  const visibleItems = useMemo(() => cardOrder.filter(k => cardConfig[k]), [cardOrder, cardConfig])

  useEffect(() => {
    if (!sortRef.current) return
    if (!editMode) {
      if (sortInstance.current) { sortInstance.current.destroy(); sortInstance.current = null }
      return
    }
    sortInstance.current = Sortable.create(sortRef.current, {
      animation: 200,
      easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
      handle: '.drag-handle',
      ghostClass: 'sortable-ghost',
      dragClass: 'sortable-drag',
      filter: '.no-sort',
      preventOnFilter: false,
      onStart: () => {
        dragActive.current = true
        const scrollY = window.scrollY
        document.body.dataset.scrollY = String(scrollY)
        document.body.style.position = 'fixed'
        document.body.style.top = `-${scrollY}px`
        document.body.style.width = '100%'
        document.body.style.overflow = 'hidden'
      },
      onEnd: (evt) => {
        dragActive.current = false
        const scrollY = parseInt(document.body.dataset.scrollY || '0')
        document.body.style.position = ''
        document.body.style.top = ''
        document.body.style.width = ''
        document.body.style.overflow = ''
        delete document.body.dataset.scrollY
        window.scrollTo(0, scrollY)
        if (evt.oldIndex === evt.newIndex) return
        const visibleKeys = cardOrder.filter(k => cardConfig[k])
        const [moved] = visibleKeys.splice(evt.oldIndex, 1)
        visibleKeys.splice(evt.newIndex, 0, moved)
        const result = []
        let vi = 0
        for (const k of cardOrder) {
          if (cardConfig[k]) { result.push(visibleKeys[vi]); vi++ }
          else result.push(k)
        }
        setCardOrder(result)
        writeCardOrder(result)
      },
    })
    return () => { if (sortInstance.current) { sortInstance.current.destroy(); sortInstance.current = null } }
  }, [editMode])

  function getStat(key) {
    switch (key) { case 'change7d': return c7; case 'change30d': return c30; case 'changeYtd': return ytd; case 'drawdown': return dd; default: return null }
  }

  function renderCard(key) {
    if (key === 'currency') return <CurrencyCard />
    if (key === 'health') return <HealthCard refreshKey={refreshKey} />
    switch (key) {
      case 'trend': return <TrendChart refreshKey={refreshKey} />
      case 'allocation': return <AllocationChart refreshKey={refreshKey} />
      case 'holdings': return <HoldingsOverview refreshKey={refreshKey} />
      default: return null
    }
  }

  return (
    <div className="space-y-[4px] sm:space-y-4" onTouchStart={startLongPress} onTouchEnd={cancelLongPress}
      onMouseDown={startLongPress} onMouseUp={cancelLongPress} onMouseLeave={cancelLongPress}
    >
      {editMode && (
        <div className="card py-2 px-4 flex items-center justify-between bg-brand-50 border-brand-200">
          <span className="text-xs text-brand-700 font-medium">编辑模式 — 拖拽 ≡ 手柄调整顺序</span>
          <button onClick={exitEditMode} className="text-xs text-brand-600 font-medium">完成</button>
        </div>
      )}

      <div className="card py-2 px-4 flex flex-col justify-center min-h-[85px] lg:min-h-[150px] relative">
        <div>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs text-gray-500">总资产（人民币）</div>
              <div className="text-3xl sm:text-4xl font-bold mt-1 text-gray-900">{formatCurrency(total)}</div>
              <div className="mt-1 text-xs text-gray-400">更新于 {updateDate ? formatDateLong(updateDate) : '--'}</div>
            </div>
            <button onClick={handleSnapshot} disabled={snapshotLoading}
              className="inline-flex items-center justify-center gap-1 w-[30px] h-[30px] rounded-full bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium transition-colors disabled:opacity-60 shrink-0"
            >
              {snapshotLoading ? (
                <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" />
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
              ) : (
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
              )}
            </button>
          </div>
        </div>
        <div className="mt-1 flex items-center gap-2 flex-wrap">
          {pendingCount > 0 && <span className="text-xs text-yellow-600">{pendingCount} 条待同步</span>}
          {snapshotMsg && <span className={`text-xs truncate ${snapshotMsg.type === 'error' ? 'text-red-500' : snapshotMsg.type === 'warn' ? 'text-yellow-600' : 'text-green-600'}`}>{snapshotMsg.text}</span>}
        </div>
      </div>

      <div ref={sortRef} className="flex flex-wrap -mx-0.5 sm:-mx-2">
        {visibleItems.map((key) => {
          if (STAT_KEYS.includes(key)) {
            const s = getStat(key)
            return s ? (
              <div key={key} data-id={key} className="w-1/3 px-0.5 sm:px-2 mb-[4px] sm:mb-4">
                <div className="relative">
                  {editMode && (
                    <>
                      <div className="drag-handle absolute top-1 left-1 z-20 w-6 h-6 flex items-center justify-center cursor-grab active:cursor-grabbing rounded bg-white dark:bg-gray-700 shadow-sm border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-300 touch-none hover:bg-gray-50 dark:hover:bg-gray-600">
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="12" height="2" rx="1" /><rect x="6" y="9" width="12" height="2" rx="1" /><rect x="6" y="14" width="12" height="2" rx="1" /></svg>
                      </div>
                      <button onClick={() => toggleCard(key)} className="absolute top-1 right-1 z-20 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center shadow hover:bg-red-600">−</button>
                    </>
                  )}
                  <StatMini label={CARD_LABELS[key]} change={s.change} changePct={s.changePct} />
                </div>
              </div>
            ) : null
          }
          if (HALF_KEYS.includes(key)) {
            return (
              <div key={key} data-id={key} className="w-1/2 px-0.5 sm:px-2 mb-[4px] sm:mb-4">
                <div className="relative">
                  {editMode && (
                    <>
                      <div className="drag-handle absolute top-1 left-1 z-20 w-6 h-6 flex items-center justify-center cursor-grab active:cursor-grabbing rounded bg-white dark:bg-gray-700 shadow-sm border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-300 touch-none hover:bg-gray-50 dark:hover:bg-gray-600">
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="12" height="2" rx="1" /><rect x="6" y="9" width="12" height="2" rx="1" /><rect x="6" y="14" width="12" height="2" rx="1" /></svg>
                      </div>
                      <button onClick={() => toggleCard(key)} className="absolute top-1 right-1 z-20 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center shadow hover:bg-red-600">−</button>
                    </>
                  )}
                  {renderCard(key)}
                </div>
              </div>
            )
          }
          return (
            <div key={key} data-id={key} className="w-full px-1 sm:px-2 mb-[4px] sm:mb-4">
              <div className="relative">
                {editMode && (
                  <>
                    <div className="drag-handle absolute top-2 left-2 z-20 w-7 h-7 flex items-center justify-center cursor-grab active:cursor-grabbing rounded bg-white dark:bg-gray-700 shadow-sm border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-300 touch-none hover:bg-gray-50 dark:hover:bg-gray-600">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="12" height="2" rx="1" /><rect x="6" y="9" width="12" height="2" rx="1" /><rect x="6" y="14" width="12" height="2" rx="1" /></svg>
                    </div>
                    <button onClick={() => toggleCard(key)} className="absolute top-2 right-2 z-20 w-6 h-6 rounded-full bg-red-500 text-white text-sm flex items-center justify-center shadow hover:bg-red-600">−</button>
                  </>
                )}
                {renderCard(key)}
              </div>
            </div>
          )
        })}
      </div>

      {editMode && (
        <div className="space-y-2">
          {cardOrder.filter((k) => !cardConfig[k]).map((key) => (
            <button key={key} onClick={() => toggleCard(key)}
              className="w-full py-8 rounded-lg border-2 border-dashed border-gray-300 text-gray-400 text-sm hover:border-brand-400 hover:text-brand-500 transition-colors"
            >+ 添加{CARD_LABELS[key] || key}</button>
          ))}
        </div>
      )}

      <style>{`
        .sortable-ghost { opacity: 0.15; }
        .sortable-drag { opacity: 1 !important; box-shadow: 0 8px 32px rgba(0,0,0,0.15) !important; border-radius: 12px; transform: scale(1.02); }
      `}</style>
    </div>
  )
}