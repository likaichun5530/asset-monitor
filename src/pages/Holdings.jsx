import { useMemo, useState, useRef, useCallback, useEffect } from 'react'
import { getActiveHoldings, holdingMarketValue, totalMarketValue } from '../utils/asset.js'
import { updateHoldings } from '../utils/dataStore.js'
import { exchangeRates } from '../data/holdings.js'
import { formatCurrency, formatNumber } from '../utils/format.js'

// 筛选标签（股票按市场拆分）
const FILTERS = ['全部', '美股', 'A股', '港股', '日股', '数字货币', '黄金', '现金', '债券', '期货']

// 类别选项（用于编辑表单下拉）
const TYPE_OPTIONS = ['股票', '数字货币', '黄金', '现金', '债券', '期货']
const MARKET_OPTIONS = ['US', 'CN', 'HK', 'JP', 'GLOBAL', '其他']
const CURRENCY_OPTIONS = ['CNY', 'USD', 'HKD']

// 空行模板（用于新增）
function emptyRow() {
  return {
    assetType: '股票',
    market: 'CN',
    account: '未知',
    symbol: '-',
    name: '',
    currency: 'CNY',
    quantity: null,
    price: null,
    marketValue: null,
    marketValueCNY: 0,
  }
}

export default function Holdings({ loading, refreshKey, onDataChange }) {
  const [activeCategory, setActiveCategory] = useState('全部')
  const [sortBy, setSortBy] = useState('marketValueCNY')
  const [sortDir, setSortDir] = useState('desc')

  // 编辑状态
  const [editingRow, setEditingRow] = useState(null) // 当前编辑的行 index（null=未编辑）
  const [editForm, setEditForm] = useState(null)     // 编辑表单数据
  const [isNew, setIsNew] = useState(false)          // 是否新增
  const [msg, setMsg] = useState(null)               // 保存提示

  const longPressTimer = useRef(null)
  const longPressTriggered = useRef(false)

  const total = useMemo(() => totalMarketValue(), [refreshKey])
  const holdings = useMemo(() => getActiveHoldings(), [refreshKey])

  const rows = useMemo(() => {
    let list = holdings.map((h, idx) => ({
      ...h,
      _idx: idx,
      marketValueCNY: holdingMarketValue(h),
      ratio: total ? (holdingMarketValue(h) / total) * 100 : 0,
    }))
    if (activeCategory !== '全部') {
      list = list.filter((h) => getCategory(h) === activeCategory)
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
  }, [holdings, activeCategory, sortBy, sortDir, total])

  function toggleSort(field) {
    if (sortBy === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortDir('desc')
    }
  }

  // ===== 长按 800ms 触发编辑 =====
  const startLongPress = useCallback((idx, e) => {
    longPressTriggered.current = false
    clearTimeout(longPressTimer.current)
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true
      const h = holdings[idx]
      if (h) {
        setEditingRow(idx)
        setEditForm({ ...h, _idx: idx })
        setIsNew(false)
        setMsg(null)
      }
    }, 800)
  }, [holdings])

  const cancelLongPress = useCallback(() => {
    clearTimeout(longPressTimer.current)
    setTimeout(() => { longPressTriggered.current = false }, 150)
  }, [])

  const handleRowClick = useCallback((idx, e) => {
    // 若是长按触发的点击，忽略（避免编辑弹窗立刻被遮罩关闭）
    if (longPressTriggered.current) return
  }, [])

  useEffect(() => () => clearTimeout(longPressTimer.current), [])

  // ===== 编辑操作 =====

  function updateField(field, value) {
    setEditForm((prev) => ({ ...prev, [field]: value }))
  }

  function startAddRow() {
    setEditingRow(-1)
    setEditForm(emptyRow())
    setIsNew(true)
    setMsg(null)
  }

  function closeEditor() {
    setEditingRow(null)
    setEditForm(null)
    setIsNew(false)
    setMsg(null)
  }

  // 保存（新增或修改）
  async function handleSave() {
    if (!editForm || !editForm.name?.trim()) {
      setMsg({ type: 'error', text: '名称不能为空' })
      return
    }
    // 数字字段转换
    const clean = { ...editForm }
    for (const f of ['quantity', 'price', 'marketValue', 'marketValueCNY']) {
      if (clean[f] === '' || clean[f] === null || clean[f] === undefined) clean[f] = null
      else {
        const n = Number(clean[f])
        clean[f] = Number.isNaN(n) ? null : n
      }
    }
    // 人民币市值使用自动计算值（原币市值 × 汇率）
    clean.marketValueCNY = calcMarketValueCNY
    clean._idx = undefined
    delete clean._idx
    delete clean.ratio
    delete clean.idx

    // 构建新列表
    const next = [...holdings]
    if (isNew) {
      next.push(clean)
    } else {
      next[editingRow] = clean
    }

    try {
      setMsg({ type: 'info', text: '同步中...' })
      await updateHoldings(next)
      setMsg({ type: 'success', text: '已同步到 Google Sheets' })
      if (editingRow === -1) {
        onDataChange?.()
      } else {
        onDataChange?.()
      }
      closeEditor()
      // 等待数据刷新
      setTimeout(onDataChange, 100)
    } catch (e) {
      setMsg({ type: 'error', text: '同步失败：' + (e?.message || String(e)) })
    }
  }

  // 删除当前行
  async function handleDelete() {
    if (editingRow === -1 || editingRow === null) return
    const next = holdings.filter((_, i) => i !== editingRow)
    try {
      setMsg({ type: 'info', text: '同步中...' })
      await updateHoldings(next)
      setMsg({ type: 'success', text: '已删除并同步到 Google Sheets' })
      onDataChange?.()
      closeEditor()
      setTimeout(onDataChange, 100)
    } catch (e) {
      setMsg({ type: 'error', text: '删除失败：' + (e?.message || String(e)) })
    }
  }

  const sumMarketValue = rows.reduce((s, r) => s + r.marketValueCNY, 0)
  const demoMode = typeof window !== 'undefined' ? (localStorage.getItem('youshu-demo-mode') === 'true') : false

  // 现金/债券：没有数量与单价概念
  const isPlainAsset = editForm && ['现金', '债券'].includes(editForm.assetType)

  // 人民币市值自动计算 = 原币市值 × 汇率
  const calcMarketValueCNY = useMemo(() => {
    if (!editForm) return null
    const mv = editForm.marketValue
    if (mv === null || mv === undefined || mv === '') return null
    const num = Number(mv)
    if (Number.isNaN(num)) return null
    const rate = exchangeRates[editForm.currency] ?? 1
    return Math.round(num * rate * 100) / 100
  }, [editForm])

  return (
    <div className="space-y-[4px]">
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-800">明细</h2>
          <span className="text-sm text-gray-500">共 {rows.length} 项</span>
        </div>

        {/* 类别筛选 */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
          {FILTERS.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                activeCategory === cat
                  ? 'bg-brand-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 新增按钮 */}
      {!demoMode && (
        <div className="flex items-center justify-between px-1">
          <span className="text-xs text-gray-400">长按任意行可编辑</span>
          <button
            onClick={startAddRow}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium transition-colors"
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
            新增行
          </button>
        </div>
      )}

      {/* 表格（移动端可左右滚动，名称列冻结） */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto max-w-full">
          <table className="w-full text-sm">
            <colgroup>
              <col className="w-[120px] min-w-[120px]" />
              <col />
              <col />
              <col />
              <col />
              <col />
              <col />
              <col />
              <col />
              <col />
              <col />
            </colgroup>
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-100 whitespace-nowrap">
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
              </tr>
            </thead>
            <tbody>
              {rows.map((h) => (
                <tr
                  key={`${h.symbol}-${h._idx}`}
                  className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 dark:hover:bg-gray-700/60 whitespace-nowrap select-none"
                  onTouchStart={(e) => { if (!demoMode) startLongPress(h._idx, e) }}
                  onTouchEnd={cancelLongPress}
                  onTouchMove={() => clearTimeout(longPressTimer.current)}
                  onMouseDown={(e) => { if (!demoMode) startLongPress(h._idx, e) }}
                  onMouseUp={cancelLongPress}
                  onMouseLeave={() => clearTimeout(longPressTimer.current)}
                  onClick={(e) => handleRowClick(h._idx, e)}
                >
                  <td className="py-2 px-1.5 text-gray-600 sticky left-0 bg-white dark:bg-gray-800 z-10">{h.name}</td>
                  <td className="py-2 px-1.5 text-gray-600">{h.symbol === '-' ? '—' : h.symbol}</td>
                  <td className="py-2 px-1.5">
                    <span className="inline-flex items-center gap-1">
                      <span className="inline-block w-1.5 h-1.5 rounded-sm shrink-0" style={{ backgroundColor: getColor(h) }} />
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
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-semibold border-t-2 border-gray-100 whitespace-nowrap">
                <td className="py-2 px-1.5 text-gray-600 sticky left-0 bg-white dark:bg-gray-800 z-10" colSpan={1}>合计</td>
                <td className="py-2 px-1.5 text-gray-600" colSpan={8}>—</td>
                <td className="py-2 px-1.5 text-right text-gray-600">{formatCurrency(sumMarketValue)}</td>
                <td className="py-2 px-1.5 text-right text-gray-600">100%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 编辑弹窗 */}
      {editForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={closeEditor} />
          <div className="relative bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto">
            {/* 标题 */}
            <div className="sticky top-0 bg-white dark:bg-gray-800 px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200">
                {isNew ? '新增持仓' : '编辑持仓'}
              </h3>
              <button onClick={closeEditor} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-5 space-y-4 pb-24 sm:pb-5">
              {/* 表单字段 */}
              <Field label="名称" required>
                <input
                  className="input"
                  value={editForm.name || ''}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="如：苹果/腾讯控股"
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="代码">
                  <input
                    className="input"
                    value={editForm.symbol || ''}
                    onChange={(e) => updateField('symbol', e.target.value)}
                    placeholder="如：AAPL / 00700"
                  />
                </Field>
                <Field label="账户">
                  <input
                    className="input"
                    value={editForm.account || ''}
                    onChange={(e) => updateField('account', e.target.value)}
                    placeholder="如：IBKR / Snowball"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <Field label="类别">
                  <select
                    className="input"
                    value={editForm.assetType || '股票'}
                    onChange={(e) => updateField('assetType', e.target.value)}
                  >
                    {TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
                <Field label="市场">
                  <select
                    className="input"
                    value={editForm.market || '其他'}
                    onChange={(e) => updateField('market', e.target.value)}
                  >
                    {MARKET_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </Field>
                <Field label="币种">
                  <select
                    className="input"
                    value={editForm.currency || 'CNY'}
                    onChange={(e) => updateField('currency', e.target.value)}
                  >
                    {CURRENCY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>
              </div>

              {/* 现金/债券：数量、单价为只读 "—" */}
              <div className="grid grid-cols-2 gap-3">
                <Field label="数量">
                  {isPlainAsset ? (
                    <div className="input flex items-center text-gray-400">—</div>
                  ) : (
                    <input
                      className="input"
                      type="number"
                      step="any"
                      value={editForm.quantity ?? ''}
                      onChange={(e) => updateField('quantity', e.target.value)}
                      placeholder="如：100"
                    />
                  )}
                </Field>
                <Field label="单价">
                  {isPlainAsset ? (
                    <div className="input flex items-center text-gray-400">—</div>
                  ) : (
                    <input
                      className="input"
                      type="number"
                      step="any"
                      value={editForm.price ?? ''}
                      onChange={(e) => updateField('price', e.target.value)}
                      placeholder="如：10.5"
                    />
                  )}
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="原币市值">
                  <input
                    className="input"
                    type="number"
                    step="any"
                    value={editForm.marketValue ?? ''}
                    onChange={(e) => updateField('marketValue', e.target.value)}
                  />
                </Field>
                <Field label="人民币市值">
                  {/* 只读：自动计算 = 原币市值 × 汇率 */}
                  <div className="input flex items-center bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                    {calcMarketValueCNY !== null ? formatCurrency(calcMarketValueCNY) : '—'}
                  </div>
                </Field>
              </div>

              {/* 提示消息 */}
              {msg && (
                <div className={`text-sm px-3 py-2 rounded-lg ${msg.type === 'success' ? 'bg-green-50 text-green-600' : msg.type === 'error' ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-600'}`}>
                  {msg.text}
                </div>
              )}

              {/* 操作按钮 */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleSave}
                  className="flex-1 px-3 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors"
                >
                  保存
                </button>
                {!isNew && (
                  <button
                    onClick={handleDelete}
                    className="px-3 py-2.5 rounded-lg border border-red-200 text-red-500 text-sm font-medium hover:bg-red-50 transition-colors"
                  >
                    删除该行
                  </button>
                )}
                <button
                  onClick={closeEditor}
                  className="px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .input {
          width: 100%;
          padding: 8px 10px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          font-size: 13px;
          color: #374151;
          background: #fff;
          outline: none;
        }
        .input:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 2px rgba(99,102,241,0.2);
        }
        .dark .input {
          background: #1f2937;
          border-color: #4b5563;
          color: #e5e7eb;
        }
      `}</style>
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

function Field({ label, children, required }) {
  return (
    <label className="block">
      <span className="text-xs text-gray-500 mb-1 block">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      {children}
    </label>
  )
}

function getCategory(h) {
  if (h.assetType === '股票') {
    if (h.market === 'US') return '美股'
    if (h.market === 'CN') return 'A股'
    if (h.market === 'HK') return '港股'
    if (h.market === 'JP') return '日股'
    return '股票'
  }
  return h.assetType
}

const marketLabels = {
  US: '美股', CN: 'A股', HK: '港股', JP: '日股', GLOBAL: '全球',
}

const assetColors = {
  美股: '#3b82f6', A股: '#ef4444', 港股: '#8b5cf6', 日股: '#ec4899',
  数字货币: '#f97316', 黄金: '#d4a017', 现金: '#6b7280', 债基: '#10b981',
  债券: '#10b981', 期货: '#06b6d4', 股票: '#3b82f6',
}

function getColor(h) {
  const cat = getCategory(h)
  return assetColors[cat] || '#94a3b8'
}