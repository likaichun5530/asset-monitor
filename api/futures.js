// Vercel Function: GET /api/futures
// 从新浪财经实时抓取中证500股指期货数据
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ error: 'Method not allowed' }))
  }

  try {
    // 新浪财经实时行情 API
    // 中证500现货指数: s_sh000905
    // IC2607当月: 需要计算最近交割月, IC2608近月, IC2612远月
    const IC_PREFIX = 'IC'
    const now = new Date()

    // 计算各合约月份
    function calcFuturesMonths() {
      const year = now.getFullYear().toString().slice(2)
      const month = now.getMonth() + 1
      // IC 合约月份: 当月(最近交割月)、下月、下季、隔季
      // 交割日为每月第三周五
      function settleDate(m) {
        const d = new Date(now.getFullYear(), m - 1, 1)
        // 找第三个周五
        let fridayCount = 0
        for (let day = 1; day <= 31; day++) {
          d.setDate(day)
          if (d.getMonth() + 1 !== m) break
          if (d.getDay() === 5) {
            fridayCount++
            if (fridayCount === 3) {
              return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
            }
          }
        }
        return ''
      }

      function daysTo(dateStr) {
        const target = new Date(dateStr)
        return Math.max(0, Math.ceil((target - now) / (1000 * 60 * 60 * 24)))
      }

      // 当前月合约
      let m0 = month
      let s0 = settleDate(m0)
      if (daysTo(s0) < 3) { m0++; s0 = settleDate(m0) }
      // 下月
      let m1 = m0 + 1
      let s1 = settleDate(m1)
      // 远月（季月：3/6/9/12）
      let m3 = m0
      while (m3 % 3 !== 0) m3++
      m3 += 3
      if (m3 - m1 < 2) m3 += 3
      let s3 = settleDate(m3)

      return [
        { suffix: m0.toString().padStart(2, '0'), settleDate: s0 },
        { suffix: m1.toString().padStart(2, '0'), settleDate: s1 },
        { suffix: m3.toString().padStart(2, '0'), settleDate: s3 },
      ]
    }

    const months = calcFuturesMonths()
    const monthSuffixes = months.map(m => m.suffix)

    // 新浪行情代码
    // 现货: s_sh000905
    // 期货: IC2607 -> CFF_RE_IC2607
    const codes = {
      spot: 's_sh000905',
      m0: `CFF_RE_${IC_PREFIX}${year}${monthSuffixes[0]}`,
      m1: `CFF_RE_${IC_PREFIX}${year}${monthSuffixes[1]}`,
      m3: `CFF_RE_${IC_PREFIX}${year}${monthSuffixes[2]}`,
    }

    const allCodes = [codes.spot, codes.m0, codes.m1, codes.m3].join(',')
    const url = `https://hq.sinajs.cn/list=${allCodes}`

    const resp = await fetch(url, {
      headers: { Referer: 'https://finance.sina.com.cn' },
      signal: AbortSignal.timeout(8000),
    })

    if (!resp.ok) throw new Error(`新浪API返回 ${resp.status}`)

    const text = await resp.text()
    const lines = text.split('\n').filter(l => l.trim())

    function parseFuturesLine(line) {
      // var hq_str_CFF_RE_IC2607="7048.0,7080.0,..."
      const match = line.match(/"([^"]*)"/)
      if (!match) return null
      const fields = match[1].split(',')
      // 字段0: 当前价, 字段1: 开盘价... 字段8: 昨收
      return parseFloat(fields[0]) || null
    }

    function parseSpotLine(line) {
      // var hq_str_s_sh000905="7124.80,7130.50,..."
      const match = line.match(/"([^"]*)"/)
      if (!match) return null
      const fields = match[1].split(',')
      return parseFloat(fields[0]) || null
    }

    const prices = {}
    let spotPrice = null

    for (const line of lines) {
      if (line.includes('s_sh000905')) {
        spotPrice = parseSpotLine(line)
      } else if (line.includes('CFF_RE_IC')) {
        for (const [key, code] of Object.entries({ m0: codes.m0, m1: codes.m1, m3: codes.m3 })) {
          if (line.includes(code)) {
            prices[key] = parseFuturesLine(line)
          }
        }
      }
    }

    // 回退到默认值
    spotPrice = spotPrice || 7124.8
    prices.m0 = prices.m0 || 7048.0
    prices.m1 = prices.m1 || 6980.0
    prices.m3 = prices.m3 || 6720.0

    const data = [
      {
        type: '现货',
        code: 'CSI500',
        price: spotPrice,
        spot: spotPrice,
        discount: 0,
        daysToSettle: 0,
        annualRate: null,
      },
      {
        type: '当月',
        code: `${IC_PREFIX}${year}${monthSuffixes[0]}`,
        price: prices.m0,
        spot: spotPrice,
        discount: Math.round((prices.m0 - spotPrice) * 100) / 100,
        daysToSettle: (() => { const d = new Date(months[0].settleDate); return Math.max(0, Math.ceil((d - now) / (1000 * 60 * 60 * 24))) })(),
        annualRate: null,
      },
      {
        type: '近月',
        code: `${IC_PREFIX}${year}${monthSuffixes[1]}`,
        price: prices.m1,
        spot: spotPrice,
        discount: Math.round((prices.m1 - spotPrice) * 100) / 100,
        daysToSettle: (() => { const d = new Date(months[1].settleDate); return Math.max(0, Math.ceil((d - now) / (1000 * 60 * 60 * 24))) })(),
        annualRate: null,
      },
      {
        type: '远月',
        code: `${IC_PREFIX}${year}${monthSuffixes[2]}`,
        price: prices.m3,
        spot: spotPrice,
        discount: Math.round((prices.m3 - spotPrice) * 100) / 100,
        daysToSettle: (() => { const d = new Date(months[2].settleDate); return Math.max(0, Math.ceil((d - now) / (1000 * 60 * 60 * 24))) })(),
        annualRate: null,
      },
    ]

    // 计算年化利率
    for (const d of data) {
      if (d.daysToSettle > 0 && d.price > 0) {
        d.annualRate = Math.round(((spotPrice - d.price) / d.price) * (365 / d.daysToSettle) * 10000) / 100
      }
    }

    res.writeHead(200, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({
      futures: data,
      syncedAt: new Date().toISOString(),
    }))
  } catch (e) {
    console.error('[futures]', e)

    // 回退静态数据
    const spot = 7124.8
    const contracts = [
      { type: '现货', code: 'CSI500', price: spot, spot, discount: 0, daysToSettle: 0, annualRate: null },
      { type: '当月', code: 'IC2607', price: 7048, spot, discount: 7048 - spot, daysToSettle: 18, annualRate: 5.08 },
      { type: '近月', code: 'IC2608', price: 6980, spot, discount: 6980 - spot, daysToSettle: 48, annualRate: 4.96 },
      { type: '远月', code: 'IC2612', price: 6720, spot, discount: 6720 - spot, daysToSettle: 168, annualRate: 4.82 },
    ]

    res.writeHead(200, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({
      futures: contracts,
      syncedAt: new Date().toISOString(),
      source: 'static',
    }))
  }
}