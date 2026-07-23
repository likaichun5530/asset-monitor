// Vercel Function: GET /api/market
// 读取 Google Sheets Market 表 A 列标的，从新浪获取实时价格
import { isConfigured, readSheet } from './_google.js'

// 名称 → 新浪代码映射（名称中不可有重复）
const CODE_MAP = {
  '上证指数': 's_sh000001',
  '中证500': 's_sh000905',
  '中证1000': 's_sh000852',
  '沪深300': 's_sh000300',
  '日经225指数': 'int_nikkei',
  '纳斯达克指数': 'int_nasdaq',
  '美元人民币': 'USDCNY',  // 新浪外汇用特殊格式
}

// 静态回退价格
const STATIC_PRICES = {
  'BTC': 64786.71,
  'ETH': 1885.88,
  'SGE黄金9999': 731.50,
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ error: 'Method not allowed' }))
  }

  try {
    // 1. 读取 Google Sheets Market 表 A 列
    let symbols = []
    if (isConfigured()) {
      try {
        const result = await readSheet('Market')
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
      symbols = ['上证指数', '中证500', '中证1000', '沪深300', '日经225指数', '纳斯达克指数', 'BTC', 'ETH', 'SGE黄金9999']
    }

    // 2. 将标的分类：有新浪代码的 / 静态的
    const sinaNames = []
    const sinaCodes = []
    for (const name of symbols) {
      const code = CODE_MAP[name]
      if (code) {
        sinaNames.push(name)
        sinaCodes.push(code)
      }
    }

    // 3. 从新浪获取
    const prices = {}
    if (sinaCodes.length > 0) {
      try {
        const url = `https://hq.sinajs.cn/list=${sinaCodes.join(',')}`
        const resp = await fetch(url, {
          headers: { Referer: 'https://finance.sina.com.cn' },
          signal: AbortSignal.timeout(8000),
        })
        const text = await resp.text()
        const lines = text.split(/\r?\n/).filter(l => l.includes('='))
        for (const line of lines) {
          const m = line.match(/hq_str_(\w+)="([^"]*)"/)
          if (!m) continue
          const code = m[1]
          const fields = m[2].split(',')
          // 找到对应的名称
          const idx = sinaCodes.indexOf(code)
          if (idx < 0) continue
          const name = sinaNames[idx]
          // 对于指数，fields[1] 是当前价：var hq_str_s_sh000001="上证指数,3456.78,..."
          let price = parseFloat(fields[1]) || parseFloat(fields[0]) || 0
          if (price) prices[name] = Math.round(price * 100) / 100
        }
      } catch (e) {
        console.warn('[market] 新浪数据获取失败', e)
      }
    }

    // 4. 构建结果
    const market = symbols.map(name => ({
      name,
      price: prices[name] || STATIC_PRICES[name] || null,
    }))

    res.writeHead(200, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ market, syncedAt: new Date().toISOString() }))
  } catch (e) {
    console.error('[market]', e)
    res.writeHead(500, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ error: String(e) }))
  }
}
