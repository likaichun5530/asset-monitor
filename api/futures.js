// Vercel Function: GET /api/futures
// 从新浪财经实时抓取中证500股指期货数据
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ error: 'Method not allowed' }))
  }

  try {
    const now = new Date()
    const yy = now.getFullYear().toString().slice(2)

    // 计算交割月（每月第三周五）
    function settleDateStr(m, y) {
      const yr = y || now.getFullYear()
      const d = new Date(yr, m - 1, 1)
      let fridayCount = 0
      for (let day = 1; day <= 31; day++) {
        d.setDate(day)
        if (d.getMonth() + 1 !== m) break
        if (d.getDay() === 5) {
          fridayCount++
          if (fridayCount === 3) {
            const mo = String(d.getMonth() + 1).padStart(2, '0')
            const da = String(d.getDate()).padStart(2, '0')
            return `${d.getFullYear()}-${mo}-${da}`
          }
        }
      }
      return ''
    }

    // 确定 4 个合约月份
    const cm = now.getMonth() + 1
    // 当月：如果距结算日不足 3 天则跳到下月
    let m0 = cm
    let s0 = settleDateStr(m0)
    let s0d = new Date(s0)
    if ((s0d - now) / (1000 * 60 * 60 * 24) < 3) { m0++; s0 = settleDateStr(m0); s0d = new Date(s0) }

    // 下月
    let m1 = m0 + 1
    let s1 = settleDateStr(m1)
    let s1d = new Date(s1)

    // 季月（跳过下季）：找下一个 3/6/9/12
    let m2 = m0
    while (m2 % 3 !== 0) m2++
    m2 += 3
    if (m2 < m1 + 2) m2 += 3

    // 隔季
    let m3 = m2
    while (m3 % 3 !== 0) m3++
    m3 += 3

    const s2 = settleDateStr(m2)
    const s3 = settleDateStr(m3)

    function suffix(m) { return m.toString().padStart(2, '0') }

    // 新浪代码：现货 + 4 个合约
    const codes = `s_sh000905,CFF_RE_IC${yy}${suffix(m0)},CFF_RE_IC${yy}${suffix(m1)},CFF_RE_IC${yy}${suffix(m2)},CFF_RE_IC${yy}${suffix(m3)}`
    const url = `https://hq.sinajs.cn/list=${codes}`

    const resp = await fetch(url, {
      headers: { Referer: 'https://finance.sina.com.cn' },
      signal: AbortSignal.timeout(8000),
    })

    const text = await resp.text()
    if (!text || text.length < 50) throw new Error('新浪返回空数据')

    const lines = text.split(/\r?\n/).filter(l => l.includes('='))

    function parsePrice(line) {
      const m = line.match(/"([^"]*)"/)
      if (!m) return null
      const v = parseFloat(m[1].split(',')[0])
      return isNaN(v) ? null : v
    }

    let spot = null
    const futures = {}

    for (const line of lines) {
      if (line.includes('s_sh000905')) spot = parsePrice(line)
      else {
        for (const [key, suffix_] of Object.entries({ m0: suffix(m0), m1: suffix(m1), m2: suffix(m2), m3: suffix(m3) })) {
          if (line.includes(`IC${yy}${suffix_}`)) {
            futures[key] = parsePrice(line)
          }
        }
      }
    }

    if (!spot) spot = 7734.31
    if (!futures.m0) futures.m0 = 7630
    if (!futures.m1) futures.m1 = 7560
    if (!futures.m2) futures.m2 = 7480
    if (!futures.m3) futures.m3 = 7420

    function dDays(dateStr) {
      const d = new Date(dateStr)
      return Math.max(0, Math.ceil((d - now) / (1000 * 60 * 60 * 24)))
    }

    const data = [
      {
        type: '现货', code: 'CSI500', price: spot, spot,
        discount: 0, daysToSettle: 0, annualRate: null,
      },
      {
        type: '当月', code: `IC${yy}${suffix(m0)}`, price: futures.m0, spot,
        discount: Math.round((spot - futures.m0) * 100) / 100,
        daysToSettle: dDays(s0), annualRate: null,
      },
      {
        type: '次月', code: `IC${yy}${suffix(m1)}`, price: futures.m1, spot,
        discount: Math.round((spot - futures.m1) * 100) / 100,
        daysToSettle: dDays(s1), annualRate: null,
      },
      {
        type: '当季', code: `IC${yy}${suffix(m2)}`, price: futures.m2, spot,
        discount: Math.round((spot - futures.m2) * 100) / 100,
        daysToSettle: dDays(s2), annualRate: null,
      },
      {
        type: '隔季', code: `IC${yy}${suffix(m3)}`, price: futures.m3, spot,
        discount: Math.round((spot - futures.m3) * 100) / 100,
        daysToSettle: dDays(s3), annualRate: null,
      },
    ]

    // 年化利率 = (贴水 / 合约价) × (365 / 剩余天数) × 100
    for (const d of data) {
      if (d.daysToSettle > 0 && d.price > 0 && d.discount > 0) {
        d.annualRate = Math.round((d.discount / d.price) * (365 / d.daysToSettle) * 10000) / 100
      }
    }

    res.writeHead(200, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ futures: data, syncedAt: new Date().toISOString() }))
  } catch (e) {
    console.error('[futures]', e)

    // 回退静态数据（最近的行情）
    const now = new Date()
    const yy = now.getFullYear().toString().slice(2)

    // 固定回退值
    const spot = 7734.31
    const data = [
      { type: '现货', code: 'CSI500', price: spot, spot, discount: 0, daysToSettle: 0, annualRate: null },
      { type: '当月', code: 'IC2608', price: 7630.0, spot, discount: spot - 7630, daysToSettle: 25, annualRate: null },
      { type: '次月', code: 'IC2609', price: 7560.0, spot, discount: spot - 7560, daysToSettle: 54, annualRate: null },
      { type: '当季', code: 'IC2612', price: 7480.0, spot, discount: spot - 7480, daysToSettle: 145, annualRate: null },
      { type: '隔季', code: 'IC2703', price: 7420.0, spot, discount: spot - 7420, daysToSettle: 235, annualRate: null },
    ]

    for (const d of data) {
      if (d.daysToSettle > 0 && d.price > 0 && d.discount > 0) {
        d.annualRate = Math.round((d.discount / d.price) * (365 / d.daysToSettle) * 10000) / 100
      }
    }

    res.writeHead(200, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ futures: data, syncedAt: new Date().toISOString(), source: 'static' }))
  }
}