import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
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

export default function App() {
  const auth = useAuth()
  const demoMode = localStorage.getItem('youshu-demo-mode') === 'true'
  const isAuthenticated = auth.isLoggedIn || demoMode
  const { source, syncedAt, error, refresh, refreshKey, manualRefreshKey, bumpRefreshKey } = useAssetData({ enabled: isAuthenticated })

  useEffect(() => { initTheme() }, [])

  // 未登录且不是演示模式，重定向到全屏登录页
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={isAuthenticated ? <Layout source={source} syncedAt={syncedAt} error={error} onRefresh={refresh} auth={auth} /> : <Navigate to="/login" replace />}>
        <Route index element={<Home refreshKey={refreshKey} targetRefreshKey={manualRefreshKey} onSnapshot={bumpRefreshKey} />} />
        <Route path="holdings" element={<Holdings refreshKey={refreshKey} onRefresh={refresh} source={source} isLoggedIn={auth.isLoggedIn} />} />
        <Route path="target" element={<Target refreshKey={manualRefreshKey} />} />
        <Route path="settings" element={<Settings auth={auth} />} />
        <Route path="us" element={<AssetDetail refreshKey={refreshKey} assetType="us" />} />
        <Route path="cn" element={<AssetDetail refreshKey={refreshKey} assetType="cn" />} />
        <Route path="hk" element={<AssetDetail refreshKey={refreshKey} assetType="hk" />} />
        <Route path="jp" element={<AssetDetail refreshKey={refreshKey} assetType="jp" />} />
        <Route path="bond" element={<AssetDetail refreshKey={refreshKey} assetType="bond" />} />
        <Route path="crypto" element={<AssetDetail refreshKey={refreshKey} assetType="crypto" />} />
        <Route path="market" element={<Market refreshKey={manualRefreshKey} />} />
        <Route path="future" element={<Future refreshKey={manualRefreshKey} />} />
        <Route path="gold" element={<AssetDetail refreshKey={refreshKey} assetType="gold" />} />
        <Route path="cash" element={<Cash refreshKey={refreshKey} targetRefreshKey={manualRefreshKey} />} />
        <Route path="*" element={<Home refreshKey={refreshKey} targetRefreshKey={manualRefreshKey} onSnapshot={bumpRefreshKey} />} />
      </Route>
    </Routes>
  )
}
