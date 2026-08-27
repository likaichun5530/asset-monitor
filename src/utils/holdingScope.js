// 证券市场详情采用账户口径：该市场股票 + 明确归属该市场的现金
export function isMarketAccountHolding(holding, market) {
  return holding?.market === market
    && (holding.assetType === '股票' || holding.assetType === '现金')
}

export function isUsAccountHolding(holding) {
  return isMarketAccountHolding(holding, 'US')
}
