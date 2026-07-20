import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Home from './pages/Home.jsx'
import Holdings from './pages/Holdings.jsx'
import Target from './pages/Target.jsx'
import { useAssetData } from './hooks/useAssetData.js'

export default function App() {
  const { loading, source, syncedAt, error, refresh, refreshKey, bumpRefreshKey } = useAssetData()

  return (
    <Routes>
      <Route element={<Layout source={source} syncedAt={syncedAt} loading={loading} error={error} onRefresh={refresh} />}>
        <Route
          index
          element={
            <Home
              loading={loading}
              refreshKey={refreshKey}
              onSnapshot={bumpRefreshKey}
              onRefresh={refresh}
            />
          }
        />
        <Route
          path="holdings"
          element={<Holdings loading={loading} refreshKey={refreshKey} />}
        />
        <Route
          path="target"
          element={<Target refreshKey={refreshKey} />}
        />
        <Route path="*" element={<Home loading={loading} refreshKey={refreshKey} onSnapshot={bumpRefreshKey} onRefresh={refresh} />} />
      </Route>
    </Routes>
  )
}