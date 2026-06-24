const fs = require('fs');
let lines = fs.readFileSync('frontend.js', 'utf8').split('\n');
console.log(lines[1].substring(0, 50));
