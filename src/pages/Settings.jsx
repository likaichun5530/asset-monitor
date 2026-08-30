import { useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { requestApiJson } from '../utils/api.js'
import { AI_CONSENT_KEY, clearAiMessages, getAiRules, isAiEnabled, saveAiRules, setAiEnabled } from '../utils/ai.js'
import packageJson from '../../package.json'
import RobotIcon from '../components/RobotIcon.jsx'
import ChangePasswordDialog from '../components/ChangePasswordDialog.jsx'
import AiModelSettingsDialog from '../components/AiModelSettingsDialog.jsx'
import AppDialog from '../components/AppDialog.jsx'
import SaveButton from '../components/SaveButton.jsx'
import AboutApp from '../components/AboutApp.jsx'

const THEME_KEY = 'youshu-theme'
const SETTINGS_SECTIONS = ['appearance', 'ai', 'security', 'about']

function SettingsSubpage({ title, description, onBack, className = '', children }) {
  return (
    <section className={`settings-panel-forward mx-auto w-full max-w-2xl space-y-3 ${className}`} aria-label={title}>
      <header className="hidden items-center gap-3 px-1 sm:flex">
        <button type="button" onClick={onBack} className="flex shrink-0 items-center gap-1 rounded-lg px-1 py-2 text-sm text-brand-600 transition-colors hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-500/10" aria-label="返回设置一级菜单">
          <svg className="h-[22px] w-[22px] text-gray-900 dark:text-gray-100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="m15 18-6-6 6-6" /></svg>
        </button>
        <div className="min-w-0">
          <h2 className="text-[19px] font-semibold text-gray-800 dark:text-gray-200">{title}</h2>
          <p className="mt-0.5 truncate text-[13px] text-gray-400">{description}</p>
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
        <h3 className="text-[15px] font-semibold text-gray-800 dark:text-gray-200">{title}</h3>
        {description && <p className="mt-1 text-[13px] leading-[18px] text-gray-400">{description}</p>}
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  )
}

function SettingsLineIcon({ type, className = 'h-5 w-5' }) {
  const common = { className, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }
  if (type === 'security') return <svg {...common}><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></svg>
  if (type === 'appearance') return <svg {...common}><circle cx="12" cy="12" r="8" /><path d="M12 4a8 8 0 0 0 0 16V4Z" /></svg>
  if (type === 'ai') return <svg {...common}><path d="m12 3 1.4 4.1L17.5 8.5l-4.1 1.4L12 14l-1.4-4.1-4.1-1.4 4.1-1.4L12 3Z" /><path d="m18 14 .8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8L18 14Z" /></svg>
  if (type === 'about') return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7h.01" /></svg>
  if (type === 'live') return <svg {...common}><path d="M4 19V9M9.3 19V5M14.7 19v-7M20 19V3" /></svg>
  if (type === 'demo') return <svg {...common}><rect x="3" y="7" width="18" height="11" rx="4" /><path d="M8 11v4M6 13h4M16 12h.01M18 14h.01" /></svg>
  if (type === 'light') return <svg {...common}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
  if (type === 'dark') return <svg {...common}><path d="M20 15.2A8.5 8.5 0 0 1 8.8 4a8.5 8.5 0 1 0 11.2 11.2Z" /></svg>
  return <svg {...common}><rect x="3" y="4" width="18" height="14" rx="2" /><path d="M8 22h8M12 18v4" /></svg>
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
    navigate(`/settings/${nextSection}`)
  }

  function returnToSettingsMenu() {
    navigate('/settings', { replace: true })
  }

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
    { key: 'light', label: '白天模式', icon: 'light' },
    { key: 'dark', label: '暗夜模式', icon: 'dark' },
    { key: 'system', label: '跟随系统', icon: 'system' },
  ]

  return (
    <div className="space-y-6">
      {!activeSection && (
        <section aria-label="设置分类" className="settings-panel-back card !p-0 mx-auto w-full max-w-2xl overflow-hidden divide-y divide-gray-100 dark:divide-gray-700">
          {[
            ...(isLoggedIn ? [{ key: 'security', icon: 'security', title: '账户与安全', description: '修改密码、退出登录' }] : []),
            { key: 'appearance', icon: 'appearance', title: '数据与外观', description: '数据模式、界面主题' },
            { key: 'ai', icon: 'ai', title: 'AI 与智能分析', description: '助手显示、回答规则、模型清单' },
            { key: 'about', icon: 'about', title: '关于应用', description: '应用信息', value: `v${packageJson.version}` },
          ].map((item) => (
            <button key={item.key} type="button" onClick={() => openSection(item.key)} className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"><SettingsLineIcon type={item.icon} /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-base font-medium text-gray-800 dark:text-gray-200">{item.title}</span>
                <span className="mt-0.5 block truncate text-[13px] text-gray-400">{item.description}</span>
              </span>
              {item.value && <span className="shrink-0 text-[13px] text-gray-400">{item.value}</span>}
              <svg className="h-4 w-4 shrink-0 text-gray-300 dark:text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6" /></svg>
            </button>
          ))}
        </section>
      )}

      {activeSection === 'appearance' && (
        <SettingsSubpage title="数据与外观" description="选择数据环境和界面显示方式" onBack={returnToSettingsMenu}>
          <SettingsGroup title="数据模式" description="选择真实账户数据或演示数据">
            <div className="space-y-2">
              {[{ demo: false, icon: 'live', label: '实盘模式' }, { demo: true, icon: 'demo', label: '演示模式' }].map((option) => {
                const selected = demoMode === option.demo
                return <button key={option.label} onClick={() => { if (!selected && (option.demo || isLoggedIn)) handleDemoToggle() }} disabled={!option.demo && !isLoggedIn} className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 transition-colors ${selected ? 'border-brand-500 bg-brand-50 dark:border-brand-400 dark:bg-brand-500/10' : 'border-gray-100 hover:border-gray-200 dark:border-gray-700 dark:hover:border-gray-600'} ${!option.demo && !isLoggedIn ? 'cursor-not-allowed opacity-50' : ''}`}>
                  <span className="flex items-center gap-3"><span className="text-gray-500 dark:text-gray-400"><SettingsLineIcon type={option.icon} /></span><span className="text-[15px] font-medium text-gray-800 dark:text-gray-200">{option.label}</span></span>
                  {selected && <svg className="h-5 w-5 text-brand-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6 9 17l-5-5" /></svg>}
                </button>
              })}
            </div>
          </SettingsGroup>
          <SettingsGroup title="皮肤选择" description="设置界面明暗外观">
            <div className="space-y-2">
              {themes.map((item) => <button key={item.key} onClick={() => handleThemeChange(item.key)} className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 transition-colors ${theme === item.key ? 'border-brand-500 bg-brand-50 dark:border-brand-400 dark:bg-brand-500/10' : 'border-gray-100 hover:border-gray-200 dark:border-gray-700 dark:hover:border-gray-600'}`}><span className="flex items-center gap-3"><span className="text-gray-500 dark:text-gray-400"><SettingsLineIcon type={item.icon} /></span><span className="text-[15px] font-medium text-gray-800 dark:text-gray-200">{item.label}</span></span>{theme === item.key && <svg className="h-5 w-5 text-brand-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6 9 17l-5-5" /></svg>}</button>)}
            </div>
          </SettingsGroup>
        </SettingsSubpage>
      )}

      {activeSection === 'ai' && (
        <SettingsSubpage title="AI 与智能分析" description="管理助手显示、回答规则和模型清单" onBack={returnToSettingsMenu}>
          <SettingsGroup title="AI 资产助手" description="使用所选大模型分析 Holdings、History 和目标配置">
          <button type="button" onClick={handleAiToggle} disabled={!isLoggedIn || demoMode} role="switch" aria-checked={aiControlEnabled} className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 transition-colors ${aiControlEnabled ? 'border-brand-500 bg-brand-50 dark:border-brand-400 dark:bg-brand-500/10' : 'border-gray-100 dark:border-gray-700'} ${!isLoggedIn || demoMode ? 'cursor-not-allowed opacity-50' : ''}`}>
            <span className="flex items-center gap-3 text-left"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-100 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400"><RobotIcon className="h-6 w-6" /></span><span><span className="block text-[15px] font-medium text-gray-800 dark:text-gray-200">在业务页面显示 AI 机器人</span><span className="mt-0.5 block text-[13px] text-gray-400">{demoMode ? '演示模式不可使用' : !isLoggedIn ? '登录后可以启用' : aiEnabled ? '已在业务页面显示' : '当前已关闭'}</span></span></span>
            <span aria-hidden="true" className={`relative ml-3 h-6 w-11 shrink-0 rounded-full transition-colors ${aiControlEnabled ? 'bg-brand-600' : 'bg-gray-200 dark:bg-gray-600'}`}><span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${aiControlEnabled ? 'translate-x-5' : 'translate-x-0'}`} /></span>
          </button>
          <p className="mt-3 text-[13px] leading-[18px] text-gray-400">具体资产金额、账户、代码和备注会通过 Vercel 后端发送给所选模型服务商。</p>
          </SettingsGroup>
          <SettingsGroup title="助手配置" description="规则和模型配置会应用于后续对话">
            <button type="button" onClick={openAiRules} disabled={!isLoggedIn || demoMode} className="flex w-full items-center justify-between rounded-lg border border-gray-100 px-4 py-3 text-left text-[15px] font-medium text-gray-700 transition-colors hover:border-brand-200 hover:text-brand-600 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300"><span>回答规则</span><svg className="h-4 w-4 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6" /></svg></button>
            <button type="button" onClick={() => setShowAiModels(true)} disabled={!isLoggedIn || demoMode} className="flex w-full items-center justify-between rounded-lg border border-gray-100 px-4 py-3 text-left text-[15px] font-medium text-gray-700 transition-colors hover:border-brand-200 hover:text-brand-600 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300"><span>AI 模型清单</span><svg className="h-4 w-4 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6" /></svg></button>
          </SettingsGroup>
        </SettingsSubpage>
      )}

      {activeSection === 'security' && isLoggedIn && (
        <SettingsSubpage title="账户与安全" description="管理登录密码和当前会话" onBack={returnToSettingsMenu}>
          <SettingsGroup title="当前账户" description={`已登录：${auth?.username || ''}`}>
            <button type="button" onClick={() => setShowChangePassword(true)} className="flex w-full items-center justify-between rounded-lg border border-gray-100 px-4 py-3 text-left text-[15px] font-medium text-gray-700 transition-colors hover:border-brand-200 hover:text-brand-600 dark:border-gray-700 dark:text-gray-300"><span>修改密码</span><svg className="h-4 w-4 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6" /></svg></button>
            <button type="button" onClick={auth?.logout} className="flex w-full items-center justify-center rounded-lg border border-red-200 px-4 py-3 text-[15px] font-medium text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-500/10">退出登录</button>
          </SettingsGroup>
        </SettingsSubpage>
      )}

      {activeSection === 'about' && (
        <SettingsSubpage title="关于应用" description="了解有数及主要功能" onBack={returnToSettingsMenu} className="-mt-2 sm:mt-0">
          <AboutApp version={packageJson.version} />
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
      <AppDialog open={showPwdDialog} onClose={handleCancel} title="切换回实盘模式" description="请输入账户密码验证身份" maxWidth="sm:max-w-sm" closeDisabled={pwdLoading} actions={(
        <button type="button" onClick={handleVerify} disabled={pwdLoading || !pwd} className="h-10 rounded-lg bg-brand-600 px-5 text-sm font-medium text-white transition-all active:scale-95 disabled:scale-100 disabled:opacity-50">{pwdLoading ? '验证中…' : '确认'}</button>
      )}>
        <input type="password" value={pwd} onChange={(e) => { setPwd(e.target.value); setPwdError('') }} onKeyDown={(e) => { if (e.key === 'Enter') handleVerify() }} placeholder="输入密码" className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200" autoFocus />
        {pwdError && <p className="mt-3 text-xs text-red-500">{pwdError}</p>}
      </AppDialog>

      <AppDialog open={showAiConsent} onClose={() => setShowAiConsent(false)} title="启用 AI 资产助手" maxWidth="sm:max-w-sm" actions={(
        <button type="button" onClick={confirmAiConsent} className="h-10 rounded-lg bg-brand-600 px-5 text-sm font-medium text-white transition-all active:scale-95">同意并启用</button>
      )}>
        <p className="text-sm leading-6 text-gray-500 dark:text-gray-400">系统会将 Holdings、History 和目标配置中的资产金额、账户、证券代码及备注发送给当前选择的模型服务商，用于回答你的资产分析问题。</p>
        <p className="mt-2 text-xs leading-5 text-gray-400">Google 凭据、登录令牌、表格公式和模型 API Key 不会发送给模型。</p>
      </AppDialog>

      <AppDialog
        open={showAiRules}
        onClose={() => setShowAiRules(false)}
        title="AI 回答规则"
        description="账户配置 · 下一次提问生效"
        ariaLabel="AI回答规则"
        actions={<SaveButton saving={aiRulesSaving} saved={aiRulesSaved} disabled={aiRulesLoading || !aiRulesDirty || !aiRules.trim()} onClick={handleSaveAiRules} savedText="规则已保存" />}
      >
              {aiRulesLoading ? <div className="py-16 text-center text-sm text-gray-400">正在读取规则…</div> : (
                <>
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">回答规则</h4>
                      <button type="button" onClick={() => updateAiRules(defaultAiRules)} className="text-xs text-brand-600 disabled:opacity-40" disabled={!defaultAiRules}>恢复默认</button>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-gray-400">统一修改助手身份、收益口径、事实边界、回答风格和分析偏好。</p>
                    <textarea value={aiRules} onChange={(event) => updateAiRules(event.target.value)} maxLength={aiRulesMaxLength} rows={18} className="mt-2 min-h-[50dvh] w-full resize-y rounded-xl border border-gray-200 bg-white p-3 text-sm leading-6 text-gray-800 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 sm:min-h-[360px]" placeholder="输入希望 AI 助手遵循的全部规则" />
                    <div className="mt-1 text-right text-xs text-gray-400">{aiRules.length}/{aiRulesMaxLength}</div>
                  </div>
                  {aiRulesError && <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-500 dark:bg-red-500/10">{aiRulesError}</div>}
                </>
              )}
      </AppDialog>
    </div>
  )
}
