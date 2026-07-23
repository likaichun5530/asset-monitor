import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Home from './pages/Home.jsx'
import Holdings from './pages/Holdings.jsx'
import Target from './pages/Target.jsx'
import Profile from './pages/Profile.jsx'
import Cash from './pages/Cash.jsx'
import AssetDetail from './pages/AssetDetail.jsx'
import { useAssetData } from './hooks/useAssetData.js'
import Settings, { initTheme } from './pages/Settings.jsx'

export default function App() {
  const { loading, source, syncedAt, error, refresh, refreshKey, bumpRefreshKey } = useAssetData()

  useEffect(() => { initTheme() }, [])

  return (
    <Routes>
      <Route element={<Layout source={source} syncedAt={syncedAt} loading={loading} error={error} onRefresh={refresh} />}>
        <Route index element={<Home loading={loading} refreshKey={refreshKey} onSnapshot={bumpRefreshKey} onRefresh={refresh} />} />
        <Route path="holdings" element={<Holdings loading={loading} refreshKey={refreshKey} />} />
        <Route path="target" element={<Target refreshKey={refreshKey} />} />
        <Route path="my" element={<Profile refreshKey={refreshKey} />} />
        <Route path="settings" element={<Settings />} />
        <Route path="us" element={<AssetDetail refreshKey={refreshKey} assetType="us" />} />
        <Route path="cn" element={<AssetDetail refreshKey={refreshKey} assetType="cn" />} />
        <Route path="hk" element={<AssetDetail refreshKey={refreshKey} assetType="hk" />} />
        <Route path="jp" element={<AssetDetail refreshKey={refreshKey} assetType="jp" />} />
        <Route path="bond" element={<AssetDetail refreshKey={refreshKey} assetType="bond" />} />
        <Route path="crypto" element={<AssetDetail refreshKey={refreshKey} assetType="crypto" />} />
        <Route path="future" element={<AssetDetail refreshKey={refreshKey} assetType="future" />} />
        <Route path="cash" element={<Cash refreshKey={refreshKey} />} />
        <Route path="*" element={<Home loading={loading} refreshKey={refreshKey} onSnapshot={bumpRefreshKey} onRefresh={refresh} />} />
      </Route>
    </Routes>
  )
}
