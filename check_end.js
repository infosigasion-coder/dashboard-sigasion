const fs = require('fs');
let html = fs.readFileSync('cf_index.html', 'utf8');
console.log(html.substring(html.length - 2000));
