import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { assetColors } from '../data/holdings.js'
import { formatCurrency, formatWan } from '../utils/format.js'
import { fetchTarget } from '../utils/dataStore.js'
import { getTargetAdjustmentAmount, getTargetAllocationStatus } from '../utils/targetAllocation.js'

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
  const previousRefreshKeyRef = useRef(refreshKey)

  const loadData = useCallback(async (forceRefresh = false) => {
    setError(null)
    try {
      const result = await fetchTarget({ forceRefresh })
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
    const forceRefresh = previousRefreshKeyRef.current !== refreshKey
    previousRefreshKeyRef.current = refreshKey
    loadData(forceRefresh)
  }, [loadData, refreshKey])

  // 分离数据行和合计行，数据行按金额从大到小排序
  const rows = (data || []).filter((r) => !r.isTotal).sort((a, b) => (b.marketValue || 0) - (a.marketValue || 0))
  const totalRow = (data || []).find((r) => r.isTotal)

  // 统计超配/低配
  const overWeight = rows.filter((r) => getTargetAllocationStatus(r.currentRatio, r.targetRatio).status === 'over')
  const underWeight = rows.filter((r) => getTargetAllocationStatus(r.currentRatio, r.targetRatio).status === 'under')
  const noTarget = rows.filter((r) => r.targetRatio === null)
  const normalWeight = rows.length - overWeight.length - underWeight.length - noTarget.length
  const adjustmentAmount = (row) => Math.abs(getTargetAdjustmentAmount(
    Number(row.marketValue),
    Number(totalRow?.marketValue),
    Number(row.targetRatio),
  ) || 0)

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
    <div className="space-y-2 sm:space-y-3">
      <section className="hidden sm:grid grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="desktop-metric-card">
          <div className="text-xs font-medium text-slate-400">配置资产总额</div>
          <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-gray-100">{formatCurrency(totalRow?.marketValue || 0)}</div>
          <div className="mt-2 text-xs text-slate-400">共 {rows.length} 个资产类别</div>
        </div>
        <div className="desktop-metric-card">
          <div className="text-xs font-medium text-slate-400">配置正常</div>
          <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-gray-100">{normalWeight} <span className="text-sm font-normal text-slate-400">项</span></div>
          <div className="mt-2 text-xs text-green-600">处于目标范围</div>
        </div>
        <div className="desktop-metric-card">
          <div className="text-xs font-medium text-slate-400">需要调整</div>
          <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-gray-100">{overWeight.length + underWeight.length} <span className="text-sm font-normal text-slate-400">项</span></div>
          <div className="mt-2 text-xs text-slate-400">超配 {overWeight.length} · 低配 {underWeight.length}</div>
        </div>
        <div className="desktop-metric-card">
          <div className="text-xs font-medium text-slate-400">未设目标</div>
          <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-gray-100">{noTarget.length} <span className="text-sm font-normal text-slate-400">项</span></div>
          <div className="mt-2 text-xs text-slate-400">建议补充目标比例</div>
        </div>
      </section>

      <section className="card sm:hidden px-3 py-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">配置偏差</div>
            <div className="mt-0.5 text-xs text-gray-400">实际配置与计划目标的差距</div>
          </div>
          <div className={`rounded-full px-2.5 py-1 text-xs font-medium ${overWeight.length + underWeight.length > 0 ? 'bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400' : 'bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400'}`}>
            {overWeight.length + underWeight.length > 0 ? `${overWeight.length + underWeight.length} 项需关注` : '配置正常'}
          </div>
        </div>
        <div className="mt-3 grid grid-cols-3 divide-x divide-gray-100 dark:divide-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900/40 py-2.5 text-center">
          <div><div className="text-base font-semibold text-red-500">{overWeight.length}</div><div className="mt-0.5 text-[10px] text-gray-400">超出目标</div></div>
          <div><div className="text-base font-semibold text-green-600">{underWeight.length}</div><div className="mt-0.5 text-[10px] text-gray-400">低于目标</div></div>
          <div><div className="text-base font-semibold text-gray-700 dark:text-gray-200">{normalWeight}</div><div className="mt-0.5 text-[10px] text-gray-400">范围正常</div></div>
        </div>
      </section>

      {/* 提醒卡片 */}
      {(overWeight.length > 0 || underWeight.length > 0) && (
        <section className="hidden sm:grid sm:grid-cols-2 gap-3">
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
                    {r.category} +{(r.diff * 100).toFixed(1)}% · 建议减少 {formatCurrency(adjustmentAmount(r), { decimals: 0 })}
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
                    {r.category} {(r.diff * 100).toFixed(1)}% · 建议增加 {formatCurrency(adjustmentAmount(r), { decimals: 0 })}
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
      <div className="card target-list-shell sm:p-0 sm:overflow-hidden">
        <div className="hidden sm:flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-gray-700">
          <div>
            <h2 className="desktop-section-title">目标配置明细</h2>
            <p className="desktop-section-subtitle">点击类别可查看对应资产详情</p>
          </div>
          <button
            onClick={loadData}
            className="desktop-secondary-button h-9"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 11a8.1 8.1 0 0 0-15.5-2M4 4v5h5M4 13a8.1 8.1 0 0 0 15.5 2M20 20v-5h-5" /></svg>
            刷新数据
          </button>
        </div>

        {/* 桌面端表格 */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-100">
                <th className="py-2 px-6 font-medium">类别</th>
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
                      <td className="py-2.5 px-6">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="inline-block w-2 h-2 rounded-sm" style={{ backgroundColor: color }} />
                        <span className="text-gray-800">{r.category}</span>
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-right text-gray-700">{formatCurrency(r.marketValue)}</td>
                    <td className="py-2.5 px-2 text-right text-gray-600">
                      <div>{(r.currentRatio * 100).toFixed(2)}%</div>
                      <div className="relative ml-auto mt-1.5 h-1.5 w-24 overflow-hidden rounded-full bg-slate-100 dark:bg-gray-700">
                        <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${Math.min(r.currentRatio * 100, 100)}%`, backgroundColor: color }} />
                        {hasTarget && <span className="absolute -top-0.5 h-2.5 w-0.5 bg-slate-700 dark:bg-white" style={{ left: `${Math.min(r.targetRatio * 100, 100)}%` }} />}
                      </div>
                    </td>
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
                  <td className="py-3 px-6 text-gray-800">合计</td>
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
        <div className="sm:hidden space-y-2">
          {rows.map((r, idx) => {
            const color = colorMap[r.category] || '#94a3b8'
            const hasTarget = r.targetRatio !== null && r.targetRatio !== undefined
            const diffPct = hasTarget ? r.diff * 100 : null
            const status = getTargetAllocationStatus(r.currentRatio, r.targetRatio).status
            const isOver = status === 'over'
            const isUnder = status === 'under'
            const scaleMax = hasTarget ? Math.max(r.currentRatio || 0, r.targetRatio || 0, 0.01) * 1.18 : Math.max(r.currentRatio || 0, 0.01)
            const currentWidth = Math.min(((r.currentRatio || 0) / scaleMax) * 100, 100)
            const targetPosition = hasTarget ? Math.min(((r.targetRatio || 0) / scaleMax) * 100, 98) : null
            const driftAmount = diffPct === null ? null : Math.abs(diffPct)
            const progressColor = isOver ? '#ef4444' : isUnder ? '#10b981' : color
            return (
              <div key={idx} className="target-allocation-card border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg px-3 py-3 cursor-pointer" onClick={() => { const route = CATEGORY_ROUTE[r.category]; if (route) navigate(route) }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-gray-800 font-medium text-sm">{r.category}</span>
                    <span className="text-xs text-gray-400">{formatWan(r.marketValue)}</span>
                  </div>
                  {isOver && <span className="text-xs px-2 py-1 rounded-full bg-red-50 dark:bg-red-500/10 text-red-500">超配 +{driftAmount.toFixed(1)}%</span>}
                  {isUnder && <span className="text-xs px-2 py-1 rounded-full bg-green-50 dark:bg-green-500/10 text-green-600">低配 −{driftAmount.toFixed(1)}%</span>}
                  {diffPct !== null && !isOver && !isUnder && <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300">正常</span>}
                  {!hasTarget && <span className="text-xs px-2 py-1 rounded-full bg-yellow-50 dark:bg-yellow-500/10 text-yellow-600">未设置</span>}
                </div>
                <div className="mt-3 flex items-end justify-between">
                  <div><div className="text-[10px] text-gray-400">当前配置</div><div className="mt-0.5 text-lg font-semibold text-gray-900 dark:text-gray-100">{(r.currentRatio * 100).toFixed(1)}%</div></div>
                  <div className="text-right"><div className="text-[10px] text-gray-400">计划目标</div><div className="mt-0.5 text-lg font-semibold text-gray-600 dark:text-gray-300">{hasTarget ? `${(r.targetRatio * 100).toFixed(1)}%` : '—'}</div></div>
                </div>
                <div className="relative mt-2 h-2 rounded-full bg-gray-100 dark:bg-gray-700">
                  <div className="absolute inset-y-0 left-0 rounded-full transition-all" style={{ width: `${currentWidth}%`, backgroundColor: progressColor }} />
                  {targetPosition !== null && <div className="absolute -top-1 h-4 w-0.5 rounded-full bg-gray-800 dark:bg-white" style={{ left: `${targetPosition}%` }} aria-label="目标位置" />}
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px]">
                  <span className={isOver ? 'text-red-500' : isUnder ? 'text-green-600' : 'text-gray-400'}>
                    {isOver && `应降低 ${driftAmount.toFixed(1)} 个百分点 · 建议减少 ${formatCurrency(adjustmentAmount(r), { decimals: 0 })}`}
                    {isUnder && `应增加 ${driftAmount.toFixed(1)} 个百分点 · 建议增加 ${formatCurrency(adjustmentAmount(r), { decimals: 0 })}`}
                    {hasTarget && !isOver && !isUnder && '当前处于目标提醒范围内'}
                    {!hasTarget && '请先在目标表中设置计划比例'}
                  </span>
                  <svg className="h-3.5 w-3.5 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6" /></svg>
                </div>
              </div>
            )
          })}
        </div>

        <div className="target-reminder mt-3 sm:mt-0 pt-3 sm:px-6 sm:py-4 border-t border-gray-100 text-sm text-gray-400 sm:bg-slate-50/60 dark:sm:bg-gray-900/30">
          💡 偏离比例达到±40%，或偏离数值达到±2%时提醒。
        </div>
      </div>
    </div>
  )
}
