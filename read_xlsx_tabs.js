const XLSX = require('xlsx');
const path = require('path');

const workbook = XLSX.readFile(path.join(__dirname, 'Festival_2026.xlsx'));
console.log('Sheets in workbook:', workbook.SheetNames);

// Print the first few rows of the sheet "Cedula y Nacimiento"
const targetSheetName = 'Cedula y Nacimiento';
const sheet = workbook.Sheets[targetSheetName];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

console.log(`\nFirst 20 rows of sheet "${targetSheetName}":`);
data.slice(0, 20).forEach((row, i) => {
  console.log(`Row ${i + 1}:`, JSON.stringify(row));
});
