const fs = require('fs');
let lines = fs.readFileSync('frontend.js', 'utf8').split('\n');
let line = lines[1];
console.log('Line 2 length:', line.length);
console.log(line.substring(67600, 67700));
