import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Home from './pages/Home.jsx'
import Holdings from './pages/Holdings.jsx'
import Target from './pages/Target.jsx'
import Profile from './pages/Profile.jsx'
import Cash from './pages/Cash.jsx'
import Future from './pages/Future.jsx'
import Market from './pages/Market.jsx'
import AssetDetail from './pages/AssetDetail.jsx'
import Login from './pages/Login.jsx'
import { useAssetData } from './hooks/useAssetData.js'
import { useAuth } from './hooks/useAuth.js'
import Settings, { initTheme } from './pages/Settings.jsx'

export default function App() {
  const { loading, source, syncedAt, error, refresh, refreshKey, bumpRefreshKey } = useAssetData()
  const auth = useAuth()

  useEffect(() => { initTheme() }, [])

  // 未登录且不是演示模式，重定向到全屏登录页
  const isAuthenticated = auth.isLoggedIn || localStorage.getItem('youshu-demo-mode') === 'true'

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={isAuthenticated ? <Layout source={source} syncedAt={syncedAt} loading={loading} error={error} onRefresh={refresh} auth={auth} /> : <Navigate to="/login" replace />}>
        <Route index element={<Home loading={loading} refreshKey={refreshKey} onSnapshot={bumpRefreshKey} onRefresh={refresh} />} />
        <Route path="holdings" element={<Holdings loading={loading} refreshKey={refreshKey} />} />
        <Route path="target" element={<Target refreshKey={refreshKey} />} />
        <Route path="my" element={<Profile refreshKey={refreshKey} />} />
        <Route path="settings" element={<Settings auth={auth} />} />
        <Route path="us" element={<AssetDetail refreshKey={refreshKey} assetType="us" />} />
        <Route path="cn" element={<AssetDetail refreshKey={refreshKey} assetType="cn" />} />
        <Route path="hk" element={<AssetDetail refreshKey={refreshKey} assetType="hk" />} />
        <Route path="jp" element={<AssetDetail refreshKey={refreshKey} assetType="jp" />} />
        <Route path="bond" element={<AssetDetail refreshKey={refreshKey} assetType="bond" />} />
        <Route path="crypto" element={<AssetDetail refreshKey={refreshKey} assetType="crypto" />} />
        <Route path="market" element={<Market refreshKey={refreshKey} />} />
        <Route path="future" element={<Future refreshKey={refreshKey} />} />
        <Route path="gold" element={<AssetDetail refreshKey={refreshKey} assetType="gold" />} />
        <Route path="cash" element={<Cash refreshKey={refreshKey} />} />
        <Route path="*" element={<Home loading={loading} refreshKey={refreshKey} onSnapshot={bumpRefreshKey} onRefresh={refresh} />} />
      </Route>
    </Routes>
  )
}
