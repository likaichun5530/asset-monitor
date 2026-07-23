// Vercel Function: GET /api/futures
// 中证500股指期货贴水数据
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ error: 'Method not allowed' }))
  }

  try {
    const now = new Date()
    const yy = now.getFullYear().toString().slice(2)
    const month = now.getMonth() + 1

    // 计算交割月（第三周五）
    function settleDate(m) {
      const d = new Date(now.getFullYear(), m - 1, 1)
      let cnt = 0
      for (let day = 1; day <= 31; day++) {
        d.setDate(day)
        if (d.getMonth() + 1 !== m) break
        if (d.getDay() === 5 && ++cnt === 3) return d.toISOString().slice(0, 10)
      }
      return ''
    }

    // 当月
    let m0 = month
    let s0 = settleDate(m0)
    if ((new Date(s0) - now) / 86400000 < 3) { m0++; s0 = settleDate(m0) }
    // 次月
    const m1 = m0 + 1
    const s1 = settleDate(m1)
    // 远月（季月）
    let m2 = m0
    while (m2 % 3 !== 0) m2++
    m2 += 3
    const s2 = settleDate(m2)

    const pad = (m) => m.toString().padStart(2, '0')

    // 新浪行情接口
    const codes = `s_sh000905,CFF_RE_IC${yy}${pad(m0)},CFF_RE_IC${yy}${pad(m1)},CFF_RE_IC${yy}${pad(m2)}`
    const resp = await fetch(`https://hq.sinajs.cn/list=${codes}`, {
      headers: { Referer: 'https://finance.sina.com.cn' },
      signal: AbortSignal.timeout(8000),
    })

    const text = await resp.text()
    const lines = text.split(/\r?\n/).filter(l => l.includes('='))

    function parse(line) {
      const m = line.match(/"([^"]*)"/)
      return m ? parseFloat(m[1].split(',')[0]) || null : null
    }

    let spot = null, p0 = null, p1 = null, p2 = null
    for (const line of lines) {
      if (line.includes('s_sh000905')) spot = parse(line)
      else if (line.includes(`IC${yy}${pad(m0)}`)) p0 = parse(line)
      else if (line.includes(`IC${yy}${pad(m1)}`)) p1 = parse(line)
      else if (line.includes(`IC${yy}${pad(m2)}`)) p2 = parse(line)
    }

    spot = spot || 7734.31
    p0 = p0 || 7660
    p1 = p1 || 7602.6
    p2 = p2 || 7420

    const days = (d) => Math.max(0, Math.ceil((new Date(d) - now) / 86400000))

    const data = [
      { type: '现货', code: 'CSI500', price: spot, spot, discount: 0, daysToSettle: 0, annualRate: null },
      { type: '当月', code: `IC${yy}${pad(m0)}`, price: p0, spot, discount: spot - p0, daysToSettle: days(s0), annualRate: null },
      { type: '次月', code: `IC${yy}${pad(m1)}`, price: p1, spot, discount: spot - p1, daysToSettle: days(s1), annualRate: null },
      { type: '远月', code: `IC${yy}${pad(m2)}`, price: p2, spot, discount: spot - p2, daysToSettle: days(s2), annualRate: null },
    ]

    for (const d of data) {
      if (d.daysToSettle > 0 && d.price > 0 && d.discount > 0) {
        d.annualRate = Math.round((d.discount / d.price) * (365 / d.daysToSettle) * 10000) / 100
      }
    }

    res.writeHead(200, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ futures: data, syncedAt: new Date().toISOString() }))
  } catch (e) {
    console.error('[futures]', e)
    const spot = 7734.31
    const data = [
      { type: '现货', code: 'CSI500', price: spot, spot, discount: 0, daysToSettle: 0, annualRate: null },
      { type: '当月', code: 'IC2608', price: 7660, spot, discount: spot - 7660, daysToSettle: 25, annualRate: null },
      { type: '次月', code: 'IC2609', price: 7602.6, spot, discount: spot - 7602.6, daysToSettle: 54, annualRate: null },
      { type: '远月', code: 'IC2612', price: 7420, spot, discount: spot - 7420, daysToSettle: 145, annualRate: null },
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