import { useState, useMemo, useCallback } from 'react'
import { getApiJson } from '../utils/api.js'
import { useVisiblePolling } from '../hooks/useVisiblePolling.js'

const CACHE_KEY = 'asset-monitor:market'

const GROUP_ORDER = ['汇率', '虚拟币', 'A股', '境外', '期货']

// 标的名 -> 图标映射
function getNameIcon(name) {
  if (name === '美元' || name === 'USD' || name === '纳斯达克指数') return <span>🇺🇸</span>
  if (name === '港币' || name === 'HKD') return <span>🇭🇰</span>
  if (name === '日元' || name === 'JPY' || name === '日经225指数') return <span>🇯🇵</span>
  if (name === 'BTC') {
    return (
      <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="11" fill="#f7931a" />
        <path d="M14.3 7.3c.8.3 1.3.9 1.1 1.8-2 .2-2-.2-3.9-.4-.4 0-.5.2-.5.5v.7c1.5.2 3.1.4 4.6.7 1.5.3 2.5 1.2 2.7 2.8.2 1.3-.3 2.1-1 2.7-.7.6-1.5.8-2.6.9v1.2h-1.1v-1.2h-.7v1.2H10v-1.2c-.7 0-1.5 0-2.2-.1v-1.1h.7c.5 0 .7-.2.7-.7v-4.8c0-.5-.2-.7-.7-.7h-.7V7.4h2.2V6.2h1.1v1.2h.7V6.2h1.1v1.1h.4zm-.2 5.3c0-.9-.8-1.2-1.9-1.3v2.6c1-.1 1.9-.4 1.9-1.3zm-3-2c0-.7-.6-1-1.4-1.1v2.3c.8 0 1.4-.4 1.4-1.2z" fill="#fff" />
      </svg>
    )
  }
  if (name === 'BNB') {
    return (
      <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="11" fill="#f0b90b" />
        <path d="M7.5 12L12 7.5l4.5 4.5-1.5 1.5L12 10.5 9 13.5 7.5 12z" fill="#fff" />
        <path d="M12 16.5l-3-3-1.5 1.5L12 19.5l4.5-4.5L15 13.5l-3 3z" fill="#fff" />
        <path d="M16.5 12L18 13.5l-1.5 1.5L15 13.5 16.5 12z" fill="#fff" opacity="0.6" />
        <path d="M7.5 12L6 13.5l1.5 1.5L9 13.5 7.5 12z" fill="#fff" opacity="0.6" />
      </svg>
    )
  }
  if (name === 'ETH') {
    return (
      <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="12" fill="#627eea" />
        <path d="M12 3v6.7l5.5 2.4L12 3z" fill="#fff" opacity="0.6" />
        <path d="M12 3L6.5 12.1 12 9.7V3z" fill="#fff" />
        <path d="M12 16.5v4.5l5.5-7.6L12 16.5z" fill="#fff" opacity="0.6" />
        <path d="M12 21v-4.5L6.5 13.4 12 21z" fill="#fff" />
        <path d="M12 15.2l5.5-3.1L12 9.7v5.5z" fill="#fff" opacity="0.2" />
        <path d="M6.5 12.1l5.5 3.1V9.7l-5.5 2.4z" fill="#fff" opacity="0.5" />
      </svg>
    )
  }
  if (name.includes('中证') || name.includes('上证') || name.includes('沪深') || name.includes('期货') || name.includes('IC')) return <span>🇨🇳</span>
  if (name === 'SGE黄金9999') return <span>🥇</span>
  return null
}

export default function Market({ refreshKey = 0 }) {
  const [data, setData] = useState(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY)
      if (cached) return JSON.parse(cached)
    } catch { /* ignore */ }
    return []
  })
  const [loading, setLoading] = useState(!data.length)

  const loadMarket = useCallback(async () => {
    try {
      const res = await getApiJson('market', { auth: false })
      const marketData = res.market || []
      setData(marketData)
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(marketData)) } catch { /* ignore */ }
    } finally {
      setLoading(false)
    }
  }, [])

  useVisiblePolling(loadMarket, { refreshKey })

  // 找中证500现货价格（Google Sheets 可能存为"中证500"或包含"中证500"的名称）
  const zz500Spot = useMemo(() => {
    const item = data.find((d) => d.name.includes('中证500') && !d.name.includes('期货') && !d.name.includes('IC'))
    return item?.price != null ? Number(item.price) : null
  }, [data])

  const groups = useMemo(() => {
    const map = new Map()
    for (const item of data) {
      const g = item.group || '其他'
      if (!map.has(g)) map.set(g, [])
      map.get(g).push(item)
    }
    const ordered = []
    for (const key of GROUP_ORDER) {
      if (map.has(key)) ordered.push({ name: key, items: map.get(key) })
    }
    for (const [key, items] of map.entries()) {
      if (!GROUP_ORDER.includes(key)) ordered.push({ name: key, items })
    }
    return ordered
  }, [data])

  const quotedCount = data.filter((item) => item.price !== null && item.price !== undefined).length

  return (
    <div className="space-y-4 sm:space-y-3 pt-3 px-1 sm:px-0 sm:pt-0">
      <section className="hidden sm:grid grid-cols-3 gap-3">
        <div className="desktop-metric-card">
          <div className="text-xs font-medium text-slate-400">行情分组</div>
          <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-gray-100">{groups.length} <span className="text-sm font-normal text-slate-400">组</span></div>
          <div className="mt-2 text-xs text-slate-400">按资产市场分类展示</div>
        </div>
        <div className="desktop-metric-card">
          <div className="text-xs font-medium text-slate-400">关注标的</div>
          <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-gray-100">{data.length} <span className="text-sm font-normal text-slate-400">项</span></div>
          <div className="mt-2 text-xs text-slate-400">汇率、指数、币种与期货</div>
        </div>
        <div className="desktop-metric-card">
          <div className="text-xs font-medium text-slate-400">有效报价</div>
          <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-gray-100">{quotedCount} <span className="text-sm font-normal text-slate-400">项</span></div>
          <div className="mt-2 text-xs text-green-600">{loading ? '正在更新行情' : '行情数据已载入'}</div>
        </div>
      </section>
      {groups.map((group, gi) => (
        <section key={gi} className="sm:card sm:p-0 sm:overflow-hidden">
          <div className="sm:flex sm:items-center sm:justify-between sm:px-6 sm:py-4 sm:border-b sm:border-slate-100 dark:sm:border-gray-700">
            <h2 className="text-base font-semibold text-gray-900 tracking-wide px-4 sm:px-0 mb-1 sm:mb-0">
              {group.name}
            </h2>
            <span className="hidden sm:inline text-xs text-slate-400">{group.items.length} 个标的</span>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-1 sm:gap-0">
            {group.items.map((item, idx) => {
              const isFutures = (item.name.includes('期货') || item.name.includes('IC')) && zz500Spot !== null && item.price != null
              const spread = isFutures ? zz500Spot - Number(item.price) : null
              const icon = group.name === '虚拟币' ? null : getNameIcon(item.name)
              return (
                <div key={idx}
                  className="card sm:rounded-none sm:border-0 sm:border-r sm:border-b sm:border-slate-100 dark:sm:border-gray-700 sm:shadow-none flex flex-col justify-center items-center sm:items-start text-center sm:text-left p-2 sm:p-5 min-h-[100px] sm:min-h-[118px]"
                >
                  <div className="text-sm sm:text-xs font-medium text-gray-500 flex items-center gap-1.5">
                    {icon}
                    <span>{item.name}</span>
                  </div>
                  <div className="text-base sm:text-xl font-semibold text-gray-900 mt-1 sm:mt-3">
                    {item.price ? Number(item.price).toFixed(2) : '—'}
                  </div>
                  {spread !== null && (
                    <div className="text-sm sm:text-xs text-gray-500 font-normal mt-0.5 sm:mt-2">
                      {spread >= 0 ? '贴水 ' : '升水 '}
                      {Math.abs(spread).toFixed(2)}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
