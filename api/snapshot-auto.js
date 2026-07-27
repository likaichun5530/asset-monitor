// Vercel Cron Function: 每天 23:50 自动生成资产快照
// 由 vercel.json crons 配置触发
import { isConfigured, readSheet, appendRows, updateRows, toNumber } from './_google.js'

const CRON_SECRET = process.env.CRON_SECRET || ''

// 9类资产的分类规则
// key: Holdings 中的过滤条件，value: { key, label, filter }
function classifyAsset(row) {
  const type = String(row.AssetType ?? row.assetType ?? '').toLowerCase()
  const market = String(row.Market ?? row.market ?? '').toUpperCase()

  if (type === 'stock') {
    if (market === 'US') return 'us'
    if (market === 'CN') return 'cn'
    if (market === 'HK') return 'hk'
    if (market === 'JP') return 'jp'
    return null // 其他股票忽略
  }
  if (type === 'crypto') return 'crypto'
  if (type === 'bond') return 'bond'
  if (type === 'future') return 'future'
  if (type === 'gold') return 'gold'
  if (type === 'cash') return 'cash'
  return null
}

const CATEGORY_KEYS = ['us', 'crypto', 'bond', 'future', 'cn', 'gold', 'jp', 'hk', 'cash']

function toSheetDate(isoDate) {
  const m = String(isoDate).match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (m) return `${m[1]}/${Number(m[2])}/${Number(m[3])}`
  return isoDate
}

function isSameDate(a, b) {
  const ma = String(a).match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/)
  const mb = String(b).match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/)
  if (!ma || !mb) return String(a) === String(b)
  return ma[1] === mb[1] && Number(ma[2]) === Number(mb[2]) && Number(ma[3]) === Number(mb[3])
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!CRON_SECRET || req.headers['authorization'] !== `Bearer ${CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (!isConfigured()) {
    return res.status(503).json({ error: 'Google Sheets 未配置' })
  }

  try {
    // 1. 读取 Holdings 表，按 9 类资产汇总
    const result = await readSheet('Holdings')
    const rows = result.data || []

    // 各类资产合计
    const categories = {}
    let total = 0
    for (const row of rows) {
      const val = toNumber(row.MarketValueCNY ?? row.marketValueCNY)
      if (val === null) continue
      const key = classifyAsset(row)
      if (!key) continue
      categories[key] = (categories[key] || 0) + val
      total += val
    }

    if (total === 0) {
      return res.status(200).json({ ok: true, message: '总资产为 0，跳过快照', total })
    }

    // 2. 组装写入行：[日期, 总资产, 美股, 数字货币, 债券, 期货, A股, 黄金, 日股, 港股, 现金, 备注]
    const today = new Date().toISOString().slice(0, 10)
    const sheetDate = toSheetDate(today)

    const rowValues = [
      sheetDate,
      Math.round(total * 100) / 100,
    ]
    // 按固定顺序写入 C~K 列
    for (const key of CATEGORY_KEYS) {
      rowValues.push(categories[key] !== undefined ? Math.round(categories[key] * 100) / 100 : '')
    }
    rowValues.push('') // L列：备注（保留占位，暂不填写）

    // 3. 检查 History 表当天是否已有记录
    const historyResult = await readSheet('History')
    const historyRows = historyResult.data || []
    const headers = historyResult.headers || []
    const dateKey = headers[0]

    let headerIdx = 0
    for (let i = 0; i < Math.min(historyRows.length, 5); i++) {
      if (historyRows[i] && String(historyRows[i][dateKey] || '').includes('日期')) { headerIdx = i; break }
    }

    let existingRow = -1
    for (let i = headerIdx + 1; i < historyRows.length; i++) {
      if (historyRows[i] && historyRows[i][dateKey] && isSameDate(historyRows[i][dateKey], today)) {
        existingRow = i + 2
        break
      }
    }

    if (existingRow > 0) {
      // 更新整行 A~L
      const col = String.fromCharCode(64 + rowValues.length) // L=12
      await updateRows('History', `A${existingRow}:${col}${existingRow}`, [rowValues])
    } else {
      await appendRows('History', [rowValues])
    }

    return res.status(200).json({
      ok: true,
      date: today,
      total: Math.round(total * 100) / 100,
      categories,
      action: existingRow > 0 ? 'updated' : 'appended',
    })
  } catch (e) {
    return res.status(500).json({ error: String(e) })
  }
}