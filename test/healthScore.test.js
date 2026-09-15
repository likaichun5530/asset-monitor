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
