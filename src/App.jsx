import { useCallback, useEffect, useState } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
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

const HOLDINGS_PAGES = new Set(['/', '/holdings', '/target', '/us', '/cn', '/hk', '/jp', '/gold', '/bond', '/crypto', '/future', '/cash'])
const HISTORY_PAGES = new Set(['/', '/us', '/cn', '/hk', '/jp', '/gold', '/bond', '/crypto'])
const ASSET_DETAIL_PAGES = new Set(['/us', '/cn', '/hk', '/jp', '/gold', '/bond', '/crypto'])

export default function App() {
  const location = useLocation()
  const auth = useAuth()
  const demoMode = localStorage.getItem('youshu-demo-mode') === 'true'
  const isAuthenticated = auth.isLoggedIn || demoMode
  const needsHoldings = HOLDINGS_PAGES.has(location.pathname)
  const needsHistory = HISTORY_PAGES.has(location.pathname)
  const { source, syncedAt, error, refreshHoldings, refreshHistory, refreshKey } = useAssetData({
    enabled: isAuthenticated,
    loadHoldings: needsHoldings,
    loadHistory: needsHistory,
    autoRefreshHoldings: needsHoldings,
  })
  const [pageRefreshKeys, setPageRefreshKeys] = useState({ target: 0, market: 0, future: 0 })

  const bumpPageRefresh = useCallback((page) => {
    setPageRefreshKeys((current) => ({ ...current, [page]: current[page] + 1 }))
  }, [])

  const refreshCurrentPage = useCallback(async () => {
    const path = location.pathname
    if (path === '/') {
      await Promise.all([refreshHoldings(true), refreshHistory(true)])
      return
    }
    if (path === '/target') { bumpPageRefresh('target'); return }
    if (path === '/market') { bumpPageRefresh('market'); return }
    if (path === '/future') { bumpPageRefresh('future'); return }
    if (path === '/settings' || path.startsWith('/settings/')) return
    if (ASSET_DETAIL_PAGES.has(path)) {
      await Promise.all([refreshHoldings(true), refreshHistory(true)])
      return
    }
    if (HOLDINGS_PAGES.has(path)) await refreshHoldings(true)
  }, [bumpPageRefresh, location.pathname, refreshHistory, refreshHoldings])

  const canRefreshCurrentPage = !(location.pathname === '/settings' || location.pathname.startsWith('/settings/'))

  useEffect(() => { initTheme() }, [])

  // 未登录且不是演示模式，重定向到全屏登录页
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={isAuthenticated ? <Layout source={source} syncedAt={syncedAt} error={error} onRefresh={canRefreshCurrentPage ? refreshCurrentPage : undefined} auth={auth} /> : <Navigate to="/login" replace />}>
        <Route index element={<Home refreshKey={refreshKey} />} />
        <Route path="holdings" element={<Holdings refreshKey={refreshKey} onRefresh={() => refreshHoldings(true)} source={source} isLoggedIn={auth.isLoggedIn} />} />
        <Route path="target" element={<Target refreshKey={pageRefreshKeys.target} />} />
        <Route path="settings" element={<Settings auth={auth} />} />
        <Route path="settings/:section" element={<Settings auth={auth} />} />
        <Route path="us" element={<AssetDetail refreshKey={refreshKey} assetType="us" />} />
        <Route path="cn" element={<AssetDetail refreshKey={refreshKey} assetType="cn" />} />
        <Route path="hk" element={<AssetDetail refreshKey={refreshKey} assetType="hk" />} />
        <Route path="jp" element={<AssetDetail refreshKey={refreshKey} assetType="jp" />} />
        <Route path="bond" element={<AssetDetail refreshKey={refreshKey} assetType="bond" />} />
        <Route path="crypto" element={<AssetDetail refreshKey={refreshKey} assetType="crypto" />} />
        <Route path="market" element={<Market refreshKey={pageRefreshKeys.market} />} />
        <Route path="future" element={<Future refreshKey={pageRefreshKeys.future} />} />
        <Route path="gold" element={<AssetDetail refreshKey={refreshKey} assetType="gold" />} />
        <Route path="cash" element={<Cash refreshKey={refreshKey} />} />
        <Route path="*" element={<Home refreshKey={refreshKey} />} />
      </Route>
    </Routes>
  )
}
