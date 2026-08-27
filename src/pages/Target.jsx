import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { assetColors } from '../data/holdings.js'
import { formatCurrency, formatWan } from '../utils/format.js'
import { fetchTarget } from '../utils/dataStore.js'
import { getTargetAllocationStatus } from '../utils/targetAllocation.js'

const colorMap = {
  美股: assetColors.美股,
  A股: assetColors.A股,
  港股: assetColors.港股,
  日股: assetColors.日股,
  虚拟币: assetColors.虚拟币,
  黄金: assetColors.黄金,
  债基: assetColors.债基,
  期货: assetColors.期货,
  现金: assetColors.现金,
}

const CATEGORY_ROUTE = {
  '美股': '/us', 'A股': '/cn', '港股': '/hk', '日股': '/jp',
  '债基': '/bond', '虚拟币': '/crypto', '期货': '/future', '黄金': '/gold', '现金': '/cash',
}

export default function Target({ refreshKey = 0 }) {
  const navigate = useNavigate()
  const [data, setData] = useState(() => {
    // 优先读缓存，实现即时渲染
    try {
      const cached = JSON.parse(localStorage.getItem('asset-monitor:target') || 'null')
      if (cached?.target?.length) return cached.target.map((row) => row.category === '债券' ? { ...row, category: '债基' } : row)
    } catch { /* ignore */ }
    return null
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const loadData = useCallback(async () => {
    setError(null)
    try {
      const result = await fetchTarget()
      setData(result.target || [])
    } catch (e) {
      setError('无法加载配置目标: ' + (e?.message || String(e)))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // 无缓存时显示 loading，否则后台刷新
    if (!data || !data.length) setLoading(true)
    loadData()
  }, [loadData, refreshKey])

  // 分离数据行和合计行，数据行按金额从大到小排序
  const rows = (data || []).filter((r) => !r.isTotal).sort((a, b) => (b.marketValue || 0) - (a.marketValue || 0))
  const totalRow = (data || []).find((r) => r.isTotal)

  // 统计超配/低配
  const overWeight = rows.filter((r) => getTargetAllocationStatus(r.currentRatio, r.targetRatio).status === 'over')
  const underWeight = rows.filter((r) => getTargetAllocationStatus(r.currentRatio, r.targetRatio).status === 'under')
  const noTarget = rows.filter((r) => r.targetRatio === null)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        <svg className="animate-spin w-6 h-6 mr-2" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" />
          <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
        加载中...
      </div>
    )
  }

  if (error) {
    return (
      <div className="card py-12 text-center">
        <p className="text-gray-400 text-sm">{error}</p>
        <p className="text-gray-400 text-xs mt-2">请在 Google Sheets 的 target 表中填写配置目标</p>
      </div>
    )
  }

  return (
    <div className="space-y-[4px]">
      {/* 提醒卡片 */}
      {(overWeight.length > 0 || underWeight.length > 0) && (
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-[4px]">
          {overWeight.length > 0 && (
            <div className="card py-3 px-4 border-l-4 border-red-400">
              <div className="text-sm font-medium text-red-500 flex items-center gap-1.5">
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 20 20" fill="none">
                  <circle cx="10" cy="10" r="10" fill="currentColor" opacity="0.15" />
                  <path d="M10 4l5 6H5l5-6z" fill="currentColor" />
                  <rect x="5" y="12.5" width="10" height="2" rx="1" fill="currentColor" opacity="0.5" />
                </svg>
                超配（建议减仓）
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {overWeight.map((r) => (
                  <span key={r.category} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-xs">
                    {r.category} +{(r.diff * 100).toFixed(1)}%
                  </span>
                ))}
              </div>
            </div>
          )}
          {underWeight.length > 0 && (
            <div className="card py-3 px-4 border-l-4 border-green-400">
              <div className="text-sm font-medium text-green-600 flex items-center gap-1.5">
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 20 20" fill="none">
                  <circle cx="10" cy="10" r="10" fill="currentColor" opacity="0.15" />
                  <path d="M10 16l5-6H5l5 6z" fill="currentColor" />
                  <rect x="5" y="5.5" width="10" height="2" rx="1" fill="currentColor" opacity="0.5" />
                </svg>
                低配（建议加仓）
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {underWeight.map((r) => (
                  <span key={r.category} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 text-green-600 text-xs">
                    {r.category} {(r.diff * 100).toFixed(1)}%
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {noTarget.length > 0 && (
        <div className="card py-2 px-4 bg-yellow-50 border-yellow-100">
          <span className="text-xs text-yellow-700">
            📝 {noTarget.length} 个类别尚未设置目标比例：{noTarget.map((r) => r.category).join('、')}
          </span>
        </div>
      )}

      {/* 配置目标表格 */}
      <div className="card">
        <div className="hidden sm:flex items-center justify-end mb-4">
          <button
            onClick={loadData}
            className="text-xs text-gray-400 hover:text-brand-600 transition-colors"
          >
            刷新
          </button>
        </div>

        {/* 桌面端表格 */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-100">
                <th className="py-2 px-2 font-medium">类别</th>
                <th className="py-2 px-2 font-medium text-right">当前金额</th>
                <th className="py-2 px-2 font-medium text-right">当前占比</th>
                <th className="py-2 px-2 font-medium text-right">目标比例</th>
                <th className="py-2 px-2 font-medium text-right">差值</th>
                <th className="py-2 px-2 font-medium text-center">状态</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => {
                const color = colorMap[r.category] || '#94a3b8'
                const hasTarget = r.targetRatio !== null && r.targetRatio !== undefined
                const diffPct = hasTarget ? r.diff * 100 : null
                const status = getTargetAllocationStatus(r.currentRatio, r.targetRatio).status
                const isOver = status === 'over'
                const isUnder = status === 'under'

                return (
                    <tr key={idx} className="border-b border-gray-50 last:border-0 cursor-pointer hover:bg-gray-50/50" onClick={() => { const route = CATEGORY_ROUTE[r.category]; if (route) navigate(route) }}>
                      <td className="py-2.5 px-2">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="inline-block w-2 h-2 rounded-sm" style={{ backgroundColor: color }} />
                        <span className="text-gray-800">{r.category}</span>
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-right text-gray-700">{formatCurrency(r.marketValue)}</td>
                    <td className="py-2.5 px-2 text-right text-gray-600">{(r.currentRatio * 100).toFixed(2)}%</td>
                    <td className="py-2.5 px-2 text-right text-gray-600">
                      {hasTarget ? `${(r.targetRatio * 100).toFixed(2)}%` : <span className="text-gray-300">—</span>}
                    </td>
                    <td className={`py-2.5 px-2 text-right font-medium ${
                      isOver ? 'text-red-500' : isUnder ? 'text-green-600' : 'text-gray-500'
                    }`}>
                      {diffPct !== null ? `${diffPct > 0 ? '+' : ''}${diffPct.toFixed(2)}%` : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      {isOver && <span className="text-sm px-1.5 py-0.5 rounded bg-red-50 text-red-500">超配</span>}
                      {isUnder && <span className="text-sm px-1.5 py-0.5 rounded bg-green-50 text-green-600">低配</span>}
                      {diffPct !== null && !isOver && !isUnder && <span className="text-sm px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">正常</span>}
                      {!hasTarget && <span className="text-sm px-1.5 py-0.5 rounded bg-gray-50 text-gray-400">未设置</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            {totalRow && (
              <tfoot>
                <tr className="font-semibold border-t-2 border-gray-100">
                  <td className="py-3 px-2 text-gray-800">合计</td>
                  <td className="py-3 px-2 text-right text-gray-800">{formatCurrency(totalRow.marketValue)}</td>
                  <td className="py-3 px-2 text-right text-gray-500">100%</td>
                  <td className="py-3 px-2 text-right text-gray-500">{totalRow.targetRatio !== null ? `${(totalRow.targetRatio * 100).toFixed(0)}%` : '—'}</td>
                  <td className="py-3 px-2"></td>
                  <td className="py-3 px-2"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* 移动端卡片列表 */}
        <div className="sm:hidden space-y-[4px]">
          {rows.map((r, idx) => {
            const color = colorMap[r.category] || '#94a3b8'
            const hasTarget = r.targetRatio !== null && r.targetRatio !== undefined
            const diffPct = hasTarget ? r.diff * 100 : null
            const status = getTargetAllocationStatus(r.currentRatio, r.targetRatio).status
            const isOver = status === 'over'
            const isUnder = status === 'under'
            return (
              <div key={idx} className="border border-gray-100 rounded-lg p-3 cursor-pointer hover:border-gray-300" onClick={() => { const route = CATEGORY_ROUTE[r.category]; if (route) navigate(route) }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block w-2 h-2 rounded-sm" style={{ backgroundColor: color }} />
                    <span className="text-gray-800 font-medium text-sm">{r.category}</span>
                  </div>
                  {isOver && <span className="text-sm px-1.5 py-0.5 rounded bg-red-50 text-red-500">超配</span>}
                  {isUnder && <span className="text-sm px-1.5 py-0.5 rounded bg-green-50 text-green-600">低配</span>}
                  {diffPct !== null && !isOver && !isUnder && <span className="text-sm px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">正常</span>}
                  {!hasTarget && <span className="text-sm px-1.5 py-0.5 rounded bg-gray-50 text-gray-400">未设置</span>}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-400">金额：</span>
                    <span className="text-gray-700">{formatWan(r.marketValue)}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">当前：</span>
                    <span className="text-gray-700">{(r.currentRatio * 100).toFixed(1)}%</span>
                  </div>
                  <div>
                    <span className="text-gray-400">目标：</span>
                    <span className="text-gray-700">{hasTarget ? `${(r.targetRatio * 100).toFixed(1)}%` : '—'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">差值：</span>
                    <span className={isOver ? 'text-red-500' : isUnder ? 'text-green-600' : 'text-gray-500'}>
                      {diffPct !== null ? `${diffPct > 0 ? '+' : ''}${diffPct.toFixed(1)}%` : '—'}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-3 pt-3 border-t border-gray-100 text-sm text-gray-400">
          💡 偏离比例达到±40%，或偏离数值达到±2%时提醒。
        </div>
      </div>
    </div>
  )
}
