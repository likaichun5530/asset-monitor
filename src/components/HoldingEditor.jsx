import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { deleteHolding, fetchHoldingEditorData, saveHolding } from '../utils/dataStore.js'
import { formatCurrency, formatNumber } from '../utils/format.js'
import { readHoldingEditorDraft, writeHoldingEditorDraft } from '../utils/holdingEditorDraft.js'
import { getMarketCashName } from '../utils/holdingScope.js'

const CATEGORIES = [
  { value: '美股', label: '美股' },
  { value: 'A股', label: 'A股' },
  { value: '港股', label: '港股' },
  { value: '日股', label: '日股' },
  { value: '债基', label: '债基' },
  { value: '现金', label: '现金' },
  { value: '黄金', label: '黄金' },
  { value: '虚拟币', label: '虚拟币' },
  { value: '期货', label: '期货' },
]
const ACCOUNT_CASH_CATEGORIES = new Set(['美股', 'A股', '港股', '日股'])
const FORM_CATEGORIES = new Set([...ACCOUNT_CASH_CATEGORIES, '债基'])
const STOCK_MARKETS = { 美股: 'US', A股: 'CN', 港股: 'HK', 日股: 'JP' }
const CATEGORY_DEFAULTS = {
  债基: { market: 'CN', currency: 'CNY' },
  黄金: { market: 'GLOBAL', currency: 'CNY' },
  虚拟币: { market: 'GLOBAL', currency: 'USD' },
  美股: { market: 'US', currency: 'USD' },
  A股: { market: 'CN', currency: 'CNY' },
  港股: { market: 'HK', currency: 'HKD' },
  日股: { market: 'JP', currency: 'JPY' },
  现金: { market: 'CN', currency: 'CNY' },
  期货: { market: 'CN', currency: 'CNY' },
}

const EMPTY_OPTIONS = {
  accounts: [],
  markets: ['CN', 'US', 'HK', 'JP', 'GLOBAL'],
  currencies: ['CNY', 'USD', 'HKD', 'JPY'],
  marketItems: [],
  fxRates: { CNY: 1 },
}

function initialForm(holding) {
  const category = holding?.category || ''
  const valuationMode = holding?.valuationMode
    || (category === '期货' ? 'formula' : holding?.symbol && holding.symbol !== '-' ? 'tracked' : 'amount')
  const holdingForm = ACCOUNT_CASH_CATEGORIES.has(category)
    ? valuationMode === 'amount' ? 'accountCash' : 'security'
    : category === '债基'
      ? valuationMode === 'amount' ? 'amount' : 'tracked'
      : ''
  const name = holdingForm === 'accountCash' ? getMarketCashName(category) : holding?.name || ''
  return {
    category,
    holdingForm,
    name,
    symbol: holding?.symbol === '-' ? '' : holding?.symbol || '',
    market: holding?.market || CATEGORY_DEFAULTS[category]?.market || '',
    account: holding?.account || '',
    currency: holding?.currency || CATEGORY_DEFAULTS[category]?.currency || 'CNY',
    quantity: holding?.quantity ?? '',
    marketValueInput: holding?.marketValueExpression || holding?.marketValue || '',
  }
}

export default function HoldingEditor({ open, holding, total, onClose, onSaved }) {
  const [form, setForm] = useState(() => initialForm(holding))
  const [initial, setInitial] = useState(() => initialForm(holding))
  const [options, setOptions] = useState(EMPTY_OPTIONS)
  const [loadingOptions, setLoadingOptions] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const restoringFormRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const base = initialForm(holding)
    const draft = readHoldingEditorDraft()
    const sameHolding = holding
      ? draft?.holding?.rowNumber === holding.rowNumber
      : !draft?.holding
    const next = sameHolding && draft?.form ? { ...base, ...draft.form } : base
    if (!next.holdingForm && next.positionType) {
      next.holdingForm = next.positionType === '现金' ? 'accountCash' : 'security'
    }
    delete next.positionType
    if (next.holdingForm === 'accountCash' && getMarketCashName(next.category)) {
      next.name = getMarketCashName(next.category)
    }
    restoringFormRef.current = JSON.stringify(next)
    setForm(next)
    setInitial(base)
    setError('')
    setLoadingOptions(true)
    fetchHoldingEditorData()
      .then((result) => setOptions({ ...EMPTY_OPTIONS, ...(result.editorOptions || {}) }))
      .catch(() => setError('无法加载在线行情和选项，表单草稿已保留，请检查网络后重试'))
      .finally(() => setLoadingOptions(false))
    const previousOverflow = document.body.style.overflow
    const previousModalOpen = document.body.dataset.modalOpen
    document.body.style.overflow = 'hidden'
    document.body.dataset.modalOpen = 'true'
    return () => {
      document.body.style.overflow = previousOverflow
      if (previousModalOpen === undefined) delete document.body.dataset.modalOpen
      else document.body.dataset.modalOpen = previousModalOpen
    }
  }, [open, holding])

  useEffect(() => {
    if (!open) return
    const serializedForm = JSON.stringify(form)
    if (restoringFormRef.current !== null) {
      if (serializedForm !== restoringFormRef.current) return
      restoringFormRef.current = null
    }
    writeHoldingEditorDraft({ holding: holding || null, form })
  }, [open, holding, form])

  const dirty = JSON.stringify(form) !== JSON.stringify(initial)
  const needsHoldingForm = FORM_CATEGORIES.has(form.category)
  const isAccountCash = ACCOUNT_CASH_CATEGORIES.has(form.category) && form.holdingForm === 'accountCash'
  const accountCashName = isAccountCash ? getMarketCashName(form.category) : ''
  const isAmount = form.category === '现金' || isAccountCash || (form.category === '债基' && form.holdingForm === 'amount')
  const isFuture = form.category === '期货'
  const isTracked = Boolean(form.category) && !isAmount && !isFuture
  const portfolioMarket = STOCK_MARKETS[form.category]
  const fixedMarket = portfolioMarket || ''

  const marketItem = useMemo(() => {
    const symbol = form.symbol.trim().toLowerCase()
    if (!symbol) return null
    return options.marketItems.find((item) => String(item.symbol).trim().toLowerCase() === symbol) || null
  }, [form.symbol, options.marketItems])

  const preview = useMemo(() => {
    const fx = options.fxRates[form.currency]
    let original = null
    if (isAmount) {
      const value = Number(String(form.marketValueInput).replace(/,/g, ''))
      if (Number.isFinite(value)) original = value
    } else if (isFuture) {
      if (!String(form.marketValueInput).trim().startsWith('=')) {
        const value = Number(String(form.marketValueInput).replace(/,/g, ''))
        if (Number.isFinite(value)) original = value
      }
    } else {
      const quantity = Number(String(form.quantity).replace(/,/g, ''))
      if (Number.isFinite(quantity) && Number.isFinite(marketItem?.price)) original = quantity * marketItem.price
    }
    const cny = Number.isFinite(original) && Number.isFinite(fx) ? original * fx : null
    const adjustedTotal = cny === null ? null : total - Number(holding?.marketValueCNY || 0) + cny
    const ratio = adjustedTotal > 0 && cny !== null ? (cny / adjustedTotal) * 100 : null
    return { original, cny, ratio }
  }, [form.currency, form.marketValueInput, form.quantity, holding?.marketValueCNY, isAmount, isFuture, marketItem, options.fxRates, total])

  if (!open) return null

  function setField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
    setError('')
  }

  function changeCategory(category) {
    const defaults = CATEGORY_DEFAULTS[category] || {}
    setForm((current) => ({
      ...current,
      category,
      holdingForm: '',
      name: '',
      market: defaults.market || '',
      currency: defaults.currency || 'CNY',
      symbol: '',
      quantity: '',
      marketValueInput: '',
    }))
    setError('')
  }

  function changeHoldingForm(holdingForm) {
    const defaults = CATEGORY_DEFAULTS[form.category] || {}
    setForm((current) => ({
      ...current,
      holdingForm,
      name: holdingForm === 'accountCash' ? getMarketCashName(form.category) : '',
      market: defaults.market || '',
      currency: defaults.currency || 'CNY',
      symbol: '',
      quantity: '',
      marketValueInput: '',
    }))
    setError('')
  }

  function requestClose() {
    if (saving || deleting) return
    if (dirty && !window.confirm('尚有未保存的修改，确定关闭吗？')) return
    onClose()
  }

  async function submit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const payload = {
        category: form.category,
        valuationMode: isAmount ? 'amount' : isFuture ? 'formula' : 'tracked',
        name: accountCashName || form.name,
        symbol: form.symbol,
        market: fixedMarket || form.market,
        account: form.account,
        currency: form.currency,
        quantity: form.quantity,
        marketValueInput: form.marketValueInput,
      }
      if (holding) {
        payload.rowNumber = holding.rowNumber
        payload.rowVersion = holding.rowVersion
      }
      await saveHolding(payload, { editing: Boolean(holding) })
      await onSaved(holding ? 'updated' : 'created')
      onClose()
    } catch (e) {
      setError(e?.message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!holding || saving || deleting) return
    const confirmed = window.confirm(`确定删除“${holding.name}”整行持仓吗？此操作无法撤销。`)
    if (!confirmed) return
    setError('')
    setDeleting(true)
    try {
      await deleteHolding({ rowNumber: holding.rowNumber, rowVersion: holding.rowVersion })
      await onSaved('deleted')
      onClose()
    } catch (e) {
      setError(e?.message || '删除失败')
    } finally {
      setDeleting(false)
    }
  }

  const priceMissing = isTracked && form.symbol.trim() && !loadingOptions && !marketItem

  const stopTouchPropagation = (event) => event.stopPropagation()

  return createPortal(
    <div
      data-pull-refresh-ignore="true"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center overflow-hidden bg-black/40 overscroll-none"
      onTouchStart={stopTouchPropagation}
      onTouchMove={stopTouchPropagation}
      onTouchEnd={stopTouchPropagation}
      onTouchCancel={stopTouchPropagation}
    >
      <div role="dialog" aria-modal="true" aria-label={holding ? '编辑持仓' : '新增持仓'} className="w-full sm:max-w-xl max-h-[92dvh] min-h-0 bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col overflow-hidden">
        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{holding ? '编辑持仓' : '新增持仓'}</h2>
          <button type="button" onClick={requestClose} className="w-10 h-10 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="关闭">×</button>
        </div>

        <form onSubmit={submit} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-4" style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}>
          <Field label="资产归属" required hint="决定这笔资金计入哪类资产">
            <select value={form.category} onChange={(e) => changeCategory(e.target.value)} className="input-style" required>
              <option value="">请选择类别</option>
              {CATEGORIES.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
            </select>
          </Field>

          {form.category === '现金' && (
            <p className="-mt-2 text-xs leading-5 text-gray-400">
              仅用于可消费或自由调配的资金。证券账户中未买入证券的资金，请选择对应股票市场后再选“账户现金”。
            </p>
          )}

          {ACCOUNT_CASH_CATEGORIES.has(form.category) && (
            <Field label="当前形式" required hint="两者都归属该证券账户">
              <select value={form.holdingForm} onChange={(e) => changeHoldingForm(e.target.value)} className="input-style" required>
                <option value="">请选择持有形式</option>
                <option value="security">证券持仓（代码 × 数量）</option>
                <option value="accountCash">账户现金（直接填金额）</option>
              </select>
            </Field>
          )}

          {form.category === '债基' && (
            <Field label="估值方式" required hint="两者都归属债基，不计入可用现金">
              <select value={form.holdingForm} onChange={(e) => changeHoldingForm(e.target.value)} className="input-style" required>
                <option value="">请选择估值方式</option>
                <option value="tracked">按代码和数量计算</option>
                <option value="amount">直接填写原币市值</option>
              </select>
            </Field>
          )}

          {form.category && (!needsHoldingForm || form.holdingForm) && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="名称" required>
                  <input value={accountCashName || form.name} onChange={(e) => setField('name', e.target.value)} className={`input-style ${isAccountCash ? 'bg-gray-50 dark:bg-gray-700 text-gray-500' : ''}`} maxLength={80} disabled={isAccountCash} required />
                </Field>

                {(isTracked || isFuture) && (
                  <Field label="代码" required>
                    <input value={form.symbol} onChange={(e) => setField('symbol', e.target.value.toUpperCase())} className="input-style" maxLength={40} required />
                  </Field>
                )}

                <Field label="市场" required hint={fixedMarket ? '由归属确定' : ''}>
                  {fixedMarket ? (
                    <input value={fixedMarket} className="input-style bg-gray-50 dark:bg-gray-700 text-gray-500" disabled />
                  ) : (
                    <select value={form.market} onChange={(e) => setField('market', e.target.value)} className="input-style" required>
                      <option value="">请选择市场</option>
                      {options.markets.map((market) => <option key={market} value={market}>{market}</option>)}
                    </select>
                  )}
                </Field>

                <Field label="账户" required>
                  <input value={form.account} onChange={(e) => setField('account', e.target.value)} className="input-style" list="holding-account-options" maxLength={80} required />
                  <datalist id="holding-account-options">{options.accounts.map((account) => <option key={account} value={account} />)}</datalist>
                </Field>

                <Field label="币种" required>
                  <select value={form.currency} onChange={(e) => setField('currency', e.target.value)} className="input-style" required>
                    {options.currencies.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
                  </select>
                </Field>

                {(isTracked || isFuture) && (
                  <Field label="数量" required>
                    <input type="number" inputMode="decimal" min="0" step="any" value={form.quantity} onChange={(e) => setField('quantity', e.target.value)} className="input-style" required />
                  </Field>
                )}

                {(isAmount || isFuture) && (
                  <Field label="原币市值" required hint={isFuture ? '可填写数字或以 = 开头的公式' : ''}>
                    <input value={form.marketValueInput} inputMode={isFuture ? 'text' : 'decimal'} onChange={(e) => setField('marketValueInput', e.target.value)} className="input-style" placeholder={isFuture ? '=价格*数量*乘数' : ''} required />
                  </Field>
                )}
              </div>

              {priceMissing && <p className="text-sm text-red-500">Market 表中暂未找到代码 {form.symbol.trim().toUpperCase()}，补充行情后才能保存。</p>}
              {(isTracked || isFuture) && marketItem && <p className="text-xs text-gray-400">已匹配行情：{marketItem.name} · {formatNumber(marketItem.price, 6)}</p>}

              <div className="rounded-xl bg-gray-50 dark:bg-gray-900/50 p-3">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">自动计算预览</div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <Preview label="单价" value={isAmount ? '—' : marketItem ? formatNumber(marketItem.price, 6) : isFuture ? '保存后计算' : '待匹配'} />
                  <Preview label="原币市值" value={preview.original === null ? (isFuture && String(form.marketValueInput).trim().startsWith('=') ? '保存后计算' : '—') : formatNumber(preview.original, 2)} />
                  <Preview label="人民币市值" value={preview.cny === null ? '保存后计算' : formatCurrency(preview.cny)} />
                  <Preview label="预计占比" value={preview.ratio === null ? '保存后计算' : `${preview.ratio.toFixed(2)}%`} />
                </div>
              </div>
            </>
          )}

          {error && <div className="rounded-lg bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">{error}</div>}

          <div className="sticky bottom-0 bg-white dark:bg-gray-800 pt-2 pb-1 flex gap-3">
            {holding && <button type="button" onClick={remove} disabled={saving || deleting} className="flex-1 h-11 rounded-lg border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400 disabled:opacity-50">{deleting ? '删除中…' : '删除'}</button>}
            <button type="button" onClick={requestClose} disabled={saving || deleting} className="flex-1 h-11 rounded-lg border border-gray-200 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300 disabled:opacity-50">取消</button>
            <button type="submit" disabled={saving || deleting || loadingOptions || !form.category || (needsHoldingForm && !form.holdingForm) || priceMissing} className="flex-1 h-11 rounded-lg bg-brand-600 text-white text-sm font-medium transition-all active:scale-95 disabled:scale-100 disabled:opacity-50">
              {saving ? '保存中…' : holding ? '保存修改' : '新增持仓'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  )
}

function Field({ label, required, hint, children }) {
  return (
    <label className="block min-w-0">
      <span className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300 mb-1.5">
        {label}{required && <span className="text-red-400">*</span>}
        {hint && <span className="text-xs text-gray-400">{hint}</span>}
      </span>
      {children}
    </label>
  )
}

function Preview({ label, value }) {
  return <div className="flex justify-between gap-2"><span className="text-gray-400">{label}</span><span className="text-gray-700 dark:text-gray-200 text-right">{value}</span></div>
}
