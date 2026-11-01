import test from 'node:test'
import assert from 'node:assert/strict'
import { snapshotFromSheets } from '../shared/income-source.js'
test('source maps real columns, ignores formula zero months, preserves source totals', () => {
 const result = snapshotFromSheets({valueRanges:[{range:"'2026'!A1:Z60",values:[[2026,'工资','奋斗','绩效','奖金','出差','公积金','补贴','合计'],['1月',10,'','','','',2,'',12],['2月','','','','','','','',0],['合计',10,0,5,0,0,2,0,12]]}]},'2026-11-01T12:00:00+08:00')
 assert.equal(result.years[0].categories['绩效'],500)
 assert.equal(result.years[0].total,1200)
 assert.equal(result.years[0].without_fund,1000)
 assert.equal(result.years[0].coverage,'1月')
 assert.equal(result.years[0].complete,false)
 assert.equal(result.snapshotAt,'2026-11-01T12:00:00+08:00')
})
