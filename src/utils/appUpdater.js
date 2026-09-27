import { registerPlugin } from '@capacitor/core'

export const APP_UPDATE_CHECK_EVENT = 'youshu-check-app-update'
export const APP_UPDATE_MANIFEST_URL = 'https://asset.kenny5530.asia/updates/android.json'

export const NativeUpdater = registerPlugin('Updater')

export function isNewerAndroidVersion(currentVersionCode, manifest) {
  return Number.isInteger(manifest?.versionCode) && manifest.versionCode > Number(currentVersionCode || 0)
}

export function validateUpdateManifest(manifest) {
  if (!manifest || !Number.isInteger(manifest.versionCode) || manifest.versionCode <= 0) return false
  if (!/^\d+\.\d+\.\d+$/.test(manifest.versionName || '')) return false
  if (!/^https:\/\/asset\.kenny5530\.asia\/downloads\/[a-zA-Z0-9._-]+\.apk$/.test(manifest.apkUrl || '')) return false
  if (!/^[a-f0-9]{64}$/.test(manifest.sha256 || '')) return false
  return Number.isInteger(manifest.size) && manifest.size > 0
}
