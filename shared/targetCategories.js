export const TARGET_CATEGORIES = Object.freeze([
  '美股', 'A股', '港股', '日股', '基金', '黄金', '虚拟币', '期货', '现金',
])

export function normalizeTargetCategory(value) {
  const category = String(value ?? '').trim()
  const aliases = {
    Bond: '基金', bond: '基金', 债券: '基金', 债基: '基金',
    Gold: '黄金', gold: '黄金',
    Future: '期货', future: '期货',
    Cash: '现金', cash: '现金',
    Crypto: '虚拟币', crypto: '虚拟币', 数字货币: '虚拟币',
  }
  return aliases[category] || category
}
