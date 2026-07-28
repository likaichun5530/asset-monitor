// 演示模式固定数据（实盘数据的 1/10，永不更新）
export const demoHoldings = [
  { assetType: '股票', market: 'US', account: 'IBKR', symbol: 'BRK.B', name: '伯克希尔', currency: 'USD', quantity: 3, price: 49.091, marketValue: 1472.730, marketValueCNY: 9975.169 },
  { assetType: '股票', market: 'US', account: 'IBKR', symbol: 'META', name: 'Meta', currency: 'USD', quantity: 1.9, price: 64.601, marketValue: 1227.419, marketValueCNY: 8313.616 },
  { assetType: '股票', market: 'US', account: 'IBKR', symbol: 'V', name: 'Visa', currency: 'USD', quantity: 3, price: 35.856, marketValue: 1075.680, marketValueCNY: 7285.850 },
  { assetType: '股票', market: 'US', account: 'IBKR', symbol: 'GEV', name: 'GE Vernova', currency: 'USD', quantity: 1.3, price: 105.784, marketValue: 1375.192, marketValueCNY: 9314.520 },
  { assetType: '股票', market: 'US', account: 'IBKR', symbol: 'GOOGL', name: '谷歌A', currency: 'USD', quantity: 4, price: 34.677, marketValue: 1387.080, marketValueCNY: 9395.040 },
  { assetType: '股票', market: 'US', account: 'IBKR', symbol: 'ETN', name: '伊顿公司', currency: 'USD', quantity: 3, price: 39.999, marketValue: 1199.970, marketValueCNY: 8127.697 },
  { assetType: '股票', market: 'US', account: 'IBKR', symbol: 'MSFT', name: '微软', currency: 'USD', quantity: 2.7, price: 39.382, marketValue: 1063.314, marketValueCNY: 7202.092 },
  { assetType: '股票', market: 'CN', account: 'Snowball', symbol: '000333', name: '美的集团', currency: 'CNY', quantity: 90, price: 8.43, marketValue: 7587, marketValueCNY: 7587 },
  { assetType: '股票', market: 'CN', account: 'Snowball', symbol: '600036', name: '招商银行', currency: 'CNY', quantity: 190, price: 3.891, marketValue: 7392.9, marketValueCNY: 7392.9 },
  { assetType: '股票', market: 'CN', account: 'Snowball', symbol: '600900', name: '长江电力', currency: 'CNY', quantity: 160, price: 2.898, marketValue: 4636.8, marketValueCNY: 4636.8 },
  { assetType: '股票', market: 'CN', account: 'Snowball', symbol: '600941', name: '中国移动', currency: 'CNY', quantity: 40, price: 9.58, marketValue: 3832, marketValueCNY: 3832 },
  { assetType: '股票', market: 'HK', account: 'Snowball', symbol: '00700', name: '腾讯控股', currency: 'HKD', quantity: 10, price: 47.78, marketValue: 4778, marketValueCNY: 4127.579 },
  { assetType: '股票', market: 'HK', account: 'Snowball', symbol: '09992', name: '泡泡玛特', currency: 'HKD', quantity: 20, price: 16.4, marketValue: 3280, marketValueCNY: 2833.499 },
  { assetType: '股票', market: 'JP', account: 'Snowball', symbol: '513880', name: '日经225ETF华安', currency: 'CNY', quantity: 4480, price: 0.2006, marketValue: 8986.88, marketValueCNY: 8986.88 },
  { assetType: '数字货币', market: 'GLOBAL', account: 'Binance', symbol: 'ETH', name: 'ETH', currency: 'USD', quantity: 0.0376762, price: 188.5875, marketValue: 71.085, marketValueCNY: 481.257 },
  { assetType: '数字货币', market: 'GLOBAL', account: 'Binance', symbol: 'BNB', name: 'BNB', currency: 'USD', quantity: 0.01302, price: 57.056, marketValue: 7.429, marketValueCNY: 50.316 },
  { assetType: '数字货币', market: 'GLOBAL', account: 'Binance', symbol: 'USDT', name: 'USDT', currency: 'USD', quantity: 1155, price: 0.0998765, marketValue: 1153.573, marketValueCNY: 7813.443 },
  { assetType: '黄金', market: 'GLOBAL', account: 'Snowball', symbol: '518850', name: '黄金ETF华夏', currency: 'CNY', quantity: 2300, price: 0.8399, marketValue: 19317.7, marketValueCNY: 19317.7 },
  { assetType: '期货', market: 'CN', account: 'Hithink', symbol: 'IC2612', name: '中证500股指期货', currency: 'CNY', quantity: 0.1, price: 712.48, marketValue: 21468, marketValueCNY: 21468 },
  { assetType: '债券', market: 'CN', account: 'Snowball', symbol: '-', name: '债基', currency: 'CNY', quantity: null, price: null, marketValue: 46496.3, marketValueCNY: 46496.3 },
  { assetType: '现金', market: 'CN', account: 'Card', symbol: '-', name: '人民币现金', currency: 'CNY', quantity: null, price: null, marketValue: 145.4, marketValueCNY: 145.4 },
  { assetType: '现金', market: 'CN', account: 'Wechat', symbol: '-', name: '人民币现金', currency: 'CNY', quantity: null, price: null, marketValue: 10, marketValueCNY: 10 },
  { assetType: '现金', market: 'CN', account: 'Alipay', symbol: '-', name: '人民币现金', currency: 'CNY', quantity: null, price: null, marketValue: 805.9, marketValueCNY: 805.9 },
  { assetType: '现金', market: 'CN', account: 'Cash', symbol: '-', name: '人民币现金', currency: 'CNY', quantity: null, price: null, marketValue: 71800, marketValueCNY: 71800 },
  { assetType: '现金', market: 'CN', account: 'Snowball', symbol: '-', name: '人民币现金', currency: 'CNY', quantity: null, price: null, marketValue: 519.211, marketValueCNY: 519.211 },
  { assetType: '现金', market: 'US', account: 'IBKR', symbol: '-', name: '美元现金', currency: 'USD', quantity: null, price: null, marketValue: 17, marketValueCNY: 115.145 },
  { assetType: '现金', market: 'HK', account: 'Card', symbol: '-', name: '港币现金', currency: 'HKD', quantity: null, price: null, marketValue: 1000, marketValueCNY: 863.872 },
]

export const demoHistory = [
  { date: '2024-07-01', total: 186975.3, note: '初始记录' },
  { date: '2024-09-21', total: 292104.6 },
  { date: '2024-12-01', total: 496809.8 },
  { date: '2025-07-15', total: 401230.5 },
  { date: '2025-10-11', total: 610558.7 },
  { date: '2025-11-01', total: 514528.7 },
  { date: '2025-12-15', total: 710558.7 },
  { date: '2026-04-11', total: 610549.7 },
  { date: '2026-05-01', total: 418304.4 },
  { date: '2026-06-01', total: 525100.2 },
  { date: '2026-07-15', total: 543200.0 },
  { date: '2026-07-16', total: 538100.5 },
  { date: '2026-07-20', total: 541200.0 },
  { date: '2026-07-25', total: 561300.8 },
  { date: '2026-07-26', total: 558900.3 },
  { date: '2026-07-27', total: 562100.0 },
  { date: '2026-07-28', total: 560400.0 },
]

export const demoPeakValue = 710558.7 
export const demoPeakDate = '2025-12-15'

// 演示模式配置目标（固定，与实盘逻辑一致）
export const demoTarget = [
  { category: '债基', marketValue: 46496.3, currentRatio: 0.1352, targetRatio: 0.15, diff: -0.0148, isTotal: false },
  { category: '现金', marketValue: 74259.43, currentRatio: 0.2159, targetRatio: 0.05, diff: 0.1659, isTotal: false },
  { category: '美股', marketValue: 93032.42, currentRatio: 0.2704, targetRatio: 0.25, diff: 0.0204, isTotal: false },
  { category: 'A股', marketValue: 23448.7, currentRatio: 0.0682, targetRatio: 0.10, diff: -0.0318, isTotal: false },
  { category: '港股', marketValue: 6961.08, currentRatio: 0.0202, targetRatio: 0.05, diff: -0.0298, isTotal: false },
  { category: '日股', marketValue: 8986.88, currentRatio: 0.0261, targetRatio: 0.05, diff: -0.0239, isTotal: false },
  { category: '数字货币', marketValue: 49919.73, currentRatio: 0.1451, targetRatio: 0.15, diff: -0.0049, isTotal: false },
  { category: '黄金', marketValue: 19317.7, currentRatio: 0.0561, targetRatio: 0.10, diff: -0.0439, isTotal: false },
  { category: '期货', marketValue: 21468, currentRatio: 0.0624, targetRatio: 0.10, diff: -0.0376, isTotal: false },
  { category: '合计', marketValue: 343890.24, currentRatio: 1, targetRatio: 1, diff: null, isTotal: true },
]
