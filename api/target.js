// Vercel Function: GET /api/target
import { batchUpdateRows, isConfigured, readSheet, updateRows } from './_google.js'
import { requireAuth } from './_auth.js'
import { readJsonBody, setPrivateResponseHeaders } from './_http.js'
import { aggregateHoldingsByCategory, calculateAllocations, getHoldingCategory, getHoldingMarketValueCNY, getTargetDeviation, parseTargetMap } from './_allocation.js'
import { invalidateAiDataCache } from './_ai-data-cache.js'
import {
  findStrategyColumn,
  parseTargetStrategies,
  parseTargetGroups,
  serializeTargetConfig,
  sheetColumnName,
  validateTargetConfig,
  validateTargetGroup,
  validateTargetStrategy,
} from './_target-config.js'

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  return res.end(JSON.stringify(body))
}

function buildTargetRows(holdingsResult, targetMap) {
  const { categoryTotals, total: totalCNY } = aggregateHoldingsByCategory(holdingsResult.data || [])
  const result = calculateAllocations(categoryTotals, totalCNY, targetMap, { includeTargetOnly: true }).map((row) => ({
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

function holdingText(row, key) {
  return String(row?.[key] ?? row?.[key[0].toLowerCase() + key.slice(1)] ?? '').trim()
}

function detailKey(value) {
  return String(value ?? '').trim().toLocaleUpperCase('zh-CN')
}

export function buildTargetDetails(holdingsResult, targetMap, strategyMap, targetGroups) {
  const holdings = holdingsResult.data || []
  const groups = new Map(targetGroups.map((group) => [group.category, group]))

  return serializeTargetConfig(targetMap).map((config) => {
    const group = groups.get(config.category)
    if (!group) return { ...config, strategy: strategyMap.get(config.category) || '', allocation: null }

    const categoryHoldings = holdings.filter((holding) => {
      const category = getHoldingCategory(holdingText(holding, 'AssetType'), holdingText(holding, 'Market'))
      if (category !== config.category) return false
      const symbol = holdingText(holding, 'Symbol')
      return !['美股', 'A股', '港股', '日股'].includes(config.category) || (symbol && symbol !== '-')
    })
    const categoryTotal = categoryHoldings.reduce((sum, holding) => sum + getHoldingMarketValueCNY(holding), 0)
    const matchedIndexes = new Set()
    const items = group.items.map((targetItem) => {
      const targetKey = detailKey(targetItem.name)
      let marketValue = 0
      categoryHoldings.forEach((holding, index) => {
        const candidates = [holdingText(holding, 'Symbol'), holdingText(holding, 'Name')].map(detailKey)
        if (candidates.includes(targetKey)) {
          marketValue += getHoldingMarketValueCNY(holding)
          matchedIndexes.add(index)
        }
      })
      const currentRatio = categoryTotal ? marketValue / categoryTotal : 0
      const deviation = getTargetDeviation(currentRatio, targetItem.targetRatio)
      return {
        name: targetItem.name,
        marketValue: Math.round(marketValue * 100) / 100,
        currentRatio,
        targetRatio: targetItem.targetRatio,
        diff: deviation.difference,
        status: deviation.status,
      }
    })

    const unmatched = new Map()
    categoryHoldings.forEach((holding, index) => {
      if (matchedIndexes.has(index)) return
      const symbol = holdingText(holding, 'Symbol')
      const name = holdingText(holding, 'Name')
      const label = symbol && symbol !== '-' ? symbol : name
      if (!label) return
      const key = detailKey(label)
      const current = unmatched.get(key) || { name: label, marketValue: 0 }
      current.marketValue += getHoldingMarketValueCNY(holding)
      unmatched.set(key, current)
    })
    for (const item of unmatched.values()) {
      items.push({
        name: item.name,
        marketValue: Math.round(item.marketValue * 100) / 100,
        currentRatio: categoryTotal ? item.marketValue / categoryTotal : 0,
        targetRatio: null,
        diff: null,
        status: 'unset',
      })
    }

    return {
      ...config,
      strategy: strategyMap.get(config.category) || '',
      allocation: {
        label: group.label,
        configuredRatio: group.items.reduce((sum, item) => sum + item.targetRatio, 0),
        marketValue: Math.round(categoryTotal * 100) / 100,
        items,
      },
    }
  })
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
    const [hResult, loadedTargetResult] = await Promise.all([
      readSheet('Holdings'),
      req.method === 'PUT' ? readSheet('target') : readSheet('target').catch(() => null),
    ])
    let tResult = loadedTargetResult
    let targetMap = parseTargetMap(tResult)
    let strategyMap = parseTargetStrategies(tResult)
    let targetGroups = parseTargetGroups(tResult)

    if (req.method === 'PUT') {
      if (!tResult?.headers?.length) return json(res, 409, { error: 'target 工作表缺少表头' })
      const body = await readJsonBody(req)
      const headers = tResult.headers
      if (body.action === 'strategy') {
        const { category, strategy } = validateTargetStrategy(body.category, body.strategy)
        let strategyColumnIndex = findStrategyColumn(headers)
        if (strategyColumnIndex < 0) {
          strategyColumnIndex = 2
          await updateRows('target', `${sheetColumnName(strategyColumnIndex)}1`, [['配置思路']], { valueInputOption: 'RAW' })
        }
        const strategyColumn = sheetColumnName(strategyColumnIndex)
        const matchingRows = (tResult.rawRows || [])
          .map((row, index) => ({ category: String(row?.[0] || '').trim(), rowNumber: index + 2 }))
          .find((row) => row.category === category || (category === '债基' && ['债券', 'Bond'].includes(row.category)))
        if (!matchingRows) return json(res, 409, { error: `target 表 A 列中找不到${category}` })
        await updateRows('target', `${strategyColumn}${matchingRows.rowNumber}`, [[strategy]], { valueInputOption: 'RAW' })
      } else if (body.action === 'detail-targets') {
        const validated = validateTargetGroup(body.category, body.targets, tResult)
        const targetColumn = sheetColumnName(validated.group.targetColumnIndex)
        await batchUpdateRows('target', validated.items.map((item) => ({
          range: `${targetColumn}${item.rowNumber}`,
          values: [[`${item.targetPercent}%`]],
        })))
      } else {
        const config = validateTargetConfig(body.targets)
        const configMap = new Map(config.map((item) => [item.category, item]))
        if (!/目标|比例/.test(String(headers[1] || ''))) return json(res, 409, { error: 'target 工作表 B 列必须是大类目标' })
        const updates = []

        for (let index = 0; index < (tResult.rawRows || []).length; index += 1) {
          const rawCategory = String(tResult.rawRows[index]?.[0] || '').trim()
          const category = rawCategory === '债券' || rawCategory === 'Bond' ? '债基' : rawCategory
          const item = configMap.get(category)
          if (!item) continue
          updates.push({ range: `B${index + 2}`, values: [[`${item.targetPercent}%`]] })
        }
        if (updates.length !== config.length) return json(res, 409, { error: 'target 表 A 列缺少部分大类资产，请先补齐后再保存' })
        await batchUpdateRows('target', updates)
      }
      invalidateAiDataCache('target')
      tResult = await readSheet('target')
      targetMap = parseTargetMap(tResult)
      strategyMap = parseTargetStrategies(tResult)
      targetGroups = parseTargetGroups(tResult)
    }

    return json(res, 200, {
      ok: true,
      target: buildTargetRows(hResult, targetMap),
      targetConfig: serializeTargetConfig(targetMap),
      targetDetails: buildTargetDetails(hResult, targetMap, strategyMap, targetGroups),
      syncedAt: new Date().toISOString(),
    })
  } catch (e) {
    return json(res, e.statusCode || 500, { error: e.statusCode ? e.message : req.method === 'PUT' ? '目标配置保存失败' : '目标配置读取失败' })
  }
}
