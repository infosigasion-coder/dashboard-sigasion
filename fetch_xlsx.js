const https = require('https');
const fs = require('fs');
const path = require('path');

const docId = '1RgaOUmSA1sCaLwkApPNw1gObzOjWAauhxDQflFMkazY';
const url = `https://docs.google.com/spreadsheets/d/${docId}/export?format=xlsx`;
const outFile = path.join(__dirname, 'Festival_2026.xlsx');

function downloadFile(fileUrl, outputPath, redirectCount = 0) {
  if (redirectCount > 5) {
    console.error('Too many redirects');
    return;
  }
  
  https.get(fileUrl, (res) => {
    if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308) {
      console.log(`Redirecting (${res.statusCode}) to: ${res.headers.location}`);
      downloadFile(res.headers.location, outputPath, redirectCount + 1);
    } else if (res.statusCode === 200) {
      const fileStream = fs.createWriteStream(outputPath);
      res.pipe(fileStream);
      fileStream.on('finish', () => {
        fileStream.close();
        console.log('Saved spreadsheet to ' + outputPath);
      });
    } else {
      console.error(`Failed with status code: ${res.statusCode}`);
    }
  }).on('error', (err) => {
    console.error('Error:', err.message);
  });
}

console.log('Downloading spreadsheet as XLSX...');
downloadFile(url, outFile);
