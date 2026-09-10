import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { getApiJson } from '../utils/api.js'

const SUBSCRIPTION_CACHE_MS = 5 * 60 * 1000
const SUBSCRIPTION_HIDDEN_DATE_KEY = 'youshu-subscription-hidden-date'
const LONG_PRESS_MS = 650
const SYNTHETIC_CLICK_GUARD_MS = 450

function readHiddenDate() {
  try { return localStorage.getItem(SUBSCRIPTION_HIDDEN_DATE_KEY) || '' } catch { return '' }
}

function formatPrice(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return ''
  return `发行价 ¥${number.toLocaleString('zh-CN', { maximumFractionDigits: 3 })}`
}

function formatItem(item) {
  const type = item.type === 'bond' ? '新债' : '新股'
  const details = [item.applyCode ? `申购代码 ${item.applyCode}` : `代码 ${item.code}`]
  const price = formatPrice(item.price)
  if (price) details.push(price)
  if (item.type === 'stock' && Number(item.maxApply) > 0) {
    details.push(`上限 ${Number(item.maxApply).toLocaleString('zh-CN')} 股`)
  }
  return `${type} · ${item.name} · ${details.join(' · ')}`
}

export default function SubscriptionTicker({ refreshKey = 0 }) {
  const [items, setItems] = useState([])
  const [date, setDate] = useState('')
  const [hiddenDate, setHiddenDate] = useState(readHiddenDate)
  const [menuOpen, setMenuOpen] = useState(false)
  const mountedRef = useRef(false)
  const longPressTimerRef = useRef(null)
  const longPressStartRef = useRef(null)
  const menuOpenedAtRef = useRef(0)
  const menuOpenRef = useRef(false)

  useEffect(() => {
    let active = true
    const forceRefresh = mountedRef.current
    mountedRef.current = true
    getApiJson('market?view=subscriptions', {
      auth: false,
      cacheTtlMs: SUBSCRIPTION_CACHE_MS,
      forceRefresh,
    }).then((data) => {
      if (active) {
        setDate(data?.date || '')
        setItems(Array.isArray(data?.items) ? data.items : [])
      }
    }).catch(() => {
      // 行情源异常时隐藏旧提醒，避免跨日继续提示昨天的申购信息。
      if (active) setItems([])
    })
    return () => { active = false }
  }, [refreshKey])

  useEffect(() => () => window.clearTimeout(longPressTimerRef.current), [])

  function cancelLongPress() {
    window.clearTimeout(longPressTimerRef.current)
    longPressTimerRef.current = null
    longPressStartRef.current = null
  }

  function startLongPress(event) {
    if (event.button !== undefined && event.button !== 0) return
    cancelLongPress()
    longPressStartRef.current = { x: event.clientX, y: event.clientY }
    longPressTimerRef.current = window.setTimeout(() => {
      longPressTimerRef.current = null
      longPressStartRef.current = null
      openMenu()
      navigator.vibrate?.(20)
    }, LONG_PRESS_MS)
  }

  function openMenu() {
    menuOpenedAtRef.current = Date.now()
    menuOpenRef.current = true
    setMenuOpen(true)
  }

  function finishLongPress() {
    cancelLongPress()
    if (menuOpenRef.current) menuOpenedAtRef.current = Date.now()
  }

  function closeMenu() {
    menuOpenRef.current = false
    setMenuOpen(false)
  }

  function closeFromBackdrop() {
    if (Date.now() - menuOpenedAtRef.current < SYNTHETIC_CLICK_GUARD_MS) return
    closeMenu()
  }

  function moveLongPress(event) {
    if (!longPressTimerRef.current || !longPressStartRef.current) return
    if (Math.hypot(event.clientX - longPressStartRef.current.x, event.clientY - longPressStartRef.current.y) > 8) cancelLongPress()
  }

  function hideForToday() {
    if (!date) return
    try { localStorage.setItem(SUBSCRIPTION_HIDDEN_DATE_KEY, date) } catch { /* ignore */ }
    setHiddenDate(date)
    closeMenu()
  }

  const messages = useMemo(() => items.map(formatItem), [items])
  if (!messages.length || (date && hiddenDate === date)) return null

  const duration = Math.min(50, Math.max(18, messages.join('').length * 0.32))

  return (
    <>
    <aside
      className="card subscription-ticker flex h-11 select-none items-center overflow-hidden px-3"
      aria-label="今日新股新债申购提醒，长按可隐藏"
      data-home-long-press-ignore="true"
      onPointerDown={startLongPress}
      onPointerMove={moveLongPress}
      onPointerUp={finishLongPress}
      onPointerCancel={finishLongPress}
      onPointerLeave={cancelLongPress}
      onContextMenu={(event) => { event.preventDefault(); cancelLongPress(); openMenu() }}
    >
      <div className="relative z-10 mr-3 flex shrink-0 items-center gap-1.5 bg-white pr-1 text-xs font-semibold text-orange-600 dark:bg-gray-800 dark:text-orange-400">
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 3a6 6 0 0 0-6 6v3l-2 3h16l-2-3V9a6 6 0 0 0-6-6Z" />
          <path d="M10 19h4" />
        </svg>
        <span>今日打新</span>
      </div>
      <div className="min-w-0 flex-1 overflow-hidden">
        <span className="sr-only">{messages.join('；')}</span>
        <div className="subscription-ticker-track" style={{ '--ticker-duration': `${duration}s` }} aria-hidden="true">
          {[0, 1].map((copy) => (
            <div key={copy} className="subscription-ticker-group">
              {messages.map((message, index) => (
                <span key={`${copy}-${index}`} className="subscription-ticker-item">
                  {message}
                  <i aria-hidden="true" />
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
      <style>{`
        @keyframes subscription-ticker-scroll {
          from { transform: translate3d(0, 0, 0); }
          to { transform: translate3d(-50%, 0, 0); }
        }
        .subscription-ticker-track {
          display: flex;
          width: max-content;
          animation: subscription-ticker-scroll var(--ticker-duration) linear infinite;
          will-change: transform;
        }
        .subscription-ticker-group { display: flex; flex-shrink: 0; align-items: center; padding-right: 2rem; }
        .subscription-ticker-item { display: inline-flex; align-items: center; white-space: nowrap; font-size: 12px; color: #475569; }
        .subscription-ticker-item i { width: 4px; height: 4px; margin: 0 14px; border-radius: 999px; background: #fdba74; }
        html.dark .subscription-ticker-item { color: #cbd5e1; }
        html.dark .subscription-ticker-item i { background: #9a5b24; }
        @media (prefers-reduced-motion: reduce) {
          .subscription-ticker-track { width: auto; animation: none; overflow-x: auto; }
          .subscription-ticker-group:nth-child(2) { display: none; }
        }
      `}</style>
    </aside>
    {menuOpen && createPortal(
      <div className="fixed inset-0 z-[100] flex items-end justify-center px-3 sm:items-center sm:pb-0" style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))' }} data-pull-refresh-ignore="true">
        <button type="button" className="absolute inset-0 z-0 bg-black/35" onClick={closeFromBackdrop} aria-label="关闭打新提醒菜单" />
        <div className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-800" onPointerDown={(event) => event.stopPropagation()}>
          <div className="border-b border-gray-100 px-4 py-3 text-center text-xs text-gray-400 dark:border-gray-700">打新提醒</div>
          <button type="button" onClick={hideForToday} className="flex h-12 w-full items-center justify-center text-sm font-medium text-gray-800 active:bg-gray-100 dark:text-gray-100 dark:active:bg-gray-700">今天内不显示</button>
          <div className="h-2 bg-gray-100 dark:bg-gray-900" />
          <button type="button" onClick={closeMenu} className="flex h-12 w-full items-center justify-center text-sm text-gray-500 active:bg-gray-100 dark:text-gray-300 dark:active:bg-gray-700">取消</button>
        </div>
      </div>,
      document.body,
    )}
    </>
  )
}
