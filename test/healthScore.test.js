import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateHealthScore } from '../src/utils/healthScore.js'
import { getTargetDeviation } from '../shared/allocation.js'
const row = (targetRatio, currentRatio, category = '美股') => ({ category, targetRatio, currentRatio })
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`)
test('连续大类扣分与零目标边界', () => {
  for (const [target, current, expected] of [[.4,.42,0],[.4,.43,2.5],[.01,.2,46.25],[0,.2,48.75]]) {
    close(calculateHealthScore({ targetRows: [row(target,current)] }).majorDeduction, expected)
  }
  assert.equal(getTargetDeviation(.42,.4).status, 'balanced')
  assert.equal(getTargetDeviation(.4201,.4).status, 'over')
})
test('细分使用类内偏离和较大权重，其他有目标也参与', () => {
  const result = calculateHealthScore({targetRows:[row(.4,.45)],targetDetails:[{category:'美股',allocation:{items:[{name:'其他',targetRatio:.5,currentRatio:.62}]}}]})
  close(result.detailDeduction,6.75)
})
test('IC分段、封顶与整数总分', () => {
  for(const [usage,expected] of [[70,0],[75,5],[80,15],[85,30],[86.5,34.5],[90,45],[95,60],[120,60]]) {
    const result=calculateHealthScore({icMarginUsageRate:usage})
    close(result.marginDeduction,expected)
    assert.ok(Number.isInteger(result.score))
  }
})
test('缺失保证金和目标会明确提示', () => {
  const result=calculateHealthScore({icMarginUsageRate:null,holdingsAvailable:false})
  assert.ok(result.dataWarnings.includes('IC 保证金数据不完整'))
  assert.ok(result.dataWarnings.includes('持仓数据不可用'))
})

test('其他无目标及现金期货无细分属于正常配置', () => {
  const result = calculateHealthScore({
    targetRows: [row(.4,.4),row(.3,.3,'现金'),row(.3,.3,'期货')],
    targetDetails: [
      {category:'美股',allocation:{items:[{name:'VOO',targetRatio:.5,currentRatio:.5},{name:'其他',targetRatio:null,currentRatio:.5}]}},
      {category:'现金',allocation:null}, {category:'期货',allocation:null},
    ],
  })
  assert.deepEqual(result.dataWarnings, [])
  assert.equal(result.detailDeduction, 0)
  assert.deepEqual(calculateHealthScore({targetRows:[row(.5,.5,'现金'),row(.5,.5,'期货')]}).dataWarnings, [])
})
test('普通细分未配置目标仍提醒', () => {
  const result=calculateHealthScore({targetRows:[row(1,1)],targetDetails:[{category:'美股',allocation:{items:[{name:'VOO',targetRatio:null,currentRatio:1}]}}]})
  assert.ok(result.dataWarnings.some((warning)=>warning.includes('VOO')))
})

test('黄金无需细分目标但大类偏离仍扣分', () => {
  const result = calculateHealthScore({targetRows:[row(.1,.2,'黄金')],targetDetails:[{category:'黄金',allocation:null}]})
  assert.deepEqual(result.dataWarnings, [])
  assert.equal(result.detailDeduction, 0)
  close(result.majorDeduction, 20)
})
