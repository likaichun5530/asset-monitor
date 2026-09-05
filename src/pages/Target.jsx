import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { assetColors } from '../data/holdings.js'
import { formatCurrency, formatWan } from '../utils/format.js'
import { fetchTarget, TARGET_UPDATED_EVENT } from '../utils/dataStore.js'
import { getTargetAdjustmentAmount, getTargetAllocationStatus, getTargetAllowedRange } from '../utils/targetAllocation.js'

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

const STATUS_PRIORITY = { over: 0, under: 1, balanced: 2, unset: 3 }

// 目标始终位于中心，合理区间映射到中心两侧的等距位置。
// 这是“偏离目标”的语义尺，不是各资产绝对占比的横轴。
function getRangeTrackPositions(currentRatio, targetRatio, allowedRange, rangeHalfWidth = 25) {
  if (!allowedRange) return null
  const rangeStart = 50 - rangeHalfWidth
  const rangeEnd = 50 + rangeHalfWidth
  const current = Number.isFinite(currentRatio) ? currentRatio : 0
  const target = Number.isFinite(targetRatio) ? targetRatio : allowedRange.lower
  const lowerTolerance = Math.max(target - allowedRange.lower, 0.0001)
  const upperTolerance = Math.max(allowedRange.upper - target, 0.0001)
  const relativePosition = current <= target
    ? 50 - ((target - current) / lowerTolerance) * rangeHalfWidth
    : 50 + ((current - target) / upperTolerance) * rangeHalfWidth
  return {
    rangeStart,
    rangeEnd,
    currentPosition: Math.min(98.5, Math.max(1.5, relativePosition)),
    targetPosition: 50,
  }
}

function getRangeRuleLabel(targetRatio) {
  if (!Number.isFinite(targetRatio)) return ''
  return targetRatio > 0 && targetRatio * 0.4 < 0.02
    ? '目标比例 ±40%'
    : '±2 个百分点'
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

  useEffect(() => {
    const handleTargetUpdated = (event) => setData(event.detail || [])
    window.addEventListener(TARGET_UPDATED_EVENT, handleTargetUpdated)
    return () => window.removeEventListener(TARGET_UPDATED_EVENT, handleTargetUpdated)
  }, [])

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

  // 需要处理的配置优先展示，同状态内仍按金额从大到小排序。
  const rows = (data || []).filter((r) => !r.isTotal).sort((a, b) => {
    const aStatus = getTargetAllocationStatus(a.currentRatio, a.targetRatio).status
    const bStatus = getTargetAllocationStatus(b.currentRatio, b.targetRatio).status
    return STATUS_PRIORITY[aStatus] - STATUS_PRIORITY[bStatus] || (b.marketValue || 0) - (a.marketValue || 0)
  })
  const totalRow = (data || []).find((r) => r.isTotal)

  // 统计超配/低配
  const overWeight = rows.filter((r) => getTargetAllocationStatus(r.currentRatio, r.targetRatio).status === 'over')
  const underWeight = rows.filter((r) => getTargetAllocationStatus(r.currentRatio, r.targetRatio).status === 'under')
  const noTarget = rows.filter((r) => r.targetRatio === null)
  const normalWeight = rows.length - overWeight.length - underWeight.length - noTarget.length
  const attentionCategories = [...overWeight, ...underWeight, ...noTarget].map((r) => r.category)
  const attentionCount = overWeight.length + underWeight.length + noTarget.length
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
    <div className="flex flex-col gap-2">
      <section className="hidden grid-cols-2 gap-2 sm:grid xl:grid-cols-4">
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

      <section className="target-mobile-summary card overflow-hidden px-4 pb-3 pt-4 sm:hidden" aria-label="实际配置与计划目标的差距">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400">配置状态</div>
            <div className="mt-1 text-xl font-semibold tracking-[-0.025em] text-gray-900 dark:text-gray-100">
              {attentionCount > 0 ? `${attentionCategories.join('、')}需要关注` : '当前配置合理'}
            </div>
          </div>
          <div className={`flex h-11 min-w-11 shrink-0 flex-col items-center justify-center rounded-xl border ${attentionCount > 0 ? 'border-orange-200 bg-orange-50 text-orange-600 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-400' : 'border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400'}`}>
            <span className="font-num text-lg font-semibold leading-none">{attentionCount}</span>
            <span className="mt-0.5 text-[9px] leading-none">需关注</span>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-4 rounded-xl border border-gray-100 bg-white/70 py-2.5 text-center dark:border-gray-700 dark:bg-gray-800/65">
          <div className="border-r border-gray-100 dark:border-gray-700"><div className="font-num text-base font-semibold text-red-500">{overWeight.length}</div><div className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">超出范围</div></div>
          <div className="border-r border-gray-100 dark:border-gray-700"><div className="font-num text-base font-semibold text-green-600">{underWeight.length}</div><div className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">低于范围</div></div>
          <div className="border-r border-gray-100 dark:border-gray-700"><div className="font-num text-base font-semibold text-gray-700 dark:text-gray-200">{normalWeight}</div><div className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">范围合理</div></div>
          <div><div className="font-num text-base font-semibold text-amber-500">{noTarget.length}</div><div className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">未设目标</div></div>
        </div>
      </section>

      {/* 提醒卡片 */}
      {(overWeight.length > 0 || underWeight.length > 0) && (
        <section className="hidden gap-2 sm:grid sm:grid-cols-2">
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
        <div className="card flex items-start gap-2.5 border-yellow-100 bg-yellow-50 px-3.5 py-3 dark:border-yellow-500/20 dark:bg-yellow-500/10 sm:px-4">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-yellow-600 dark:text-yellow-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 9v4m0 4h.01" /><path d="M10.3 3.6 2.4 17.3A2 2 0 0 0 4.1 20h15.8a2 2 0 0 0 1.7-2.7L13.7 3.6a2 2 0 0 0-3.4 0Z" /></svg>
          <span className="text-xs leading-5 text-yellow-700 dark:text-yellow-400">{noTarget.length} 个类别尚未设置目标比例：{noTarget.map((r) => r.category).join('、')}</span>
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
                const allowedRange = hasTarget ? getTargetAllowedRange(r.targetRatio) : null
                const track = getRangeTrackPositions(r.currentRatio, r.targetRatio, allowedRange)
                const currentPosition = track?.currentPosition ?? 0
                const targetPosition = track?.targetPosition ?? null
                const rangeStart = track?.rangeStart ?? null
                const rangeEnd = track?.rangeEnd ?? null
                const progressColor = isOver ? '#ef4444' : isUnder ? '#10b981' : color

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
                      <div className="relative ml-auto mt-2 h-2 w-32 rounded-full bg-slate-100 dark:bg-gray-700">
                        {rangeStart !== null && rangeEnd !== null && <span className="absolute inset-y-0 rounded-full bg-emerald-200 dark:bg-emerald-500/40" style={{ left: `${rangeStart}%`, width: `${Math.max(rangeEnd - rangeStart, 1)}%` }} />}
                        {targetPosition !== null && <span className="absolute -top-1 h-4 w-0.5 rounded-full bg-slate-700 dark:bg-white" style={{ left: `${targetPosition}%` }} />}
                        <span className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-sm dark:border-gray-800" style={{ left: `${currentPosition}%`, backgroundColor: progressColor }} />
                      </div>
                      {allowedRange && <div className="mt-1 whitespace-nowrap text-[10px] text-slate-400">范围 {(allowedRange.lower * 100).toFixed(1)}–{(allowedRange.upper * 100).toFixed(1)}%</div>}
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
        <div className="sm:hidden">
          <div className="mb-2 flex items-end justify-between px-1">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">配置明细</h2>
              <p className="mt-0.5 text-[11px] text-gray-400">优先显示需要调整的类别</p>
            </div>
            <span className="text-[11px] text-gray-400">共 {rows.length} 项</span>
          </div>
          <div className="space-y-2">
          {rows.map((r, idx) => {
            const color = colorMap[r.category] || '#94a3b8'
            const hasTarget = r.targetRatio !== null && r.targetRatio !== undefined
            const diffPct = hasTarget ? r.diff * 100 : null
            const status = getTargetAllocationStatus(r.currentRatio, r.targetRatio).status
            const isOver = status === 'over'
            const isUnder = status === 'under'
            const allowedRange = hasTarget ? getTargetAllowedRange(r.targetRatio) : null
            const track = getRangeTrackPositions(r.currentRatio, r.targetRatio, allowedRange, 18)
            const currentPosition = track?.currentPosition ?? 0
            const targetPosition = track?.targetPosition ?? null
            const rangeStart = track?.rangeStart ?? null
            const rangeEnd = track?.rangeEnd ?? null
            const driftAmount = diffPct === null ? null : Math.abs(diffPct)
            const progressColor = isOver ? '#ef4444' : isUnder ? '#10b981' : color
            const rangeRuleLabel = getRangeRuleLabel(r.targetRatio)
            const statusLabel = isOver ? '超出范围' : isUnder ? '低于范围' : hasTarget ? '范围合理' : '未设目标'
            const statusClass = isOver ? 'text-red-500' : isUnder ? 'text-green-600' : hasTarget ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
            return (
              <button key={idx} type="button" className="target-allocation-card w-full rounded-xl border border-gray-100 bg-white px-3.5 pb-3 pt-3.5 text-left transition-transform active:scale-[0.99] dark:border-gray-700 dark:bg-gray-800" onClick={() => { const route = CATEGORY_ROUTE[r.category]; if (route) navigate(route) }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ backgroundColor: color }} />
                    <div className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{r.category}</span>
                      <span className="mt-0.5 block text-[11px] text-gray-400">当前金额 {formatWan(r.marketValue)}</span>
                    </div>
                  </div>
                  <span className={`inline-flex shrink-0 items-center gap-1.5 pt-0.5 text-xs font-medium ${statusClass}`}>
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />{statusLabel}
                  </span>
                </div>

                {allowedRange ? (
                  <div className="mt-3 px-1">
                    <div className="relative h-[68px]" aria-label={`偏离目标范围尺：当前 ${(r.currentRatio * 100).toFixed(1)}%，目标 ${(r.targetRatio * 100).toFixed(1)}%，合理区间 ${(allowedRange.lower * 100).toFixed(1)}% 至 ${(allowedRange.upper * 100).toFixed(1)}%`}>
                      <span className="sr-only">合理区间按 {rangeRuleLabel} 计算，低配线 {(allowedRange.lower * 100).toFixed(1)}%，超配线 {(allowedRange.upper * 100).toFixed(1)}%</span>
                      <span className="absolute left-0 top-0 text-[10px] font-medium text-gray-400 dark:text-gray-500">低配</span>
                      <span className="absolute left-1/2 top-0 -translate-x-1/2 text-[10px] font-semibold text-gray-700 dark:text-gray-200">目标</span>
                      <span className="absolute right-0 top-0 text-[10px] font-medium text-gray-400 dark:text-gray-500">超配</span>
                      <div className="absolute inset-x-0 top-[30px] h-px bg-gray-300 dark:bg-gray-600" aria-hidden="true" />
                      <div className="absolute top-[23px] h-[15px] rounded-md bg-emerald-50 ring-1 ring-inset ring-emerald-100/70 dark:bg-emerald-500/10 dark:ring-emerald-400/10" style={{ left: `${rangeStart}%`, width: `${Math.max(rangeEnd - rangeStart, 1)}%` }} aria-label="合理区间" />
                      <div className="absolute top-[17px] h-7 w-px -translate-x-1/2 bg-gray-800 dark:bg-gray-100" style={{ left: `${targetPosition}%` }} aria-label="目标中心位置" />
                      <div className="absolute top-[30px] h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white shadow-sm transition-all dark:border-gray-800" style={{ left: `${currentPosition}%`, backgroundColor: progressColor }} aria-label={`当前配置 ${(r.currentRatio * 100).toFixed(1)}%`} />
                      <span className="absolute top-[44px] -translate-x-1/2 whitespace-nowrap text-[9px] font-medium" style={{ left: `${Math.min(96, Math.max(4, currentPosition))}%`, color: progressColor }}>当前</span>
                    </div>
                    <div className="grid grid-cols-3 border-t border-gray-100 pt-2 text-center dark:border-gray-700/80">
                      <div>
                        <div className="text-[10px] text-gray-400">当前</div>
                        <div className={`font-num mt-0.5 text-sm font-medium ${isOver ? 'text-red-500' : isUnder ? 'text-green-600' : 'text-gray-700 dark:text-gray-200'}`}>{(r.currentRatio * 100).toFixed(1)}%</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-400">目标</div>
                        <div className="font-num mt-0.5 text-sm font-medium text-gray-700 dark:text-gray-200">{(r.targetRatio * 100).toFixed(1)}%</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-400">偏差</div>
                        <div className={`font-num mt-0.5 text-sm font-medium ${isOver ? 'text-red-500' : isUnder ? 'text-green-600' : 'text-gray-600 dark:text-gray-300'}`}>{`${diffPct > 0 ? '+' : ''}${diffPct.toFixed(1)}%`}</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 rounded-lg border border-dashed border-amber-200 bg-amber-50/50 px-3 py-2 text-[11px] text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400">设置计划目标后，这里会显示合理区间。</div>
                )}

                <div className={`mt-3 flex min-h-10 items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs ${isOver ? 'border-red-100 bg-red-50/70 text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400' : isUnder ? 'border-green-100 bg-green-50/70 text-green-700 dark:border-green-500/20 dark:bg-green-500/10 dark:text-green-400' : hasTarget ? 'border-gray-100 bg-gray-50/70 text-gray-600 dark:border-gray-700 dark:bg-gray-700/30 dark:text-gray-300' : 'border-amber-100 bg-amber-50/60 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400'}`}>
                  <span className="font-medium">
                    {isOver && <>超出 {driftAmount.toFixed(1)}%<span className="ml-1 font-normal opacity-70">· 建议减少 {formatCurrency(adjustmentAmount(r), { decimals: 0 })}</span></>}
                    {isUnder && <>低于 {driftAmount.toFixed(1)}%<span className="ml-1 font-normal opacity-70">· 建议增加 {formatCurrency(adjustmentAmount(r), { decimals: 0 })}</span></>}
                    {hasTarget && !isOver && !isUnder && '当前配置在合理区间内，无需调整'}
                    {!hasTarget && '请先设置计划目标比例'}
                  </span>
                  <svg className="h-3.5 w-3.5 shrink-0 opacity-55" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6" /></svg>
                </div>
              </button>
            )
          })}
          </div>
        </div>

        <div className="target-reminder mt-3 border-t border-gray-100 pt-3 text-sm text-gray-400 dark:border-gray-700 sm:mt-0 sm:bg-slate-50/60 sm:px-6 sm:py-4 dark:sm:bg-gray-900/30">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400" aria-hidden="true">i</span>
            <div><span className="font-medium text-gray-600 dark:text-gray-300">范围说明</span><p className="mt-0.5 text-xs leading-5 text-gray-400">目标比例 ±40% 与 ±2 个百分点取更严格的范围。</p></div>
          </div>
        </div>
      </div>
    </div>
  )
}
