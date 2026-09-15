import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateHealthScore } from '../src/utils/healthScore.js'

const issue = (name = '项目') => ({ name, currentRatio: 0.5, targetRatio: 0.2 })
const balanced = (name = '项目') => ({ name, currentRatio: 0.2, targetRatio: 0.2 })

test('账户健康度按大类、细分配置和 IC 保证金规则扣分', () => {
  const result = calculateHealthScore({
    targetRows: [issue('美股'), issue('现金'), balanced('基金'), { isTotal: true }],
    targetDetails: [{ category: '美股', allocation: { items: [issue('VOO'), issue('QQQ'), issue('其他')] } }],
    icMarginUsageRate: 72,
  })
  assert.deepEqual({ ...result, detailDeduction: Number(result.detailDeduction.toFixed(2)) }, {
    score: 76,
    majorIssues: ['美股（严重，-10）', '现金（严重，-10）'],
    detailIssues: ['美股 · VOO（严重，-1.2）', '美股 · QQQ（严重，-1.2）'],
    majorIssueCount: 2,
    detailIssueCount: 2,
    majorDeduction: 20,
    detailDeduction: 2.4,
    marginDeduction: 2,
  })
})

test('账户健康度扣分封顶、最低 5 分，并正确处理危险保证金', () => {
  const result = calculateHealthScore({
    targetRows: Array.from({ length: 10 }, (_, index) => issue(`大类${index}`)),
    targetDetails: [{ category: '大类0', allocation: { items: Array.from({ length: 30 }, (_, index) => issue(`细分${index}`)) } }],
    icMarginUsageRate: 80,
  })
  assert.equal(result.majorDeduction, 50)
  assert.equal(result.detailDeduction, 30)
  assert.equal(result.marginDeduction, 15)
  assert.equal(result.score, 5)
})
