import { useState, useRef, useCallback, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { NavLink, Outlet } from 'react-router-dom'
import AiAssistant from './AiAssistant.jsx'
import { shouldIgnorePullRefresh } from '../utils/pullRefresh.js'

const navItems = [
  { type: 'label', label: '工作台' },
  { to: '/', label: '总览', icon: HomeIcon, end: true },
  { to: '/market', label: '行情', icon: MarketIcon },
  { to: '/holdings', label: '持仓明细', icon: ListIcon },
  { to: '/target', label: '配置目标', icon: TargetIcon },
  { type: 'label', label: '资产账户' },
  { to: '/us', label: '美股', icon: StockUpIcon },
  { to: '/cn', label: 'A股', icon: ChartUpIcon },
  { to: '/hk', label: '港股', icon: GlobeIcon },
  { to: '/jp', label: '日股', icon: SunIcon },
  { to: '/gold', label: '黄金', icon: GoldIcon },
  { to: '/bond', label: '债基', icon: ShieldIcon },
  { to: '/crypto', label: '虚拟币', icon: BitcoinIcon },
  { to: '/future', label: '期货', icon: ZapIcon },
  { to: '/cash', label: '现金', icon: WalletIcon },
  { type: 'label', label: '系统' },
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
  '/gold': '黄金',
  '/bond': '债基',
  '/crypto': '虚拟币',
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
function ChartUpIcon({ className }) { return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19V9M10 19V5M16 19v-7M22 19H2" /><path d="m3 7 5-4 5 5 7-6" /></svg> }
function GlobeIcon({ className }) { return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3.4 3 14.6 0 18M12 3c-3 3.4-3 14.6 0 18" /></svg> }
function SunIcon({ className }) { return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42" /></svg> }
function GoldIcon({ className }) { return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7 8-3 11h16L17 8Z" /><path d="M9 8 11 3h2l2 5M8 13h8" /></svg> }
function ShieldIcon({ className }) { return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg> }
function BitcoinIcon({ className }) { return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11.8 3v2.1M11.8 15.4V20M15.2 7.3c1.7 0 3 1.2 3 2.7s-1.3 2.5-3 2.5H7.5V7.3h7.7zM7.5 12.5h8.2" /></svg> }
function ZapIcon({ className }) { return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg> }
function WalletIcon({ className }) { return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" /><path d="M3 5v14a2 2 0 0 0 2 2h16v-5" /><path d="M18 12a2 2 0 0 0 0 4h4v-4z" /></svg> }
function SettingsIcon({ className }) { return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg> }

const sourceLabels = {
  online: '在线',
  cache: '缓存',
  demo: '演示',
  empty: '无数据',
}

const pageDescriptions = {
  '/': '资产总览与组合表现',
  '/holdings': '查看和维护全部资产明细',
  '/target': '跟踪当前配置与目标偏差',
  '/market': '关注汇率、指数与主要标的',
  '/settings': '数据模式、外观与账户管理',
  '/us': '美股账户资产与走势',
  '/cn': 'A股持仓与走势',
  '/hk': '港股持仓与走势',
  '/jp': '日股持仓与走势',
  '/gold': '黄金持仓与走势',
  '/bond': '债基持仓与走势',
  '/crypto': '虚拟币持仓与走势',
  '/future': '期货持仓、保证金与贴水',
  '/cash': '现金资产与币种分布',
}

const settingsSectionTitles = {
  appearance: '数据与外观',
  ai: 'AI 与智能分析',
  security: '账户与安全',
  about: '关于',
}

export default function Layout({ source = 'empty', syncedAt, error, onRefresh, auth } = {}) {
  const location = useLocation()
  const pagePath = location.pathname.startsWith('/settings/') ? '/settings' : location.pathname
  const pageTitle = pageTitles[pagePath] || '有数'
  const pageDescription = pageDescriptions[pagePath] || '资产配置，心中有数'
  const displayLabel = sourceLabels[source] || source
  const settingsSection = location.pathname.match(/^\/settings\/([^/]+)$/)?.[1]
  const settingsSectionTitle = settingsSectionTitles[settingsSection]

  const [isRefreshing, setIsRefreshing] = useState(false)
  const contentRef = useRef(null)
  const touchStartY = useRef(null)
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
    const ignoredGesture = document.body.dataset.sortableDragging === 'true'
      || document.body.dataset.modalOpen === 'true'
      || shouldIgnorePullRefresh(e.target)
    if (!onRefresh || scrollY > 5 || window.innerWidth >= 640 || refreshingRef.current || ignoredGesture) {
      touchStartY.current = null
      pullingRef.current = false
      return
    }
    touchStartY.current = e.touches[0].clientY
    pullingRef.current = false
  }, [onRefresh])

  const handleTouchMove = useCallback((e) => {
    if (document.body.dataset.modalOpen === 'true' || shouldIgnorePullRefresh(e.target)) {
      touchStartY.current = null
      pullingRef.current = false
      resetPull()
      return
    }
    if (refreshingRef.current || window.innerWidth >= 640 || touchStartY.current === null || document.body.dataset.sortableDragging === 'true') return
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
    if (refreshingRef.current || window.innerWidth >= 640 || touchStartY.current === null || !pullingRef.current) {
      touchStartY.current = null
      pullingRef.current = false
      return
    }
    touchStartY.current = null
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

  const handleTouchCancel = useCallback(() => {
    touchStartY.current = null
    pullingRef.current = false
    resetPull()
  }, [resetPull])

  useEffect(() => { return () => { clearTimeout(sloganTimerRef.current) } }, [])

  const handleDesktopRefresh = useCallback(async () => {
    if (refreshingRef.current || !onRefresh) return
    refreshingRef.current = true
    setIsRefreshing(true)
    try { await onRefresh() } finally {
      refreshingRef.current = false
      setIsRefreshing(false)
    }
  }, [onRefresh])

  return (
    <div className="min-h-full flex dark:bg-gray-900">
      {/* PC 侧栏 */}
      <aside className="hidden sm:flex flex-col w-56 shrink-0 border-r border-slate-800 bg-slate-950 sticky top-0 h-screen overflow-y-auto desktop-sidebar">
        <div className="px-5 h-[72px] flex items-center border-b border-white/[0.07]">
          <div className="flex items-center gap-3 overflow-hidden">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-lg font-bold text-white shadow-sm">有</span>
            <div className="min-w-0">
              <div className="text-xl font-semibold tracking-[0.12em] text-white">有数</div>
              <div className="mt-0.5 text-[9px] tracking-[0.18em] text-slate-600">ASSET MONITOR</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item, i) => {
            if (item.type === 'label') return <div key={`${item.label}-${i}`} className="px-3 pt-4 pb-1.5 first:pt-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">{item.label}</div>
            const Icon = item.icon
            return (<NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `group flex items-center gap-3 px-3 py-2.5 rounded-lg text-[15px] font-medium transition-all ${isActive ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-400 hover:bg-white/[0.06] hover:text-white'}`}>
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white/[0.05] text-current opacity-70 transition-opacity group-hover:opacity-100"><Icon className="w-4 h-4 shrink-0" /></span><span className="truncate">{item.label}</span>
            </NavLink>)
          })}
        </nav>
      </aside>

      {/* 主内容区 */}
      <div className="flex-1 min-w-0 flex flex-col bg-gray-50 sm:bg-[#f4f6f9] dark:bg-gray-900">
        {/* 移动端顶部栏 */}
        <header className="sm:hidden sticky top-0 z-20 bg-white/90 dark:bg-gray-800/90 backdrop-blur border-b border-gray-100 dark:border-gray-700">
          {settingsSectionTitle ? (
            <div className="relative flex h-12 items-center justify-center px-4">
              <NavLink to="/settings" replace className="absolute left-2 flex items-center rounded-lg p-2 text-gray-900 dark:text-gray-100" aria-label="返回设置一级菜单">
                <svg className="h-[22px] w-[22px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="m15 18-6-6 6-6" /></svg>
              </NavLink>
              <span className="max-w-[58vw] truncate text-[17px] font-semibold text-gray-800 dark:text-gray-200">{settingsSectionTitle}</span>
            </div>
          ) : (
            <div className="px-4 h-12 flex items-center justify-between">
              <span className="font-semibold text-gray-800 dark:text-gray-200 text-xl">{pageTitle}</span>
              <div className="flex items-center gap-3">
              {auth?.isLoggedIn ? (
                <span className="max-w-24 shrink truncate text-[15px] font-medium text-gray-800 dark:text-gray-200">{auth.username}</span>
              ) : (
                <NavLink to="/login" className="shrink-0 text-[15px] font-medium text-brand-600 dark:text-brand-400">登录</NavLink>
              )}
              <span className={`shrink-0 text-[15px] font-medium ${source === 'online' ? 'text-green-600 dark:text-green-400' : source === 'cache' ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-500 dark:text-gray-400'}`}>
                {(typeof window !== 'undefined' && localStorage.getItem('youshu-demo-mode') === 'true') ? '演示' : displayLabel}
              </span>
              <NavLink to="/settings" className="p-1 text-gray-500 dark:text-gray-400"><SettingsIcon className="h-6 w-6" /></NavLink>
              </div>
            </div>
          )}
        </header>

        {/* PC 顶部栏 */}
        <header className="hidden sm:flex sticky top-0 z-20 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border-b border-slate-200/80 dark:border-gray-700 desktop-topbar">
          <div className="flex-1 flex items-center justify-between px-4 lg:px-5 h-[72px]">
            <div>
              <h1 className="text-xl font-semibold text-slate-900 dark:text-gray-100 tracking-tight">{pageTitle}</h1>
              <p className="mt-0.5 text-xs text-slate-400 dark:text-gray-500">{pageDescription}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`status-pill ${source === 'online' ? 'status-pill-online' : source === 'cache' ? 'status-pill-cache' : ''}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${source === 'online' ? 'bg-green-500' : source === 'cache' ? 'bg-yellow-500' : 'bg-gray-400'}`} />
                {displayLabel}
              </span>
              <button type="button" onClick={handleDesktopRefresh} disabled={isRefreshing || !onRefresh} className="desktop-icon-button" title="刷新数据" aria-label="刷新数据">
                <svg className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 11a8.1 8.1 0 0 0-15.5-2M4 4v5h5M4 13a8.1 8.1 0 0 0 15.5 2M20 20v-5h-5" /></svg>
              </button>
              {auth?.isLoggedIn && (
                <span className="hidden h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-[15px] text-slate-600 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 lg:flex"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">{auth.username?.slice(0, 1)?.toUpperCase()}</span>{auth.username}</span>
              )}
              <NavLink to="/settings" className="desktop-icon-button" title="设置" aria-label="设置"><SettingsIcon className="h-5 w-5" /></NavLink>
            </div>
          </div>
        </header>

        <div className="relative flex-1 flex flex-col" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} onTouchCancel={handleTouchCancel}>
          <div ref={contentRef} className="flex-1 flex flex-col relative">
            <div className="sm:hidden absolute left-0 right-0 flex items-center justify-center" style={{ top: '-36px', height: '36px', zIndex: 5 }}>
              <span className="text-sm text-gray-700 font-medium tracking-wider">资产配置，心中有数</span>
            </div>
            <main className="flex-1 min-w-0 w-full max-w-[1440px] mx-auto px-3 pt-2 pb-24 sm:pb-8">
              <Outlet />
            </main>
          </div>
        </div>
      </div>

      {/* 移动端底部导航 */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-20 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 flex">
        <NavLink to="/" end className={({ isActive }) => `flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-xs ${isActive ? 'text-brand-600 dark:text-brand-400' : 'text-gray-500 dark:text-gray-400'}`}><HomeIcon className="w-5 h-5" /><span>总览</span></NavLink>
        <NavLink to="/market" className={({ isActive }) => `flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-xs ${isActive ? 'text-brand-600 dark:text-brand-400' : 'text-gray-500 dark:text-gray-400'}`}><MarketIcon className="w-5 h-5" /><span>行情</span></NavLink>
        <NavLink to="/holdings" className={({ isActive }) => `flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-xs ${isActive ? 'text-brand-600 dark:text-brand-400' : 'text-gray-500 dark:text-gray-400'}`}><ListIcon className="w-5 h-5" /><span>持仓</span></NavLink>
        <NavLink to="/target" className={({ isActive }) => `flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-xs ${isActive ? 'text-brand-600 dark:text-brand-400' : 'text-gray-500 dark:text-gray-400'}`}><TargetIcon className="w-5 h-5" /><span>目标</span></NavLink>
      </nav>
      <AiAssistant auth={auth} />
    </div>
  )
}
