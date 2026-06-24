const https = require('https');
const fs = require('fs');
const path = require('path');

const docId = '1RgaOUmSA1sCaLwkApPNw1gObzOjWAauhxDQflFMkazY';
const sheets = ['Cálculo de Cuota', 'Control de Pagos', 'Pendientes', 'Análisis Comprobantes', 'Historial', 'Egresos', 'Cedula y Nacimiento'];
const outDir = __dirname;

function downloadSheet(sheetName) {
  return new Promise((resolve, reject) => {
    const encodedName = encodeURIComponent(sheetName);
    const url = `https://docs.google.com/spreadsheets/d/${docId}/gviz/tq?tqx=out:csv&sheet=${encodedName}`;
    const outFile = path.join(outDir, `${sheetName.replace(/ /g, '_')}.csv`);
    
    console.log(`Downloading ${sheetName}...`);
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to download ${sheetName}: Status code ${res.statusCode}`));
        return;
      }
      
      const fileStream = fs.createWriteStream(outFile);
      res.pipe(fileStream);
      
      fileStream.on('finish', () => {
        fileStream.close();
        console.log(`Saved ${sheetName} to ${outFile}`);
        resolve();
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

async function run() {
  for (const sheet of sheets) {
    try {
      await downloadSheet(sheet);
    } catch (err) {
      console.error(`Error downloading ${sheet}:`, err.message);
    }
  }
}

run();
