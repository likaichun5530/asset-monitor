import { useEffect, useMemo, useRef, useState } from 'react'
import { getApiJson } from '../utils/api.js'

const SUBSCRIPTION_CACHE_MS = 5 * 60 * 1000

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
  const mountedRef = useRef(false)

  useEffect(() => {
    let active = true
    const forceRefresh = mountedRef.current
    mountedRef.current = true
    getApiJson('market?view=subscriptions', {
      auth: false,
      cacheTtlMs: SUBSCRIPTION_CACHE_MS,
      forceRefresh,
    }).then((data) => {
      if (active) setItems(Array.isArray(data?.items) ? data.items : [])
    }).catch(() => {
      // 行情源异常时隐藏旧提醒，避免跨日继续提示昨天的申购信息。
      if (active) setItems([])
    })
    return () => { active = false }
  }, [refreshKey])

  const messages = useMemo(() => items.map(formatItem), [items])
  if (!messages.length) return null

  const duration = Math.min(50, Math.max(18, messages.join('').length * 0.32))

  return (
    <aside className="card subscription-ticker flex h-11 items-center overflow-hidden px-3" aria-label="今日新股新债申购提醒">
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
  )
}
