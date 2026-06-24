const https = require('https');

const docId = '1RgaOUmSA1sCaLwkApPNw1gObzOjWAauhxDQflFMkazY';
const url = `https://docs.google.com/spreadsheets/d/${docId}/edit`;

https.get(url, (res) => {
  let html = '';
  res.on('data', (chunk) => { html += chunk; });
  res.on('end', () => {
    // Search for sheet metadata in bootstrap data
    const regex = /"tbl_chart_title"\s*:\s*"([^"]+)"|{"id":\d+,"title":"([^"]+)"/g;
    const matches = new Set();
    let match;
    while ((match = regex.exec(html)) !== null) {
      const name = match[1] || match[2];
      if (name) matches.add(name);
    }
    console.log('Found tabs:', Array.from(matches));
  });
}).on('error', (err) => {
  console.error('Error fetching sheet HTML:', err.message);
});
