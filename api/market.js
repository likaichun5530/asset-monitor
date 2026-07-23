// Vercel Function: GET /api/market
// 读取 Google Sheets Market 表 A 列标的，获取最新价格
import { isConfigured, readSheet } from './_google.js'

// 名称 → 新浪代码映射
const SINA_MAP = {
  '上证指数': 's_sh000001',
  '中证500': 's_sh000905',
  '中证1000': 's_sh000852',
  '沪深300': 's_sh000300',
}

// 分组映射
const GROUP_MAP = {
  'USD': '汇率', 'HKD': '汇率', 'JPY': '汇率',
  '上证指数': 'A股', '中证500': 'A股', '中证1000': 'A股', '沪深300': 'A股',
  '中证500期货当月': '期货', '中证500期货近月': '期货', '中证500期货远月': '期货',
  'BTC': '数字货币', 'ETH': '数字货币',
  '纳斯达克指数': '境外', '日经225指数': '境外',
  'SGE黄金9999': '其他',
}

// 静态价格
const FALLBACK = {
  '上证指数': 3876.78, '中证500': 7734.31, '中证1000': 7195.50, '沪深300': 4728.00,
  'BTC': 64786.71, 'ETH': 1885.88,
  '日经225指数': 39504, '纳斯达克指数': 19654,
  'USD': 7.26, 'HKD': 0.93, 'JPY': 0.048,
  'SGE黄金9999': 731.50,
  '中证500期货当月': 7660, '中证500期货近月': 7602.6, '中证500期货远月': 7420,
}

function getGroup(name) {
  return GROUP_MAP[name] || '其他'
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ error: 'Method not allowed' }))
  }

  try {
    // 1. 读取 Market 表 A 列
    let symbols = []
    if (isConfigured()) {
      try {
        const result = await readSheet('Market')
        for (const row of (result.data || [])) {
          const name = (row[Object.keys(row)[0]] || '').toString().trim()
          if (name) symbols.push(name)
        }
      } catch (e) {
        console.warn('[market] Google Sheets 读取失败', e)
      }
    }
    if (!symbols.length) symbols = Object.keys(FALLBACK)

    // 2. 新浪实时价格
    const pricesFromSina = {}
    const sinaItems = []
    for (const name of symbols) { const code = SINA_MAP[name]; if (code) sinaItems.push({ name, code }) }
    if (sinaItems.length) {
      const codes = sinaItems.map(i => i.code).join(',')
      try {
        const resp = await fetch(`https://hq.sinajs.cn/list=${codes}`, {
          headers: { Referer: 'https://finance.sina.com.cn' },
          signal: AbortSignal.timeout(6000),
        })
        if (resp.ok) {
          const text = await resp.text()
          for (const line of text.split(/\r?\n/)) {
            const m = line.match(/hq_str_(\w+)="([^"]*)"/)
            if (!m) continue
            const code = m[1]
            const fields = m[2].split(',').filter(f => !isNaN(parseFloat(f)))
            const price = parseFloat(fields[0])
            if (!price) continue
            const item = sinaItems.find(i => i.code === code)
            if (item) pricesFromSina[item.name] = Math.round(price * 100) / 100
          }
        }
      } catch (e) { console.warn('[market] 新浪请求失败', e) }
    }

    // 3. 构建结果（带分组）
    const market = symbols.map(name => ({
      name,
      price: pricesFromSina[name] ?? FALLBACK[name] ?? null,
      group: getGroup(name),
    }))

    res.writeHead(200, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ market, syncedAt: new Date().toISOString() }))
  } catch (e) {
    console.error('[market]', e)
    res.writeHead(500, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ error: String(e) }))
  }
}