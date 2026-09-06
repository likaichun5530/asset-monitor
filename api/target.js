// Vercel Function: GET /api/target
import { appendRows, batchUpdateRows, isConfigured, readSheet, updateRows } from './_google.js'
import { requireAuth } from './_auth.js'
import { readJsonBody, setPrivateResponseHeaders } from './_http.js'
import { aggregateHoldingsByCategory, calculateAllocations, parseTargetMap } from './_allocation.js'
import { invalidateAiDataCache } from './_ai-data-cache.js'
import {
  findStrategyColumn,
  normalizeTargetCategory,
  parseTargetStrategies,
  serializeTargetConfig,
  serializeTargetDetails,
  sheetColumnName,
  validateTargetConfig,
  validateTargetStrategy,
} from './_target-config.js'

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  return res.end(JSON.stringify(body))
}

function buildTargetRows(holdingsResult, targetMap) {
  const { categoryTotals, total: totalCNY } = aggregateHoldingsByCategory(holdingsResult.data || [])
  const result = calculateAllocations(categoryTotals, totalCNY, targetMap).map((row) => ({
    category: row.category,
    marketValue: Math.round(row.marketValue * 100) / 100,
    currentRatio: row.currentRatio,
    targetRatio: row.targetRatio,
    diff: row.difference,
    isTotal: false,
  }))
  const totalTarget = Array.from(targetMap.values()).reduce((sum, value) => sum + value, 0)
  result.push({
    category: '合计',
    marketValue: Math.round(totalCNY * 100) / 100,
    currentRatio: 1,
    targetRatio: totalTarget > 0 ? totalTarget : null,
    diff: null,
    isTotal: true,
  })
  return result
}

export default async function handler(req, res) {
  setPrivateResponseHeaders(res)
  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    return res.end()
  }
  if (!['GET', 'PUT'].includes(req.method)) return json(res, 405, { error: 'Method not allowed' })

  try {
    await requireAuth(req)
    if (!isConfigured()) {
      return json(res, 503, { error: 'Google Sheets 未配置' })
    }
    const [hResult, tResult] = await Promise.all([
      readSheet('Holdings'),
      req.method === 'PUT' ? readSheet('target') : readSheet('target').catch(() => null),
    ])
    let targetMap = parseTargetMap(tResult)
    const strategyMap = parseTargetStrategies(tResult)

    if (req.method === 'PUT') {
      if (!tResult?.headers?.length) return json(res, 409, { error: 'target 工作表缺少表头' })
      const body = await readJsonBody(req)
      const headers = tResult.headers
      if (body.action === 'strategy') {
        const { category, strategy } = validateTargetStrategy(body.category, body.strategy)
        let strategyColumnIndex = findStrategyColumn(headers)
        if (strategyColumnIndex < 0) {
          strategyColumnIndex = headers.length
          await updateRows('target', `${sheetColumnName(strategyColumnIndex)}1`, [['配置思路']], { valueInputOption: 'RAW' })
        }
        const strategyColumn = sheetColumnName(strategyColumnIndex)
        const matchingRows = (tResult.rawRows || [])
          .map((row, index) => ({ category: normalizeTargetCategory(row?.[0]), rowNumber: index + 2 }))
          .filter((row) => row.category === category)
        if (matchingRows.length) {
          await batchUpdateRows('target', matchingRows.map(({ rowNumber }) => ({ range: `${strategyColumn}${rowNumber}`, values: [[strategy]] })), { valueInputOption: 'RAW' })
        } else {
          const row = Array(strategyColumnIndex + 1).fill('')
          row[0] = category
          row[strategyColumnIndex] = strategy
          await appendRows('target', [row], { valueInputOption: 'RAW' })
        }
        strategyMap.set(category, strategy)
      } else {
        const config = validateTargetConfig(body.targets)
        const configMap = new Map(config.map((item) => [item.category, item]))
        const targetColumnIndex = headers.findIndex((header) => /目标|比例/.test(String(header)))
        if (targetColumnIndex < 0) return json(res, 409, { error: 'target 工作表缺少目标比例列' })
        const targetColumn = sheetColumnName(targetColumnIndex)
        const found = new Set()
        const updates = []

        for (let index = 0; index < (tResult.rawRows || []).length; index += 1) {
          const category = normalizeTargetCategory(tResult.rawRows[index]?.[0])
          const item = configMap.get(category)
          if (!item) continue
          found.add(category)
          updates.push({ range: `${targetColumn}${index + 2}`, values: [[`${item.targetPercent}%`]] })
        }

        const missingRows = config.filter((item) => !found.has(item.category)).map((item) => {
          const row = Array(targetColumnIndex + 1).fill('')
          row[0] = item.category
          row[targetColumnIndex] = `${item.targetPercent}%`
          return row
        })
        if (updates.length) await batchUpdateRows('target', updates)
        if (missingRows.length) await appendRows('target', missingRows)
        targetMap = new Map(config.map((item) => [item.category, item.targetRatio]))
      }
      invalidateAiDataCache('target')
    }

    return json(res, 200, {
      ok: true,
      target: buildTargetRows(hResult, targetMap),
      targetConfig: serializeTargetConfig(targetMap),
      targetDetails: serializeTargetDetails(targetMap, strategyMap),
      syncedAt: new Date().toISOString(),
    })
  } catch (e) {
    return json(res, e.statusCode || 500, { error: e.statusCode ? e.message : req.method === 'PUT' ? '目标配置保存失败' : '目标配置读取失败' })
  }
}
