import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

let dialogSequence = 0

export default function AppDialog({ open, onClose, title, description, actions, children, ariaLabel = title, maxWidth = 'sm:max-w-2xl', closeDisabled = false }) {
  const dialogIdRef = useRef('')
  const closeRef = useRef(onClose)
  const closeDisabledRef = useRef(closeDisabled)
  closeRef.current = onClose
  closeDisabledRef.current = closeDisabled

  useEffect(() => {
    if (!open) return undefined
    const dialogId = `youshu-dialog-${++dialogSequence}`
    dialogIdRef.current = dialogId
    const scrollY = window.scrollY
    const body = document.body
    const html = document.documentElement
    const previous = {
      bodyOverflow: body.style.overflow,
      bodyOverscroll: body.style.overscrollBehavior,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyWidth: body.style.width,
      htmlOverflow: html.style.overflow,
      modalOpen: body.dataset.modalOpen,
    }

    body.dataset.modalOpen = 'true'
    body.style.overflow = 'hidden'
    body.style.overscrollBehavior = 'none'
    body.style.position = 'fixed'
    body.style.top = `-${scrollY}px`
    body.style.width = '100%'
    html.style.overflow = 'hidden'
    window.history.pushState({ ...window.history.state, youshuDialog: dialogId }, '', window.location.href)

    const handlePopState = () => {
      if (dialogIdRef.current !== dialogId) return
      if (closeDisabledRef.current) {
        window.history.pushState({ ...window.history.state, youshuDialog: dialogId }, '', window.location.href)
        return
      }
      const closeResult = closeRef.current?.()
      if (closeResult === false) {
        window.history.pushState({ ...window.history.state, youshuDialog: dialogId }, '', window.location.href)
        return
      }
      dialogIdRef.current = ''
    }
    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
      if (dialogIdRef.current === dialogId && window.history.state?.youshuDialog === dialogId) {
        dialogIdRef.current = ''
        window.history.back()
      }
      body.style.overflow = previous.bodyOverflow
      body.style.overscrollBehavior = previous.bodyOverscroll
      body.style.position = previous.bodyPosition
      body.style.top = previous.bodyTop
      body.style.width = previous.bodyWidth
      html.style.overflow = previous.htmlOverflow
      if (previous.modalOpen === undefined) delete body.dataset.modalOpen
      else body.dataset.modalOpen = previous.modalOpen
      window.scrollTo(0, scrollY)
    }
  }, [open])

  if (!open) return null

  const requestClose = () => {
    if (closeDisabled) return
    const dialogId = dialogIdRef.current
    if (dialogId && window.history.state?.youshuDialog === dialogId) {
      window.history.back()
    } else {
      dialogIdRef.current = ''
      onClose?.()
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[86] flex items-end justify-center overflow-hidden overscroll-none sm:items-center sm:px-4" data-pull-refresh-ignore="true">
      <button type="button" className="fixed inset-0 touch-none bg-black/40" onClick={requestClose} aria-label={`关闭${ariaLabel || ''}`} />
      <section role="dialog" aria-modal="true" aria-label={ariaLabel} className={`relative flex h-[100dvh] min-h-0 w-full flex-col overflow-hidden overscroll-none bg-white shadow-2xl dark:bg-gray-800 sm:h-auto sm:max-h-[92dvh] sm:rounded-2xl ${maxWidth}`}>
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-100 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800 sm:px-5">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
            {description && <p className="mt-0.5 truncate text-xs text-gray-400">{description}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {actions && <div className="hidden sm:block">{actions}</div>}
            <button type="button" onClick={requestClose} disabled={closeDisabled} className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 disabled:opacity-40 dark:hover:bg-gray-700" aria-label="关闭">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 6 12 12M18 6 6 18" /></svg>
            </button>
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 pb-[calc(env(safe-area-inset-bottom)+16px)] sm:px-5" style={{ WebkitOverflowScrolling: 'touch' }}>
          {children}
        </div>
        {actions && (
          <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-gray-100 bg-white px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 dark:border-gray-700 dark:bg-gray-800 sm:hidden">
            <button type="button" onClick={requestClose} disabled={closeDisabled} className="h-10 min-w-20 rounded-lg border border-gray-200 px-4 text-sm font-medium text-gray-600 disabled:opacity-40 dark:border-gray-600 dark:text-gray-300">取消</button>
            {actions}
          </footer>
        )}
      </section>
    </div>,
    document.body,
  )
}
