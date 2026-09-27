import { registerPlugin } from '@capacitor/core'

export const APP_UPDATE_CHECK_EVENT = 'youshu-check-app-update'
export const APP_UPDATE_AVAILABILITY_EVENT = 'youshu-app-update-availability'
export const APP_UPDATE_MANIFEST_URL = 'https://asset.kenny5530.asia/updates/android.json'
export const PENDING_ANDROID_UPDATE_KEY = 'youshu-pending-android-update'
export const AVAILABLE_ANDROID_UPDATE_KEY = 'youshu-available-android-update'
export const PROMPTED_ANDROID_UPDATE_KEY = 'youshu-prompted-android-update'

export const NativeUpdater = registerPlugin('Updater')

export function isNewerAndroidVersion(currentVersionCode, manifest) {
  return Number.isInteger(manifest?.versionCode) && manifest.versionCode > Number(currentVersionCode || 0)
}

export function rememberPendingAndroidUpdate(versionCode, storage = localStorage) {
  const normalized = Number(versionCode)
  if (!Number.isInteger(normalized) || normalized <= 0) return false
  storage.setItem(PENDING_ANDROID_UPDATE_KEY, String(normalized))
  return true
}

export function readPendingAndroidUpdate(storage = localStorage) {
  const normalized = Number(storage.getItem(PENDING_ANDROID_UPDATE_KEY))
  return Number.isInteger(normalized) && normalized > 0 ? normalized : null
}

export function clearPendingAndroidUpdate(storage = localStorage) {
  storage.removeItem(PENDING_ANDROID_UPDATE_KEY)
}

export function rememberAvailableAndroidUpdate(manifest, storage = localStorage) {
  if (!Number.isInteger(manifest?.versionCode) || manifest.versionCode <= 0) return null
  const update = { versionCode: manifest.versionCode, versionName: manifest.versionName || '' }
  storage.setItem(AVAILABLE_ANDROID_UPDATE_KEY, JSON.stringify(update))
  return update
}

export function readAvailableAndroidUpdate(storage = localStorage) {
  try {
    const update = JSON.parse(storage.getItem(AVAILABLE_ANDROID_UPDATE_KEY) || 'null')
    return Number.isInteger(update?.versionCode) && update.versionCode > 0 ? update : null
  } catch {
    return null
  }
}

export function clearAvailableAndroidUpdate(storage = localStorage) {
  storage.removeItem(AVAILABLE_ANDROID_UPDATE_KEY)
}

export function shouldPromptAndroidUpdate(versionCode, storage = localStorage) {
  return Number(storage.getItem(PROMPTED_ANDROID_UPDATE_KEY) || 0) !== Number(versionCode)
}

export function markAndroidUpdatePrompted(versionCode, storage = localStorage) {
  storage.setItem(PROMPTED_ANDROID_UPDATE_KEY, String(versionCode))
}

export function installedUpdateNeedsReload({ installedVersionCode, installedVersionName, bundledVersionName, pendingVersionCode }) {
  return Number(installedVersionCode) >= Number(pendingVersionCode)
    && installedVersionName !== bundledVersionName
}

export function validateUpdateManifest(manifest) {
  if (!manifest || !Number.isInteger(manifest.versionCode) || manifest.versionCode <= 0) return false
  if (!/^\d+\.\d+\.\d+$/.test(manifest.versionName || '')) return false
  if (!/^https:\/\/asset\.kenny5530\.asia\/downloads\/[a-zA-Z0-9._-]+\.apk$/.test(manifest.apkUrl || '')) return false
  if (!/^[a-f0-9]{64}$/.test(manifest.sha256 || '')) return false
  return Number.isInteger(manifest.size) && manifest.size > 0
}

export function splitUpdateNotes(notes) {
  const items = String(notes || '包含功能改进和问题修复。')
    .split(/(?:\r?\n|[；;])+/)
    .map((item) => item.trim().replace(/^\d+[.、]\s*/, ''))
    .filter(Boolean)
  return items.length ? items : ['包含功能改进和问题修复。']
}
