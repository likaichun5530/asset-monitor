/**
 * Market 表行情刷新脚本（单文件版）
 *
 * Market 表结构保持不变：
 * B = Symbol、C = Price、D = UpdatedAt、E = Source
 *
 * 使用方法：
 * 1. 将本文件完整复制到 Google Sheets 绑定的 Apps Script 项目中。
 * 2. 在“项目设置 -> 脚本属性”中设置 FINNHUB_API_KEY。
 * 3. 手动运行一次 installMarketRefreshTrigger() 并完成授权。
 *
 * 脚本只创建一个每 5 分钟运行的触发器，再根据来源、市场当地时间和
 * 最小刷新间隔决定是否请求行情。美股使用 America/New_York，因此会
 * 自动适配夏令时和冬令时，无需维护两套北京时间。
 */

const MARKET_SHEET_NAME = 'Market'
const MARKET_TRIGGER_HANDLER = 'updateMarket'
const MARKET_TRIGGER_INTERVAL_MINUTES = 5
const MARKET_LAST_RUN_PREFIX = 'MARKET_LAST_RUN_'

// 时间窗口使用各市场的当地时间；前后各留几分钟以容忍定时触发器延迟。
const MARKET_REFRESH_RULES = Object.freeze({
  coinbase: Object.freeze({
    label: '数字货币',
    timeZone: 'UTC',
    intervalMinutes: 5,
    always: true,
  }),
  exchange: Object.freeze({
    label: '汇率',
    timeZone: 'UTC',
    intervalMinutes: 30,
    always: true,
  }),
  finnhub: Object.freeze({
    label: '美股',
    timeZone: 'America/New_York',
    intervalMinutes: 5,
    weekdays: Object.freeze([1, 2, 3, 4, 5]),
    windows: Object.freeze([Object.freeze(['09:25', '16:10'])]),
  }),
  china: Object.freeze({
    label: 'A股',
    timeZone: 'Asia/Shanghai',
    intervalMinutes: 5,
    weekdays: Object.freeze([1, 2, 3, 4, 5]),
    windows: Object.freeze([
      Object.freeze(['09:25', '11:35']),
      Object.freeze(['12:55', '15:05']),
    ]),
  }),
  future: Object.freeze({
    label: '股指期货',
    timeZone: 'Asia/Shanghai',
    intervalMinutes: 5,
    weekdays: Object.freeze([1, 2, 3, 4, 5]),
    windows: Object.freeze([
      Object.freeze(['09:25', '11:35']),
      Object.freeze(['12:55', '15:05']),
    ]),
  }),
  fund: Object.freeze({
    label: '基金净值',
    timeZone: 'Asia/Shanghai',
    intervalMinutes: 60,
    weekdays: Object.freeze([1, 2, 3, 4, 5]),
    windows: Object.freeze([Object.freeze(['18:00', '23:30'])]),
  }),
})

function normalizeMarketSource_(source) {
  return String(source || '').trim().toLowerCase()
}

function timeToMinutes_(value) {
  const parts = String(value || '').split(':')
  return Number(parts[0]) * 60 + Number(parts[1])
}

function isInsideMarketWindow_(now, rule) {
  if (rule.always) return true
  const day = Number(Utilities.formatDate(now, rule.timeZone, 'u'))
  if (rule.weekdays && rule.weekdays.indexOf(day) === -1) return false
  const localTime = Utilities.formatDate(now, rule.timeZone, 'HH:mm')
  const minute = timeToMinutes_(localTime)
  return (rule.windows || []).some(function (window) {
    return minute >= timeToMinutes_(window[0]) && minute <= timeToMinutes_(window[1])
  })
}

function shouldRefreshSource_(source, now, properties, force) {
  const rule = MARKET_REFRESH_RULES[source]
  if (!rule) return false
  if (force) return true
  if (!isInsideMarketWindow_(now, rule)) return false
  const lastRun = Number(properties.getProperty(MARKET_LAST_RUN_PREFIX + source) || 0)
  return !lastRun || now.getTime() - lastRun >= rule.intervalMinutes * 60 * 1000
}

// 定时触发器入口：每 5 分钟检查一次，只刷新当前到期的来源。
function updateMarket() {
  return runMarketUpdate_(false)
}

// 手动强制刷新所有已支持来源，不受交易时段和最小间隔限制。
function refreshAllMarketNow() {
  return runMarketUpdate_(true)
}

function runMarketUpdate_(force) {
  const lock = LockService.getScriptLock()
  if (!lock.tryLock(1000)) {
    Logger.log('Market 刷新仍在运行，本次跳过')
    return { skipped: true, reason: 'locked' }
  }

  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(MARKET_SHEET_NAME)
    if (!sheet) throw new Error('找不到工作表：' + MARKET_SHEET_NAME)
    const lastRow = sheet.getLastRow()
    if (lastRow < 2) return { updated: 0, failed: 0, sources: [] }

    const now = new Date()
    const properties = PropertiesService.getScriptProperties()
    const rows = sheet.getRange(2, 2, lastRow - 1, 4).getValues()
    const sources = []
    rows.forEach(function (row) {
      const source = normalizeMarketSource_(row[3])
      if (row[0] && MARKET_REFRESH_RULES[source] && sources.indexOf(source) === -1) {
        sources.push(source)
      }
    })

    const dueSources = sources.filter(function (source) {
      return shouldRefreshSource_(source, now, properties, force)
    })
    if (!dueSources.length) return { updated: 0, failed: 0, sources: [] }

    const updates = []
    let failed = 0
    rows.forEach(function (row, index) {
      const symbol = String(row[0] || '').trim()
      const source = normalizeMarketSource_(row[3])
      if (!symbol || dueSources.indexOf(source) === -1) return
      try {
        updates.push({
          rowNumber: index + 2,
          price: getMarketPrice_(source, symbol),
        })
      } catch (error) {
        failed += 1
        Logger.log(
          'Market 刷新失败 [' + source + '/' + symbol + ']：' +
          String(error.message || error)
        )
      }
    })

    // 只写成功行的 C、D 列，不覆盖其他来源、公式或人工维护的单元格。
    updates.forEach(function (item) {
      sheet.getRange(item.rowNumber, 3, 1, 2).setValues([[item.price, now]])
    })
    if (updates.length) SpreadsheetApp.flush()

    // 记录“尝试时间”，即使某个供应商临时失败，也不会每 5 分钟反复轰炸接口。
    dueSources.forEach(function (source) {
      properties.setProperty(MARKET_LAST_RUN_PREFIX + source, String(now.getTime()))
    })

    const result = { updated: updates.length, failed: failed, sources: dueSources }
    Logger.log(JSON.stringify(result))
    return result
  } finally {
    lock.releaseLock()
  }
}

function getMarketPrice_(source, symbol) {
  if (source === 'coinbase') return getCoinbasePrice_(symbol)
  if (source === 'finnhub') return getFinnhubPrice_(symbol)
  if (source === 'exchange') return getExchangeRate_(symbol)
  if (source === 'china') return getTencentPrice_(symbol)
  if (source === 'future') return getFuturePrice_(symbol)
  if (source === 'fund') return getFundPrice_(symbol)
  throw new Error('不支持的行情来源：' + source)
}

function fetchText_(provider, url, options) {
  const requestOptions = Object.assign({ muteHttpExceptions: true }, options || {})
  const response = UrlFetchApp.fetch(url, requestOptions)
  const status = response.getResponseCode()
  if (status !== 200) throw new Error(provider + ' HTTP ' + status)
  return response.getContentText()
}

function parseJson_(provider, text) {
  try {
    return JSON.parse(text)
  } catch (error) {
    throw new Error(provider + ' 返回了无效 JSON')
  }
}

function validPrice_(provider, value) {
  const price = Number(value)
  if (!isFinite(price) || price <= 0) throw new Error(provider + ' 未返回有效价格')
  return price
}

function getCoinbasePrice_(symbol) {
  let pair = String(symbol || '').trim().toUpperCase().replace('/', '-')
  if (pair.indexOf('-') === -1) pair += '-USD'
  if (!/^[A-Z0-9]+-[A-Z0-9]+$/.test(pair)) throw new Error('Coinbase Symbol 格式无效')
  const url = 'https://api.coinbase.com/v2/prices/' + encodeURIComponent(pair) + '/spot'
  const json = parseJson_('Coinbase', fetchText_('Coinbase', url))
  return validPrice_('Coinbase', json && json.data && json.data.amount)
}

function getFinnhubPrice_(symbol) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('FINNHUB_API_KEY')
  if (!apiKey) throw new Error('未配置 Script Property：FINNHUB_API_KEY')
  const code = String(symbol || '').trim().toUpperCase()
  if (!code) throw new Error('Finnhub Symbol 不能为空')
  const url = 'https://finnhub.io/api/v1/quote?symbol=' + encodeURIComponent(code) +
    '&token=' + encodeURIComponent(apiKey)
  const json = parseJson_('Finnhub', fetchText_('Finnhub', url))
  if (json && json.error) throw new Error('Finnhub：' + String(json.error).slice(0, 160))
  return validPrice_('Finnhub', json && json.c)
}

function getExchangeRate_(symbol) {
  const match = String(symbol || '').trim().toUpperCase().match(/^([A-Z]{3})\/([A-Z]{3})$/)
  if (!match) throw new Error('汇率 Symbol 必须使用 USD/CNY 格式')
  const from = match[1]
  const to = match[2]
  const url = 'https://api.frankfurter.dev/v1/latest?base=' + encodeURIComponent(from) +
    '&symbols=' + encodeURIComponent(to)
  const json = parseJson_('Frankfurter', fetchText_('Frankfurter', url))
  return validPrice_('Frankfurter', json && json.rates && json.rates[to])
}

function getTencentPrice_(symbol) {
  const code = String(symbol || '').trim().toLowerCase()
  if (!/^(?:sh|sz|bj)\d{6}$/.test(code)) throw new Error('腾讯行情 Symbol 格式无效')
  const text = fetchText_('腾讯行情', 'https://qt.gtimg.cn/q=' + encodeURIComponent(code))
  const fields = text.split('~')
  if (fields.length < 4) throw new Error('腾讯行情返回字段不完整')
  return validPrice_('腾讯行情', fields[3])
}

function getFuturePrice_(symbol) {
  const code = String(symbol || '').trim().toUpperCase()
  if (!/^[A-Z]{1,4}\d{3,4}$/.test(code)) throw new Error('期货 Symbol 格式无效')
  const text = fetchText_(
    '新浪期货',
    'https://hq.sinajs.cn/list=CFF_RE_' + encodeURIComponent(code),
    { headers: { Referer: 'https://finance.sina.com.cn' } }
  )
  const match = text.match(/"([^"]+)"/)
  if (!match) throw new Error('新浪期货未返回行情')
  const fields = match[1].split(',')
  if (fields.length < 4) throw new Error('新浪期货返回字段不完整')
  return validPrice_('新浪期货', fields[3])
}

function getFundPrice_(symbol) {
  const code = String(symbol || '').trim()
  if (!/^\d{6}$/.test(code)) throw new Error('基金代码必须是 6 位数字')
  const url = 'https://api.fund.eastmoney.com/f10/lsjz?fundCode=' + encodeURIComponent(code) +
    '&pageIndex=1&pageSize=1'
  const text = fetchText_('东方财富基金', url, {
    headers: {
      Referer: 'https://fund.eastmoney.com/',
      'User-Agent': 'Mozilla/5.0',
    },
  })
  const json = parseJson_('东方财富基金', text)
  const rows = json && json.Data && json.Data.LSJZList
  if (!rows || !rows.length) throw new Error('东方财富基金未返回净值')
  return validPrice_('东方财富基金', rows[0].DWJZ)
}

// 首次启用或调整调度后运行一次：删除旧触发器并创建唯一的 5 分钟触发器。
function installMarketRefreshTrigger() {
  removeMarketRefreshTriggers()
  ScriptApp.newTrigger(MARKET_TRIGGER_HANDLER)
    .timeBased()
    .everyMinutes(MARKET_TRIGGER_INTERVAL_MINUTES)
    .create()
  return 'Market 自动刷新触发器已安装'
}

function removeMarketRefreshTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (trigger.getHandlerFunction() === MARKET_TRIGGER_HANDLER) {
      ScriptApp.deleteTrigger(trigger)
    }
  })
}

function getMarketRefreshStatus() {
  const properties = PropertiesService.getScriptProperties()
  return Object.keys(MARKET_REFRESH_RULES).map(function (source) {
    const timestamp = Number(properties.getProperty(MARKET_LAST_RUN_PREFIX + source) || 0)
    return {
      source: source,
      label: MARKET_REFRESH_RULES[source].label,
      lastRunAt: timestamp ? new Date(timestamp).toISOString() : null,
    }
  })
}
