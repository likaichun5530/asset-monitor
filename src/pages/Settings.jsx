import { useState } from 'react'
import { apiUrl } from '../utils/api.js'
import { AI_CONSENT_KEY, isAiEnabled, setAiEnabled } from '../utils/ai.js'
import packageJson from '../../package.json'

const THEME_KEY = 'youshu-theme'

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
  const [aiEnabled, setAiEnabledState] = useState(() => isAiEnabled())
  const [showAiConsent, setShowAiConsent] = useState(false)
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
      const resp = await fetch(apiUrl('auth/login'), {
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

  function handleAiToggle() {
    if (aiEnabled) {
      setAiEnabled(false)
      setAiEnabledState(false)
      return
    }
    if (localStorage.getItem(AI_CONSENT_KEY) === 'true') {
      setAiEnabled(true)
      setAiEnabledState(true)
      return
    }
    setShowAiConsent(true)
  }

  function confirmAiConsent() {
    localStorage.setItem(AI_CONSENT_KEY, 'true')
    setAiEnabled(true)
    setAiEnabledState(true)
    setShowAiConsent(false)
  }

  const themes = [
    { key: 'light', label: '白天模式', icon: '☀️' },
    { key: 'dark', label: '暗夜模式', icon: '🌙' },
    { key: 'system', label: '跟随系统', icon: '💻' },
  ]

  return (
    <div className="space-y-[4px] sm:grid sm:grid-cols-2 sm:gap-3 sm:space-y-0">
      <div className="card sm:min-h-[260px]">
        <h3 className="text-base font-semibold text-gray-800 mb-4">数据模式</h3>
        <p className="hidden sm:block -mt-2 mb-5 text-xs text-gray-400">选择真实账户数据或演示数据</p>
        <div className="space-y-[4px] sm:space-y-3">
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

      <div className="card sm:min-h-[260px]">
        <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-1">AI 资产助手</h3>
        <p className="mb-5 text-xs leading-5 text-gray-400">使用 DeepSeek 分析 Holdings、History 和目标配置</p>
        <button
          type="button"
          onClick={handleAiToggle}
          disabled={!isLoggedIn || demoMode}
          className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-colors ${aiEnabled ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10 dark:border-brand-400' : 'border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600'} ${!isLoggedIn || demoMode ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="flex items-center gap-3 text-left">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-100 text-lg dark:bg-brand-500/15">🤖</span>
            <div>
              <div className="text-sm font-medium text-gray-800 dark:text-gray-200">显示 AI 机器人</div>
              <div className="mt-0.5 text-[10px] text-gray-400">{demoMode ? '演示模式不可使用' : !isLoggedIn ? '登录后可以启用' : aiEnabled ? '已在所有页面显示' : '当前已关闭'}</div>
            </div>
          </div>
          <span className={`relative h-6 w-11 rounded-full transition-colors ${aiEnabled ? 'bg-brand-600' : 'bg-gray-200 dark:bg-gray-600'}`}>
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${aiEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </span>
        </button>
        <p className="mt-3 text-[10px] leading-4 text-gray-400">开启后，具体资产金额、账户、代码和备注会通过 Vercel 后端发送给 DeepSeek。</p>
      </div>

      <div className="card sm:min-h-[260px]">
        <h3 className="text-base font-semibold text-gray-800 mb-4">皮肤选择</h3>
        <p className="hidden sm:block -mt-2 mb-5 text-xs text-gray-400">设置界面明暗外观</p>
        <div className="space-y-[4px] sm:space-y-3">
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
          <p className="hidden sm:block -mt-2 mb-5 text-xs text-gray-400">当前登录账户：{auth?.username}</p>
          <button onClick={auth?.logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-red-200 text-red-500 text-sm font-medium hover:bg-red-50 transition-colors"
          >退出登录</button>
        </div>
      )}

      <div className={`card ${!isLoggedIn ? 'sm:col-span-2' : ''}`}>
        <h3 className="text-base font-semibold text-gray-800 mb-4">关于</h3>
        <div className="space-y-[4px] sm:space-y-0 text-sm sm:divide-y sm:divide-slate-100 dark:sm:divide-gray-700">
          <div className="flex justify-between sm:py-3 sm:first:pt-0"><span className="text-gray-500">应用名称</span><span className="text-gray-800 font-medium">有数</span></div>
          <div className="flex justify-between sm:py-3"><span className="text-gray-500">版本</span><span className="text-gray-800">{packageJson.version}</span></div>
          <div className="flex justify-between sm:py-3 sm:last:pb-0"><span className="text-gray-500">Slogan</span><span className="text-gray-800">资产配置，心中有数</span></div>
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

      {showAiConsent && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center px-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => setShowAiConsent(false)} />
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl dark:bg-gray-800">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">启用 DeepSeek 资产助手</h3>
            <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">系统会将 Holdings、History 和目标配置中的资产金额、账户、证券代码及备注发送给 DeepSeek API，用于回答你的资产分析问题。</p>
            <p className="mt-2 text-xs leading-5 text-gray-400">Google 凭据、登录令牌、表格公式和 DeepSeek API Key 不会发送给模型。</p>
            <div className="mt-5 flex gap-2">
              <button type="button" onClick={() => setShowAiConsent(false)} className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 dark:border-gray-600 dark:text-gray-300">取消</button>
              <button type="button" onClick={confirmAiConsent} className="flex-1 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white">同意并启用</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
