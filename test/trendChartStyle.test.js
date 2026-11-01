import test from 'node:test'
import assert from 'node:assert/strict'
import { TREND_MARGIN, TREND_X_AXIS, TREND_Y_AXIS, TREND_CARD_CLASS, toWanNum, compactCoverage } from '../src/components/trendChartStyle.js'
test('shared axes suppress default gray lines and short ticks with compact gutters', () => {
 assert.equal(TREND_X_AXIS.tickLine, false)
 assert.equal(TREND_Y_AXIS.tickLine, false)
 assert.equal(TREND_Y_AXIS.axisLine, false)
 assert.equal(TREND_Y_AXIS.width, 44)
 assert.deepEqual(TREND_MARGIN, {top:24,right:12,bottom:0,left:0})
 assert.match(TREND_CARD_CLASS,/px-\[1px\]/)
 assert.equal(toWanNum(150000), '15')
})
test('month coverage compresses consecutive months but never fills gaps', () => {
 assert.equal(compactCoverage('1月、2月、3月、4月、5月、6月、7月、8月、9月、10月'),'1—10月')
 for (const text of ['1月、3月','全年','1—10月','1月']) assert.equal(compactCoverage(text),text)
})
