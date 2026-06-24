const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');
console.log('--- Right before 41802 ---');
console.log(html.substring(41700, 41802));
console.log('--- At 41802 ---');
console.log(html.substring(41802, 41900));
