export const HISTORY_CATEGORY_META = [
  { key: 'us', label: '美股', color: '#3b82f6' },
  { key: 'crypto', label: '虚拟币', color: '#f97316' },
  { key: 'bond', label: '债基', color: '#10b981' },
  { key: 'future', label: '期货', color: '#06b6d4' },
  { key: 'cn', label: 'A股', color: '#ef4444' },
  { key: 'gold', label: '黄金', color: '#d4a017' },
  { key: 'jp', label: '日股', color: '#ec4899' },
  { key: 'hk', label: '港股', color: '#8b5cf6' },
  { key: 'cash', label: '现金', color: '#6b7280' },
]

export function getHistoryDayDetail(history = [], date) {
  const ordered = history
    .filter((item) => item?.date)
    .slice()
    .sort((a, b) => new Date(a.date) - new Date(b.date))
  const currentIndex = ordered.findIndex((item) => item.date === date)
  if (currentIndex < 0) return null

  const current = ordered[currentIndex]
  const previous = currentIndex > 0 ? ordered[currentIndex - 1] : null
  const hasCategoryValues = Boolean(current.categories && Object.keys(current.categories).length)
  const canCompareCategories = Boolean(hasCategoryValues && previous?.categories && Object.keys(previous.categories).length)

  const categories = hasCategoryValues
    ? HISTORY_CATEGORY_META.map((meta) => {
        const currentValue = Number(current.categories?.[meta.key]) || 0
        const previousValue = Number(previous?.categories?.[meta.key]) || 0
        return {
          ...meta,
          currentValue,
          change: canCompareCategories ? currentValue - previousValue : null,
        }
      })
    : []

  const currentTotal = Number(current.total) || 0
  const previousTotal = previous && Number.isFinite(Number(previous.total)) ? Number(previous.total) : null

  return {
    date: current.date,
    note: String(current.note || ''),
    previousDate: previous?.date || null,
    total: currentTotal,
    totalChange: previousTotal === null ? null : currentTotal - previousTotal,
    categories,
    canCompareCategories,
  }
}
