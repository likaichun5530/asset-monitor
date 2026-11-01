// Current source labels, with historical aliases retained for private snapshots.
export const incomeCategoryNames = { 工资:'工资', 双薪:'奋斗', 奋斗:'奋斗', '双薪/奋斗':'奋斗', 年奖:'绩效', 绩效奖:'绩效', 绩效:'绩效', '年奖/绩效奖':'绩效', 奖金:'奖金', 出差:'出差', 公积金:'公积金', 提取公积金:'公积金', 车补:'补贴', 补贴:'补贴', '车补/补贴':'补贴' }
export const incomeCategoryName = (name, column) => incomeCategoryNames[name] || (String(name).includes('\ufffd') ? `原表分类（${column}列）` : String(name))
