const fs = require('fs');
let html = fs.readFileSync('cf_index.html', 'utf8');

const cut1 = 41802;
const copy1 = html.substring(0, cut1);
const copy2 = html.substring(cut1);

console.log('Copy 1 length:', copy1.length);
console.log('Copy 2 length:', copy2.length);
