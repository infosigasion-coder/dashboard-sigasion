const fs = require('fs');
let text = fs.readFileSync('js/main.js', 'utf8');
let match = text.match(/function showComprobante[\s\S]*?\}\s*\n/);
if (match) console.log(match[0]);
