import { useMemo, useState } from 'react'
import { categoryColors, marketLabels, marketColors, assetColors } from '../data/holdings.js'
import { holdingMarketValue, totalMarketValue, getActiveHoldings } from '../utils/asset.js'
import { formatCurrency, formatNumber } from '../utils/format.js'
import HoldingEditor from '../components/HoldingEditor.jsx'
import { clearHoldingEditorDraft, readHoldingEditorDraft, writeHoldingEditorDraft } from '../utils/holdingEditorDraft.js'
import { getHoldingCategory } from '../../shared/allocation.js'

// 筛选标签（股票按市场拆分）
const FILTERS = ['全部', '美股', 'A股', '港股', '日股', '虚拟币', '黄金', '现金', '债基', '期货']

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

function getCategory(h) {
  return getHoldingCategory(h.assetType, h.market)
}

function getColor(h) {
  const cat = getCategory(h)
  return colorMap[cat] || '#94a3b8'
}

export default function Holdings({ refreshKey, onRefresh, source = 'empty', isLoggedIn = false }) {
  const demoMode = typeof window !== 'undefined' && localStorage.getItem('youshu-demo-mode') === 'true'
  const canEdit = isLoggedIn && !demoMode
  const restoredDraft = canEdit ? readHoldingEditorDraft() : null
  const [activeCategory, setActiveCategory] = useState('全部')
  const [searchQuery, setSearchQuery] = useState('')
  const [accountFilter, setAccountFilter] = useState('全部账户')
  const [sortBy, setSortBy] = useState('marketValueCNY')
  const [sortDir, setSortDir] = useState('desc')
  const [editorOpen, setEditorOpen] = useState(() => Boolean(restoredDraft))
  const [editingHolding, setEditingHolding] = useState(() => restoredDraft?.holding || null)
  const [success, setSuccess] = useState('')

  const total = useMemo(() => totalMarketValue(), [refreshKey])
  const holdings = useMemo(() => getActiveHoldings(), [refreshKey])

  const rows = useMemo(() => {
    let list = holdings.map((h) => ({
      ...h,
      marketValueCNY: holdingMarketValue(h),
      ratio: total ? (holdingMarketValue(h) / total) * 100 : 0,
    }))
    if (activeCategory !== '全部') {
      list = list.filter((h) => getCategory(h) === activeCategory)
    }
    if (accountFilter !== '全部账户') {
      list = list.filter((h) => h.account === accountFilter)
    }
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase('zh-CN')
    if (normalizedQuery) {
      list = list.filter((h) => [h.name, h.symbol, h.account, h.currency]
        .some((value) => String(value || '').toLocaleLowerCase('zh-CN').includes(normalizedQuery)))
    }
    list.sort((a, b) => {
      let av = a[sortBy]
      let bv = b[sortBy]
      if (av === null || av === undefined) av = 0
      if (bv === null || bv === undefined) bv = 0
      if (typeof av === 'string') {
        return sortDir === 'asc' ? String(av).localeCompare(String(bv), 'zh') : String(bv).localeCompare(String(av), 'zh')
      }
      return sortDir === 'asc' ? av - bv : bv - av
    })
    return list
  }, [holdings, activeCategory, accountFilter, searchQuery, sortBy, sortDir, total])

  function toggleSort(field) {
    if (sortBy === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortDir('desc')
    }
  }

  const sumMarketValue = rows.reduce((s, r) => s + r.marketValueCNY, 0)
  const accounts = useMemo(() => Array.from(new Set(holdings.map((h) => h.account).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'zh-CN')), [holdings])
  const currencyCount = useMemo(() => new Set(holdings.map((h) => h.currency).filter(Boolean)).size, [holdings])
  const largestHolding = rows.reduce((largest, row) => !largest || row.marketValueCNY > largest.marketValueCNY ? row : largest, null)
  const filteredRatio = total ? (sumMarketValue / total) * 100 : 0

  function openCreate() {
    setEditingHolding(null)
    writeHoldingEditorDraft({ holding: null, form: null })
    setEditorOpen(true)
    setSuccess('')
  }

  function openEdit(holding) {
    const editable = { ...holding, category: getCategory(holding) }
    setEditingHolding(editable)
    writeHoldingEditorDraft({ holding: editable, form: null })
    setEditorOpen(true)
    setSuccess('')
  }

  async function handleSaved(action) {
    await onRefresh?.()
    setSuccess(action === 'deleted' ? '持仓整行已删除' : action === 'updated' ? '持仓已更新' : '持仓已新增')
  }

  function closeEditor() {
    clearHoldingEditorDraft()
    setEditorOpen(false)
  }

  return (
    <div className="space-y-3">
      <section className="hidden sm:grid grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="desktop-metric-card">
          <div className="text-xs font-medium text-slate-400">资产总额</div>
          <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-gray-100">{formatCurrency(total)}</div>
          <div className="mt-2 text-xs text-slate-400">全部有效持仓</div>
        </div>
        <div className="desktop-metric-card">
          <div className="text-xs font-medium text-slate-400">当前筛选</div>
          <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-gray-100">{formatCurrency(sumMarketValue)}</div>
          <div className="mt-2 text-xs text-slate-400">占总资产 {filteredRatio.toFixed(1)}%</div>
        </div>
        <div className="desktop-metric-card">
          <div className="text-xs font-medium text-slate-400">账户与币种</div>
          <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-gray-100">{accounts.length} <span className="text-sm font-normal text-slate-400">个账户</span></div>
          <div className="mt-2 text-xs text-slate-400">覆盖 {currencyCount} 种币种</div>
        </div>
        <div className="desktop-metric-card">
          <div className="text-xs font-medium text-slate-400">筛选内最大持仓</div>
          <div className="mt-2 truncate text-2xl font-semibold text-slate-900 dark:text-gray-100">{largestHolding?.name || '—'}</div>
          <div className="mt-2 text-xs text-slate-400">{largestHolding ? `${largestHolding.ratio.toFixed(1)}% · ${formatCurrency(largestHolding.marketValueCNY)}` : '暂无持仓'}</div>
        </div>
      </section>

      <div className="card">
        <div className="flex items-center justify-between mb-3 sm:mb-5">
          <div>
            <h2 className="desktop-section-title">持仓明细</h2>
            <p className="hidden sm:block desktop-section-subtitle">按类别、账户或名称快速定位资产</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">共 {rows.length} 项</span>
            <button
              type="button"
              onClick={openCreate}
              disabled={!canEdit}
              title={!canEdit ? '请登录实盘账户后操作' : '新增持仓'}
              className="h-9 sm:h-10 px-3 sm:px-4 rounded-lg sm:rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium shadow-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ＋ 新增
            </button>
          </div>
        </div>

        {success && <div className="mb-3 rounded-lg bg-green-50 dark:bg-green-500/10 px-3 py-2 text-sm text-green-600 dark:text-green-400">{success}</div>}
        {!canEdit && <div className="mb-3 text-xs text-gray-400">新增和编辑仅在登录后的实盘模式下可用</div>}
        {canEdit && source !== 'online' && <div className="mb-3 rounded-lg bg-yellow-50 dark:bg-yellow-500/10 px-3 py-2 text-xs text-yellow-700 dark:text-yellow-400">当前使用缓存数据，可以填写表单；保存时需要恢复网络连接。</div>}

        <div className="hidden sm:flex items-center gap-3 mb-4">
          <label className="relative flex-1 max-w-md">
            <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="搜索名称、代码、账户或币种" className="input-style pl-9" />
          </label>
          <select value={accountFilter} onChange={(event) => setAccountFilter(event.target.value)} className="input-style w-48">
            <option>全部账户</option>
            {accounts.map((account) => <option key={account} value={account}>{account}</option>)}
          </select>
          {(searchQuery || accountFilter !== '全部账户' || activeCategory !== '全部') && (
            <button type="button" onClick={() => { setSearchQuery(''); setAccountFilter('全部账户'); setActiveCategory('全部') }} className="h-10 px-3 text-sm text-slate-400 hover:text-brand-600">清除筛选</button>
          )}
        </div>

        {/* 类别筛选 */}
        <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 -mx-1 px-1">
          {FILTERS.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-full sm:rounded-lg text-sm whitespace-nowrap transition-colors ${
                activeCategory === cat
                  ? 'bg-brand-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 表格（移动端可左右滚动，名称列冻结） */}
      <div className="card overflow-hidden sm:p-0">
        <div className="overflow-x-auto max-w-full">
          <table className="w-full text-sm">
            <colgroup>
              <col className="w-[100px] min-w-[100px]" />
              <col />
              <col />
              <col />
              <col />
              <col />
              <col />
              <col />
              <col />
              <col className="w-[64px]" />
              <col />
              <col />
            </colgroup>
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-100 whitespace-nowrap sm:sticky sm:top-0 sm:z-20">
                <Th label="名称" field="name" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} sticky />
                <Th label="代码" field="symbol" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
                <Th label="类别" field="assetType" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
                <Th label="市场" field="market" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
                <Th label="账户" field="account" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
                <Th label="币种" field="currency" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
                <Th label="数量" field="quantity" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} align="right" />
                <Th label="单价" field="price" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} align="right" />
                <Th label="原币市值" field="marketValue" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} align="right" />
                <Th label="人民币市值" field="marketValueCNY" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} align="right" />
                <Th label="占比" field="ratio" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} align="right" />
                <th className="py-2 px-1.5 font-medium text-center whitespace-nowrap">操作</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((h, idx) => {
                const color = getColor(h)
                return (
                  <tr key={`${h.symbol}-${idx}`} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 dark:hover:bg-gray-700/60 whitespace-nowrap">
                    <td className="py-2 px-1.5 sm:px-4 text-gray-800 font-medium sticky left-0 bg-white dark:bg-gray-800 z-10">{h.name}</td>
                    <td className="py-2 px-1.5 text-gray-600">{h.symbol === '-' ? '—' : h.symbol}</td>
                    <td className="py-2 px-1.5">
                      <span className="inline-flex items-center gap-1">
                        <span className="inline-block w-1.5 h-1.5 rounded-sm shrink-0" style={{ backgroundColor: color }} />
                        <span className="text-gray-600">{getCategory(h)}</span>
                      </span>
                    </td>
                    <td className="py-2 px-1.5 text-gray-600">{marketLabels[h.market] || h.market}</td>
                    <td className="py-2 px-1.5 text-gray-600">{h.account}</td>
                    <td className="py-2 px-1.5 text-gray-600">{h.currency}</td>
                    <td className="py-2 px-1.5 text-right text-gray-600">
                      {h.quantity === null || h.quantity === undefined ? '—' : formatNumber(h.quantity, h.quantity < 1 ? 6 : 2)}
                    </td>
                    <td className="py-2 px-1.5 text-right text-gray-600">
                      {h.price === null || h.price === undefined ? '—' : formatNumber(h.price, h.price < 1 ? 6 : 2)}
                    </td>
                    <td className="py-2 px-1.5 text-right text-gray-600">
                      {h.marketValue === null || h.marketValue === undefined ? '—' : formatNumber(h.marketValue, 2)}
                    </td>
                    <td className="py-2 px-1.5 text-right text-gray-600">{formatCurrency(h.marketValueCNY)}</td>
                    <td className="py-2 px-1.5 text-right text-gray-600">{h.ratio.toFixed(2)}%</td>
                    <td className="py-2 px-1.5 text-center">
                      <button type="button" onClick={() => openEdit(h)} disabled={!canEdit} className="h-8 px-2 rounded text-sm text-brand-600 hover:bg-brand-50 disabled:text-gray-300 disabled:cursor-not-allowed">编辑</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="font-semibold border-t-2 border-gray-100 whitespace-nowrap">
                <td className="py-2 px-1.5 sm:px-4 text-gray-600 sticky left-0 bg-white dark:bg-gray-800 z-10" colSpan={1}>合计</td>
                <td className="py-2 px-1.5 text-gray-600" colSpan={8}>—</td>
                <td className="py-2 px-1.5 text-right text-gray-600">{formatCurrency(sumMarketValue)}</td>
                <td className="py-2 px-1.5 text-right text-gray-600">{filteredRatio.toFixed(2)}%</td>
                <td className="py-2 px-1.5">—</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <HoldingEditor
        open={editorOpen}
        holding={editingHolding}
        total={total}
        onClose={closeEditor}
        onSaved={handleSaved}
      />

    </div>
  )
}

function Th({ label, field, sortBy, sortDir, onSort, align = 'left', sticky }) {
  const active = sortBy === field
  return (
    <th className={`py-2 px-1.5 font-medium whitespace-nowrap ${align === 'right' ? 'text-right' : 'text-left'} ${sticky ? 'sticky left-0 z-20 bg-white dark:bg-gray-800' : ''}`}>
      <button
        onClick={() => onSort(field)}
        className={`inline-flex items-center gap-1 ${active ? 'text-brand-600' : 'text-gray-400 hover:text-gray-600'}`}
      >
        {label}
        {active && <span className="text-sm">{sortDir === 'asc' ? '↑' : '↓'}</span>}
      </button>
    </th>
  )
}
