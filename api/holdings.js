// Vercel Function: GET / POST / PUT / DELETE /api/holdings
import { appendRows, deleteSheetRow, isConfigured, updateRows } from './_google.js'
import { requireAuth } from './_auth.js'
import { readJsonBody, setPrivateResponseHeaders } from './_http.js'
import { buildRow, columnLetter } from './_holdings-formulas.js'
import { parseInput } from './_holdings-schema.js'
import { editorOptions, findVersionedRow, loadHoldings } from './_holdings-service.js'

export { buildRow, columnLetter, computedFormulas } from './_holdings-formulas.js'
export { mapAssetType, marketRows, parseInput } from './_holdings-schema.js'
export { findVersionedRow, rowVersion } from './_holdings-service.js'

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  return res.end(JSON.stringify(body))
}

export default async function handler(req, res) {
  setPrivateResponseHeaders(res)
  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    return res.end()
  }
  if (!['GET', 'POST', 'PUT', 'DELETE'].includes(req.method)) return json(res, 405, { error: 'Method not allowed' })

  try {
    await requireAuth(req)
    if (!isConfigured()) return json(res, 503, { error: 'Google Sheets 未配置' })

    if (req.method === 'GET') {
      const includeEditor = String(req.query?.editor || '') === '1'
      const loaded = await loadHoldings({ includeMarket: includeEditor })
      return json(res, 200, {
        holdings: loaded.holdings,
        editorOptions: includeEditor ? editorOptions(loaded.holdings, loaded.market) : undefined,
        syncedAt: new Date().toISOString(),
      })
    }

    const body = await readJsonBody(req)
    const loaded = await loadHoldings({ includeMarket: req.method !== 'DELETE' })
    if (req.method === 'DELETE') {
      const { rowNumber } = findVersionedRow(body, loaded)
      await deleteSheetRow('Holdings', rowNumber)
      return json(res, 200, { ok: true, action: 'deleted', rowNumber })
    }

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
      await updateRows('Holdings', `A${rowNumber}:${lastColumn}${rowNumber}`, [buildRow(headers, rowNumber, input)])
    } else {
      const current = findVersionedRow(body, loaded)
      rowNumber = current.rowNumber
      const row = buildRow(headers, rowNumber, input, current.formulaRow)
      await updateRows('Holdings', `A${rowNumber}:${lastColumn}${rowNumber}`, [row])
    }

    return json(res, 200, { ok: true, action: req.method === 'POST' ? 'created' : 'updated', rowNumber })
  } catch (error) {
    return json(res, error.statusCode || 500, { error: error.statusCode ? error.message : '持仓操作失败' })
  }
}
