// 资产大类展示顺序与中文映射
// 颜色 / 标签 / 汇率等常量（仅在资产页面使用）

export const categoryOrder = ['股票', '数字货币', '黄金', '现金', '债券', '期货', '其他']

export const categoryColors = {
  股票: '#3b82f6',
  数字货币: '#ec4899',
  黄金: '#eab308',
  现金: '#6b7280',
  债券: '#10b981',
  期货: '#06b6d4',
  其他: '#14b8a6',
}

// 各类资产专属颜色（用于 AssetDetail 页和菜单图标）
export const assetColors = {
  美股: '#3b82f6',
  A股: '#ef4444',
  港股: '#8b5cf6',
  日股: '#ec4899',
  数字货币: '#f97316',
  债基: '#10b981',
  期货: '#06b6d4',
  黄金: '#d4a017',
  现金: '#6b7280',
}

// 汇率（来自 Currency 表）
export const exchangeRates = {
  CNY: 1,
  USD: 6.77325054,
  HKD: 0.8638716,
}

// 市场中文映射
export const marketLabels = {
  US: '美股',
  CN: 'A股',
  HK: '港股',
  JP: '日股',
  GLOBAL: '全球',
}

// 市场颜色
export const marketColors = {
  US: '#3b82f6',
  CN: '#ef4444',
  HK: '#8b5cf6',
  JP: '#f59e0b',
  GLOBAL: '#10b981',
}

// 市场展示顺序
export const marketOrder = ['US', 'CN', 'HK', 'JP', 'GLOBAL']

// 币种颜色
export const currencyColors = {
  CNY: '#ef4444',
  USD: '#3b82f6',
  HKD: '#8b5cf6',
}

// 币种中文名
export const currencyLabels = {
  CNY: '人民币',
  USD: '美元',
  HKD: '港币',
}