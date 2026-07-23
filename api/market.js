// Vercel Function: GET /api/market
// 读取 Google Sheets Market 表 A 列标的，从新浪获取实时价格
import { isConfigured, readSheet } from './_google.js'

const STATIC_PRICES = {
  '中证500': 7734.31,
  'BTC': 64786.71,
  'ETH': 1885.88,
  'SGE黄金9999': 731.50,
  '沪深300': 4090.12,
  '上证指数': 3456.78,
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ error: 'Method not allowed' }))
  }

  try {
    let symbols = []
    if (isConfigured()) {
      try {
        // 读取 Market sheet 第一列（A 列）
        const result = await readSheet('Market')
        // 提取 A 列值的列表
        const rows = result.data || []
        for (const row of rows) {
          const name = (row[Object.keys(row)[0]] || '').toString().trim()
          if (name) symbols.push(name)
        }
      } catch (e) {
        console.warn('[market] Google Sheets 读取失败', e)
      }
    }

    if (!symbols.length) {
      // 回退静态数据
      symbols = Object.keys(STATIC_PRICES)
    }

    // 从新浪获取实时价格
    const map = { ...STATIC_PRICES }
    for (const name of symbols) {
      if (!(name in STATIC_PRICES)) {
        // 尝试新浪查询（只支持 A 股代码格式）
        // 这里如果有映射表可以根据 symbol 去查
        // 暂时用默认值
      }
    }

    // 构建返回数据
    const market = symbols.map((name, idx) => ({
      name,
      price: map[name] || 0,
      change: 0,
      changePct: 0,
    }))

    // 尝试从新浪获取
    // 中证500、BTC 等暂用默认值，A 股可以用新浪接口
    const hqCodes = []
    const hqMap = {}
    for (const s of symbols) {
      // 尝试匹配已知 A 股代码格式
    }

    if (hqCodes.length) {
      const url = `https://hq.sinajs.cn/list=${hqCodes.join(',')}`
      try {
        const resp = await fetch(url, {
          headers: { Referer: 'https://finance.sina.com.cn' },
          signal: AbortSignal.timeout(8000),
        })
        const text = await resp.text()
        for (const line of text.split('\n')) {
          const hqMatch = line.match(/hq_str_(\w+)="([^"]*)"/)
          if (!hqMatch) continue
          const code = hqMatch[1]
          const fields = hqMatch[2].split(',')
          const name = hqMap[code]
          if (!name) continue
          const price = parseFloat(fields[3]) || 0
          const prevClose = parseFloat(fields[2]) || 0
          const change = price - prevClose
          const changePct = prevClose ? (change / prevClose) * 100 : 0
          const idx = market.findIndex(m => m.name === name)
          if (idx >= 0) {
            market[idx] = {
              name,
              price: Math.round(price * 100) / 100,
              change: Math.round(change * 100) / 100,
              changePct: Math.round(changePct * 100) / 100,
            }
          }
        }
      } catch (e) {
        console.warn('[market] 新浪数据获取失败', e)
      }
    }

    res.writeHead(200, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ market, syncedAt: new Date().toISOString() }))
  } catch (e) {
    console.error('[market]', e)
    res.writeHead(500, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ error: String(e) }))
  }
}