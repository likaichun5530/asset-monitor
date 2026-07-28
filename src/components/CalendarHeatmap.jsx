import { useMemo, useState } from 'react'
import { getHistory } from '../utils/asset.js'
import { formatCurrency } from '../utils/format.js'

// 星期标题
const WEEKDAY_HEADERS = ['日', '一', '二', '三', '四', '五', '六']

// 月份中文名
const MONTH_NAMES = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

export default function CalendarHeatmap({ refreshKey = 0 }) {
  const history = useMemo(() => getHistory(), [refreshKey])
  const [selectedDay, setSelectedDay] = useState(null)
  const [popupPos, setPopupPos] = useState(null)
  const [showMonthPicker, setShowMonthPicker] = useState(false)

  // 当前选中年月
  const now = new Date()
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth()) // 0=1月

  // 构建 { dateStr -> total } 映射
  const totalMap = useMemo(() => {
    const map = new Map()
    for (const d of history) map.set(d.date, d.total)
    return map
  }, [history])

  // 分析历史数据中存在的年月范围
  const availableMonths = useMemo(() => {
    const set = new Set()
    for (const d of history) {
      const parts = d.date.split('-')
      if (parts.length >= 2) set.add(`${parts[0]}-${parts[1]}`)
    }
    return Array.from(set).sort()
  }, [history])

  // 选中月份的数据
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay()

  const dateStr = (d) =>
    `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`

  const prevDateStr = (d) => {
    const prev = new Date(viewYear, viewMonth, d - 1)
    const y = prev.getFullYear()
    const m = String(prev.getMonth() + 1).padStart(2, '0')
    const day = String(prev.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  const monthData = useMemo(() => {
    const days = []
    for (let pad = 0; pad < firstDayOfWeek; pad++) days.push(null)
    for (let d = 1; d <= daysInMonth; d++) {
      const date = dateStr(d)
      const total = totalMap.get(date)
      if (total !== undefined) {
        const prevTotal = totalMap.get(prevDateStr(d))
        if (prevTotal !== undefined) {
          days.push({ date, day: d, hasData: true, change: total - prevTotal })
          continue
        }
      }
      days.push({ date, day: d, hasData: false, change: null })
    }
    return days
  }, [totalMap, viewYear, viewMonth, daysInMonth, firstDayOfWeek])

  const handleDayClick = (dayInfo, event) => {
    if (!dayInfo || !dayInfo.hasData || dayInfo.change === null) return
    setSelectedDay(dayInfo)
    const rect = event.currentTarget.getBoundingClientRect()
    setPopupPos({ top: rect.top - 10, left: rect.left + rect.width / 2 })
  }

  const dismissPopup = () => { setSelectedDay(null); setPopupPos(null) }

  const selectMonth = (ym) => {
    const [y, m] = ym.split('-').map(Number)
    setViewYear(y)
    setViewMonth(m - 1)
    setShowMonthPicker(false)
  }

  // 月份选择器：左右导航
  const goPrev = () => {
    if (viewMonth === 0) { setViewYear(viewYear - 1); setViewMonth(11) }
    else setViewMonth(viewMonth - 1)
  }
  const goNext = () => {
    if (viewMonth === 11) { setViewYear(viewYear + 1); setViewMonth(0) }
    else setViewMonth(viewMonth + 1)
  }

  if (!history.length) {
    return (
      <div className="card">
        <h3 className="text-base font-semibold text-gray-800 mb-3">收益日历</h3>
        <div className="text-sm text-gray-400 py-8 text-center">暂无历史数据</div>
      </div>
    )
  }

  return (
    <div className="card relative">
      {/* 标题行 */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-800">收益日历</h3>
        <div className="relative">
          <button
            onClick={() => setShowMonthPicker(!showMonthPicker)}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            {viewYear}年{MONTH_NAMES[viewMonth]}
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>

          {/* 月份下拉选择器 */}
          {showMonthPicker && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setShowMonthPicker(false)} />
              <div className="absolute right-0 top-full mt-1 z-30 bg-white rounded-lg shadow-lg border border-gray-200 p-2 w-52">
                {/* 左右翻页 */}
                <div className="flex items-center justify-between mb-2 px-1">
                  <button onClick={goPrev} className="p-1 hover:bg-gray-100 rounded text-gray-500">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
                  </button>
                  <span className="text-sm font-medium text-gray-700">{viewYear}</span>
                  <button onClick={goNext} className="p-1 hover:bg-gray-100 rounded text-gray-500">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
                  </button>
                </div>
                {/* 12个月份网格 */}
                <div className="grid grid-cols-3 gap-1">
                  {MONTH_NAMES.map((name, idx) => {
                    const ym = `${viewYear}-${String(idx + 1).padStart(2, '0')}`
                    const hasData = availableMonths.includes(ym)
                    const isActive = viewYear === viewYear && viewMonth === idx
                    return (
                      <button
                        key={idx}
                        onClick={() => selectMonth(ym)}
                        disabled={!hasData}
                        className={`px-2 py-1.5 rounded text-xs transition-colors ${
                          isActive ? 'bg-brand-600 text-white' :
                          hasData ? 'hover:bg-gray-100 text-gray-700' :
                          'text-gray-300 cursor-not-allowed'
                        }`}
                      >
                        {name}
                      </button>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 日历网格 */}
      <div className="grid grid-cols-7 gap-[2px]">
        {WEEKDAY_HEADERS.map((w) => (
          <div key={w} className="text-center text-[10px] text-gray-400 py-[2px]">{w}</div>
        ))}
        {monthData.map((dayInfo, idx) => {
          if (!dayInfo) return <div key={`empty-${idx}`} className="aspect-square" />
          const isUp = dayInfo.change > 0
          const isDown = dayInfo.change < 0
          const bgColor = isUp ? 'bg-red-100' : isDown ? 'bg-green-100' : 'bg-gray-50'
          const textColor = isUp ? 'text-red-600' : isDown ? 'text-green-600' : 'text-gray-400'
          const isSelected = selectedDay?.date === dayInfo.date

          return (
            <div
              key={dayInfo.date}
              onClick={(e) => handleDayClick(dayInfo, e)}
              className={`aspect-square flex items-center justify-center text-xs rounded cursor-pointer transition-colors ${bgColor} ${textColor} ${isSelected ? 'ring-2 ring-brand-500' : ''} hover:ring-1 hover:ring-gray-300`}
            >
              {dayInfo.day}
            </div>
          )
        })}
      </div>

      {/* 浮层提示 */}
      {selectedDay && popupPos && (
        <>
          <div className="fixed inset-0 z-30" onClick={dismissPopup} />
          <div
            className="fixed z-40 bg-white rounded-lg shadow-lg border border-gray-200 px-3 py-2 text-sm whitespace-nowrap pointer-events-none"
            style={{
              top: popupPos.top - 8,
              left: popupPos.left,
              transform: 'translate(-50%, -100%)',
            }}
          >
            <div className="text-gray-600 text-xs mb-0.5">{selectedDay.date}</div>
            <div className={selectedDay.change > 0 ? 'text-red-500 font-medium' : 'text-green-600 font-medium'}>
              {selectedDay.change > 0 ? '涨了 ' : '跌了 '}
              {formatCurrency(Math.abs(selectedDay.change))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}