// 美股详情采用账户口径：美股股票 + 明确归属 US 市场的现金
export function isUsAccountHolding(holding) {
  return holding?.market === 'US'
    && (holding.assetType === '股票' || holding.assetType === '现金')
}
