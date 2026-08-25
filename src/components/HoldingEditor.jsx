import { useEffect, useMemo, useState } from 'react'
import { fetchHoldingEditorData, saveHolding } from '../utils/dataStore.js'
import { formatCurrency, formatNumber } from '../utils/format.js'
import { readHoldingEditorDraft, writeHoldingEditorDraft } from '../utils/holdingEditorDraft.js'

const CATEGORIES = ['债基', '黄金', '虚拟币', '美股', 'A股', '港股', '日股', '现金', '期货']
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
  return {
    category,
    name: holding?.name || '',
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
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return undefined
    const base = initialForm(holding)
    const draft = readHoldingEditorDraft()
    const sameHolding = holding
      ? draft?.holding?.rowNumber === holding.rowNumber
      : !draft?.holding
    const next = sameHolding && draft?.form ? { ...base, ...draft.form } : base
    setForm(next)
    setInitial(base)
    setError('')
    setLoadingOptions(true)
    fetchHoldingEditorData()
      .then((result) => setOptions({ ...EMPTY_OPTIONS, ...(result.editorOptions || {}) }))
      .catch(() => setError('无法加载在线行情和选项，表单草稿已保留，请检查网络后重试'))
      .finally(() => setLoadingOptions(false))
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow }
  }, [open, holding])

  useEffect(() => {
    if (!open) return
    writeHoldingEditorDraft({ holding: holding || null, form })
  }, [open, holding, form])

  const dirty = JSON.stringify(form) !== JSON.stringify(initial)
  const isCash = form.category === '现金'
  const isFuture = form.category === '期货'
  const stockMarket = STOCK_MARKETS[form.category]

  const marketItem = useMemo(() => {
    const symbol = form.symbol.trim().toLowerCase()
    if (!symbol) return null
    return options.marketItems.find((item) => String(item.symbol).trim().toLowerCase() === symbol) || null
  }, [form.symbol, options.marketItems])

  const preview = useMemo(() => {
    const fx = options.fxRates[form.currency]
    let original = null
    if (isCash) {
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
  }, [form.currency, form.marketValueInput, form.quantity, holding?.marketValueCNY, isCash, isFuture, marketItem, options.fxRates, total])

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
      market: defaults.market || '',
      currency: defaults.currency || 'CNY',
      symbol: '',
      quantity: '',
      marketValueInput: '',
    }))
    setError('')
  }

  function requestClose() {
    if (saving) return
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
        name: form.name,
        symbol: form.symbol,
        market: stockMarket || form.market,
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
      await onSaved()
      onClose()
    } catch (e) {
      setError(e?.message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const priceMissing = !isCash && !isFuture && form.symbol.trim() && !loadingOptions && !marketItem

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40">
      <div role="dialog" aria-modal="true" aria-label={holding ? '编辑持仓' : '新增持仓'} className="w-full sm:max-w-xl max-h-[92vh] bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{holding ? '编辑持仓' : '新增持仓'}</h2>
          <button type="button" onClick={requestClose} className="w-10 h-10 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="关闭">×</button>
        </div>

        <form onSubmit={submit} className="overflow-y-auto px-4 py-4 space-y-4">
          <Field label="类别" required>
            <select value={form.category} onChange={(e) => changeCategory(e.target.value)} className="input-style" required>
              <option value="">请选择类别</option>
              {CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </Field>

          {form.category && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="名称" required>
                  <input value={form.name} onChange={(e) => setField('name', e.target.value)} className="input-style" maxLength={80} required />
                </Field>

                {!isCash && (
                  <Field label="代码" required>
                    <input value={form.symbol} onChange={(e) => setField('symbol', e.target.value.toUpperCase())} className="input-style" maxLength={40} required />
                  </Field>
                )}

                <Field label="市场" required hint={stockMarket ? '由股票类别确定' : ''}>
                  {stockMarket ? (
                    <input value={stockMarket} className="input-style bg-gray-50 dark:bg-gray-700 text-gray-500" disabled />
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

                {!isCash && (
                  <Field label="数量" required>
                    <input type="number" inputMode="decimal" min="0" step="any" value={form.quantity} onChange={(e) => setField('quantity', e.target.value)} className="input-style" required />
                  </Field>
                )}

                {(isCash || isFuture) && (
                  <Field label="原币市值" required hint={isFuture ? '可填写数字或以 = 开头的公式' : ''}>
                    <input value={form.marketValueInput} inputMode={isFuture ? 'text' : 'decimal'} onChange={(e) => setField('marketValueInput', e.target.value)} className="input-style" placeholder={isFuture ? '=价格*数量*乘数' : ''} required />
                  </Field>
                )}
              </div>

              {priceMissing && <p className="text-sm text-red-500">Market 表中暂未找到代码 {form.symbol.trim().toUpperCase()}，补充行情后才能保存。</p>}
              {!isCash && marketItem && <p className="text-xs text-gray-400">已匹配行情：{marketItem.name} · {formatNumber(marketItem.price, 6)}</p>}

              <div className="rounded-xl bg-gray-50 dark:bg-gray-900/50 p-3">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">自动计算预览</div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <Preview label="单价" value={isCash ? '—' : marketItem ? formatNumber(marketItem.price, 6) : '待匹配'} />
                  <Preview label="原币市值" value={preview.original === null ? (isFuture && String(form.marketValueInput).trim().startsWith('=') ? '保存后计算' : '—') : formatNumber(preview.original, 2)} />
                  <Preview label="人民币市值" value={preview.cny === null ? '保存后计算' : formatCurrency(preview.cny)} />
                  <Preview label="预计占比" value={preview.ratio === null ? '保存后计算' : `${preview.ratio.toFixed(2)}%`} />
                </div>
              </div>
            </>
          )}

          {error && <div className="rounded-lg bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">{error}</div>}

          <div className="sticky bottom-0 bg-white dark:bg-gray-800 pt-2 pb-1 flex gap-3">
            <button type="button" onClick={requestClose} className="flex-1 h-11 rounded-lg border border-gray-200 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300">取消</button>
            <button type="submit" disabled={saving || loadingOptions || !form.category || priceMissing} className="flex-1 h-11 rounded-lg bg-brand-600 text-white text-sm font-medium disabled:opacity-50">
              {saving ? '保存中…' : holding ? '保存修改' : '新增持仓'}
            </button>
          </div>
        </form>
      </div>
    </div>
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
