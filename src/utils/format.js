// 金额格式化：千分位 + 两位小数
export function formatCurrency(value, { decimals = 2 } = {}) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '¥--'
  return '¥' + Number(value).toLocaleString('zh-CN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

// 整数金额（万元）
export function formatWan(value) {
  if (!Number.isFinite(Number(value))) return '--'
  return (Number(value) / 10000).toFixed(2) + ' 万'
}

// 百分比：传 0.12 表示 0.12%，传 12 表示 12%
// pctValue 为已是百分比形式的数值
export function formatPercent(pctValue, { withSign = false } = {}) {
  if (pctValue === null || pctValue === undefined || Number.isNaN(Number(pctValue))) return '--'
  const num = Number(pctValue).toFixed(2)
  if (withSign && Number(num) > 0) return '+' + num + '%'
  return num + '%'
}

// 涨跌金额（带正负号）
export function formatChange(value) {
  if (!Number.isFinite(Number(value))) return '--'
  const num = Number(value)
  const formatted = num.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  if (formatted === '-0.00') return '0.00'
  const prefix = num > 0 ? '+' : ''
  return prefix + formatted
}

// 日期格式化 YYYY-MM-DD -> MM-DD
export function formatDateShort(dateStr) {
  if (!dateStr) return ''
  const parts = String(dateStr).split('-')
  if (parts.length < 3) return dateStr
  return `${parts[1]}-${parts[2]}`
}

// 日期格式化 YYYY-MM-DD -> YYYY/MM/DD
export function formatDateLong(dateStr) {
  if (!dateStr) return ''
  const parts = String(dateStr).split('-')
  if (parts.length < 3) return dateStr
  return `${parts[0]}/${parts[1]}/${parts[2]}`
}

// 日期格式化 YYYY-MM-DD -> MM/DD
export function formatDateMid(dateStr) {
  if (!dateStr) return ''
  const parts = String(dateStr).split('-')
  if (parts.length < 3) return dateStr
  return `${parts[1]}/${parts[2]}`
}

// 数字千分位
export function formatNumber(value, decimals = 2) {
  if (!Number.isFinite(Number(value))) return '--'
  return Number(value).toLocaleString('zh-CN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}