import { toNumber } from './_google.js'

export const CATEGORY_CONFIG = {
  债基: { assetType: 'Bond' },
  黄金: { assetType: 'Gold' },
  虚拟币: { assetType: 'Crypto' },
  美股: { assetType: 'Stock', market: 'US' },
  A股: { assetType: 'Stock', market: 'CN' },
  港股: { assetType: 'Stock', market: 'HK' },
  日股: { assetType: 'Stock', market: 'JP' },
  现金: { assetType: 'Cash' },
  期货: { assetType: 'Future' },
}

export const REQUIRED_HEADERS = [
  'AssetType', 'Market', 'Account', 'Symbol', 'Name', 'Currency',
  'Quantity', 'Price', 'MarketValue', 'MarketValueCNY',
]

export const FX_NAMES = {
  USD: ['USD', '美元'],
  HKD: ['HKD', '港币'],
  JPY: ['JPY', '日元'],
  EUR: ['EUR', '欧元'],
}

export function httpError(statusCode, message) {
  return Object.assign(new Error(message), { statusCode })
}

export function headerIndex(headers, name) {
  return headers.findIndex((header) => String(header).trim().toLowerCase() === name.toLowerCase())
}

export function assertHoldingsSchema(headers) {
  const missing = REQUIRED_HEADERS.filter((name) => headerIndex(headers, name) < 0)
  if (missing.length) throw httpError(500, `Holdings 表缺少字段：${missing.join('、')}`)
}

export function mapAssetType(type) {
  const value = String(type || '').trim().toLowerCase()
  if (value === 'stock' || value === '股票') return '股票'
  if (value === 'crypto' || value === '虚拟币' || value === '数字货币') return '虚拟币'
  if (value === 'gold' || value === '黄金') return '黄金'
  if (value === 'cash' || value === '现金') return '现金'
  if (value === 'bond' || value === '债券' || value === '债基') return '债基'
  if (value === 'future' || value === '期货') return '期货'
  return type || '其他'
}

export function normalizeHolding(row, index, formulaRow) {
  const marketValueRaw = formulaRow?.MarketValue
  const symbol = String(row.Symbol || row.symbol || '').trim()
  const assetType = mapAssetType(row.AssetType || row.assetType)
  return {
    assetType,
    market: row.Market || row.market || '其他',
    account: row.Account || row.account || '未知',
    symbol: symbol || '-',
    name: row.Name || row.name || `项目${index + 1}`,
    currency: row.Currency || row.currency || 'CNY',
    quantity: toNumber(row.Quantity ?? row.quantity) ?? null,
    price: toNumber(row.Price ?? row.price) ?? null,
    marketValue: toNumber(row.MarketValue ?? row.marketValue) ?? null,
    marketValueCNY: toNumber(row.MarketValueCNY ?? row.marketValueCNY) ?? 0,
    marketValueExpression: typeof marketValueRaw === 'string' && marketValueRaw.startsWith('=') ? marketValueRaw : null,
    valuationMode: assetType === '期货' ? 'formula' : symbol && symbol !== '-' ? 'tracked' : 'amount',
    rowNumber: index + 2,
  }
}

export function marketRows(result) {
  return (result.rawRows || []).map((row, index) => ({
    rowNumber: index + 2,
    name: String(row[0] || '').trim(),
    symbol: String(row[1] || '').trim(),
    price: toNumber(row[2]),
    group: String(row[5] || '').trim(),
  })).filter((row) => row.name || row.symbol)
}

export function findFxRow(rows, currency) {
  if (currency === 'CNY') return null
  const candidates = FX_NAMES[currency] || [currency]
  return rows.find((row) => Number.isFinite(row.price) && row.price > 0 && candidates.some((candidate) =>
    row.symbol.toLowerCase() === candidate.toLowerCase() || row.name.toLowerCase() === candidate.toLowerCase()
  )) || null
}

function findMarketPrice(rows, symbol) {
  const key = String(symbol || '').trim().toLowerCase()
  return rows.find((row) => row.symbol.toLowerCase() === key && Number.isFinite(row.price) && row.price > 0) || null
}

function cleanText(value, label, { max = 80, required = true } = {}) {
  const text = String(value ?? '').trim()
  if (required && !text) throw httpError(400, `请填写${label}`)
  if (text.length > max) throw httpError(400, `${label}不能超过 ${max} 个字符`)
  if (text.startsWith('=')) throw httpError(400, `${label}不能以等号开头`)
  return text
}

function positiveNumber(value, label) {
  const number = typeof value === 'number' ? value : Number(String(value ?? '').replace(/,/g, '').trim())
  if (!Number.isFinite(number) || number <= 0) throw httpError(400, `${label}必须是大于 0 的数字`)
  return number
}

function parseMarketValueInput(value, allowFormula) {
  if (allowFormula && typeof value === 'string' && value.trim().startsWith('=')) {
    const formula = value.trim()
    if (formula.length > 500 || /[\r\n]/.test(formula)) throw httpError(400, '原币市值公式格式不正确')
    if (/\b(?:IMPORTRANGE|IMPORTXML|IMPORTHTML|IMPORTDATA|IMAGE|HYPERLINK)\s*\(/i.test(formula)) {
      throw httpError(400, '原币市值公式不能调用外部数据')
    }
    return formula
  }
  return positiveNumber(value, '原币市值')
}

export function parseInput(body, rows) {
  for (const forbidden of ['assetType', 'price', 'marketValue', 'marketValueCNY', 'ratio']) {
    if (Object.prototype.hasOwnProperty.call(body, forbidden)) throw httpError(400, `${forbidden} 为系统计算字段，不能填写`)
  }

  const category = cleanText(body.category, '类别', { max: 10 })
  const config = CATEGORY_CONFIG[category]
  if (!config) throw httpError(400, '不支持该资产类别')

  const name = cleanText(body.name, '名称')
  const account = cleanText(body.account, '账户')
  const currency = cleanText(body.currency, '币种', { max: 10 }).toUpperCase()
  const market = config.market || cleanText(body.market, '市场', { max: 20 }).toUpperCase()
  const isCash = category === '现金'
  const isFuture = category === '期货'
  const requestedMode = String(body.valuationMode || '').trim().toLowerCase()
  const valuationMode = isCash ? 'amount' : isFuture ? 'formula' : requestedMode || (String(body.symbol || '').trim() ? 'tracked' : 'amount')
  if (!['tracked', 'amount', 'formula'].includes(valuationMode)) throw httpError(400, '不支持该估值方式')
  if (valuationMode === 'formula' && !isFuture) throw httpError(400, '只有期货可使用公式估值')
  if (valuationMode === 'amount' && !['现金', '债基', '美股', 'A股', '港股', '日股'].includes(category)) {
    throw httpError(400, '该资产类别不支持直接填写市值')
  }
  const symbol = valuationMode === 'amount' ? '-' : cleanText(body.symbol, '代码', { max: 40 }).toUpperCase()
  const quantity = valuationMode === 'amount' ? '' : positiveNumber(body.quantity, '数量')
  const allowsAmountFormula = isCash || (valuationMode === 'amount' && config.assetType === 'Stock')
  const originalValue = valuationMode === 'amount'
    ? parseMarketValueInput(body.marketValueInput, allowsAmountFormula)
    : valuationMode === 'formula'
      ? parseMarketValueInput(body.marketValueInput, true)
      : null

  const priceRow = valuationMode === 'tracked' ? findMarketPrice(rows, symbol) : null
  if (valuationMode === 'tracked' && !priceRow) throw httpError(400, `Market 表中找不到代码 ${symbol} 的有效价格`)
  const fxRow = findFxRow(rows, currency)
  if (currency !== 'CNY' && !fxRow) throw httpError(400, `Market 表中找不到 ${currency} 的人民币汇率`)

  return { category, config, valuationMode, name, account, currency, market, symbol, quantity, originalValue, priceRow, fxRow }
}
