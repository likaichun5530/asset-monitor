import { useCallback, useEffect, useRef, useState } from 'react'
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { App as CapacitorApp } from '@capacitor/app'
import Layout from './components/Layout.jsx'
import Home from './pages/Home.jsx'
import Holdings from './pages/Holdings.jsx'
import Target from './pages/Target.jsx'
import Cash from './pages/Cash.jsx'
import Future from './pages/Future.jsx'
import Market from './pages/Market.jsx'
import AssetDetail from './pages/AssetDetail.jsx'
import Login from './pages/Login.jsx'
import { useAssetData } from './hooks/useAssetData.js'
import { useAuth } from './hooks/useAuth.js'
import Settings, { initTheme } from './pages/Settings.jsx'
import { fetchTarget } from './utils/dataStore.js'
import { refreshFuturesData, refreshMarketData } from './utils/quoteData.js'
import { getPageRefreshPlan } from './utils/pageRefreshQueue.js'
import { getNativeBackTarget, requestInPageBack } from './utils/nativeBack.js'
import AppUpdater from './components/AppUpdater.jsx'

const HOLDINGS_PAGES = new Set(['/', '/holdings', '/target', '/us', '/cn', '/hk', '/jp', '/gold', '/bond', '/crypto', '/future', '/cash'])
const HISTORY_PAGES = new Set(['/', '/us', '/cn', '/hk', '/jp', '/gold', '/bond', '/crypto'])

function StartupStage({ children }) {
  const isNativeApp = Capacitor.isNativePlatform()
  const [phase, setPhase] = useState(() => (isNativeApp ? 'reveal' : 'hold'))

  useEffect(() => {
    if (isNativeApp) {
      const finishTimer = window.setTimeout(() => setPhase('done'), 300)
      return () => window.clearTimeout(finishTimer)
    }

    const revealTimer = window.setTimeout(() => setPhase('reveal'), 180)
    const finishTimer = window.setTimeout(() => setPhase('done'), 480)
    return () => {
      window.clearTimeout(revealTimer)
      window.clearTimeout(finishTimer)
    }
  }, [isNativeApp])

  return (
    <div className="startup-stage">
      {phase !== 'done' && !isNativeApp && (
        <div className="startup-splash" aria-hidden="true">
          <img src="/Transparent-Chinese.png" alt="" className="startup-logo startup-logo-light" />
          <img src="/white-Chinese.png" alt="" className="startup-logo startup-logo-dark" />
        </div>
      )}
      <div className={`startup-content startup-content-${phase}`}>{children}</div>
    </div>
  )
}

export default function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const auth = useAuth()
  const demoMode = localStorage.getItem('youshu-demo-mode') === 'true'
  const isAuthenticated = auth.isLoggedIn || demoMode
  const needsHoldings = HOLDINGS_PAGES.has(location.pathname)
  const needsHistory = HISTORY_PAGES.has(location.pathname)
  const { source, isRefreshing, refreshHoldings, refreshHistory, refreshKey } = useAssetData({
    enabled: isAuthenticated,
    loadHoldings: needsHoldings,
    loadHistory: needsHistory,
    autoRefreshHoldings: needsHoldings,
    autoRefreshHistory: needsHistory,
  })
  const refreshQueueRef = useRef(Promise.resolve())

  const refreshSource = useCallback(async (sourceName) => {
    try {
      if (sourceName === 'holdings') return await refreshHoldings(true)
      if (sourceName === 'history') return await refreshHistory(true)
      if (sourceName === 'target') return await fetchTarget({ forceRefresh: true })
      if (sourceName === 'market') return await refreshMarketData({ forceRefresh: true })
      if (sourceName === 'futures') return await refreshFuturesData({ forceRefresh: true })
    } catch {
      return false
    }
    return false
  }, [refreshHistory, refreshHoldings])

  const refreshCurrentPage = useCallback(() => {
    const plan = getPageRefreshPlan(location.pathname)
    const runQueue = async () => {
      await Promise.all(plan.primary.map(refreshSource))
      for (const sourceName of plan.queued) await refreshSource(sourceName)
    }
    const request = refreshQueueRef.current.catch(() => {}).then(runQueue)
    refreshQueueRef.current = request
    return request
  }, [location.pathname, refreshSource])

  const canRefreshCurrentPage = !(location.pathname === '/settings' || location.pathname.startsWith('/settings/'))

  useEffect(() => initTheme(), [])

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined
    let disposed = false
    let listener = null

    CapacitorApp.addListener('backButton', () => {
      if (document.body.dataset.modalOpen === 'true') {
        window.history.back()
        return
      }
      if (requestInPageBack()) return
      const parent = getNativeBackTarget(location.pathname)
      if (parent) {
        navigate(parent, { replace: true, state: { pageTransition: 'back' } })
        return
      }
      CapacitorApp.exitApp()
    }).then((handle) => {
      if (disposed) handle.remove()
      else listener = handle
    })

    return () => {
      disposed = true
      listener?.remove()
    }
  }, [location.pathname, navigate])

  // 未登录且不是演示模式，重定向到全屏登录页
  return (
    <>
      <StartupStage>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={isAuthenticated ? <Layout source={source} onRefresh={canRefreshCurrentPage ? refreshCurrentPage : undefined} auth={auth} /> : <Navigate to="/login" replace />}>
            <Route index element={<Home refreshKey={refreshKey} isRefreshing={isRefreshing} />} />
            <Route path="holdings" element={<Holdings refreshKey={refreshKey} onRefresh={() => refreshHoldings(true)} source={source} isLoggedIn={auth.isLoggedIn} />} />
            <Route path="target" element={<Target />} />
            <Route path="settings" element={<Settings auth={auth} />} />
            <Route path="settings/:section" element={<Settings auth={auth} />} />
            <Route path="us" element={<AssetDetail refreshKey={refreshKey} assetType="us" />} />
            <Route path="cn" element={<AssetDetail refreshKey={refreshKey} assetType="cn" />} />
            <Route path="hk" element={<AssetDetail refreshKey={refreshKey} assetType="hk" />} />
            <Route path="jp" element={<AssetDetail refreshKey={refreshKey} assetType="jp" />} />
            <Route path="bond" element={<AssetDetail refreshKey={refreshKey} assetType="bond" />} />
            <Route path="crypto" element={<AssetDetail refreshKey={refreshKey} assetType="crypto" />} />
            <Route path="market" element={<Market />} />
            <Route path="future" element={<Future refreshKey={refreshKey} />} />
            <Route path="gold" element={<AssetDetail refreshKey={refreshKey} assetType="gold" />} />
            <Route path="cash" element={<Cash refreshKey={refreshKey} />} />
            <Route path="*" element={<Home refreshKey={refreshKey} isRefreshing={isRefreshing} />} />
          </Route>
        </Routes>
      </StartupStage>
      <AppUpdater />
    </>
  )
}
