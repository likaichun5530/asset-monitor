// Vercel Function: GET /api/holdings
import { isConfigured, readSheet, toNumber } from './_google.js'

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

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ error: 'Method not allowed' }))
  }

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
    return res.end(JSON.stringify({
      holdings,
      syncedAt: new Date().toISOString(),
    }))
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ error: String(e) }))
  }
}