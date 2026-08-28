import { useMemo, useState, useRef, useCallback, useEffect } from 'react'
import { getHistory } from '../utils/asset.js'
import { saveHistoryNote } from '../utils/dataStore.js'
import { formatCurrency } from '../utils/format.js'
import { getHistoryDayDetail } from '../utils/historyChanges.js'
import { setCachedHistory } from '../utils/snapshot.js'

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

function formatSignedCurrency(value) {
  if (!Number.isFinite(Number(value))) return '—'
  const amount = Number(value)
  if (amount === 0) return formatCurrency(0, { decimals: 0 })
  return `${amount > 0 ? '+' : '−'}${formatCurrency(Math.abs(amount), { decimals: 0 })}`
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
  const [historyRevision, setHistoryRevision] = useState(0)
  const history = useMemo(() => getHistory(), [refreshKey, historyRevision])
  const [selectedDay, setSelectedDay] = useState(null)
  const [popupPos, setPopupPos] = useState(null)
  const [showMonthPicker, setShowMonthPicker] = useState(false)
  const [noteEditing, setNoteEditing] = useState(false)
  const [noteDraft, setNoteDraft] = useState('')
  const [noteSaving, setNoteSaving] = useState(false)
  const [noteError, setNoteError] = useState('')
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
  // 组件根容器引用（用于判断点击是否在日历内部）
  const wrapRef = useRef(null)
  // 防止点击弹窗本体立即关闭的标记
  const suppressCloseRef = useRef(false)
  const noteTextareaRef = useRef(null)

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

  const selectedDetail = useMemo(
    () => selectedDay ? getHistoryDayDetail(history, selectedDay.date) : null,
    [history, selectedDay],
  )

  useEffect(() => {
    setNoteEditing(false)
    setNoteDraft(selectedDetail?.note || '')
    setNoteError('')
  }, [selectedDetail?.date])

  useEffect(() => {
    if (!noteEditing) return undefined
    const frame = requestAnimationFrame(() => {
      noteTextareaRef.current?.focus({ preventScroll: true })
      noteTextareaRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    })
    return () => cancelAnimationFrame(frame)
  }, [noteEditing])

  useEffect(() => {
    if (!selectedDetail || window.matchMedia('(min-width: 640px)').matches) return undefined
    const previousOverflow = document.body.style.overflow
    const previousOverscroll = document.body.style.overscrollBehavior
    document.body.dataset.modalOpen = 'true'
    document.body.style.overflow = 'hidden'
    document.body.style.overscrollBehavior = 'none'
    return () => {
      delete document.body.dataset.modalOpen
      document.body.style.overflow = previousOverflow
      document.body.style.overscrollBehavior = previousOverscroll
    }
  }, [selectedDetail])

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
      top: Math.max(Math.min(rect.top, window.innerHeight - 390), 16),
      left: Math.min(Math.max(rect.left + rect.width / 2, 152), window.innerWidth - 152),
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
    suppressCloseRef.current = true
    const rect = event.currentTarget.getBoundingClientRect()
    setPopupPos({
      top: Math.max(Math.min(rect.top, window.innerHeight - 390), 16),
      left: Math.min(Math.max(rect.left + rect.width / 2, 152), window.innerWidth - 152),
    })
  }

  // 点击日历外部时关闭弹窗（替代全屏遮罩，避免 z 堆叠问题）
  useEffect(() => {
    if (!selectedDay) return
    const onDocClick = (e) => {
      // 本次点击由日期格子触发时，跳过（避免刚打开就关闭）
      if (suppressCloseRef.current) { suppressCloseRef.current = false; return }
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setSelectedDay(null)
        setPopupPos(null)
      }
    }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [selectedDay])

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

  const handleSaveNote = async () => {
    if (!selectedDetail || noteSaving) return
    setNoteSaving(true)
    setNoteError('')
    try {
      const result = await saveHistoryNote(selectedDetail.date, noteDraft)
      const updatedHistory = history.map((item) => item.date === selectedDetail.date
        ? { ...item, note: result.note || undefined }
        : item)
      setCachedHistory(updatedHistory)
      setHistoryRevision((value) => value + 1)
      setNoteEditing(false)
    } catch (error) {
      setNoteError(error?.message || '保存备注失败')
    } finally {
      setNoteSaving(false)
    }
  }

  const renderDayDetail = (showClose = false) => selectedDetail && (
    <>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{selectedDetail.date}</div>
          <div className="mt-0.5 text-[11px] text-gray-400">
            {selectedDetail.canCompareCategories && selectedDetail.previousDate
              ? `较上一条快照 ${selectedDetail.previousDate}`
              : '分类资产金额'}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {!noteEditing && (
            <button type="button" onClick={() => setNoteEditing(true)} className="rounded-lg bg-brand-50 px-2.5 py-1.5 text-xs font-medium text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
              {selectedDetail.note ? '编辑备注' : '添加备注'}
            </button>
          )}
          {showClose && (
            <button
              type="button"
              className="-mr-1 p-2 text-gray-400"
              aria-label="关闭分类资产变化"
              onClick={() => { setSelectedDay(null); setPopupPos(null) }}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 6 12 12M18 6 6 18" /></svg>
            </button>
          )}
        </div>
      </div>
      <div className="mt-3 flex items-end justify-between rounded-lg bg-gray-50 dark:bg-gray-900/50 px-3 py-2">
        <div><div className="text-[10px] text-gray-400">总资产</div><div className="mt-0.5 text-sm font-semibold text-gray-800 dark:text-gray-100">{formatCurrency(selectedDetail.total, { decimals: 0 })}</div></div>
        {selectedDetail.totalChange !== null && (
          <div className={`text-sm font-semibold ${selectedDetail.totalChange > 0 ? 'text-red-500' : selectedDetail.totalChange < 0 ? 'text-green-600' : 'text-gray-400'}`}>
            {formatSignedCurrency(selectedDetail.totalChange)}
          </div>
        )}
      </div>
      {noteEditing ? (
        <div className="mt-3 rounded-xl border border-brand-100 bg-brand-50/40 p-3 dark:border-brand-500/20 dark:bg-brand-500/5">
          <textarea
            ref={noteTextareaRef}
            value={noteDraft}
            onChange={(event) => { setNoteDraft(event.target.value); setNoteError('') }}
            maxLength={500}
            rows={3}
            placeholder="记录当天的重要事项"
            className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:focus:ring-brand-500/20"
          />
          {noteError && <div className="mt-1 text-xs text-red-500">{noteError}</div>}
          <div className="mt-2 flex justify-end gap-2">
            <button type="button" onClick={() => { setNoteEditing(false); setNoteDraft(selectedDetail.note || ''); setNoteError('') }} className="rounded-lg px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700">取消</button>
            <button type="button" onClick={handleSaveNote} disabled={noteSaving} className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">
              {noteSaving ? '保存中…' : '保存备注'}
            </button>
          </div>
        </div>
      ) : selectedDetail.note ? (
        <div className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">{selectedDetail.note}</div>
      ) : null}
      {selectedDetail.categories.length > 0 ? (
        <div className="mt-2 divide-y divide-gray-100 dark:divide-gray-700">
          {selectedDetail.categories.map((item) => {
            const displayValue = selectedDetail.canCompareCategories ? item.change : item.currentValue
            return (
              <div key={item.key} className="flex h-7 items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                  {item.label}
                </span>
                <span className={selectedDetail.canCompareCategories
                  ? displayValue > 0 ? 'font-medium text-red-500' : displayValue < 0 ? 'font-medium text-green-600' : 'text-gray-400'
                  : 'text-gray-600 dark:text-gray-300'}>
                  {selectedDetail.canCompareCategories
                    ? formatSignedCurrency(displayValue)
                    : formatCurrency(displayValue, { decimals: 0 })}
                </span>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="py-6 text-center text-xs text-gray-400">该日暂无分类资产快照</div>
      )}
    </>
  )

  if (!history.length) {
    return (
      <div className="card calendar-card">
        <h3 className="text-base font-semibold text-gray-800 mb-3">收益日历</h3>
        <div className="text-sm text-gray-400 py-8 text-center">暂无历史数据</div>
      </div>
    )
  }

  return (
    <div className="card calendar-card relative" ref={wrapRef}>
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

      {/* 日历网格（无 z 堆叠，避免穿透底部导航栏） */}
      <div className="grid grid-cols-7 gap-[2px]">
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
              className={`calendar-day-cell aspect-square flex flex-col items-center justify-center rounded cursor-pointer transition-colors ${cellBg} ${isSelected ? 'ring-2 ring-brand-500' : ''} hover:ring-1 hover:ring-gray-300 relative overflow-hidden ${!dayInfo.isCurrentMonth ? 'opacity-60' : ''}`}
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

      {/* 手机端底部面板 */}
      {selectedDetail && (
        <>
          <button type="button" aria-label="关闭分类资产变化" className="fixed inset-0 z-[55] bg-black/25 sm:hidden" onClick={() => { setSelectedDay(null); setPopupPos(null) }} />
          <section role="dialog" aria-modal="true" aria-label="每日资产变化" className="fixed inset-x-0 bottom-0 z-[60] flex max-h-[calc(100dvh-8px)] min-h-0 flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl dark:bg-gray-800 sm:hidden" data-pull-refresh-ignore="true">
            <div className="shrink-0 pt-3"><div className="mx-auto h-1 w-10 rounded-full bg-gray-200 dark:bg-gray-600" /></div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(env(safe-area-inset-bottom)+20px)] pt-3" style={{ WebkitOverflowScrolling: 'touch' }}>
              {renderDayDetail(true)}
            </div>
          </section>
        </>
      )}

      {/* 桌面端日期旁浮层 */}
      {selectedDetail && popupPos && (
        <div
          className="fixed z-30 hidden w-72 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-xl dark:border-gray-600 dark:bg-gray-800 sm:block"
          style={{ top: popupPos.top, left: popupPos.left, transform: 'translateX(-50%)' }}
        >
          {renderDayDetail()}
        </div>
      )}
    </div>
  )
}
