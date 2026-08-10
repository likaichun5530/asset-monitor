import { useMemo, useState, useRef, useCallback, useEffect } from 'react'
import { getHistory } from '../utils/asset.js'
import { formatCurrency } from '../utils/format.js'

// 星期标题
const WEEKDAY_HEADERS = ['日', '一', '二', '三', '四', '五', '六']

// 月份中文名
const MONTH_NAMES = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

// 格式化涨跌金额：具体数字，无小数，无万，无千分位
function formatChangeShort(value) {
  if (value === null || value === undefined) return ''
  const rounded = Math.round(Math.abs(value))
  return value > 0 ? '+' + rounded : '-' + rounded
}

// 格式化涨跌百分比（value 已是百分比数值，如 0.2 表示 +0.2%）
function formatChangePct(value) {
  if (value === null || value === undefined) return ''
  const sign = value > 0 ? '+' : ''
  return sign + value.toFixed(1) + '%'
}

// 日期字符串工具
function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function prevDayStr(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() - 1)
  return toDateStr(d)
}

export default function CalendarHeatmap({ refreshKey = 0 }) {
  const history = useMemo(() => getHistory(), [refreshKey])
  const [selectedDay, setSelectedDay] = useState(null)
  const [popupPos, setPopupPos] = useState(null)
  const [showMonthPicker, setShowMonthPicker] = useState(false)
  // 显示模式（记忆上次选择）
  const [displayMode, setDisplayMode] = useState(() => {
    try { return localStorage.getItem('youshu-calendar-mode') || 'amount' } catch { return 'amount' }
  })
  const changeDisplayMode = (mode) => {
    setDisplayMode(mode)
    try { localStorage.setItem('youshu-calendar-mode', mode) } catch { /* ignore */ }
  }

  // 存储每个日期格子的 DOM 引用，用于滚动时更新弹窗位置
  const dayRefs = useRef({})

  // 当前选中年月
  const now = new Date()
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth()) // 0=1月

  // 今天日期字符串
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

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

  // 生成完整 42 格日历（月初含上月、月末含下月）
  const monthData = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1)
    const firstWeekday = firstDay.getDay() // 0=周日

    // 日历起始日期 = 本月1号往前数 firstWeekday 天
    const startDate = new Date(viewYear, viewMonth, 1 - firstWeekday)

    const days = []
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + i)
      const ds = toDateStr(date)
      const isCurrentMonth = date.getMonth() === viewMonth && date.getFullYear() === viewYear
      const total = totalMap.get(ds)
      const prevTotal = totalMap.get(prevDayStr(ds))
      const hasTotal = total !== undefined
      const hasChange = total !== undefined && prevTotal !== undefined
      days.push({
        date: ds,
        day: date.getDate(),
        isCurrentMonth,
        hasTotal,
        hasChange,
        total: hasTotal ? total : null,
        change: hasChange ? total - prevTotal : null,
        changePct: hasChange && prevTotal ? ((total - prevTotal) / prevTotal) * 100 : null,
      })
    }
    return days
  }, [totalMap, viewYear, viewMonth])

  // 根据被选中日期的格子重新计算弹窗位置（跟随滚动）
  const updatePopupPos = useCallback(() => {
    if (!selectedDay) return
    const el = dayRefs.current[selectedDay.date]
    if (!el) return
    const rect = el.getBoundingClientRect()
    setPopupPos({
      top: rect.top,
      left: rect.left + rect.width / 2,
    })
  }, [selectedDay])

  // 监听滚动和窗口大小变化，让弹窗跟随日期格子
  useEffect(() => {
    if (!selectedDay) return
    const onScroll = () => updatePopupPos()
    const onResize = () => updatePopupPos()
    // 用 capture + passive 确保捕获所有滚动（包括内部滚动容器）
    window.addEventListener('scroll', onScroll, { capture: true, passive: true })
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('scroll', onScroll, { capture: true })
      window.removeEventListener('resize', onResize)
    }
  }, [selectedDay, updatePopupPos])

  const handleDayClick = (dayInfo, event) => {
    if (!dayInfo.hasTotal) return
    // 点击同一日期：关闭弹窗
    if (selectedDay?.date === dayInfo.date) { setSelectedDay(null); setPopupPos(null); return }
    // 点击其他日期：直接切换为新的日期，并更新弹窗位置
    setSelectedDay(dayInfo)
    const rect = event.currentTarget.getBoundingClientRect()
    setPopupPos({
      top: rect.top,
      left: rect.left + rect.width / 2,
    })
  }

  const selectMonth = (ym) => {
    const [y, m] = ym.split('-').map(Number)
    setViewYear(y)
    setViewMonth(m - 1)
    setShowMonthPicker(false)
  }

  const goPrev = () => {
    if (viewMonth === 0) { setViewYear(viewYear - 1); setViewMonth(11) }
    else setViewMonth(viewMonth - 1)
  }
  const goNext = () => {
    if (viewMonth === 11) { setViewYear(viewYear + 1); setViewMonth(0) }
    else setViewMonth(viewMonth + 1)
  }
  const goPrevYear = () => setViewYear(viewYear - 1)
  const goNextYear = () => setViewYear(viewYear + 1)

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
        <div className="flex items-center gap-2">
          {/* 金额/比例切换 */}
          <div className="flex items-center gap-[1px] bg-gray-100 rounded-lg">
            <button
              onClick={() => changeDisplayMode('amount')}
              className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${displayMode === 'amount' ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >金额</button>
            <button
              onClick={() => changeDisplayMode('percent')}
              className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${displayMode === 'percent' ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >比例</button>
          </div>
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

            {/* 月份下拉选择器（双箭头翻年 + 单箭头翻月） */}
            {showMonthPicker && (
              <>
                <div className="fixed inset-0 z-[45]" onClick={() => setShowMonthPicker(false)} />
                <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-2 w-52">
                  <div className="flex items-center justify-between mb-2 px-1">
                    <div className="flex items-center gap-1">
                      <button onClick={goPrevYear} className="p-1 hover:bg-gray-100 rounded text-gray-400" title="上一年">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 18l-6-6 6-6 M17 18l-6-6 6-6" /></svg>
                      </button>
                      <button onClick={goPrev} className="p-1 hover:bg-gray-100 rounded text-gray-500">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
                      </button>
                    </div>
                    <span className="text-sm font-medium text-gray-700">{viewYear}</span>
                    <div className="flex items-center gap-1">
                      <button onClick={goNext} className="p-1 hover:bg-gray-100 rounded text-gray-500">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
                      </button>
                      <button onClick={goNextYear} className="p-1 hover:bg-gray-100 rounded text-gray-400" title="下一年">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 18l6-6-6-6 M13 18l6-6-6-6" /></svg>
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    {MONTH_NAMES.map((name, idx) => {
                      const ym = `${viewYear}-${String(idx + 1).padStart(2, '0')}`
                      const hasData = availableMonths.includes(ym)
                      const isActive = viewMonth === idx
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
      </div>

      {/* 日历网格（relative z-[41] 使日期格子高于遮罩，点击可切换日期） */}
      <div className="grid grid-cols-7 gap-[2px] relative z-[41]">
        {WEEKDAY_HEADERS.map((w) => (
          <div key={w} className="text-center text-[10px] text-gray-400 py-[2px]">{w}</div>
        ))}
        {monthData.map((dayInfo, idx) => {
          const isUp = dayInfo.change > 0
          const isDown = dayInfo.change < 0
          const hasChange = dayInfo.change !== null
          const isSelected = selectedDay?.date === dayInfo.date
          const isToday = dayInfo.date === todayStr

          const cellBg = !dayInfo.hasTotal ? 'bg-gray-50'
            : isSelected ? (isUp ? 'bg-red-200' : 'bg-green-200')
            : isUp ? 'bg-red-100' : 'bg-green-100'

          return (
            <div
              key={dayInfo.date}
              ref={(el) => { dayRefs.current[dayInfo.date] = el }}
              onClick={(e) => handleDayClick(dayInfo, e)}
              className={`aspect-square flex flex-col items-center justify-center rounded cursor-pointer transition-colors ${cellBg} ${isSelected ? 'ring-2 ring-brand-500' : ''} hover:ring-1 hover:ring-gray-300 relative overflow-hidden ${!dayInfo.isCurrentMonth ? 'opacity-60' : ''}`}
            >
              {/* 右上角日期数字 */}
              <span className={`absolute top-1.5 right-1.5 text-sm ${!dayInfo.hasTotal ? 'text-gray-300' : isUp ? 'text-red-600' : isDown ? 'text-green-600' : 'text-gray-500'}`}>
                {isToday ? '今' : dayInfo.day}
              </span>
              {/* 底部涨跌金额/比例 */}
              {hasChange && (
                <span className={`absolute bottom-1.5 left-0 right-0 text-center text-[10px] leading-none font-medium ${isUp ? 'text-red-500' : 'text-green-600'}`}>
                  {displayMode === 'amount' ? formatChangeShort(dayInfo.change) : formatChangePct(dayInfo.changePct)}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* 点击弹出当天总资产（跟随日期，滚动时保持相对位置） */}
      {selectedDay && popupPos && (
        <>
          {/* 遮罩在日历下方（z-40），点击非日期区域关闭；日期区域 z-[41] 优先响应 */}
          <div className="fixed inset-0 z-40" onClick={() => { setSelectedDay(null); setPopupPos(null) }} />
          <div
            className="fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 px-3 py-2 text-center whitespace-nowrap pointer-events-none"
            style={{
              top: popupPos.top - 8,
              left: popupPos.left,
              transform: 'translate(-50%, -100%)',
            }}
          >
            <div className="text-[10px] text-gray-500 dark:text-gray-400">{selectedDay.date}</div>
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-0.5">
              {formatCurrency(selectedDay.total)}
            </div>
          </div>
        </>
      )}
    </div>
  )
}