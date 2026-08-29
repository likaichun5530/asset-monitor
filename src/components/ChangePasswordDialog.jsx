import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { requestApiJson } from '../utils/api.js'
import { PASSWORD_MAX_LENGTH, validateChangePasswordForm } from '../utils/password.js'

const EMPTY_FORM = Object.freeze({ currentPassword: '', newPassword: '', confirmPassword: '' })

export default function ChangePasswordDialog({ open, onClose, onChanged }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return undefined
    setForm(EMPTY_FORM)
    setError('')
    setSuccess('')
    setSaving(false)
    const previousOverflow = document.body.style.overflow
    const previousModalOpen = document.body.dataset.modalOpen
    document.body.style.overflow = 'hidden'
    document.body.dataset.modalOpen = 'true'
    return () => {
      document.body.style.overflow = previousOverflow
      if (previousModalOpen === undefined) delete document.body.dataset.modalOpen
      else document.body.dataset.modalOpen = previousModalOpen
    }
  }, [open])

  if (!open) return null

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
    setError('')
  }

  function requestClose() {
    if (!saving && !success) onClose()
  }

  async function submit(event) {
    event.preventDefault()
    const validationError = validateChangePasswordForm(form)
    if (validationError) {
      setError(validationError)
      return
    }

    setSaving(true)
    setError('')
    try {
      const data = await requestApiJson('auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: form.currentPassword,
          newPassword: form.newPassword,
        }),
      })
      setForm(EMPTY_FORM)
      setSuccess(data.message || '密码修改成功，请重新登录')
      window.setTimeout(() => onChanged(), 900)
    } catch (requestError) {
      setError(requestError.message || '密码修改失败，请稍后重试')
    } finally {
      setSaving(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:px-4" data-pull-refresh-ignore="true">
      <button type="button" className="fixed inset-0 bg-black/40" onClick={requestClose} aria-label="关闭修改密码" />
      <section role="dialog" aria-modal="true" aria-label="修改登录密码" className="relative w-full rounded-t-2xl bg-white p-5 shadow-2xl dark:bg-gray-800 sm:max-w-sm sm:rounded-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">修改登录密码</h3>
            <p className="mt-1 text-xs text-gray-400">修改成功后，所有已登录设备需要重新登录</p>
          </div>
          <button type="button" onClick={requestClose} disabled={saving || Boolean(success)} className="p-2 text-gray-400 disabled:opacity-40" aria-label="关闭">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 6 12 12M18 6 6 18" /></svg>
          </button>
        </div>

        <form onSubmit={submit} className="mt-5 space-y-4">
          <label className="block">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-300">当前密码</span>
            <input type="password" autoComplete="current-password" value={form.currentPassword} onChange={(event) => updateField('currentPassword', event.target.value)} disabled={saving || Boolean(success)} autoFocus maxLength={512} className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100" />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-300">新密码</span>
            <input type="password" autoComplete="new-password" value={form.newPassword} onChange={(event) => updateField('newPassword', event.target.value)} disabled={saving || Boolean(success)} maxLength={PASSWORD_MAX_LENGTH} className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100" />
            <span className="mt-1 block text-[10px] text-gray-400">6～128 位，不能全部为空格或使用公开泄漏密码</span>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-300">确认新密码</span>
            <input type="password" autoComplete="new-password" value={form.confirmPassword} onChange={(event) => updateField('confirmPassword', event.target.value)} disabled={saving || Boolean(success)} maxLength={PASSWORD_MAX_LENGTH} className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100" />
          </label>

          {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-500 dark:bg-red-500/10">{error}</div>}
          {success && <div className="rounded-lg bg-green-50 px-3 py-2 text-xs text-green-600 dark:bg-green-500/10 dark:text-green-400">{success}</div>}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={requestClose} disabled={saving || Boolean(success)} className="flex-1 rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-600 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300">取消</button>
            <button type="submit" disabled={saving || Boolean(success)} className="flex-1 rounded-lg bg-brand-600 px-3 py-2.5 text-sm font-medium text-white disabled:opacity-50">{saving ? '修改中…' : success ? '修改成功' : '确认修改'}</button>
          </div>
        </form>
      </section>
    </div>,
    document.body
  )
}
