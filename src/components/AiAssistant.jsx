import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import {
  AI_MESSAGES_KEY,
  AI_SETTING_EVENT,
  isAiEnabled,
  loadAiMessages,
  saveAiMessages,
  streamAiChat,
} from '../utils/ai.js'

const PAGE_PROMPTS = {
  '/': ['总结我的资产状况', '最近30天有哪些变化', '我当前最大的配置风险是什么'],
  '/holdings': ['检查我的持仓集中度', '分析账户和币种风险', '哪些持仓占比最高'],
  '/target': ['分析当前超配和低配', '给出调仓优先顺序', '哪些类别最偏离目标'],
  '/market': ['结合持仓分析币种风险', '哪些资产受汇率影响较大'],
  '/us': ['分析我的美股配置', '美股账户有哪些集中风险'],
  '/cn': ['分析我的A股配置', 'A股持仓有哪些集中风险'],
  '/hk': ['分析我的港股配置', '港股持仓有哪些集中风险'],
  '/jp': ['分析我的日股配置', '日股持仓有哪些集中风险'],
  '/gold': ['分析黄金配置是否合理', '黄金距离目标还有多少'],
  '/bond': ['分析债基配置是否合理', '债基距离目标还有多少'],
  '/crypto': ['分析虚拟币配置风险', '虚拟币距离目标还有多少'],
  '/future': ['分析期货配置风险', '期货仓位对组合有什么影响'],
  '/cash': ['分析现金配置', '现金是否高于或低于目标'],
}

function RobotIcon({ className = 'h-6 w-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="7" width="16" height="13" rx="4" />
      <path d="M12 3v4M9 3h6M8 12h.01M16 12h.01M8 16h8" />
    </svg>
  )
}

export default function AiAssistant({ auth } = {}) {
  const location = useLocation()
  const [enabled, setEnabled] = useState(() => isAiEnabled())
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState(() => loadAiMessages())
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [dataAsOf, setDataAsOf] = useState(null)
  const scrollRef = useRef(null)
  const abortRef = useRef(null)
  const demoMode = typeof window !== 'undefined' && localStorage.getItem('youshu-demo-mode') === 'true'
  const visible = enabled && auth?.isLoggedIn && !demoMode
  const prompts = useMemo(() => PAGE_PROMPTS[location.pathname] || PAGE_PROMPTS['/'], [location.pathname])

  useEffect(() => {
    const onSetting = (event) => {
      const nextEnabled = Boolean(event.detail?.enabled)
      setEnabled(nextEnabled)
      if (!nextEnabled) setOpen(false)
    }
    const onStorage = (event) => {
      if (event.key === 'youshu-ai-enabled') setEnabled(event.newValue === 'true')
    }
    window.addEventListener(AI_SETTING_EVENT, onSetting)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(AI_SETTING_EVENT, onSetting)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  useEffect(() => { saveAiMessages(messages) }, [messages])

  useEffect(() => {
    if (!open || !visible) return undefined
    document.body.dataset.modalOpen = 'true'
    return () => { delete document.body.dataset.modalOpen }
  }, [open, visible])

  useEffect(() => {
    if (open) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, open])

  useEffect(() => () => abortRef.current?.abort(), [])

  if (!visible) return null

  const sendMessage = async (preset) => {
    const question = String(preset ?? input).trim()
    if (!question || loading) return
    setInput('')
    setError('')
    const requestMessages = [...messages, { role: 'user', content: question }]
    setMessages([...requestMessages, { role: 'assistant', content: '' }])
    setLoading(true)
    const controller = new AbortController()
    abortRef.current = controller
    let answer = ''
    try {
      const meta = await streamAiChat(requestMessages, location.pathname, (chunk) => {
        answer += chunk
        setMessages([...requestMessages, { role: 'assistant', content: answer }])
      }, { signal: controller.signal })
      setDataAsOf(meta.dataAsOf)
      if (!answer.trim()) throw new Error('AI没有返回有效内容，请重试')
    } catch (requestError) {
      if (requestError?.name !== 'AbortError') setError(requestError?.message || 'AI分析失败')
      setMessages(requestMessages)
    } finally {
      abortRef.current = null
      setLoading(false)
    }
  }

  const close = () => {
    abortRef.current?.abort()
    setOpen(false)
    setLoading(false)
  }

  const clearMessages = () => {
    abortRef.current?.abort()
    setMessages([])
    setError('')
    setDataAsOf(null)
    localStorage.removeItem(AI_MESSAGES_KEY)
  }

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed right-3 top-14 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg shadow-brand-600/25 transition hover:-translate-y-0.5 hover:bg-brand-700 sm:right-5 sm:top-20"
          title="AI资产助手"
          aria-label="打开AI资产助手"
          data-pull-refresh-ignore="true"
        >
          <RobotIcon />
        </button>
      )}

      {open && (
        <>
          <button type="button" className="fixed inset-0 z-[65] bg-black/30 sm:bg-black/10" aria-label="关闭AI资产助手" onClick={close} />
          <section className="fixed inset-x-0 bottom-0 z-[70] flex max-h-[88vh] min-h-[68vh] flex-col rounded-t-2xl bg-white shadow-2xl dark:bg-gray-800 sm:inset-x-auto sm:bottom-5 sm:right-5 sm:top-20 sm:h-auto sm:max-h-none sm:min-h-0 sm:w-[400px] sm:rounded-2xl" data-pull-refresh-ignore="true">
            <header className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-700">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"><RobotIcon className="h-5 w-5" /></span>
                <div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">DeepSeek 资产助手</div>
                  <div className="text-[10px] text-gray-400">{dataAsOf ? `数据截至 ${dataAsOf}` : '发送问题时读取最新资产数据'}</div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {messages.length > 0 && <button type="button" onClick={clearMessages} className="p-2 text-xs text-gray-400 hover:text-gray-600" title="清空对话">清空</button>}
                <button type="button" onClick={close} className="p-2 text-gray-400 hover:text-gray-600" aria-label="关闭AI资产助手"><svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 6 12 12M18 6 6 18" /></svg></button>
              </div>
            </header>

            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
              {messages.length === 0 && (
                <div>
                  <div className="rounded-xl bg-gray-50 p-3 text-xs leading-5 text-gray-500 dark:bg-gray-900/40 dark:text-gray-400">
                    我会读取 Holdings、History 和目标配置来回答。资产金额、账户、代码和备注会发送给 DeepSeek，请勿在问题中填写密码或API密钥。
                  </div>
                  <div className="mt-4 text-xs font-medium text-gray-500">你可以这样问</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {prompts.map((prompt) => <button key={prompt} type="button" onClick={() => sendMessage(prompt)} className="rounded-full border border-brand-100 bg-brand-50 px-3 py-1.5 text-xs text-brand-700 hover:border-brand-200 dark:border-brand-500/20 dark:bg-brand-500/10 dark:text-brand-400">{prompt}</button>)}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {messages.map((message, index) => (
                  <div key={`${message.role}-${index}`} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[88%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-sm leading-6 ${message.role === 'user' ? 'rounded-br-md bg-brand-600 text-white' : 'rounded-bl-md bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'}`}>
                      {message.content || (loading && index === messages.length - 1 ? <span className="inline-flex gap-1"><i className="h-1.5 w-1.5 animate-pulse rounded-full bg-gray-400" /><i className="h-1.5 w-1.5 animate-pulse rounded-full bg-gray-400 [animation-delay:150ms]" /><i className="h-1.5 w-1.5 animate-pulse rounded-full bg-gray-400 [animation-delay:300ms]" /></span> : '')}
                    </div>
                  </div>
                ))}
              </div>
              {error && <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-500 dark:bg-red-500/10">{error}</div>}
            </div>

            <footer className="border-t border-gray-100 bg-white px-3 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 dark:border-gray-700 dark:bg-gray-800 sm:pb-3">
              <div className="flex items-end gap-2 rounded-xl border border-gray-200 bg-gray-50 p-1.5 focus-within:border-brand-300 dark:border-gray-600 dark:bg-gray-700">
                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value.slice(0, 1000))}
                  onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendMessage() } }}
                  rows={1}
                  placeholder="询问你的资产情况…"
                  disabled={loading}
                  className="max-h-24 min-h-[36px] flex-1 resize-none bg-transparent px-2 py-2 text-sm text-gray-800 outline-none placeholder:text-gray-400 disabled:opacity-60 dark:text-gray-100"
                />
                <button type="button" onClick={() => sendMessage()} disabled={loading || !input.trim()} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white disabled:opacity-40" aria-label="发送问题">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></svg>
                </button>
              </div>
              <div className="mt-1.5 text-center text-[9px] text-gray-400">仅供资产整理与风险分析参考，不构成投资建议</div>
            </footer>
          </section>
        </>
      )}
    </>
  )
}
