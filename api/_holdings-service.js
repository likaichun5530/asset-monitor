import crypto from 'crypto'
import { readSheet } from './_google.js'
import {
  FX_NAMES,
  assertHoldingsSchema,
  findFxRow,
  httpError,
  marketRows,
  normalizeHolding,
} from './_holdings-schema.js'

export function rowVersion(formulaRow) {
  return crypto.createHash('sha256').update(JSON.stringify(formulaRow || [])).digest('hex').slice(0, 16)
}

export function findVersionedRow(body, loaded) {
  const rowNumber = Number(body.rowNumber)
  if (!Number.isInteger(rowNumber) || rowNumber < 2) throw httpError(400, '持仓行号无效')
  const index = rowNumber - 2
  const evaluatedRow = loaded.evaluated.rawRows?.[index]
  const formulaRow = loaded.formulas.rawRows?.[index]
  if (!evaluatedRow) throw httpError(404, '该持仓已不存在，请刷新后重试')
  if (!body.rowVersion || body.rowVersion !== rowVersion(formulaRow)) {
    throw httpError(409, '持仓数据已经变化，请刷新后重新操作')
  }
  return { rowNumber, formulaRow }
}

export function editorOptions(holdings, rows) {
  const fxRates = { CNY: 1 }
  for (const currency of Object.keys(FX_NAMES)) {
    const row = findFxRow(rows, currency)
    if (row) fxRates[currency] = row.price
  }
  return {
    accounts: [...new Set(holdings.map((holding) => holding.account).filter(Boolean))].sort(),
    markets: [...new Set(['CN', 'US', 'HK', 'JP', 'GLOBAL', ...holdings.map((holding) => holding.market).filter(Boolean)])],
    currencies: [...new Set(['CNY', 'USD', 'HKD', 'JPY', ...holdings.map((holding) => holding.currency).filter(Boolean)])],
    marketItems: rows.filter((row) => row.symbol && Number.isFinite(row.price) && row.price > 0)
      .map(({ name, symbol, price, group }) => ({ name, symbol, price, group })),
    fxRates,
  }
}

export async function loadHoldings({ includeMarket = false } = {}) {
  const [evaluated, formulas, marketResult] = await Promise.all([
    readSheet('Holdings'),
    readSheet('Holdings', { valueRenderOption: 'FORMULA' }),
    includeMarket ? readSheet('Market') : Promise.resolve(null),
  ])
  assertHoldingsSchema(evaluated.headers)
  const holdings = (evaluated.data || []).map((row, index) => {
    const normalized = normalizeHolding(row, index, formulas.data?.[index])
    normalized.rowVersion = rowVersion(formulas.rawRows?.[index])
    return normalized
  })
  return { evaluated, formulas, holdings, market: marketResult ? marketRows(marketResult) : null }
}
