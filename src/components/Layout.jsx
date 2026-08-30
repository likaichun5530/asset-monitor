import { useState, useRef, useCallback, useEffect } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import AiAssistant from './AiAssistant.jsx'
import { shouldIgnorePullRefresh } from '../utils/pullRefresh.js'

const navItems = [
  { type: 'label', label: '工作台' },
  { to: '/', label: '总览', icon: HomeIcon, end: true },
  { to: '/market', label: '行情', icon: MarketIcon },
  { to: '/holdings', label: '持仓', icon: ListIcon },
  { to: '/target', label: '目标', icon: TargetIcon },
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
  about: '关于应用',
}

const mobileDetailPages = new Set(['/us', '/cn', '/hk', '/jp', '/gold', '/bond', '/crypto', '/future', '/cash'])

export default function Layout({ source = 'empty', syncedAt, error, onRefresh, auth } = {}) {
  const location = useLocation()
  const navigate = useNavigate()
  const pagePath = location.pathname.startsWith('/settings/') ? '/settings' : location.pathname
  const pageTitle = pageTitles[pagePath] || '有数'
  const pageDescription = pageDescriptions[pagePath] || '资产配置，心中有数'
  const displayLabel = sourceLabels[source] || source
  const settingsSection = location.pathname.match(/^\/settings\/([^/]+)$/)?.[1]
  const settingsSectionTitle = settingsSectionTitles[settingsSection]
  const isMobileDetailPage = mobileDetailPages.has(location.pathname)

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
      <aside className="desktop-sidebar sticky top-0 hidden h-screen w-56 shrink-0 flex-col overflow-y-auto border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 sm:flex">
        <div className="flex h-[72px] items-center border-b border-slate-100 px-4 dark:border-white/[0.07]">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="relative h-10 w-12 shrink-0 overflow-hidden rounded-lg bg-white">
              <img src="/icon.png" alt="有数 App Logo" className="absolute left-1/2 top-1/2 h-[68px] w-[68px] max-w-none -translate-x-1/2 -translate-y-1/2 object-contain" />
            </span>
            <div className="min-w-0 leading-none">
              <div className="text-[19px] font-semibold tracking-[0.08em] text-slate-900 dark:text-white">有数</div>
              <div className="mt-1.5 text-[10px] font-medium tracking-[0.12em] text-slate-400 dark:text-slate-500">资产管理</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item, i) => {
            if (item.type === 'label') return <div key={`${item.label}-${i}`} className="px-3 pb-1.5 pt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 first:pt-0 dark:text-slate-600">{item.label}</div>
            const Icon = item.icon
            return (<NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] font-medium transition-all ${isActive ? 'bg-brand-50 text-brand-700 dark:bg-brand-600 dark:text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.06] dark:hover:text-white'}`}>
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-100 text-current opacity-80 transition-opacity group-hover:opacity-100 dark:bg-white/[0.05]"><Icon className="w-4 h-4 shrink-0" /></span><span className="truncate">{item.label}</span>
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
              <span className="max-w-[58vw] truncate text-lg font-semibold text-gray-800 dark:text-gray-200">{settingsSectionTitle}</span>
            </div>
          ) : isMobileDetailPage ? (
            <div className="relative flex h-12 items-center justify-between gap-2 px-2">
              <div className="flex min-w-0 items-center">
                <button type="button" onClick={() => navigate('/holdings')} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 dark:text-gray-100" aria-label="返回持仓">
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="m15 18-6-6 6-6" /></svg>
                </button>
              </div>
              <span className="pointer-events-none absolute left-1/2 max-w-[30vw] -translate-x-1/2 truncate text-xl font-semibold text-gray-800 dark:text-gray-200">{pageTitle}</span>
              <div className="flex shrink-0 items-center gap-2">
                {auth?.isLoggedIn ? <span className="max-w-16 truncate text-sm font-medium text-gray-700 dark:text-gray-300">{auth.username}</span> : <NavLink to="/login" className="text-sm font-medium text-brand-600 dark:text-brand-400">登录</NavLink>}
                <span className={`inline-flex items-center gap-1 text-sm font-medium ${source === 'online' ? 'text-green-600 dark:text-green-400' : source === 'cache' ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-500 dark:text-gray-400'}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${source === 'online' ? 'bg-green-500' : source === 'cache' ? 'bg-yellow-500' : 'bg-gray-400'}`} />
                  {(typeof window !== 'undefined' && localStorage.getItem('youshu-demo-mode') === 'true') ? '演示' : displayLabel}
                </span>
                <NavLink to="/settings" className="p-1 text-gray-500 dark:text-gray-400"><SettingsIcon className="h-6 w-6" /></NavLink>
              </div>
            </div>
          ) : (
            <div className="px-4 h-12 flex items-center justify-between">
              <span className={`${pagePath === '/' ? 'text-2xl font-bold' : 'text-xl font-semibold'} text-gray-800 dark:text-gray-200`}>{pageTitle}</span>
              <div className="flex items-center gap-3">
              {auth?.isLoggedIn ? (
                <span className="max-w-24 shrink truncate text-[15px] font-medium text-gray-800 dark:text-gray-200">{auth.username}</span>
              ) : (
                <NavLink to="/login" className="shrink-0 text-[15px] font-medium text-brand-600 dark:text-brand-400">登录</NavLink>
              )}
              <span className={`inline-flex shrink-0 items-center gap-1 text-[15px] font-medium ${source === 'online' ? 'text-green-600 dark:text-green-400' : source === 'cache' ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-500 dark:text-gray-400'}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${source === 'online' ? 'bg-green-500' : source === 'cache' ? 'bg-yellow-500' : 'bg-gray-400'}`} />
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
              <h1 className={`${pagePath === '/' ? 'text-2xl font-bold' : 'text-xl font-semibold'} tracking-tight text-slate-900 dark:text-gray-100`}>{pageTitle}</h1>
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
                <span className="hidden h-10 items-center rounded-xl border border-slate-200 bg-white px-3.5 text-[15px] text-slate-600 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 lg:flex">{auth.username}</span>
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
      <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-gray-100 bg-white pb-[env(safe-area-inset-bottom)] dark:border-gray-700 dark:bg-gray-800 sm:hidden">
        {[["/", "总览", HomeIcon], ["/market", "行情", MarketIcon], ["/holdings", "持仓", ListIcon], ["/target", "目标", TargetIcon]].map(([to, label, Icon]) => (
          <NavLink key={to} to={to} end={to === '/'} className="flex flex-1 items-center justify-center py-1.5 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-300">
            {({ isActive }) => <span className={`flex min-w-[58px] flex-col items-center justify-center gap-0.5 rounded-xl px-3 py-1 transition-colors ${isActive ? 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400' : 'text-gray-500 dark:text-gray-400'}`}><Icon className="h-5 w-5" /><span>{label}</span></span>}
          </NavLink>
        ))}
      </nav>
      <AiAssistant auth={auth} />
    </div>
  )
}
