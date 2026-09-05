const EASTMONEY_ENDPOINT = 'https://datacenter-web.eastmoney.com/api/data/v1/get'

const SUBSCRIPTION_REPORTS = Object.freeze([
  {
    type: 'stock',
    reportName: 'RPTA_APP_IPOAPPLY',
    dateField: 'APPLY_DATE',
    sortColumns: 'APPLY_DATE,SECURITY_CODE',
  },
  {
    type: 'bond',
    reportName: 'RPT_BOND_CB_LIST',
    dateField: 'PUBLIC_START_DATE',
    sortColumns: 'PUBLIC_START_DATE,SECURITY_CODE',
  },
])

function cleanText(value) {
  return String(value ?? '').trim()
}

function finiteNumber(value) {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

export function getShanghaiDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  return `${values.year}-${values.month}-${values.day}`
}

export function normalizeSubscription(row, type) {
  if (type === 'stock') {
    const name = cleanText(row.SECURITY_NAME_ABBR || row.SECURITY_NAME)
    const code = cleanText(row.SECURITY_CODE)
    if (!name || !code) return null
    return {
      type,
      name,
      code,
      applyCode: cleanText(row.APPLY_CODE),
      price: finiteNumber(row.ISSUE_PRICE),
      maxApply: finiteNumber(row.ONLINE_APPLY_UPPER),
      market: cleanText(row.MARKET_TYPE_NEW || row.MARKET),
    }
  }

  const name = cleanText(row.SECURITY_NAME_ABBR)
  const code = cleanText(row.SECURITY_CODE)
  if (!name || !code) return null
  return {
    type: 'bond',
    name,
    code,
    applyCode: cleanText(row.CORRECODE),
    price: finiteNumber(row.ISSUE_PRICE),
    maxApply: null,
    market: cleanText(row.TRADE_MARKET),
  }
}

function buildRequestUrl(report, date) {
  const url = new URL(EASTMONEY_ENDPOINT)
  url.searchParams.set('reportName', report.reportName)
  url.searchParams.set('columns', 'ALL')
  url.searchParams.set('source', 'WEB')
  url.searchParams.set('client', 'WEB')
  url.searchParams.set('pageNumber', '1')
  url.searchParams.set('pageSize', '100')
  url.searchParams.set('sortColumns', report.sortColumns)
  url.searchParams.set('sortTypes', '-1,1')
  url.searchParams.set('filter', `(${report.dateField}='${date}')`)
  return url
}

async function fetchReport(report, date, fetchImpl) {
  const response = await fetchImpl(buildRequestUrl(report, date), {
    headers: {
      Accept: 'application/json',
      Referer: 'https://data.eastmoney.com/xg/xg/calendar.html',
      'User-Agent': 'Asset-Monitor/1.0',
    },
    signal: AbortSignal.timeout(8_000),
  })
  if (!response.ok) throw new Error(`申购日历读取失败: ${response.status}`)
  const payload = await response.json()
  // 东方财富在正常的“当天没有申购项目”场景下返回 code=9201，而不是空 data。
  if (payload?.code === 9201 && payload?.result === null) return []
  if (!payload?.success || !payload?.result) throw new Error('申购日历返回异常')
  return (payload.result.data || [])
    .map((row) => normalizeSubscription(row, report.type))
    .filter(Boolean)
}

export async function fetchTodaySubscriptions({ now = new Date(), fetchImpl = fetch } = {}) {
  const date = getShanghaiDate(now)
  const results = await Promise.allSettled(
    SUBSCRIPTION_REPORTS.map((report) => fetchReport(report, date, fetchImpl)),
  )
  const fulfilled = results.filter((result) => result.status === 'fulfilled')
  if (!fulfilled.length) throw new Error('新股新债数据暂时不可用')
  return {
    date,
    items: fulfilled.flatMap((result) => result.value),
    partial: fulfilled.length !== results.length,
  }
}
