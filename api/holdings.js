// Vercel Function: GET/PUT /api/holdings
// GET: 读取 Holdings 表
// PUT: 重写整个 Holdings 表（整表覆盖，支持增删改）
import { isConfigured, readSheet, writeSheetRows, toNumber } from './_google.js'

function mapAssetType(t) {
  const s = String(t || '').toLowerCase()
  if (s === 'stock') return '股票'
  if (s === 'crypto') return '数字货币'
  if (s === 'gold') return '黄金'
  if (s === 'cash') return '现金'
  if (s === 'bond') return '债券'
  if (s === 'future') return '期货'
  return t || '其他'
}

// 表头列定义（Holdings 表结构）
const HEADERS = ['AssetType', 'Market', 'Account', 'Symbol', 'Name', 'Currency', 'Quantity', 'Price', 'MarketValue', 'MarketValueCNY']

// 中文类别 -> 英文枚举
function toEnglishType(type) {
  const map = {
    '股票': 'Stock', '数字货币': 'Crypto', '黄金': 'Gold',
    '现金': 'Cash', '债券': 'Bond', '期货': 'Future',
  }
  return map[type] || type
}

export default async function handler(req, res) {
  const method = req.method

  if (method === 'GET') {
    if (!isConfigured()) {
      res.writeHead(503, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify({ error: 'Google Sheets 未配置' }))
    }

    try {
      const result = await readSheet('Holdings')
      const holdings = (result.data || []).map((r, idx) => ({
        assetType: mapAssetType(r.AssetType || r.assetType),
        market: r.Market || r.market || '其他',
        account: r.Account || r.account || '未知',
        symbol: r.Symbol || r.symbol || '-',
        name: r.Name || r.name || `项目${idx + 1}`,
        currency: r.Currency || r.currency || 'CNY',
        quantity: toNumber(r.Quantity ?? r.quantity) ?? null,
        price: toNumber(r.Price ?? r.price) ?? null,
        marketValue: toNumber(r.MarketValue ?? r.marketValue) ?? null,
        marketValueCNY: toNumber(r.MarketValueCNY ?? r.marketValueCNY) ?? 0,
      }))

      res.writeHead(200, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify({ holdings, syncedAt: new Date().toISOString() }))
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify({ error: String(e) }))
    }
  }

  if (method === 'PUT') {
    if (!isConfigured()) {
      res.writeHead(503, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify({ error: 'Google Sheets 未配置' }))
    }

    // 读取请求体
    let body = ''
    for await (const chunk of req) body += chunk
    let payload
    try {
      payload = JSON.parse(body || '{}')
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify({ error: '请求体格式错误' }))
    }

    const holdings = payload.holdings
    if (!Array.isArray(holdings)) {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify({ error: '需要 holdings 数组' }))
    }

    try {
      // 组装写入行：[表头 + 数据行]
      // H列（Price）使用 vlookup 公式从 Market 表按 B 列代码动态获取
      const rows = [HEADERS]
      holdings.forEach((h, i) => {
        const rowNum = i + 2 // 第 1 行是表头
        const symbol = h.symbol || '-'
        // 有代码时写 vlookup 公式；无代码（'-'）时留空
        const priceFormula = symbol !== '-' && symbol
          ? `=IFERROR(VLOOKUP($D${rowNum},Market!$B:$C,2,FALSE),"")`
          : ''
        rows.push([
          toEnglishType(h.assetType || '其他'),
          h.market || '其他',
          h.account || '未知',
          symbol,
          h.name || '未命名',
          h.currency || 'CNY',
          h.quantity ?? '',
          priceFormula,
          h.marketValue ?? '',
          h.marketValueCNY ?? '',
        ])
      })

      // 整表重写：清空 A2:J 后写入新数据（USER_ENTERED 会执行公式）
      await writeSheetRows('Holdings', rows)

      res.writeHead(200, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify({ ok: true, count: holdings.length, syncedAt: new Date().toISOString() }))
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify({ error: String(e) }))
    }
  }

  res.writeHead(405, { 'Content-Type': 'application/json' })
  return res.end(JSON.stringify({ error: 'Method not allowed' }))
}