import { useMemo, useState, useCallback, useRef, useEffect } from 'react'
import Sortable from 'sortablejs'
import TrendChart from '../components/TrendChart.jsx'
import AllocationChart from '../components/AllocationChart.jsx'
import HoldingsOverview from '../components/HoldingsOverview.jsx'
import CalendarHeatmap from '../components/CalendarHeatmap.jsx'
import HomeAssetHero from '../components/HomeAssetHero.jsx'
import SubscriptionTicker from '../components/SubscriptionTicker.jsx'
import { CurrencyCard, HealthCard, StatMini } from '../components/HomeOverviewCards.jsx'
import {
  currentTotal, change7d, change30d, changeYtd, drawdownFromPeak,
  changeToday, lastUpdateDate,
} from '../utils/asset.js'
import { getPendingCount } from '../utils/dataStore.js'
import { findBestCardOverlap, getCardInsertDirection, reorderCardIds } from '../utils/cardSort.js'

const CARD_KEY = 'youshu-home-cards'
const ORDER_KEY = 'youshu-home-order'
const PRIVACY_KEY = 'youshu-home-values-hidden'
const ALL_KEYS = ['change7d', 'change30d', 'changeYtd', 'drawdown', 'currency', 'health', 'trend', 'allocation', 'holdings', 'calendar']
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
function readPrivacyMode() { try { return localStorage.getItem(PRIVACY_KEY) === 'true' } catch { return false } }
function writePrivacyMode(hidden) { try { localStorage.setItem(PRIVACY_KEY, String(hidden)) } catch {} }

const CARD_LABELS = {
  change7d: '近7日盈亏', change30d: '近1月盈亏', changeYtd: '今年盈亏',
  drawdown: '较高点回撤', currency: '货币比例', health: '账户健康度',
  trend: '资产趋势图', allocation: '资产配置', holdings: '持仓概况', calendar: '收益日历',
}

export default function Home({ refreshKey, targetRefreshKey = 0 }) {
  const [cardConfig, setCardConfig] = useState(readCardConfig)
  const [cardOrder, setCardOrder] = useState(readCardOrder)
  const [editMode, setEditMode] = useState(false)
  const [valuesHidden, setValuesHidden] = useState(readPrivacyMode)
  const [todayDetailRequest, setTodayDetailRequest] = useState(0)
  const longPressTimer = useRef(null)
  const sortRef = useRef(null)
  const sortInstance = useRef(null)
  const longPressStart = useRef(null)
  const cardConfigRef = useRef(cardConfig)

  const total = useMemo(() => currentTotal(), [refreshKey])
  const today = useMemo(() => changeToday(), [refreshKey])
  const c7 = useMemo(() => change7d(), [refreshKey])
  const c30 = useMemo(() => change30d(), [refreshKey])
  const ytd = useMemo(() => changeYtd(), [refreshKey])
  const dd = useMemo(() => drawdownFromPeak(), [refreshKey])
  const updateDate = useMemo(() => lastUpdateDate(), [refreshKey])
  const pendingCount = useMemo(() => getPendingCount(), [refreshKey])
  const startLongPress = useCallback((e) => {
    if (editMode || e?.target?.closest?.('.recharts-wrapper, button, a, input')) return
    const point = e.touches?.[0] || e
    longPressStart.current = { x: point.clientX, y: point.clientY }
    clearTimeout(longPressTimer.current)
    longPressTimer.current = setTimeout(() => {
      longPressTimer.current = null
      longPressStart.current = null
      setEditMode(true)
      navigator.vibrate?.(20)
    }, 2000)
  }, [editMode])
  const cancelLongPress = useCallback(() => {
    clearTimeout(longPressTimer.current)
    longPressTimer.current = null
    longPressStart.current = null
  }, [])
  const handleLongPressMove = useCallback((e) => {
    if (!longPressTimer.current || !longPressStart.current) return
    const point = e.touches?.[0] || e
    if (Math.hypot(point.clientX - longPressStart.current.x, point.clientY - longPressStart.current.y) > 8) {
      cancelLongPress()
    }
  }, [cancelLongPress])
  useEffect(() => { return () => { if (longPressTimer.current) clearTimeout(longPressTimer.current) } }, [])

  function toggleCard(key) {
    const next = { ...cardConfigRef.current, [key]: !cardConfigRef.current[key] }
    cardConfigRef.current = next
    setCardConfig(next)
    writeCardConfig(next)
  }
  function exitEditMode() { setEditMode(false) }
  function togglePrivacyMode() {
    setValuesHidden((hidden) => {
      const next = !hidden
      writePrivacyMode(next)
      return next
    })
  }

  const visibleItems = useMemo(() => cardOrder.filter(k => cardConfig[k]), [cardOrder, cardConfig])

  useEffect(() => {
    if (!sortRef.current) return
    if (!editMode) {
      if (sortInstance.current) { sortInstance.current.destroy(); sortInstance.current = null }
      return
    }
    const coarsePointer = window.matchMedia?.('(pointer: coarse)').matches ?? false
    let dropTarget = null
    let draggedId = null
    let collisionFrame = null
    let previousDragRect = null
    let latchedPlacement = null
    let lastReorderAt = 0
    const clearDropTarget = () => {
      dropTarget?.classList.remove('sortable-drop-target')
      dropTarget = null
    }
    const stopCollisionLoop = () => {
      if (collisionFrame !== null) cancelAnimationFrame(collisionFrame)
      collisionFrame = null
      previousDragRect = null
      latchedPlacement = null
      clearDropTarget()
    }
    const checkCardCollision = () => {
      if (!draggedId || !sortInstance.current || !sortRef.current) return
      const fallback = document.querySelector('.sortable-fallback')
      const movingRect = fallback?.getBoundingClientRect()
      if (movingRect) {
        const candidates = Array.from(sortRef.current.querySelectorAll(':scope > [data-id]'))
          .filter((element) => element.dataset.id !== draggedId)
          .map((element) => ({ id: element.dataset.id, element, rect: element.getBoundingClientRect() }))
        const best = findBestCardOverlap(movingRect, candidates)
        const movement = previousDragRect
          ? { x: movingRect.left - previousDragRect.left, y: movingRect.top - previousDragRect.top }
          : { x: 0, y: 0 }
        previousDragRect = movingRect

        if (!best || best.ratio < 0.35) latchedPlacement = null
        if (!best || best.ratio < 0.5) {
          clearDropTarget()
        } else {
          if (dropTarget !== best.element) {
            clearDropTarget()
            dropTarget = best.element
            dropTarget.classList.add('sortable-drop-target')
          }
          const now = performance.now()
          const direction = getCardInsertDirection(movingRect, best.rect, movement)
          const placement = `${best.id}:${direction}`
          if (latchedPlacement !== placement && now - lastReorderAt >= 80) {
            const currentOrder = sortInstance.current.toArray()
            const nextOrder = reorderCardIds(currentOrder, draggedId, best.id, direction)
            if (nextOrder.some((id, index) => id !== currentOrder[index])) {
              sortInstance.current.sort(nextOrder, true)
              lastReorderAt = now
            }
            latchedPlacement = placement
          }
        }
      }
      collisionFrame = requestAnimationFrame(checkCardCollision)
    }
    sortInstance.current = Sortable.create(sortRef.current, {
      sort: !coarsePointer,
      animation: 100,
      easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
      swapThreshold: 0.5,
      draggable: '[data-id]',
      delay: coarsePointer ? 160 : 0,
      delayOnTouchOnly: true,
      touchStartThreshold: 4,
      ghostClass: 'sortable-ghost',
      chosenClass: 'sortable-chosen',
      dragClass: 'sortable-drag',
      fallbackClass: 'sortable-fallback',
      forceFallback: coarsePointer,
      fallbackOnBody: true,
      fallbackTolerance: 3,
      scroll: true,
      bubbleScroll: true,
      scrollSensitivity: 70,
      scrollSpeed: 12,
      filter: 'button, a, input, select, textarea, .no-sort',
      preventOnFilter: false,
      onStart: (evt) => {
        draggedId = evt.item?.dataset.id || null
        lastReorderAt = 0
        document.body.dataset.sortableDragging = 'true'
        if (coarsePointer) collisionFrame = requestAnimationFrame(checkCardCollision)
      },
      onEnd: () => {
        stopCollisionLoop()
        draggedId = null
        delete document.body.dataset.sortableDragging
        const visibleKeys = sortInstance.current?.toArray() || []
        setCardOrder((previous) => {
          const expectedCount = previous.filter((key) => cardConfigRef.current[key]).length
          if (visibleKeys.length !== expectedCount) return previous
          let visibleIndex = 0
          const result = previous.map((key) => cardConfigRef.current[key] ? visibleKeys[visibleIndex++] : key)
          writeCardOrder(result)
          return result
        })
      },
    })
    return () => {
      stopCollisionLoop()
      draggedId = null
      delete document.body.dataset.sortableDragging
      if (sortInstance.current) { sortInstance.current.destroy(); sortInstance.current = null }
    }
  }, [editMode])

  function getStat(key) {
    switch (key) { case 'change7d': return c7; case 'change30d': return c30; case 'changeYtd': return ytd; case 'drawdown': return dd; default: return null }
  }

  function renderCard(key) {
    if (key === 'currency') return <CurrencyCard refreshKey={refreshKey} />
    if (key === 'health') return <HealthCard refreshKey={refreshKey} targetRefreshKey={targetRefreshKey} />
    switch (key) {
      case 'trend': return <TrendChart refreshKey={refreshKey} />
      case 'allocation': return <AllocationChart refreshKey={refreshKey} />
      case 'holdings': return <HoldingsOverview refreshKey={refreshKey} />
      case 'calendar': return <CalendarHeatmap refreshKey={refreshKey} openTodayRequest={todayDetailRequest} />
      default: return null
    }
  }

  return (
    <div className="home-page space-y-2" onTouchStart={startLongPress} onTouchMove={handleLongPressMove}
      onTouchEnd={cancelLongPress} onTouchCancel={cancelLongPress} onMouseDown={startLongPress}
      onMouseMove={handleLongPressMove} onMouseUp={cancelLongPress} onMouseLeave={cancelLongPress}
    >
      {editMode && (
        <div className="card py-2 sm:py-3 px-4 sm:px-5 flex items-center justify-between bg-brand-50 border-brand-200 dark:bg-brand-500/10">
          <span className="text-xs sm:text-sm text-brand-700 dark:text-brand-400 font-medium">编辑模式 — 按住卡片拖动调整顺序，点击减号隐藏卡片</span>
          <button onClick={exitEditMode} className="text-xs sm:text-sm text-brand-600 dark:text-brand-400 font-medium">完成编辑</button>
        </div>
      )}

      <HomeAssetHero
        total={total}
        todayChange={today.change}
        todayChangePct={today.changePct}
        updateDate={updateDate}
        pendingCount={pendingCount}
        editMode={editMode}
        valuesHidden={valuesHidden}
        onToggleEdit={() => setEditMode((value) => !value)}
        onToggleValuesHidden={togglePrivacyMode}
        onOpenTodayDetail={() => setTodayDetailRequest((value) => value + 1)}
      />

      <SubscriptionTicker refreshKey={refreshKey} />

      <div ref={sortRef} className="home-card-grid -mx-1 flex flex-wrap items-stretch">
        {visibleItems.map((key) => {
          if (STAT_KEYS.includes(key)) {
            const s = getStat(key)
            return s ? (
              <div key={key} data-id={key} data-pull-refresh-ignore={editMode ? 'true' : undefined} className={`home-card-slot home-card-slot-stat mb-2 w-1/3 px-1 sm:w-1/2 lg:w-1/4 ${editMode ? 'home-card-sortable cursor-grab active:cursor-grabbing' : ''}`}>
                <div className={`relative w-full ${editMode ? 'home-card-wobble' : ''}`}>
                  {editMode && (
                    <button onClick={() => toggleCard(key)} className="absolute top-1 right-1 z-20 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center shadow hover:bg-red-600">−</button>
                  )}
                  <StatMini label={CARD_LABELS[key]} change={s.change} changePct={s.changePct} valuesHidden={valuesHidden} />
                </div>
              </div>
            ) : null
          }
          if (HALF_KEYS.includes(key)) {
            return (
              <div key={key} data-id={key} data-pull-refresh-ignore={editMode ? 'true' : undefined} className={`home-card-slot home-card-slot-compact mb-2 w-1/2 px-1 ${editMode ? 'home-card-sortable cursor-grab active:cursor-grabbing' : ''}`}>
                <div className={`relative w-full ${editMode ? 'home-card-wobble' : ''}`}>
                  {editMode && (
                    <button onClick={() => toggleCard(key)} className="absolute top-1 right-1 z-20 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center shadow hover:bg-red-600">−</button>
                  )}
                  {renderCard(key)}
                </div>
              </div>
            )
          }
          return (
            <div key={key} data-id={key} data-pull-refresh-ignore={editMode ? 'true' : undefined} className={`home-card-slot home-card-slot-analysis mb-2 w-full px-1 lg:w-1/2 ${editMode ? 'home-card-sortable cursor-grab active:cursor-grabbing' : ''}`}>
              <div className={`relative w-full ${editMode ? 'home-card-wobble' : ''}`}>
                {editMode && (
                  <button onClick={() => toggleCard(key)} className="absolute top-2 right-2 z-20 w-6 h-6 rounded-full bg-red-500 text-white text-sm flex items-center justify-center shadow hover:bg-red-600">−</button>
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
        @keyframes home-card-wiggle {
          0%, 100% { transform: rotate(-0.45deg); }
          50% { transform: rotate(0.45deg); }
        }
        .home-card-wobble {
          animation: home-card-wiggle 0.34s ease-in-out infinite;
          transform-origin: center;
          will-change: transform;
        }
        .home-card-sortable:nth-child(2n) > .home-card-wobble {
          animation-delay: -0.17s;
          animation-direction: reverse;
        }
        .sortable-drop-target > .home-card-wobble {
          outline: 2px solid rgba(37, 99, 235, 0.45);
          outline-offset: 2px;
          border-radius: 12px;
        }
        .sortable-ghost { opacity: 0.15; }
        .sortable-drag, .sortable-fallback {
          opacity: 0.97 !important;
          box-shadow: 0 8px 32px rgba(0,0,0,0.15) !important;
          border-radius: 12px;
          pointer-events: none !important;
          will-change: transform;
          backface-visibility: hidden;
        }
        @media (prefers-reduced-motion: reduce) {
          .home-card-wobble { animation: none; }
        }
      `}</style>
    </div>
  )
}
