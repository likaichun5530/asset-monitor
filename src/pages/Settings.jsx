import { useEffect, useRef, useState } from 'react'
import { requestApiJson } from '../utils/api.js'
import { AI_CONSENT_KEY, clearAiMessages, getAiRules, isAiEnabled, saveAiRules, setAiEnabled } from '../utils/ai.js'
import packageJson from '../../package.json'
import RobotIcon from '../components/RobotIcon.jsx'
import ChangePasswordDialog from '../components/ChangePasswordDialog.jsx'
import AiModelSettingsDialog from '../components/AiModelSettingsDialog.jsx'

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
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [aiEnabled, setAiEnabledState] = useState(() => isAiEnabled())
  const [showAiConsent, setShowAiConsent] = useState(false)
  const [showAiRules, setShowAiRules] = useState(false)
  const [showAiModels, setShowAiModels] = useState(false)
  const [aiRules, setAiRules] = useState('')
  const [defaultAiRules, setDefaultAiRules] = useState('')
  const [aiRulesMaxLength, setAiRulesMaxLength] = useState(6000)
  const [aiRulesLoading, setAiRulesLoading] = useState(false)
  const [aiRulesSaving, setAiRulesSaving] = useState(false)
  const [aiRulesError, setAiRulesError] = useState('')
  const [aiRulesSaved, setAiRulesSaved] = useState(false)
  const [aiRulesDirty, setAiRulesDirty] = useState(false)
  const latestAiRulesRef = useRef('')
  const isLoggedIn = auth?.isLoggedIn || false
  const aiControlEnabled = aiEnabled && isLoggedIn && !demoMode

  useEffect(() => {
    if (!showAiRules) return undefined
    const previousOverflow = document.body.style.overflow
    document.body.dataset.modalOpen = 'true'
    document.body.style.overflow = 'hidden'
    return () => {
      delete document.body.dataset.modalOpen
      document.body.style.overflow = previousOverflow
    }
  }, [showAiRules])

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
    if (!auth?.username) { setPwdError('登录已失效，请重新登录'); return }
    setPwdLoading(true)
    setPwdError('')
    try {
      await requestApiJson('auth/login', {
        method: 'POST',
        auth: false,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: auth.username, password: pwd }),
      })
      setShowPwdDialog(false)
      setDemoMode(false)
      localStorage.setItem('youshu-demo-mode', 'false')
      window.location.reload()
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

  async function openAiRules() {
    setShowAiRules(true)
    setAiRulesLoading(true)
    setAiRulesError('')
    setAiRulesSaved(false)
    try {
      const data = await getAiRules()
      setAiRules(data.rules || '')
      latestAiRulesRef.current = data.rules || ''
      setDefaultAiRules(data.defaultRules || '')
      setAiRulesMaxLength(data.maxLength || 6000)
      setAiRulesDirty(false)
    } catch (error) {
      setAiRulesError(error.message || '读取 AI 规则失败')
    } finally {
      setAiRulesLoading(false)
    }
  }

  function updateAiRules(value) {
    const next = value.slice(0, aiRulesMaxLength)
    latestAiRulesRef.current = next
    setAiRules(next)
    setAiRulesDirty(true)
    setAiRulesSaved(false)
    setAiRulesError('')
  }

  async function handleSaveAiRules() {
    const rulesToSave = latestAiRulesRef.current
    if (!rulesToSave.trim()) { setAiRulesError('AI 规则不能为空'); return }
    if (aiRulesSaving) return
    setAiRulesSaving(true)
    setAiRulesError('')
    setAiRulesSaved(false)
    try {
      const data = await saveAiRules(rulesToSave)
      if (latestAiRulesRef.current === rulesToSave) {
        const savedRules = data.rules || rulesToSave
        latestAiRulesRef.current = savedRules
        setAiRules(savedRules)
        setAiRulesDirty(false)
        setAiRulesSaved(true)
        clearAiMessages()
      }
    } catch (error) {
      setAiRulesError(error.message || '保存 AI 规则失败')
    } finally {
      setAiRulesSaving(false)
    }
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
        <p className="mb-5 text-xs leading-5 text-gray-400">使用所选大模型分析 Holdings、History 和目标配置</p>
        <button
          type="button"
          onClick={handleAiToggle}
          disabled={!isLoggedIn || demoMode}
          role="switch"
          aria-checked={aiControlEnabled}
          className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-colors ${aiControlEnabled ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10 dark:border-brand-400' : 'border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600'} ${!isLoggedIn || demoMode ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="flex items-center gap-3 text-left">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-100 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400"><RobotIcon className="h-6 w-6" /></span>
            <div>
              <div className="text-sm font-medium text-gray-800 dark:text-gray-200">在首页显示 AI 机器人</div>
              <div className="mt-0.5 text-[10px] text-gray-400">{demoMode ? '演示模式不可使用' : !isLoggedIn ? '登录后可以启用' : aiEnabled ? '已在首页显示' : '当前已关闭'}</div>
            </div>
          </div>
          <span aria-hidden="true" className={`relative ml-3 h-6 w-11 shrink-0 rounded-full transition-colors ${aiControlEnabled ? 'bg-brand-600' : 'bg-gray-200 dark:bg-gray-600'}`}>
            <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${aiControlEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
          </span>
        </button>
        <p className="mt-3 text-[10px] leading-4 text-gray-400">开启后，可在 AI 对话框中选择模型。具体资产金额、账户、代码和备注会通过 Vercel 后端发送给所选模型服务商。</p>
        <button type="button" onClick={openAiRules} disabled={!isLoggedIn || demoMode} className="mt-3 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:border-brand-200 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-300">
          查看和修改回答规则
        </button>
        <button type="button" onClick={() => setShowAiModels(true)} disabled={!isLoggedIn || demoMode} className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:border-brand-200 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-300">
          管理 AI 模型清单
        </button>
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
          <h3 className="text-base font-semibold text-gray-800 mb-4">账号安全</h3>
          <p className="hidden sm:block -mt-2 mb-5 text-xs text-gray-400">当前登录账户：{auth?.username}</p>
          <button type="button" onClick={() => setShowChangePassword(true)}
            className="mb-3 w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:border-brand-200 hover:text-brand-600 dark:border-gray-600 dark:text-gray-300"
          >修改密码</button>
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

      <ChangePasswordDialog
        open={showChangePassword}
        onClose={() => setShowChangePassword(false)}
        onChanged={() => {
          setShowChangePassword(false)
          auth?.logout?.()
        }}
      />

      <AiModelSettingsDialog open={showAiModels} onClose={() => setShowAiModels(false)} />

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
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">启用 AI 资产助手</h3>
            <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">系统会将 Holdings、History 和目标配置中的资产金额、账户、证券代码及备注发送给当前选择的模型服务商，用于回答你的资产分析问题。</p>
            <p className="mt-2 text-xs leading-5 text-gray-400">Google 凭据、登录令牌、表格公式和模型 API Key 不会发送给模型。</p>
            <div className="mt-5 flex gap-2">
              <button type="button" onClick={() => setShowAiConsent(false)} className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 dark:border-gray-600 dark:text-gray-300">取消</button>
              <button type="button" onClick={confirmAiConsent} className="flex-1 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white">同意并启用</button>
            </div>
          </div>
        </div>
      )}

      {showAiRules && (
        <div className="fixed inset-0 z-[85] flex items-end justify-center sm:items-center sm:px-4" data-pull-refresh-ignore="true">
          <button type="button" className="fixed inset-0 bg-black/40" onClick={() => setShowAiRules(false)} aria-label="关闭AI规则设置" />
          <section role="dialog" aria-modal="true" aria-label="AI回答规则" className="relative flex h-[calc(100dvh-8px)] min-h-0 w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl dark:bg-gray-800 sm:h-auto sm:max-h-[92dvh] sm:max-w-2xl sm:rounded-2xl">
            <header className="flex shrink-0 items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-700 sm:px-5">
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">AI 回答规则</h3>
                <p className="mt-0.5 text-[10px] text-gray-400">统一保存到 Google Sheet，下一次提问生效</p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <button type="button" onClick={handleSaveAiRules} disabled={aiRulesLoading || aiRulesSaving || !aiRulesDirty || !aiRules.trim()} className="rounded-lg bg-brand-600 px-3 py-2 text-xs font-medium text-white disabled:opacity-50">{aiRulesSaving ? '保存中…' : aiRulesDirty ? '保存' : '已保存'}</button>
                <button type="button" onClick={() => setShowAiRules(false)} className="p-2 text-gray-400" aria-label="关闭"><svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 6 12 12M18 6 6 18" /></svg></button>
              </div>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5" style={{ WebkitOverflowScrolling: 'touch' }}>
              {aiRulesLoading ? <div className="py-16 text-center text-sm text-gray-400">正在读取规则…</div> : (
                <>
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">回答规则</h4>
                      <button type="button" onClick={() => updateAiRules(defaultAiRules)} className="text-xs text-brand-600 disabled:opacity-40" disabled={!defaultAiRules}>恢复默认</button>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-gray-400">统一修改助手身份、收益口径、事实边界、回答风格和分析偏好。</p>
                    <textarea value={aiRules} onChange={(event) => updateAiRules(event.target.value)} maxLength={aiRulesMaxLength} rows={18} className="mt-2 min-h-[50dvh] w-full resize-y rounded-xl border border-gray-200 bg-white p-3 text-sm leading-6 text-gray-800 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 sm:min-h-[360px]" placeholder="输入希望 AI 助手遵循的全部规则" />
                    <div className="mt-1 text-right text-[10px] text-gray-400">{aiRules.length}/{aiRulesMaxLength}</div>
                  </div>
                  {aiRulesError && <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-500 dark:bg-red-500/10">{aiRulesError}</div>}
                  {aiRulesSaved && <div className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-xs text-green-600 dark:bg-green-500/10 dark:text-green-400">已同步到 Google Sheet，旧对话已清空，下一次提问将使用新规则。</div>}
                </>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
