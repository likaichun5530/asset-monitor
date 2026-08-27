// 资产归属由 AssetType 决定；Stock + 市场即该证券账户的全部资金。
export function isMarketAccountHolding(holding, market) {
  return holding?.market === market
    && holding.assetType === '股票'
}

export function isUsAccountHolding(holding) {
  return isMarketAccountHolding(holding, 'US')
}

const MARKET_CASH_NAMES = {
  A股: '人民币现金',
  美股: '美元现金',
  港股: '港币现金',
  日股: '日元现金',
}

export function getMarketCashName(category) {
  return MARKET_CASH_NAMES[category] || ''
}
