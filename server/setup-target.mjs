// 在 Google Sheets 中创建 target 表并填充当前各类资产数据
// 运行方式：cd server && node setup-target.mjs

import { google } from 'googleapis'
import dotenv from 'dotenv'
dotenv.config()

const auth = new google.auth.JWT(
  process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  null,
  process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  ['https://www.googleapis.com/auth/spreadsheets']
)

await auth.authorize()
const sheets = google.sheets({ version: 'v4', auth })
const SPREADSHEET_ID = process.env.SPREADSHEET_ID

// 1. 先读取 Holdings 表，计算各类资产金额（股票按市场拆分）
const holdingsResp = await sheets.spreadsheets.values.get({
  spreadsheetId: SPREADSHEET_ID,
  range: 'Holdings!A:J',
})
const hRows = holdingsResp.data.values || []
const hHeaders = hRows[0]
const colIdx = {}
hHeaders.forEach((h, i) => { colIdx[h] = i })

function toNum(v) {
  if (!v) return 0
  return Number(String(v).replace(/,/g, '')) || 0
}

function stockLabel(market) {
  if (market === 'US') return '美股'
  if (market === 'CN') return 'A股'
  if (market === 'HK') return '港股'
  if (market === 'JP') return '日股'
  return '股票'
}

const catMap = new Map()
let totalCNY = 0
for (let i = 1; i < hRows.length; i++) {
  const row = hRows[i]
  if (!row || !row[colIdx.AssetType]) continue
  let cat = row[colIdx.AssetType]
  if (cat === 'Stock') {
    cat = stockLabel(row[colIdx.Market])
  } else {
    const map = { Crypto: '虚拟币', Gold: '黄金', Cash: '现金', Bond: '债券', Future: '期货' }
    cat = map[cat] || cat
  }
  const mv = toNum(row[colIdx.MarketValueCNY])
  totalCNY += mv
  catMap.set(cat, (catMap.get(cat) || 0) + mv)
}

// 按金额降序
const cats = Array.from(catMap.entries()).sort((a, b) => b[1] - a[1])

// 2. 检查 target 表是否存在，不存在则创建
const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID })
let targetSheetId = null
let targetSheetTitle = 'target'
for (const s of meta.data.sheets) {
  if (String(s.properties.title).toLowerCase() === 'target') {
    targetSheetId = s.properties.sheetId
    targetSheetTitle = s.properties.title
    break
  }
}

if (targetSheetId !== null) {
  console.log('target 表已存在, sheetId:', targetSheetId)
} else {
  try {
    const addResp = await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [{
          addSheet: { properties: { title: 'target' } }
        }]
      }
    })
    targetSheetId = addResp.data.replies[0].addSheet.properties.sheetId
    console.log('已创建 target 表, sheetId:', targetSheetId)
  } catch (e) {
    // 表已存在，重新获取 sheetId
    const meta2 = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID })
    for (const s of meta2.data.sheets) {
      if (String(s.properties.title).toLowerCase() === 'target') {
        targetSheetId = s.properties.sheetId
        break
      }
    }
    console.log('target 表已存在(重新获取), sheetId:', targetSheetId)
  }
}

// 3. 填充数据
// 表头：类别 | 当前金额(人民币) | 当前占比 | 配置目标 | 与目标差值
const headerRow = ['类别', '当前金额(人民币)', '当前占比', '配置目标', '与目标差值']
const dataRows = cats.map(([cat, mv], idx) => {
  // Excel 行号 = idx + 2 (表头是第1行)
  const excelRow = idx + 2
  const ratio = totalCNY ? (mv / totalCNY) : 0
  return [
    cat,
    Math.round(mv * 100) / 100,
    ratio,  // 百分比小数，Google Sheets 会自动格式化
    '',     // 目标比例，留空让用户填
    // 差值公式：=C{row}-D{row}（当前占比 - 目标比例）
    `=C${excelRow}-D${excelRow}`,
  ]
})
// 合计行
const totalRow = ['合计', Math.round(totalCNY * 100) / 100, 1, 1, '']

const allRows = [headerRow, ...dataRows, totalRow]

await sheets.spreadsheets.values.update({
  spreadsheetId: SPREADSHEET_ID,
  range: 'target!A1:E',
  valueInputOption: 'USER_ENTERED',
  requestBody: { values: allRows },
})
console.log('已填充 target 表数据，共', dataRows.length, '个类别')

// 4. 设置条件格式：差值列（E列）绝对值大于 3% 时字体变红
await sheets.spreadsheets.batchUpdate({
  spreadsheetId: SPREADSHEET_ID,
  requestBody: {
    requests: [{
      addConditionalFormatRule: {
        rule: {
          ranges: [{
            sheetId: targetSheetId,
            startColumnIndex: 4, // E列 (0-based)
            endColumnIndex: 5,
            startRowIndex: 1,    // 跳过表头
          }],
          booleanRule: {
            condition: {
              type: 'NUMBER_GREATER',
              values: [{ userEnteredValue: '0.03' }]
            },
            format: {
              textFormat: { foregroundColor: { red: 1, green: 0, blue: 0 } }
            }
          }
        },
        index: 0,
      }
    }, {
      addConditionalFormatRule: {
        rule: {
          ranges: [{
            sheetId: targetSheetId,
            startColumnIndex: 4,
            endColumnIndex: 5,
            startRowIndex: 1,
          }],
          booleanRule: {
            condition: {
              type: 'NUMBER_LESS',
              values: [{ userEnteredValue: '-0.03' }]
            },
            format: {
              textFormat: { foregroundColor: { red: 1, green: 0, blue: 0 } }
            }
          }
        },
        index: 1,
      }
    }]
  }
})
console.log('已设置条件格式：差值绝对值>3%时字体变红')

// 5. 设置百分比格式
await sheets.spreadsheets.batchUpdate({
  spreadsheetId: SPREADSHEET_ID,
  requestBody: {
    requests: [{
      repeatCell: {
        range: {
          sheetId: targetSheetId,
          startColumnIndex: 2, // C列
          endColumnIndex: 5,   // C, D, E列
          startRowIndex: 1,
        },
        cell: {
          userEnteredFormat: {
            numberFormat: { type: 'PERCENT', pattern: '0.00%' }
          }
        },
        fields: 'userEnteredFormat.numberFormat'
      }
    }]
  }
})
console.log('已设置百分比格式')

console.log('\n完成！target 表结构：')
console.log('  A: 类别')
console.log('  B: 当前金额(人民币)')
console.log('  C: 当前占比（公式自动计算）')
console.log('  D: 配置目标（留空待填）')
console.log('  E: 与目标差值（=C-D，>3%或<-3%字体变红）')