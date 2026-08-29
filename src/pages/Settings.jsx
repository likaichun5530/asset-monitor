import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { requestApiJson } from '../utils/api.js'
import { AI_CONSENT_KEY, clearAiMessages, getAiRules, isAiEnabled, saveAiRules, setAiEnabled } from '../utils/ai.js'
import packageJson from '../../package.json'
import RobotIcon from '../components/RobotIcon.jsx'
import ChangePasswordDialog from '../components/ChangePasswordDialog.jsx'
import AiModelSettingsDialog from '../components/AiModelSettingsDialog.jsx'

const THEME_KEY = 'youshu-theme'
const SETTINGS_SECTIONS = ['appearance', 'ai', 'security', 'about']

function SettingsSubpage({ title, description, onBack, children }) {
  return (
    <section className="mx-auto w-full max-w-2xl space-y-3" aria-label={title}>
      <header className="flex items-center gap-3 px-1">
        <button type="button" onClick={onBack} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 shadow-sm transition-colors hover:border-brand-200 hover:text-brand-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400" aria-label="返回设置一级菜单">
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6" /></svg>
        </button>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200">{title}</h2>
          <p className="mt-0.5 truncate text-[11px] text-gray-400">{description}</p>
        </div>
      </header>
      <div className="card !p-0 overflow-hidden divide-y divide-gray-100 dark:divide-gray-700">{children}</div>
    </section>
  )
}

function SettingsGroup({ title, description, children }) {
  return (
    <section className="p-4 sm:p-5">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">{title}</h3>
        {description && <p className="mt-1 text-[11px] leading-4 text-gray-400">{description}</p>}
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  )
}

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
  const navigate = useNavigate()
  const location = useLocation()
  const { section } = useParams()
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
  const activeSection = SETTINGS_SECTIONS.includes(section) && (section !== 'security' || isLoggedIn) ? section : null
  const aiControlEnabled = aiEnabled && isLoggedIn && !demoMode

  function openSection(nextSection) {
    navigate(`/settings/${nextSection}`, { state: { fromSettingsMenu: true } })
  }

  function returnToSettingsMenu() {
    if (location.state?.fromSettingsMenu) {
      navigate(-1)
      return
    }
    navigate('/settings', { replace: true })
  }

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
    <div className="space-y-6">
      {!activeSection && (
        <section aria-label="设置分类" className="card !p-0 mx-auto w-full max-w-2xl overflow-hidden divide-y divide-gray-100 dark:divide-gray-700">
          {[
            { key: 'appearance', icon: '◐', title: '数据与外观', description: '数据模式、界面主题' },
            { key: 'ai', icon: '✦', title: 'AI 与智能分析', description: '助手显示、回答规则、模型清单' },
            ...(isLoggedIn ? [{ key: 'security', icon: '◇', title: '账户与安全', description: '修改密码、退出登录' }] : []),
            { key: 'about', icon: 'ⓘ', title: '关于应用', description: '应用信息', value: `v${packageJson.version}` },
          ].map((item) => (
            <button key={item.key} type="button" onClick={() => openSection(item.key)} className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-lg font-medium text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">{item.icon}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-gray-800 dark:text-gray-200">{item.title}</span>
                <span className="mt-0.5 block truncate text-[11px] text-gray-400">{item.description}</span>
              </span>
              {item.value && <span className="shrink-0 text-xs text-gray-400">{item.value}</span>}
              <svg className="h-4 w-4 shrink-0 text-gray-300 dark:text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6" /></svg>
            </button>
          ))}
        </section>
      )}

      {activeSection === 'appearance' && (
        <SettingsSubpage title="数据与外观" description="选择数据环境和界面显示方式" onBack={returnToSettingsMenu}>
          <SettingsGroup title="数据模式" description="选择真实账户数据或演示数据">
            <div className="space-y-2">
              {[{ demo: false, icon: '📊', label: '实盘模式' }, { demo: true, icon: '🎮', label: '演示模式' }].map((option) => {
                const selected = demoMode === option.demo
                return <button key={option.label} onClick={() => { if (!selected && (option.demo || isLoggedIn)) handleDemoToggle() }} disabled={!option.demo && !isLoggedIn} className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 transition-colors ${selected ? 'border-brand-500 bg-brand-50 dark:border-brand-400 dark:bg-brand-500/10' : 'border-gray-100 hover:border-gray-200 dark:border-gray-700 dark:hover:border-gray-600'} ${!option.demo && !isLoggedIn ? 'cursor-not-allowed opacity-50' : ''}`}>
                  <span className="flex items-center gap-3"><span className="text-xl">{option.icon}</span><span className="text-sm font-medium text-gray-800 dark:text-gray-200">{option.label}</span></span>
                  {selected && <svg className="h-5 w-5 text-brand-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6 9 17l-5-5" /></svg>}
                </button>
              })}
            </div>
          </SettingsGroup>
          <SettingsGroup title="皮肤选择" description="设置界面明暗外观">
            <div className="space-y-2">
              {themes.map((item) => <button key={item.key} onClick={() => handleThemeChange(item.key)} className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 transition-colors ${theme === item.key ? 'border-brand-500 bg-brand-50 dark:border-brand-400 dark:bg-brand-500/10' : 'border-gray-100 hover:border-gray-200 dark:border-gray-700 dark:hover:border-gray-600'}`}><span className="flex items-center gap-3"><span className="text-xl">{item.icon}</span><span className="text-sm font-medium text-gray-800 dark:text-gray-200">{item.label}</span></span>{theme === item.key && <svg className="h-5 w-5 text-brand-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6 9 17l-5-5" /></svg>}</button>)}
            </div>
          </SettingsGroup>
        </SettingsSubpage>
      )}

      {activeSection === 'ai' && (
        <SettingsSubpage title="AI 与智能分析" description="管理助手显示、回答规则和模型清单" onBack={returnToSettingsMenu}>
          <SettingsGroup title="AI 资产助手" description="使用所选大模型分析 Holdings、History 和目标配置">
          <button type="button" onClick={handleAiToggle} disabled={!isLoggedIn || demoMode} role="switch" aria-checked={aiControlEnabled} className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 transition-colors ${aiControlEnabled ? 'border-brand-500 bg-brand-50 dark:border-brand-400 dark:bg-brand-500/10' : 'border-gray-100 dark:border-gray-700'} ${!isLoggedIn || demoMode ? 'cursor-not-allowed opacity-50' : ''}`}>
            <span className="flex items-center gap-3 text-left"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-100 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400"><RobotIcon className="h-6 w-6" /></span><span><span className="block text-sm font-medium text-gray-800 dark:text-gray-200">在首页显示 AI 机器人</span><span className="mt-0.5 block text-[10px] text-gray-400">{demoMode ? '演示模式不可使用' : !isLoggedIn ? '登录后可以启用' : aiEnabled ? '已在首页显示' : '当前已关闭'}</span></span></span>
            <span aria-hidden="true" className={`relative ml-3 h-6 w-11 shrink-0 rounded-full transition-colors ${aiControlEnabled ? 'bg-brand-600' : 'bg-gray-200 dark:bg-gray-600'}`}><span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${aiControlEnabled ? 'translate-x-5' : 'translate-x-0'}`} /></span>
          </button>
          <p className="mt-3 text-[10px] leading-4 text-gray-400">具体资产金额、账户、代码和备注会通过 Vercel 后端发送给所选模型服务商。</p>
          </SettingsGroup>
          <SettingsGroup title="助手配置" description="规则和模型配置会应用于后续对话">
            <button type="button" onClick={openAiRules} disabled={!isLoggedIn || demoMode} className="flex w-full items-center justify-between rounded-lg border border-gray-100 px-4 py-3 text-left text-sm font-medium text-gray-700 transition-colors hover:border-brand-200 hover:text-brand-600 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300"><span>回答规则</span><svg className="h-4 w-4 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6" /></svg></button>
            <button type="button" onClick={() => setShowAiModels(true)} disabled={!isLoggedIn || demoMode} className="flex w-full items-center justify-between rounded-lg border border-gray-100 px-4 py-3 text-left text-sm font-medium text-gray-700 transition-colors hover:border-brand-200 hover:text-brand-600 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300"><span>AI 模型清单</span><svg className="h-4 w-4 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6" /></svg></button>
          </SettingsGroup>
        </SettingsSubpage>
      )}

      {activeSection === 'security' && isLoggedIn && (
        <SettingsSubpage title="账户与安全" description="管理登录密码和当前会话" onBack={returnToSettingsMenu}>
          <SettingsGroup title="当前账户" description={`已登录：${auth?.username || ''}`}>
            <button type="button" onClick={() => setShowChangePassword(true)} className="flex w-full items-center justify-between rounded-lg border border-gray-100 px-4 py-3 text-left text-sm font-medium text-gray-700 transition-colors hover:border-brand-200 hover:text-brand-600 dark:border-gray-700 dark:text-gray-300"><span>修改密码</span><svg className="h-4 w-4 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6" /></svg></button>
            <button type="button" onClick={auth?.logout} className="flex w-full items-center justify-center rounded-lg border border-red-200 px-4 py-3 text-sm font-medium text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-500/10">退出登录</button>
          </SettingsGroup>
        </SettingsSubpage>
      )}

      {activeSection === 'about' && (
        <SettingsSubpage title="关于应用" description="应用信息和当前版本" onBack={returnToSettingsMenu}>
          <SettingsGroup title="有数" description="资产配置，心中有数">
            <div className="divide-y divide-gray-100 text-sm dark:divide-gray-700">
              <div className="flex justify-between py-3"><span className="text-gray-500">应用名称</span><span className="font-medium text-gray-800 dark:text-gray-200">有数</span></div>
              <div className="flex justify-between py-3"><span className="text-gray-500">当前版本</span><span className="text-gray-800 dark:text-gray-200">v{packageJson.version}</span></div>
            </div>
          </SettingsGroup>
        </SettingsSubpage>
      )}

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
