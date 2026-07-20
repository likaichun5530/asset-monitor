import { NavLink, Outlet } from 'react-router-dom'
import { formatDateLong } from '../utils/format.js'

const navItems = [
  { to: '/', label: '首页', icon: HomeIcon, end: true },
  { to: '/holdings', label: '持仓明细', icon: ListIcon },
  { to: '/target', label: '配置目标', icon: TargetIcon },
]

function HomeIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1V9.5z" />
    </svg>
  )
}

function ListIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  )
}

function TargetIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  )
}

function RefreshIcon({ className, spinning }) {
  return (
    <svg className={`${className} ${spinning ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 4v6h-6M1 20v-6h6" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  )
}

const sourceLabels = {
  online: '在线',
  cache: '离线缓存',
  static: '示例数据',
}

const sourceDotColors = {
  online: 'bg-green-500',
  cache: 'bg-yellow-500',
  static: 'bg-gray-400',
}

const sourceTextColors = {
  online: 'text-green-600',
  cache: 'text-yellow-600',
  static: 'text-gray-500',
}

export default function Layout({ source = 'static', syncedAt, loading, error, onRefresh }) {
  return (
    <div className="min-h-full flex">
      {/* 桌面端侧边栏 */}
      <aside className="hidden sm:flex flex-col w-56 shrink-0 border-r border-gray-100 bg-white sticky top-0 h-screen">
        <div className="px-5 py-5 flex items-center gap-2 border-b border-gray-50">
          <img src="/favicon.svg" alt="logo" className="w-7 h-7" />
          <span className="font-semibold text-gray-800">资产管理</span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-brand-50 text-brand-600'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </NavLink>
            )
          })}
        </nav>

        {/* 同步状态 */}
        <div className="px-4 py-4 border-t border-gray-50 space-y-2">
          <div className="flex items-center justify-between">
            <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${sourceTextColors[source] || sourceTextColors.static}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${sourceDotColors[source] || sourceDotColors.static}`} />
              {sourceLabels[source] || source}
            </span>
            <button
              onClick={onRefresh}
              disabled={loading}
              className="p-1 rounded text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors disabled:opacity-50"
              title="刷新数据"
            >
              <RefreshIcon className="w-3.5 h-3.5" spinning={loading} />
            </button>
          </div>
          {syncedAt && (
            <div className="text-xs text-gray-400">
              同步于 {formatDateLong(syncedAt.slice(0, 10))}
            </div>
          )}
          {error && (
            <div className="text-xs text-red-500">加载失败，使用缓存</div>
          )}
        </div>
      </aside>

      {/* 主内容区 */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* 移动端顶部栏 */}
        <header className="sm:hidden sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-gray-100">
          <div className="px-4 h-12 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src="/favicon.svg" alt="logo" className="w-6 h-6" />
              <span className="font-semibold text-gray-800 text-sm">资产管理</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 text-xs ${sourceTextColors[source]}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${sourceDotColors[source]}`} />
                {sourceLabels[source]}
              </span>
              <button onClick={onRefresh} disabled={loading} className="p-1 text-gray-400 disabled:opacity-50">
                <RefreshIcon className="w-4 h-4" spinning={loading} />
              </button>
            </div>
          </div>
        </header>

        {/* 内容 */}
        <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-8 py-4 sm:py-6 pb-24 sm:pb-6">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-gray-400">
              <svg className="animate-spin w-6 h-6 mr-2" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" />
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
              加载中...
            </div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>

      {/* 移动端底部 Tab */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-20 bg-white border-t border-gray-100 flex">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-xs ${
                  isActive ? 'text-brand-600' : 'text-gray-500'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </NavLink>
          )
        })}
      </nav>
    </div>
  )
}