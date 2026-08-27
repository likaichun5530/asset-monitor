// 证券市场详情采用账户口径：该市场股票 + 明确归属该市场的现金
export function isMarketAccountHolding(holding, market) {
  return holding?.market === market
    && (holding.assetType === '股票' || holding.assetType === '现金')
}

export function isUsAccountHolding(holding) {
  return isMarketAccountHolding(holding, 'US')
}

const MARKET_CASH_NAMES = {
  A股: '人民币现金',
  美股: '美元现金',
  港股: '港币现金',
}

export function getMarketCashName(category) {
  return MARKET_CASH_NAMES[category] || ''
}
