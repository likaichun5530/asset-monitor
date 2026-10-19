// Market 名称直接展示；合约代码用于推算第三个周五交割日。
export function inferIcSettleDate(symbol) {
  const match = String(symbol || '').trim().toUpperCase().match(/^IC(\d{2})(\d{2})$/)
  if (!match || Number(match[2]) < 1 || Number(match[2]) > 12) return ''
  const year = 2000 + Number(match[1]), month = Number(match[2]) - 1
  const first = new Date(Date.UTC(year, month, 1))
  const day = 1 + (5 - first.getUTCDay() + 7) % 7 + 14
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function calculateIcQuote(item, spot, now = Date.now()) {
  const positive = (value) => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : null
  const price = positive(item.price)
  const spotPrice = positive(spot)
  const spread = price !== null && spotPrice !== null ? spotPrice - price : null
  const settleDate = item.settleDate || inferIcSettleDate(item.code || item.symbol) || inferIcSettleDate(item.name)
  // 按上海自然日计算，避免 UTC 与本地时区切换造成天数误差。
  const today = new Date(now + 8 * 3600000).toISOString().slice(0, 10)
  const remaining = settleDate ? (Date.parse(`${settleDate}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000 : NaN
  const daysToSettle = Number.isFinite(remaining) ? Math.max(0, remaining) : null
  const annualRate = spread !== null && daysToSettle > 0 ? spread / price * 365 / daysToSettle * 100 : null
  return { ...item, name: item.name || item.code || item.symbol, price, spread, discount: spread, settleDate, daysToSettle, annualRate }
}

export function buildIcQuotes(items, now = Date.now()) {
  const spotItem = items.find((item) => item.name.includes('中证500') && item.group !== '期货')
  const spot = spotItem?.price ?? null
  const contracts = items.filter((item) => /^IC/i.test(item.name.trim()) || /^IC/i.test(item.symbol.trim()))
  return [{ type: '现货', code: spotItem?.symbol || 'sh000905', name: spotItem?.name || '中证500', price: spot, spot, discount: 0, annualRate: null, settleDate: '', daysToSettle: null },
    ...contracts.map((item) => calculateIcQuote({ type: '期货', code: item.symbol || item.name, name: item.name, price: item.price, spot }, spot, now))]
}
