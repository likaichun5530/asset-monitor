// Vercel Function: GET / POST / PUT /api/holdings
import crypto from 'crypto'
import { isConfigured, readSheet, appendRows, updateRows, toNumber } from './_google.js'
import { readJsonBody } from './_http.js'
import { requireAuth } from './_auth.js'

const CATEGORY_CONFIG = {
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

const REQUIRED_HEADERS = [
  'AssetType', 'Market', 'Account', 'Symbol', 'Name', 'Currency',
  'Quantity', 'Price', 'MarketValue', 'MarketValueCNY',
]

const FX_NAMES = {
  USD: ['USD', '美元'],
  HKD: ['HKD', '港币'],
  JPY: ['JPY', '日元'],
  EUR: ['EUR', '欧元'],
}

function mapAssetType(t) {
  const s = String(t || '').trim().toLowerCase()
  if (s === 'stock' || s === '股票') return '股票'
  if (s === 'crypto' || s === '虚拟币' || s === '数字货币') return '虚拟币'
  if (s === 'gold' || s === '黄金') return '黄金'
  if (s === 'cash' || s === '现金') return '现金'
  if (s === 'bond' || s === '债券' || s === '债基') return '债基'
  if (s === 'future' || s === '期货') return '期货'
  return t || '其他'
}

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  return res.end(JSON.stringify(body))
}

function httpError(statusCode, message) {
  return Object.assign(new Error(message), { statusCode })
}

function headerIndex(headers, name) {
  return headers.findIndex((h) => String(h).trim().toLowerCase() === name.toLowerCase())
}

function assertSchema(headers) {
  const missing = REQUIRED_HEADERS.filter((name) => headerIndex(headers, name) < 0)
  if (missing.length) throw httpError(500, `Holdings 表缺少字段：${missing.join('、')}`)
}

function columnLetter(index) {
  let n = index + 1
  let result = ''
  while (n > 0) {
    n -= 1
    result = String.fromCharCode(65 + (n % 26)) + result
    n = Math.floor(n / 26)
  }
  return result
}

function rowVersion(formulaRow) {
  return crypto.createHash('sha256')
    .update(JSON.stringify(formulaRow || []))
    .digest('hex')
    .slice(0, 16)
}

function normalizeHolding(row, idx, formulaRow) {
  const marketValueRaw = formulaRow?.MarketValue
  return {
    assetType: mapAssetType(row.AssetType || row.assetType),
    market: row.Market || row.market || '其他',
    account: row.Account || row.account || '未知',
    symbol: row.Symbol || row.symbol || '-',
    name: row.Name || row.name || `项目${idx + 1}`,
    currency: row.Currency || row.currency || 'CNY',
    quantity: toNumber(row.Quantity ?? row.quantity) ?? null,
    price: toNumber(row.Price ?? row.price) ?? null,
    marketValue: toNumber(row.MarketValue ?? row.marketValue) ?? null,
    marketValueCNY: toNumber(row.MarketValueCNY ?? row.marketValueCNY) ?? 0,
    marketValueExpression: typeof marketValueRaw === 'string' && marketValueRaw.startsWith('=')
      ? marketValueRaw
      : null,
    rowNumber: idx + 2,
  }
}

function marketRows(result) {
  return (result.rawRows || []).map((row, idx) => ({
    rowNumber: idx + 2,
    name: String(row[0] || '').trim(),
    symbol: String(row[1] || '').trim(),
    price: toNumber(row[2]),
    group: String(row[5] || '').trim(),
  })).filter((row) => row.name || row.symbol)
}

function findMarketPrice(rows, symbol) {
  const key = String(symbol || '').trim().toLowerCase()
  return rows.find((row) => row.symbol.toLowerCase() === key && Number.isFinite(row.price) && row.price > 0) || null
}

function findFxRow(rows, currency) {
  if (currency === 'CNY') return null
  const candidates = FX_NAMES[currency] || [currency]
  return rows.find((row) => Number.isFinite(row.price) && row.price > 0 && candidates.some((candidate) =>
    row.symbol.toLowerCase() === candidate.toLowerCase() || row.name.toLowerCase() === candidate.toLowerCase()
  )) || null
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

function parseInput(body, rows) {
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
  const symbol = isCash ? '-' : cleanText(body.symbol, '代码', { max: 40 }).toUpperCase()
  const quantity = isCash ? '' : positiveNumber(body.quantity, '数量')
  const originalValue = isCash
    ? parseMarketValueInput(body.marketValueInput, false)
    : isFuture
      ? parseMarketValueInput(body.marketValueInput, true)
      : null

  const priceRow = isCash ? null : findMarketPrice(rows, symbol)
  if (!isCash && !isFuture && !priceRow) throw httpError(400, `Market 表中找不到代码 ${symbol} 的有效价格`)
  const fxRow = findFxRow(rows, currency)
  if (currency !== 'CNY' && !fxRow) throw httpError(400, `Market 表中找不到 ${currency} 的人民币汇率`)

  return { category, config, name, account, currency, market, symbol, quantity, originalValue, priceRow, fxRow }
}

function computedFormulas(headers, rowNumber, input) {
  const cell = (name) => `${columnLetter(headerIndex(headers, name))}${rowNumber}`
  const priceCell = cell('Price')
  const quantityCell = cell('Quantity')
  const originalCell = cell('MarketValue')
  const symbolCell = cell('Symbol')
  const isCash = input.category === '现金'
  const isFuture = input.category === '期货'

  return {
    Price: isCash ? '' : `=IFERROR(INDEX(Market!$C:$C,MATCH(${symbolCell},Market!$B:$B,0)),"")`,
    MarketValue: isCash || isFuture ? input.originalValue : `=IF(OR(${quantityCell}="",${priceCell}=""),"",${quantityCell}*${priceCell})`,
    MarketValueCNY: input.currency === 'CNY'
      ? `=IF(${originalCell}="","",${originalCell})`
      : `=IF(${originalCell}="","",${originalCell}*Market!$C$${input.fxRow.rowNumber})`,
  }
}

function buildRow(headers, rowNumber, input, baseRow = []) {
  const row = Array.from({ length: headers.length }, (_, idx) => baseRow[idx] ?? '')
  const set = (name, value) => { row[headerIndex(headers, name)] = value }
  set('AssetType', input.config.assetType)
  set('Market', input.market)
  set('Account', input.account)
  set('Symbol', input.symbol)
  set('Name', input.name)
  set('Currency', input.currency)
  set('Quantity', input.quantity)
  const formulas = computedFormulas(headers, rowNumber, input)
  set('Price', formulas.Price)
  set('MarketValue', formulas.MarketValue)
  set('MarketValueCNY', formulas.MarketValueCNY)
  return row
}

function editorOptions(holdings, rows) {
  const fxRates = { CNY: 1 }
  for (const currency of Object.keys(FX_NAMES)) {
    const row = findFxRow(rows, currency)
    if (row) fxRates[currency] = row.price
  }
  return {
    accounts: [...new Set(holdings.map((h) => h.account).filter(Boolean))].sort(),
    markets: [...new Set(['CN', 'US', 'HK', 'JP', 'GLOBAL', ...holdings.map((h) => h.market).filter(Boolean)])],
    currencies: [...new Set(['CNY', 'USD', 'HKD', 'JPY', ...holdings.map((h) => h.currency).filter(Boolean)])],
    marketItems: rows.filter((row) => row.symbol && Number.isFinite(row.price) && row.price > 0)
      .map(({ name, symbol, price, group }) => ({ name, symbol, price, group })),
    fxRates,
  }
}

export {
  mapAssetType,
  columnLetter,
  rowVersion,
  parseInput,
  computedFormulas,
  buildRow,
  marketRows,
}

async function loadHoldings({ includeMarket = false } = {}) {
  const [evaluated, formulas, marketResult] = await Promise.all([
    readSheet('Holdings'),
    readSheet('Holdings', { valueRenderOption: 'FORMULA' }),
    includeMarket ? readSheet('Market') : Promise.resolve(null),
  ])
  assertSchema(evaluated.headers)
  const holdings = (evaluated.data || []).map((row, idx) => {
    const normalized = normalizeHolding(row, idx, formulas.data?.[idx])
    normalized.rowVersion = rowVersion(formulas.rawRows?.[idx])
    return normalized
  })
  return { evaluated, formulas, holdings, market: marketResult ? marketRows(marketResult) : null }
}

export default async function handler(req, res) {
  if (!['GET', 'POST', 'PUT'].includes(req.method)) return json(res, 405, { error: 'Method not allowed' })
  if (!isConfigured()) return json(res, 503, { error: 'Google Sheets 未配置' })

  try {
    if (req.method === 'GET') {
      const includeEditor = String(req.query?.editor || '') === '1'
      const loaded = await loadHoldings({ includeMarket: includeEditor })
      return json(res, 200, {
        holdings: loaded.holdings,
        editorOptions: includeEditor ? editorOptions(loaded.holdings, loaded.market) : undefined,
        syncedAt: new Date().toISOString(),
      })
    }

    requireAuth(req)
    const body = await readJsonBody(req)
    const loaded = await loadHoldings({ includeMarket: true })
    const input = parseInput(body, loaded.market)
    const headers = loaded.evaluated.headers
    const lastColumn = columnLetter(headers.length - 1)

    let rowNumber
    if (req.method === 'POST') {
      const expectedRow = (loaded.evaluated.rawRows?.length || 0) + 2
      const appended = await appendRows('Holdings', [buildRow(headers, expectedRow, input)])
      const updatedRange = appended?.updates?.updatedRange || ''
      const match = updatedRange.match(/![A-Z]+(\d+)/i)
      rowNumber = match ? Number(match[1]) : expectedRow
      const row = buildRow(headers, rowNumber, input)
      await updateRows('Holdings', `A${rowNumber}:${lastColumn}${rowNumber}`, [row])
    } else {
      rowNumber = Number(body.rowNumber)
      if (!Number.isInteger(rowNumber) || rowNumber < 2) throw httpError(400, '持仓行号无效')
      const idx = rowNumber - 2
      const evaluatedRow = loaded.evaluated.rawRows?.[idx]
      const formulaRow = loaded.formulas.rawRows?.[idx]
      if (!evaluatedRow) throw httpError(404, '该持仓已不存在，请刷新后重试')
      const currentVersion = rowVersion(formulaRow)
      if (!body.rowVersion || body.rowVersion !== currentVersion) {
        throw httpError(409, '持仓数据已经变化，请刷新后重新编辑')
      }
      const row = buildRow(headers, rowNumber, input, formulaRow)
      await updateRows('Holdings', `A${rowNumber}:${lastColumn}${rowNumber}`, [row])
    }

    return json(res, 200, { ok: true, action: req.method === 'POST' ? 'created' : 'updated', rowNumber })
  } catch (error) {
    console.error('[holdings]', error)
    return json(res, error.statusCode || 500, { error: error.message || String(error) })
  }
}
