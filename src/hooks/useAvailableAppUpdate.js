import { useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { APP_UPDATE_AVAILABILITY_EVENT, readAvailableAndroidUpdate } from '../utils/appUpdater.js'

export default function useAvailableAppUpdate() {
  const isNativeApp = Capacitor.isNativePlatform()
  const [availableUpdate, setAvailableUpdate] = useState(() => (
    isNativeApp ? readAvailableAndroidUpdate() : null
  ))

  useEffect(() => {
    if (!isNativeApp) return undefined
    const handleAvailability = (event) => setAvailableUpdate(event.detail || null)
    window.addEventListener(APP_UPDATE_AVAILABILITY_EVENT, handleAvailability)
    return () => window.removeEventListener(APP_UPDATE_AVAILABILITY_EVENT, handleAvailability)
  }, [isNativeApp])

  return availableUpdate
}
