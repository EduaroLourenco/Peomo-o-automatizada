const ExcelJS = require('exceljs');

async function readMLSpreadsheet(filePath) {
  console.log(`\n--- Reading ${filePath.split('/').pop()} ---`);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const worksheet = workbook.worksheets[0]; // first sheet
  for (let i = 10; i <= 30; i++) {
    const row = worksheet.getRow(i).values;
    if (row && row.length > 0) {
      // Just print strings to avoid [object Object] clutter
      const strValues = row.slice(1).map(v => typeof v === 'object' ? JSON.stringify(v) : v);
      console.log(`Row ${i}:`, strValues.join(' | '));
    } else {
      console.log(`Row ${i}: [Empty]`);
    }
  }
}

async function main() {
  await readMLSpreadsheet('c:/Users/dudu4/Downloads/promoção mercado livre/9.9.xlsx');
}

main().catch(console.error);
