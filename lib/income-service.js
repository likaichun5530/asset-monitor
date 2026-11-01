import crypto from 'node:crypto'
const categories = new Set(['工资','双薪','奋斗','绩效','年奖','绩效奖','奖金','出差','公积金','补贴','车补'])
const fail = (statusCode, message) => { throw Object.assign(new Error(message), { statusCode }) }
const version = rows => crypto.createHash('sha256').update(JSON.stringify(rows)).digest('hex').slice(0,16)
export function incomeEntries(year, rows) {
 const header=rows[0] || [];const end=header.indexOf('合计')
 if (!/^\d{4}$/.test(String(year)) || Number(header[0])!==Number(year) || end<2 || rows[13]?.[0]!=='合计') fail(503,'收入表结构不匹配，禁止写入')
 if(new Set(header.slice(1,end)).size!==end-1) fail(503,'收入分类结构重复，禁止写入')
 const result=[]
 for(let month=1;month<=12;month++) {
  if(rows[month]?.[0]!==`${month}月`) fail(503,'收入月份结构不匹配，禁止写入')
  for(let col=1;col<end;col++) {
   const letter=String.fromCharCode(65+col);const last=String.fromCharCode(64+end)
   const value=rows[month][col] ?? ''
   const writable=categories.has(header[col]) && rows[month][end]===`=SUM(B${month+1}:${last}${month+1})` && rows[13][col]===`=SUM(${letter}2:${letter}13)` && rows[13][end]===`=SUM(${String.fromCharCode(65+end)}2:${String.fromCharCode(65+end)}13)` && (value==='' || typeof value==='number')
   result.push({year:Number(year),month,category:header[col],amount:typeof value==='number'?value:null,writable,rowVersion:version(rows),column:letter})
  }
 }
 return result
}
export function planIncomeWrite(body, rows) {
 const entries=incomeEntries(String(body.year), rows)
 const entry=entries.find(e=>e.month===body.month && e.category===body.category)
 if(!entry) fail(400,'请选择有效年度、月份和分类')
 if(!entry.writable) fail(409,'该年度汇总不是受保护公式，或该金额为公式，仅支持只读')
 if(body.rowVersion!==entry.rowVersion) fail(409,'收入数据已经变化，请刷新后重新操作')
 if(typeof body.amount!=='string' || !/^(0|[1-9]\d{0,8})(\.\d{1,2})?$/.test(body.amount)) fail(400,'金额须为非负人民币金额，最多两位小数')
 return {range:`'${entry.year}'!${entry.column}${entry.month+1}`,values:[[Number(body.amount)]]}
}
