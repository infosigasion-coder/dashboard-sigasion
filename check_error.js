const fs = require('fs');
let lines = fs.readFileSync('frontend.js', 'utf8').split('\n');
console.log(lines[0].substring(0, 100));
console.log('Line 1 length:', lines[0].length);
console.log('Line 2 length:', lines[1].length);
console.log(lines[1].substring(lines[1].length - 100));
