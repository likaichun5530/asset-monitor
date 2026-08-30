import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import RobotIcon from './RobotIcon.jsx'
import {
  AI_MESSAGES_KEY,
  AI_MESSAGES_CLEARED_EVENT,
  AI_MODEL_CHANGED_EVENT,
  AI_MODEL_KEY,
  AI_MODEL_OPTIONS,
  AI_WEB_SEARCH_KEY,
  AI_SETTING_EVENT,
  cacheAiModel,
  getAiModels,
  getAiModelOption,
  getCachedAiModel,
  isAiEnabled,
  setAiEnabled,
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
const AI_BUSINESS_PAGES = new Set(Object.keys(PAGE_PROMPTS))

const AI_BUTTON_POSITION_KEY = 'youshu-ai-button-position'
const BUTTON_SIZE = 44
const EDGE_GAP = 8

function clampButtonPosition(position) {
  if (typeof window === 'undefined') return { x: EDGE_GAP, y: 56 }
  return {
    x: Math.min(Math.max(position.x, EDGE_GAP), Math.max(EDGE_GAP, window.innerWidth - BUTTON_SIZE - EDGE_GAP)),
    y: Math.min(Math.max(position.y, EDGE_GAP), Math.max(EDGE_GAP, window.innerHeight - BUTTON_SIZE - EDGE_GAP)),
  }
}

function snapButtonToEdge(position) {
  if (typeof window === 'undefined') return { x: EDGE_GAP, y: 56 }
  const clamped = clampButtonPosition(position)
  return {
    x: clamped.x + BUTTON_SIZE / 2 < window.innerWidth / 2
      ? EDGE_GAP
      : Math.max(EDGE_GAP, window.innerWidth - BUTTON_SIZE - EDGE_GAP),
    y: clamped.y,
  }
}

function loadButtonPosition() {
  if (typeof window === 'undefined') return { x: EDGE_GAP, y: 56 }
  try {
    const saved = JSON.parse(localStorage.getItem(AI_BUTTON_POSITION_KEY) || 'null')
    if (Number.isFinite(saved?.xRatio) && Number.isFinite(saved?.yRatio)) {
      return snapButtonToEdge({ x: saved.xRatio * window.innerWidth, y: saved.yRatio * window.innerHeight })
    }
  } catch {
    // Ignore malformed local preferences.
  }
  return snapButtonToEdge({ x: window.innerWidth, y: window.innerWidth >= 640 ? 80 : 56 })
}

function saveButtonPosition(position) {
  if (typeof window === 'undefined') return
  localStorage.setItem(AI_BUTTON_POSITION_KEY, JSON.stringify({
    xRatio: position.x / window.innerWidth,
    yRatio: position.y / window.innerHeight,
  }))
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
  const [selectedModel, setSelectedModel] = useState(getCachedAiModel)
  const [aiModels, setAiModels] = useState(AI_MODEL_OPTIONS)
  const [actualModel, setActualModel] = useState(null)
  const [modelMenuOpen, setModelMenuOpen] = useState(false)
  const [webSearch, setWebSearch] = useState(() => {
    try { return localStorage.getItem(AI_WEB_SEARCH_KEY) === 'true' } catch { return false }
  })
  const [buttonPosition, setButtonPosition] = useState(loadButtonPosition)
  const [buttonDragging, setButtonDragging] = useState(false)
  const [showDismissButton, setShowDismissButton] = useState(false)
  const scrollRef = useRef(null)
  const abortRef = useRef(null)
  const dragRef = useRef(null)
  const longPressTimerRef = useRef(null)
  const longPressTriggeredRef = useRef(false)
  const suppressClickRef = useRef(false)
  const historyEntryRef = useRef(false)
  const modelMenuRef = useRef(null)
  const currentPageRef = useRef(location.pathname)
  const demoMode = typeof window !== 'undefined' && localStorage.getItem('youshu-demo-mode') === 'true'
  const visible = enabled && auth?.isLoggedIn && !demoMode && AI_BUSINESS_PAGES.has(location.pathname)
  const prompts = useMemo(() => PAGE_PROMPTS[location.pathname] || PAGE_PROMPTS['/'], [location.pathname])

  const close = useCallback(() => {
    abortRef.current?.abort()
    if (historyEntryRef.current) {
      historyEntryRef.current = false
      history.back()
    }
    setOpen(false)
    setLoading(false)
  }, [])

  useEffect(() => {
    const onSetting = (event) => {
      const nextEnabled = Boolean(event.detail?.enabled)
      setEnabled(nextEnabled)
      if (!nextEnabled) close()
    }
    const onStorage = (event) => {
      if (event.key === 'youshu-ai-enabled') {
        const nextEnabled = event.newValue === 'true'
        setEnabled(nextEnabled)
        if (!nextEnabled) close()
      }
      if (event.key === AI_MODEL_KEY) {
        setSelectedModel(getAiModelOption(event.newValue, aiModels).id)
      }
    }
    const onMessagesCleared = () => {
      abortRef.current?.abort()
      setMessages([])
      setError('')
      setDataAsOf(null)
      setActualModel(null)
      setLoading(false)
    }
    const onModelChanged = (event) => {
      setSelectedModel(getAiModelOption(event.detail?.model, aiModels).id)
    }
    window.addEventListener(AI_SETTING_EVENT, onSetting)
    window.addEventListener(AI_MESSAGES_CLEARED_EVENT, onMessagesCleared)
    window.addEventListener(AI_MODEL_CHANGED_EVENT, onModelChanged)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(AI_SETTING_EVENT, onSetting)
      window.removeEventListener(AI_MESSAGES_CLEARED_EVENT, onMessagesCleared)
      window.removeEventListener(AI_MODEL_CHANGED_EVENT, onModelChanged)
      window.removeEventListener('storage', onStorage)
    }
  }, [aiModels, close])

  useEffect(() => {
    if (!visible && open) close()
  }, [close, open, visible])

  useEffect(() => {
    currentPageRef.current = location.pathname
    if (!loading) return
    abortRef.current?.abort()
    setLoading(false)
    setError('')
    setMessages((current) => current.at(-1)?.role === 'assistant' && !current.at(-1)?.content ? current.slice(0, -1) : current)
  }, [location.pathname])

  useEffect(() => { saveAiMessages(messages) }, [messages])

  useEffect(() => {
    if (!visible) return undefined
    let active = true
    getAiModels().then(({ models }) => {
      if (!active) return
      setAiModels(models)
      setSelectedModel((current) => {
        const next = models.some((model) => model.id === current) ? current : cacheAiModel(models[0].id)
        return next
      })
    }).catch(() => {})
    return () => { active = false }
  }, [visible])

  useEffect(() => {
    if (!open || !visible) return undefined
    document.body.dataset.modalOpen = 'true'
    const scrollY = window.scrollY
    const previousBody = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
    }
    const previousHtmlOverflow = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollY}px`
    document.body.style.width = '100%'
    return () => {
      delete document.body.dataset.modalOpen
      document.documentElement.style.overflow = previousHtmlOverflow
      Object.assign(document.body.style, previousBody)
      window.scrollTo(0, scrollY)
    }
  }, [open, visible])

  useEffect(() => {
    const handleResize = () => setButtonPosition((current) => {
      const next = snapButtonToEdge(current)
      saveButtonPosition(next)
      return next
    })
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (!open) return undefined
    history.pushState({ ...(history.state || {}), youshuAiAssistant: true }, '', window.location.href)
    historyEntryRef.current = true
    const handlePopState = () => {
      if (!historyEntryRef.current) return
      historyEntryRef.current = false
      abortRef.current?.abort()
      setLoading(false)
      setOpen(false)
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [open])

  useEffect(() => {
    if (open) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, open])

  useEffect(() => () => abortRef.current?.abort(), [])

  useEffect(() => () => clearTimeout(longPressTimerRef.current), [])

  useEffect(() => {
    if (!modelMenuOpen) return undefined
    const closeModelMenu = (event) => {
      if (!modelMenuRef.current?.contains(event.target)) setModelMenuOpen(false)
    }
    document.addEventListener('pointerdown', closeModelMenu)
    return () => document.removeEventListener('pointerdown', closeModelMenu)
  }, [modelMenuOpen])

  useEffect(() => {
    if (location.pathname !== '/') setShowDismissButton(false)
  }, [location.pathname])

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
    const requestPage = location.pathname
    let answer = ''
    try {
      const meta = await streamAiChat(requestMessages, requestPage, (chunk) => {
        if (currentPageRef.current !== requestPage) return
        answer += chunk
        setMessages([...requestMessages, { role: 'assistant', content: answer }])
      }, { signal: controller.signal, model: selectedModelOption, webSearch })
      if (currentPageRef.current !== requestPage) return
      setDataAsOf(meta.dataAsOf)
      setSelectedModel(meta.selectionId)
      setActualModel(meta.model)
      if (!answer.trim()) throw new Error('AI没有返回有效内容，请重试')
    } catch (requestError) {
      if (currentPageRef.current === requestPage) {
        if (requestError?.name !== 'AbortError') setError(requestError?.message || 'AI分析失败')
        setMessages(requestMessages)
      }
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null
        setLoading(false)
      }
    }
  }

  const handleButtonPointerDown = (event) => {
    if (event.button !== undefined && event.button !== 0) return
    event.currentTarget.setPointerCapture?.(event.pointerId)
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: buttonPosition.x,
      originY: buttonPosition.y,
      moved: false,
    }
    longPressTriggeredRef.current = false
    clearTimeout(longPressTimerRef.current)
    longPressTimerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true
      suppressClickRef.current = true
      setShowDismissButton(true)
      navigator.vibrate?.(30)
    }, 550)
  }

  const handleButtonPointerMove = (event) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const deltaX = event.clientX - drag.startX
    const deltaY = event.clientY - drag.startY
    if (!drag.moved && Math.hypot(deltaX, deltaY) < 5) return
    clearTimeout(longPressTimerRef.current)
    drag.moved = true
    setButtonDragging(true)
    suppressClickRef.current = true
    setButtonPosition(clampButtonPosition({ x: drag.originX + deltaX, y: drag.originY + deltaY }))
  }

  const handleButtonPointerEnd = (event) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    clearTimeout(longPressTimerRef.current)
    dragRef.current = null
    setButtonDragging(false)
    if (drag.moved) {
      setButtonPosition((current) => {
        const next = snapButtonToEdge(current)
        saveButtonPosition(next)
        return next
      })
    }
  }

  const handleButtonClick = () => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }
    if (showDismissButton || longPressTriggeredRef.current) {
      setShowDismissButton(false)
      return
    }
    setOpen(true)
  }

  const disableAssistant = (event) => {
    event.stopPropagation()
    clearTimeout(longPressTimerRef.current)
    setShowDismissButton(false)
    setAiEnabled(false)
    setEnabled(false)
  }

  const clearMessages = () => {
    abortRef.current?.abort()
    setMessages([])
    setError('')
    setDataAsOf(null)
    setActualModel(null)
    localStorage.removeItem(AI_MESSAGES_KEY)
  }

  const handleModelChange = (modelId) => {
    if (loading) return
    const next = cacheAiModel(modelId)
    setModelMenuOpen(false)
    if (next === selectedModel) return
    setSelectedModel(next)
    clearMessages()
  }

  const handleWebSearchToggle = () => {
    if (loading) return
    setWebSearch((current) => {
      const next = !current
      localStorage.setItem(AI_WEB_SEARCH_KEY, next ? 'true' : 'false')
      return next
    })
  }

  const selectedModelOption = getAiModelOption(selectedModel, aiModels)

  return (
    <>
      {!open && (
        <div
          className={`fixed z-40 h-11 w-11 ${buttonDragging ? '' : 'transition-[left,top] duration-200 ease-out'}`}
          style={{ left: `${buttonPosition.x}px`, top: `${buttonPosition.y}px` }}
          data-pull-refresh-ignore="true"
        >
          <button
            type="button"
            onClick={handleButtonClick}
            onPointerDown={handleButtonPointerDown}
            onPointerMove={handleButtonPointerMove}
            onPointerUp={handleButtonPointerEnd}
            onPointerCancel={handleButtonPointerEnd}
            className={`flex h-11 w-11 touch-none select-none items-center justify-center rounded-xl bg-transparent drop-shadow-[0_5px_7px_rgba(79,70,229,0.28)] outline-none transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-brand-400 ${showDismissButton ? 'scale-105' : ''}`}
            title="有数资产管理助手"
            aria-label="打开有数资产管理助手"
          >
            <RobotIcon className="h-11 w-11" />
          </button>
          {showDismissButton && (
            <button
              type="button"
              onClick={disableAssistant}
              className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-gray-800 text-sm font-bold leading-none text-white shadow-md dark:border-gray-900"
              aria-label="关闭AI机器人"
              title="关闭AI机器人"
            >×</button>
          )}
        </div>
      )}

      {open && (
        <>
          <button type="button" className="fixed inset-0 z-[65] bg-black/30 sm:bg-black/10" aria-label="关闭AI资产助手" onClick={close} />
          <section role="dialog" aria-modal="true" aria-label="有数资产管理助手" className="fixed inset-x-0 bottom-0 z-[70] flex max-h-[88dvh] min-h-[68dvh] flex-col overflow-hidden overscroll-none rounded-t-2xl bg-white shadow-2xl dark:bg-gray-800 sm:inset-x-auto sm:bottom-5 sm:right-5 sm:top-20 sm:h-auto sm:max-h-none sm:min-h-0 sm:w-[400px] sm:rounded-2xl" data-pull-refresh-ignore="true">
            <header className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-700">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"><RobotIcon className="h-5 w-5" /></span>
                <div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">有数资产管理助手</div>
                  <div className="text-[10px] text-gray-400">{actualModel ? `${actualModel}${dataAsOf ? ` · 数据截至 ${dataAsOf}` : ''}` : '发送问题时读取最新资产数据'}</div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {messages.length > 0 && <button type="button" onClick={clearMessages} className="p-2 text-xs text-gray-400 hover:text-gray-600" title="清空对话">清空</button>}
                <button type="button" onClick={close} className="p-2 text-gray-400 hover:text-gray-600" aria-label="关闭AI资产助手"><svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 6 12 12M18 6 6 18" /></svg></button>
              </div>
            </header>

            <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">
              {messages.length === 0 && (
                <div>
                  <div className="rounded-xl bg-gray-50 p-3 text-xs leading-5 text-gray-500 dark:bg-gray-900/40 dark:text-gray-400">
                    我是您的专属资产管理助手，有什么要求，您尽管吩咐。
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
              <div ref={modelMenuRef} className="relative mt-2 flex items-center gap-2 px-1">
                <span className="shrink-0 text-[10px] text-gray-400">模型</span>
                <button
                  type="button"
                  onClick={() => setModelMenuOpen((current) => !current)}
                  disabled={loading}
                  aria-haspopup="listbox"
                  aria-expanded={modelMenuOpen}
                  className="flex min-w-0 flex-1 items-center justify-between gap-2 bg-transparent text-left text-[11px] font-medium text-gray-600 outline-none disabled:opacity-50 dark:text-gray-300"
                >
                  <span className="truncate">{selectedModelOption.label}</span>
                  <span className={`shrink-0 text-[9px] text-gray-400 transition-transform ${modelMenuOpen ? 'rotate-180' : ''}`}>⌄</span>
                </button>
                <button type="button" onClick={handleWebSearchToggle} disabled={loading} role="switch" aria-checked={webSearch} className={`flex shrink-0 items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-medium transition-colors disabled:opacity-50 ${webSearch ? 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400' : 'text-gray-400'}`} title="允许当前模型搜索互联网实时信息">
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3.4 3 14.6 0 18M12 3c-3 3.4-3 14.6 0 18" /></svg>
                  联网{webSearch ? '开' : '关'}
                </button>
                {modelMenuOpen && (
                  <div role="listbox" aria-label="选择 AI 模型" className="absolute bottom-full left-0 right-0 mb-2 overflow-hidden rounded-xl border border-gray-200 bg-white p-1 shadow-xl dark:border-gray-600 dark:bg-gray-700">
                    {aiModels.map((model) => (
                      <button
                        key={model.id}
                        type="button"
                        role="option"
                        aria-selected={selectedModel === model.id}
                        onClick={() => handleModelChange(model.id)}
                        className={`flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 text-left ${selectedModel === model.id ? 'bg-brand-50 dark:bg-brand-500/10' : 'hover:bg-gray-50 dark:hover:bg-gray-600'}`}
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-[14px] font-medium leading-5 text-gray-700 dark:text-gray-200">{model.label}</span>
                          <span className="block truncate text-[11px] leading-4 text-gray-400">{model.description}</span>
                        </span>
                        {selectedModel === model.id && <span className="shrink-0 text-[10px] text-brand-600">✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </footer>
          </section>
        </>
      )}
    </>
  )
}
