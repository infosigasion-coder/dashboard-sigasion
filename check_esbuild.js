const fs = require('fs');
let lines = fs.readFileSync('frontend.js', 'utf8').split('\n');
let line2 = lines[1];
console.log('esbuild error character:', line2.substring(67680, 67690));
console.log('Surrounding 100 chars:', line2.substring(67631, 67731));
