import { useState } from 'react'

const THEME_KEY = 'youshu-theme'

const API_BASE = import.meta.env.VITE_API_BASE || (typeof window !== 'undefined' ? window.location.origin : '')

function applyTheme(t) {
  const root = document.documentElement
  const metaTheme = document.querySelector('meta[name="theme-color"]')
  const isDark = t === 'dark' || (t !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  root.classList.toggle('dark', isDark)
  if (metaTheme) metaTheme.content = isDark ? '#111827' : '#ffffff'
}

export function initTheme() {
  const saved = localStorage.getItem(THEME_KEY) || 'system'
  applyTheme(saved)
}

export default function Settings({ auth } = {}) {
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || 'system')
  const [demoMode, setDemoMode] = useState(() => localStorage.getItem('youshu-demo-mode') === 'true')
  const [showPwdDialog, setShowPwdDialog] = useState(false)
  const [pwd, setPwd] = useState('')
  const [pwdError, setPwdError] = useState('')
  const [pwdLoading, setPwdLoading] = useState(false)
  const isLoggedIn = auth?.isLoggedIn || false

  function handleThemeChange(t) {
    setTheme(t)
    localStorage.setItem(THEME_KEY, t)
    applyTheme(t)
  }

  function handleDemoToggle() {
    const next = !demoMode
    if (demoMode && isLoggedIn) {
      // 演示 → 实盘：弹出密码验证框
      setShowPwdDialog(true)
      setPwd('')
      setPwdError('')
      return
    }
    // 实盘 → 演示：直接切换
    setDemoMode(next)
    localStorage.setItem('youshu-demo-mode', next ? 'true' : 'false')
    window.location.reload()
  }

  async function handleVerify() {
    if (!pwd) { setPwdError('请输入密码'); return }
    setPwdLoading(true)
    setPwdError('')
    try {
      const resp = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: auth?.username || 'admin', password: pwd }),
      })
      if (resp.ok) {
        setShowPwdDialog(false)
        setDemoMode(false)
        localStorage.setItem('youshu-demo-mode', 'false')
        window.location.reload()
      } else {
        const err = await resp.json()
        setPwdError(err.error || '密码错误')
      }
    } catch (e) {
      setPwdError(e.message || '验证失败')
    } finally {
      setPwdLoading(false)
    }
  }

  function handleCancel() {
    setShowPwdDialog(false)
    setPwd('')
    setPwdError('')
  }

  const themes = [
    { key: 'light', label: '白天模式', icon: '☀️' },
    { key: 'dark', label: '暗夜模式', icon: '🌙' },
    { key: 'system', label: '跟随系统', icon: '💻' },
  ]

  return (
    <div className="space-y-[4px]">
      <div className="card">
        <h3 className="text-base font-semibold text-gray-800 mb-4">数据模式</h3>
        <div className="space-y-[4px]">
          <button
            onClick={() => { if (demoMode && isLoggedIn) handleDemoToggle() }}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-colors ${!demoMode ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10 dark:border-brand-400' : 'border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600'} ${!isLoggedIn ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={!isLoggedIn}
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">📊</span>
              <span className="text-sm font-medium text-gray-800">实盘模式</span>
            </div>
            {!demoMode && <svg className="w-5 h-5 text-brand-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>}
          </button>
          <button
            onClick={() => { if (!demoMode && isLoggedIn) handleDemoToggle() }}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-colors ${demoMode ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10 dark:border-brand-400' : 'border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600'}`}
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">🎮</span>
              <span className="text-sm font-medium text-gray-800">演示模式</span>
            </div>
            {demoMode && <svg className="w-5 h-5 text-brand-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>}
          </button>
        </div>
      </div>

      <div className="card">
        <h3 className="text-base font-semibold text-gray-800 mb-4">皮肤选择</h3>
        <div className="space-y-[4px]">
          {themes.map((t) => (
            <button key={t.key} onClick={() => handleThemeChange(t.key)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-colors ${theme === t.key ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10 dark:border-brand-400' : 'border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600'}`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{t.icon}</span>
                <span className="text-sm font-medium text-gray-800">{t.label}</span>
              </div>
              {theme === t.key && <svg className="w-5 h-5 text-brand-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>}
            </button>
          ))}
        </div>
      </div>

      {isLoggedIn && (
        <div className="card">
          <h3 className="text-base font-semibold text-gray-800 mb-4">账户</h3>
          <button onClick={auth?.logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-red-200 text-red-500 text-sm font-medium hover:bg-red-50 transition-colors"
          >退出登录</button>
        </div>
      )}

      <div className="card">
        <h3 className="text-base font-semibold text-gray-800 mb-4">关于</h3>
        <div className="space-y-[4px] text-sm">
          <div className="flex justify-between"><span className="text-gray-500">应用名称</span><span className="text-gray-800 font-medium">有数</span></div>
          <div className="flex justify-between"><span className="text-gray-500">版本</span><span className="text-gray-800">1.1.1</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Slogan</span><span className="text-gray-800">资产配置，心中有数</span></div>
        </div>
      </div>

      {/* 密码验证弹窗 */}
      {showPwdDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={handleCancel} />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 w-80 max-w-[90vw]">
            <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-1">切换回实盘模式</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">请输入账户密码验证身份</p>
            <input
              type="password"
              value={pwd}
              onChange={(e) => { setPwd(e.target.value); setPwdError('') }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleVerify() }}
              placeholder="输入密码"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500 mb-3"
              autoFocus
            />
            {pwdError && <p className="text-xs text-red-500 mb-3">{pwdError}</p>}
            <div className="flex gap-2">
              <button onClick={handleCancel}
                className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >取消</button>
              <button onClick={handleVerify} disabled={pwdLoading}
                className="flex-1 px-3 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors disabled:opacity-60"
              >{pwdLoading ? '验证中...' : '确认'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}