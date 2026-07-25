import { useState, useRef, useCallback, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { NavLink, Outlet } from 'react-router-dom'
import { formatDateLong } from '../utils/format.js'

const navItems = [
  { to: '/', label: '总览', icon: HomeIcon, end: true },
  { to: '/market', label: '行情', icon: MarketIcon },
  { to: '/holdings', label: '持仓明细', icon: ListIcon },
  { to: '/target', label: '配置目标', icon: TargetIcon },
  { type: 'divider' },
  { to: '/us', label: '美股', icon: StockUpIcon },
  { to: '/cn', label: 'A股', icon: ChartUpIcon },
  { to: '/hk', label: '港股', icon: GlobeIcon },
  { to: '/jp', label: '日股', icon: SunIcon },
  { to: '/bond', label: '债基', icon: ShieldIcon },
  { to: '/crypto', label: '数字货币', icon: BitcoinIcon },
  { to: '/future', label: '期货', icon: ZapIcon },
  { to: '/cash', label: '现金', icon: WalletIcon },
  { type: 'divider' },
  { to: '/settings', label: '设置', icon: SettingsIcon },
]

const pageTitles = {
  '/': '总览',
  '/holdings': '持仓',
  '/target': '目标',
  '/market': '行情',
  '/my': '我的',
  '/settings': '设置',
  '/us': '美股',
  '/cn': 'A股',
  '/hk': '港股',
  '/jp': '日股',
  '/bond': '债基',
  '/crypto': '数字货币',
  '/future': '期货',
  '/cash': '现金',
}

function HomeIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1V9.5z" />
    </svg>
  )
}
function ListIcon({ className }) { return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg> }
function MarketIcon({ className }) { return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg> }
function TargetIcon({ className }) { return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg> }
function StockUpIcon({ className }) { return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="10" width="4" height="9" rx="1" /><rect x="10" y="6" width="4" height="13" rx="1" /><rect x="17" y="2" width="4" height="17" rx="1" /></svg> }
function ChartUpIcon({ className }) { return StockUpIcon({ className }) }
function GlobeIcon({ className }) { return StockUpIcon({ className }) }
function SunIcon({ className }) { return StockUpIcon({ className }) }
function ShieldIcon({ className }) { return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg> }
function BitcoinIcon({ className }) { return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11.8 3v2.1M11.8 15.4V20M15.2 7.3c1.7 0 3 1.2 3 2.7s-1.3 2.5-3 2.5H7.5V7.3h7.7zM7.5 12.5h8.2" /></svg> }
function ZapIcon({ className }) { return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg> }
function WalletIcon({ className }) { return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" /><path d="M3 5v14a2 2 0 0 0 2 2h16v-5" /><path d="M18 12a2 2 0 0 0 0 4h4v-4z" /></svg> }
function SettingsIcon({ className }) { return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg> }

const sourceLabels = {
  online: '在线',
  cache: '离线',
  static: '刷新中',
}

export default function Layout({ source = 'static', syncedAt, loading, error, onRefresh, auth } = {}) {
  const location = useLocation()
  const pageTitle = pageTitles[location.pathname] || '有数'
  const displayLabel = sourceLabels[source] || source

  const [isRefreshing, setIsRefreshing] = useState(false)
  const contentRef = useRef(null)
  const touchStartY = useRef(0)
  const refreshingRef = useRef(false)
  const pullingRef = useRef(false)
  const sloganTimerRef = useRef(null)
  const MAX_PULL = 90
  const THRESHOLD = 50

  const resetPull = useCallback(() => {
    if (contentRef.current) {
      contentRef.current.style.transition = 'transform 0.3s ease-out'
      contentRef.current.style.transform = 'translateY(0px)'
    }
  }, [])

  const handleTouchStart = useCallback((e) => {
    const scrollY = window.scrollY || document.documentElement.scrollTop
    if (scrollY > 5 || window.innerWidth >= 640 || refreshingRef.current) return
    touchStartY.current = e.touches[0].clientY
    pullingRef.current = false
  }, [])

  const handleTouchMove = useCallback((e) => {
    if (refreshingRef.current || window.innerWidth >= 640) return
    const scrollY = window.scrollY || document.documentElement.scrollTop
    if (scrollY > 5) return
    const deltaY = e.touches[0].clientY - touchStartY.current
    if (deltaY <= 0) { if (pullingRef.current) { pullingRef.current = false; resetPull() }; return }
    pullingRef.current = true
    e.preventDefault()
    const distance = Math.min(deltaY * 0.4, MAX_PULL)
    if (contentRef.current) { contentRef.current.style.transition = 'none'; contentRef.current.style.transform = `translateY(${distance}px)` }
  }, [resetPull])

  const handleTouchEnd = useCallback(async () => {
    if (refreshingRef.current || window.innerWidth >= 640 || !pullingRef.current) { pullingRef.current = false; return }
    pullingRef.current = false
    const match = (contentRef.current?.style?.transform || '').match(/translateY\(([\d.]+)px\)/)
    const dist = match ? parseFloat(match[1]) : 0
    if (dist < THRESHOLD) { resetPull(); return }
    refreshingRef.current = true; setIsRefreshing(true)
    clearTimeout(sloganTimerRef.current)
    sloganTimerRef.current = setTimeout(async () => {
      if (contentRef.current) { contentRef.current.style.transition = 'transform 0.3s ease-out'; contentRef.current.style.transform = 'translateY(0px)' }
      await new Promise((r) => setTimeout(r, 450))
      try { await onRefresh() } finally { refreshingRef.current = false; setIsRefreshing(false) }
    }, 1000)
  }, [onRefresh, resetPull])

  useEffect(() => { return () => { clearTimeout(sloganTimerRef.current) } }, [])

  return (
    <div className="min-h-full flex dark:bg-gray-900">
      <aside className="hidden sm:flex flex-col w-52 shrink-0 border-r border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 sticky top-0 h-screen overflow-y-auto">
        <div className="px-4 pt-[21px] pb-4 border-b border-gray-50 dark:border-gray-700">
          <img src="/Transparent-Chinese.png" alt="logo" className="w-[108px] h-[40px] object-cover object-center rounded-lg block dark:hidden" />
          <img src="/white-Chinese.png" alt="logo" className="w-[108px] h-[40px] object-cover object-center rounded-lg hidden dark:block" />
        </div>
        <nav className="flex-1 px-3 py-3 space-y-0.5">
          {navItems.map((item, i) => {
            if (item.type === 'divider') return <div key={i} className="mx-2 my-2 border-t border-gray-200 dark:border-gray-600" />
            const Icon = item.icon
            return (<NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `flex items-center gap-2.5 px-3 py-2 rounded-lg text-[15px] font-medium transition-colors ${isActive ? 'bg-brand-50 text-brand-600 dark:bg-gray-700 dark:text-brand-400' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-gray-200'}`}>
              <Icon className="w-4 h-4 shrink-0" /><span className="truncate">{item.label}</span>
            </NavLink>)
          })}
        </nav>
        <div className="px-4 py-3 border-t border-gray-50 dark:border-gray-700 space-y-1.5 text-xs">
          <span className={`inline-flex items-center gap-1.5 font-medium ${source === 'online' ? 'text-green-600 dark:text-green-400' : source === 'cache' ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-500 dark:text-gray-400'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${source === 'online' ? 'bg-green-500' : source === 'cache' ? 'bg-yellow-500' : 'bg-gray-400'}`} />
            {displayLabel}
          </span>
          {syncedAt && <div className="text-gray-400 dark:text-gray-500">同步于 {formatDateLong(syncedAt.slice(0, 10))}</div>}
          {error && <div className="text-red-500 dark:text-red-400">加载失败，使用缓存</div>}
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col bg-gray-50 dark:bg-gray-900">
        <header className="sm:hidden sticky top-0 z-20 bg-white/90 dark:bg-gray-800/90 backdrop-blur border-b border-gray-100 dark:border-gray-700">
          <div className="px-4 h-12 flex items-center justify-between">
            <span className="font-semibold text-gray-800 dark:text-gray-200 text-xl">{pageTitle}</span>
            <div className="flex items-center gap-3">
              {/* 演示模式左侧：未登录显示"登录"，已登录显示用户名 */}
              {(typeof window !== 'undefined' && localStorage.getItem('youshu-demo-mode') === 'true') ? (
                auth?.isLoggedIn ? (
                  <span className="text-sm text-gray-800 dark:text-gray-200 font-medium shrink-0">{auth.username}</span>
                ) : (
                  <NavLink to="/login" className="text-sm text-brand-600 dark:text-brand-400 font-medium shrink-0">登录</NavLink>
                )
              ) : null}
              <span className={`text-sm ${source === 'online' ? 'text-green-600 dark:text-green-400' : source === 'cache' ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-500 dark:text-gray-400'}`}>
                {(typeof window !== 'undefined' && localStorage.getItem('youshu-demo-mode') === 'true') ? '演示' : displayLabel}
              </span>
              <NavLink to="/settings" className="p-1 text-gray-400 dark:text-gray-500"><SettingsIcon className="w-5 h-5" /></NavLink>
            </div>
          </div>
        </header>

        <div className="relative flex-1 flex flex-col" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
          <div ref={contentRef} className="flex-1 flex flex-col relative">
            <div className="sm:hidden absolute left-0 right-0 flex items-center justify-center" style={{ top: '-36px', height: '36px', zIndex: 5 }}>
              <span className="text-sm text-gray-700 font-medium tracking-wider">资产配置，心中有数</span>
            </div>
            <main className="flex-1 w-full px-[4px] sm:px-8 pt-[4px] sm:pt-2 pb-24 sm:pb-8">
              <Outlet />
            </main>
          </div>
        </div>
      </div>

      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-20 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 flex">
        <NavLink to="/" end className={({ isActive }) => `flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-xs ${isActive ? 'text-brand-600 dark:text-brand-400' : 'text-gray-500 dark:text-gray-400'}`}><HomeIcon className="w-5 h-5" /><span>总览</span></NavLink>
        <NavLink to="/market" className={({ isActive }) => `flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-xs ${isActive ? 'text-brand-600 dark:text-brand-400' : 'text-gray-500 dark:text-gray-400'}`}><MarketIcon className="w-5 h-5" /><span>行情</span></NavLink>
        <NavLink to="/holdings" className={({ isActive }) => `flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-xs ${isActive ? 'text-brand-600 dark:text-brand-400' : 'text-gray-500 dark:text-gray-400'}`}><ListIcon className="w-5 h-5" /><span>持仓</span></NavLink>
        <NavLink to="/target" className={({ isActive }) => `flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-xs ${isActive ? 'text-brand-600 dark:text-brand-400' : 'text-gray-500 dark:text-gray-400'}`}><TargetIcon className="w-5 h-5" /><span>目标</span></NavLink>
        <NavLink to="/my" className={({ isActive }) => `flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-xs ${isActive ? 'text-brand-600 dark:text-brand-400' : 'text-gray-500 dark:text-gray-400'}`}>
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
          <span>我的</span>
        </NavLink>
      </nav>
    </div>
  )
}