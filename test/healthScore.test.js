import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateHealthScore } from '../src/utils/healthScore.js'

const issue = (name = '项目') => ({ name, currentRatio: 0.5, targetRatio: 0.2 })
const balanced = (name = '项目') => ({ name, currentRatio: 0.2, targetRatio: 0.2 })

test('账户健康度按大类、细分配置和 IC 保证金规则扣分', () => {
  const result = calculateHealthScore({
    targetRows: [issue('美股'), issue('现金'), balanced('债基'), { isTotal: true }],
    targetDetails: [{ allocation: { items: [issue('VOO'), issue('QQQ'), issue('其他')] } }],
    icMarginUsageRate: 72,
  })
  assert.deepEqual(result, {
    score: 62,
    majorIssues: ['美股（严重，-9）', '现金（严重，-9）'],
    detailIssues: ['VOO（严重，-4）', 'QQQ（严重，-4）'],
    majorIssueCount: 2,
    detailIssueCount: 2,
    majorDeduction: 18,
    detailDeduction: 8,
    marginDeduction: 12,
  })
})

test('账户健康度扣分封顶、最低 5 分，并正确处理危险保证金', () => {
  const result = calculateHealthScore({
    targetRows: Array.from({ length: 10 }, (_, index) => issue(`大类${index}`)),
    targetDetails: [{ allocation: { items: Array.from({ length: 20 }, (_, index) => issue(`细分${index}`)) } }],
    icMarginUsageRate: 76,
  })
  assert.equal(result.majorDeduction, 50)
  assert.equal(result.detailDeduction, 30)
  assert.equal(result.marginDeduction, 30)
  assert.equal(result.score, 5)
})
