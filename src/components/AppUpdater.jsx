import { useCallback, useEffect, useRef, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import AppDialog from './AppDialog.jsx'
import { APP_UPDATE_CHECK_EVENT, APP_UPDATE_MANIFEST_URL, isNewerAndroidVersion, NativeUpdater, validateUpdateManifest } from '../utils/appUpdater.js'

export default function AppUpdater() {
  const [open, setOpen] = useState(false)
  const [checking, setChecking] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [current, setCurrent] = useState(null)
  const [update, setUpdate] = useState(null)
  const [message, setMessage] = useState('')
  const checkingRef = useRef(false)

  const checkForUpdate = useCallback(async ({ manual = false } = {}) => {
    if (!Capacitor.isNativePlatform() || checkingRef.current) return
    checkingRef.current = true
    setChecking(true)
    setMessage('')
    try {
      const [version, response] = await Promise.all([
        NativeUpdater.getVersion(),
        fetch(`${APP_UPDATE_MANIFEST_URL}?t=${Date.now()}`, { cache: 'no-store' }),
      ])
      if (!response.ok) throw new Error(`检查更新失败（${response.status}）`)
      const manifest = await response.json()
      if (!validateUpdateManifest(manifest)) throw new Error('服务器升级信息无效')
      setCurrent(version)
      if (isNewerAndroidVersion(version.versionCode, manifest)) {
        setUpdate(manifest)
        setOpen(true)
      } else if (manual) {
        setUpdate(null)
        setMessage(`当前已是最新版本 ${version.versionName}`)
        setOpen(true)
      }
    } catch (error) {
      if (manual) {
        setUpdate(null)
        setMessage(error.message || '检查更新失败')
        setOpen(true)
      }
    } finally {
      checkingRef.current = false
      setChecking(false)
    }
  }, [])

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined
    const timer = window.setTimeout(() => checkForUpdate(), 1600)
    const manualCheck = () => checkForUpdate({ manual: true })
    window.addEventListener(APP_UPDATE_CHECK_EVENT, manualCheck)
    let progressListener
    NativeUpdater.addListener('downloadProgress', ({ progress: nextProgress }) => setProgress(Number(nextProgress) || 0))
      .then((listener) => { progressListener = listener })
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener(APP_UPDATE_CHECK_EVENT, manualCheck)
      progressListener?.remove()
    }
  }, [checkForUpdate])

  async function installUpdate() {
    if (!update || downloading) return
    setMessage('')
    setProgress(0)
    try {
      const version = await NativeUpdater.getVersion()
      if (!version.canInstallPackages) {
        await NativeUpdater.openInstallPermission()
        setMessage('请开启“允许来自此来源的应用”，返回有数后再次点击升级。')
        return
      }
      setDownloading(true)
      await NativeUpdater.downloadAndInstall({ url: update.apkUrl, sha256: update.sha256 })
      setMessage('升级包已校验，正在打开系统安装界面。')
    } catch (error) {
      setMessage(error.message || '升级失败，请稍后重试')
    } finally {
      setDownloading(false)
    }
  }

  if (!Capacitor.isNativePlatform()) return null

  const actions = update ? (
    <button type="button" onClick={installUpdate} disabled={downloading} className="h-10 rounded-lg bg-brand-600 px-5 text-sm font-medium text-white disabled:opacity-50">
      {downloading ? `下载中 ${progress}%` : '下载并升级'}
    </button>
  ) : null

  return (
    <AppDialog open={open} onClose={() => { if (!downloading) setOpen(false) }} closeDisabled={downloading} title={update ? `发现新版本 ${update.versionName}` : '检查更新'} description={current ? `当前版本 ${current.versionName}` : undefined} ariaLabel="应用升级" maxWidth="sm:max-w-md" actions={actions}>
      {update && (
        <div className="space-y-3">
          <p className="text-sm leading-6 text-gray-600 dark:text-gray-300">{update.notes || '包含功能改进和问题修复。'}</p>
          <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700"><div className="h-full rounded-full bg-brand-600 transition-[width]" style={{ width: `${downloading ? progress : 0}%` }} /></div>
          <p className="text-xs text-gray-400">下载后会校验升级包，并由 Android 系统安装器确认覆盖安装。</p>
        </div>
      )}
      {!update && <p className="text-sm leading-6 text-gray-500 dark:text-gray-300">{checking ? '正在检查更新…' : message}</p>}
      {update && message && <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">{message}</p>}
    </AppDialog>
  )
}
