// 持仓明细数据（来自 Google Sheets 的 Holdings 表）
// 字段说明：
//  - assetType: 资产大类（Stock / Crypto / Gold / Cash / Bond / Future）
//  - market: 市场（US / CN / HK / JP / GLOBAL）
//  - account: 账户/平台（IBKR / Snowball / Binance / Card / Wechat / Alipay / Cash / Hithink）
//  - symbol: 代码
//  - name: 名称
//  - currency: 计价币种（CNY / USD / HKD）
//  - quantity: 持仓数量（现金类为 null）
//  - price: 单价（现金类为 null）
//  - marketValue: 原币市值
//  - marketValueCNY: 人民币市值

export const holdings = [
  // ===== 美股 =====
  { assetType: '股票', market: 'US', account: 'IBKR', symbol: 'NVDA', name: '英伟达', currency: 'USD', quantity: 122, price: 202.81, marketValue: 24742.82, marketValueCNY: 167589.32 },
  { assetType: '股票', market: 'US', account: 'IBKR', symbol: 'BRK.B', name: '伯克希尔', currency: 'USD', quantity: 30, price: 490.91, marketValue: 14727.30, marketValueCNY: 99751.69 },
  { assetType: '股票', market: 'US', account: 'IBKR', symbol: 'META', name: 'Meta', currency: 'USD', quantity: 19, price: 646.01, marketValue: 12274.19, marketValueCNY: 83136.16 },
  { assetType: '股票', market: 'US', account: 'IBKR', symbol: 'V', name: 'Visa', currency: 'USD', quantity: 30, price: 358.56, marketValue: 10756.80, marketValueCNY: 72858.50 },
  { assetType: '股票', market: 'US', account: 'IBKR', symbol: 'GEV', name: 'GE Vernova', currency: 'USD', quantity: 13, price: 1057.84, marketValue: 13751.92, marketValueCNY: 93145.20 },
  { assetType: '股票', market: 'US', account: 'IBKR', symbol: 'GOOGL', name: '谷歌A', currency: 'USD', quantity: 40, price: 346.77, marketValue: 13870.80, marketValueCNY: 93950.40 },
  { assetType: '股票', market: 'US', account: 'IBKR', symbol: 'ETN', name: '伊顿公司', currency: 'USD', quantity: 30, price: 399.99, marketValue: 11999.70, marketValueCNY: 81276.97 },
  { assetType: '股票', market: 'US', account: 'IBKR', symbol: 'MU', name: '美光科技', currency: 'USD', quantity: 20, price: 848.95, marketValue: 16979.00, marketValueCNY: 115003.02 },
  { assetType: '股票', market: 'US', account: 'IBKR', symbol: 'MSFT', name: '微软', currency: 'USD', quantity: 27, price: 393.82, marketValue: 10633.14, marketValueCNY: 72020.92 },

  // ===== A股 =====
  { assetType: '股票', market: 'CN', account: 'Snowball', symbol: '000333', name: '美的集团', currency: 'CNY', quantity: 900, price: 84.3, marketValue: 75870, marketValueCNY: 75870 },
  { assetType: '股票', market: 'CN', account: 'Snowball', symbol: '600036', name: '招商银行', currency: 'CNY', quantity: 1900, price: 38.91, marketValue: 73929, marketValueCNY: 73929 },
  { assetType: '股票', market: 'CN', account: 'Snowball', symbol: '600900', name: '长江电力', currency: 'CNY', quantity: 1600, price: 28.98, marketValue: 46368, marketValueCNY: 46368 },
  { assetType: '股票', market: 'CN', account: 'Snowball', symbol: '600941', name: '中国移动', currency: 'CNY', quantity: 400, price: 95.8, marketValue: 38320, marketValueCNY: 38320 },

  // ===== 港股 =====
  { assetType: '股票', market: 'HK', account: 'Snowball', symbol: '00700', name: '腾讯控股', currency: 'HKD', quantity: 100, price: 477.8, marketValue: 47780, marketValueCNY: 41275.79 },
  { assetType: '股票', market: 'HK', account: 'Snowball', symbol: '09992', name: '泡泡玛特', currency: 'HKD', quantity: 200, price: 164, marketValue: 32800, marketValueCNY: 28334.99 },

  // ===== 日股 =====
  { assetType: '股票', market: 'JP', account: 'Snowball', symbol: '513880', name: '日经225ETF华安', currency: 'CNY', quantity: 44800, price: 2.006, marketValue: 89868.8, marketValueCNY: 89868.8 },

  // ===== 数字货币 =====
  { assetType: '数字货币', market: 'GLOBAL', account: 'Binance', symbol: 'BTC', name: 'BTC', currency: 'USD', quantity: 0.94742797, price: 64786.715, marketValue: 61387.15, marketValueCNY: 415747.17 },
  { assetType: '数字货币', market: 'GLOBAL', account: 'Binance', symbol: 'ETH', name: 'ETH', currency: 'USD', quantity: 0.376762, price: 1885.875, marketValue: 710.85, marketValueCNY: 4812.57 },
  { assetType: '数字货币', market: 'GLOBAL', account: 'Binance', symbol: 'BNB', name: 'BNB', currency: 'USD', quantity: 0.1302, price: 570.56, marketValue: 74.29, marketValueCNY: 503.16 },
  { assetType: '数字货币', market: 'GLOBAL', account: 'Binance', symbol: 'USDT', name: 'USDT', currency: 'USD', quantity: 11550, price: 0.998765, marketValue: 11535.73, marketValueCNY: 78134.43 },

  // ===== 黄金 =====
  { assetType: '黄金', market: 'GLOBAL', account: 'Snowball', symbol: '518850', name: '黄金ETF华夏', currency: 'CNY', quantity: 23000, price: 8.399, marketValue: 193177, marketValueCNY: 193177 },

  // ===== 期货 =====
  { assetType: '期货', market: 'CN', account: 'Hithink', symbol: 'IC2612', name: '中证500股指期货', currency: 'CNY', quantity: 1, price: 7124.8, marketValue: 214680, marketValueCNY: 214680 },

  // ===== 债券 =====
  { assetType: '债券', market: 'CN', account: 'Snowball', symbol: '-', name: '债基', currency: 'CNY', quantity: null, price: null, marketValue: 464963, marketValueCNY: 464963 },

  // ===== 现金 =====
  { assetType: '现金', market: 'CN', account: 'Card', symbol: '-', name: '人民币现金', currency: 'CNY', quantity: null, price: null, marketValue: 1454, marketValueCNY: 1454 },
  { assetType: '现金', market: 'CN', account: 'Wechat', symbol: '-', name: '人民币现金', currency: 'CNY', quantity: null, price: null, marketValue: 100, marketValueCNY: 100 },
  { assetType: '现金', market: 'CN', account: 'Alipay', symbol: '-', name: '人民币现金', currency: 'CNY', quantity: null, price: null, marketValue: 8059, marketValueCNY: 8059 },
  { assetType: '现金', market: 'CN', account: 'Cash', symbol: '-', name: '人民币现金', currency: 'CNY', quantity: null, price: null, marketValue: 718000, marketValueCNY: 718000 },
  { assetType: '现金', market: 'CN', account: 'Snowball', symbol: '-', name: '人民币现金', currency: 'CNY', quantity: null, price: null, marketValue: 5192.11, marketValueCNY: 5192.11 },
  { assetType: '现金', market: 'US', account: 'IBKR', symbol: '-', name: '美元现金', currency: 'USD', quantity: null, price: null, marketValue: 170, marketValueCNY: 1151.45 },
  { assetType: '现金', market: 'HK', account: 'Card', symbol: '-', name: '港币现金', currency: 'HKD', quantity: null, price: null, marketValue: 10000, marketValueCNY: 8638.72 },
]

// 资产大类展示顺序与中文映射
export const categoryOrder = ['股票', '数字货币', '黄金', '现金', '债券', '期货', '其他']

export const categoryColors = {
  股票: '#3b82f6',
  数字货币: '#8b5cf6',
  黄金: '#f59e0b',
  现金: '#6b7280',
  债券: '#10b981',
  期货: '#ef4444',
  其他: '#14b8a6',
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
