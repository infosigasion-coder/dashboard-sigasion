const fs = require('fs');
let html = fs.readFileSync('cf_index.html', 'utf8');

console.log(html.substring(41802, 41850));
