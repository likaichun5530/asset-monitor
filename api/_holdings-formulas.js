import { headerIndex } from './_holdings-schema.js'

export function columnLetter(index) {
  let value = index + 1
  let result = ''
  while (value > 0) {
    value -= 1
    result = String.fromCharCode(65 + (value % 26)) + result
    value = Math.floor(value / 26)
  }
  return result
}

export function computedFormulas(headers, rowNumber, input) {
  const cell = (name) => `${columnLetter(headerIndex(headers, name))}${rowNumber}`
  const priceCell = cell('Price')
  const quantityCell = cell('Quantity')
  const originalCell = cell('MarketValue')
  const symbolCell = cell('Symbol')
  const isTracked = input.valuationMode === 'tracked'
  const hasAutomaticPrice = isTracked || input.valuationMode === 'formula'

  return {
    Price: hasAutomaticPrice ? `=IFERROR(INDEX(Market!$C:$C,MATCH(${symbolCell},Market!$B:$B,0)),"")` : '',
    MarketValue: isTracked ? `=IF(OR(${quantityCell}="",${priceCell}=""),"",${quantityCell}*${priceCell})` : input.originalValue,
    MarketValueCNY: input.currency === 'CNY'
      ? `=IF(${originalCell}="","",${originalCell})`
      : `=IF(${originalCell}="","",${originalCell}*Market!$C$${input.fxRow.rowNumber})`,
  }
}

export function buildRow(headers, rowNumber, input, baseRow = []) {
  const row = Array.from({ length: headers.length }, (_, index) => baseRow[index] ?? '')
  const set = (name, value) => { row[headerIndex(headers, name)] = value }
  set('AssetType', input.config.assetType)
  set('Market', input.market)
  set('Account', input.account)
  set('Symbol', input.symbol)
  set('Name', input.name)
  set('Currency', input.currency)
  set('Quantity', input.quantity)
  const formulas = computedFormulas(headers, rowNumber, input)
  set('Price', formulas.Price)
  set('MarketValue', formulas.MarketValue)
  set('MarketValueCNY', formulas.MarketValueCNY)
  return row
}
