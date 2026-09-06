export const TARGET_CATEGORIES = Object.freeze([
  '美股', 'A股', '港股', '日股', '债基', '黄金', '虚拟币', '期货', '现金',
])

export function normalizeTargetCategory(value) {
  const category = String(value ?? '').trim()
  return category === '债券' ? '债基' : category
}
