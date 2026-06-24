const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');
const i1 = html.indexOf('SAGA LOGIN MODAL');
const i2 = html.indexOf('MODAL EGRESOS PUBLICO');
console.log('SAGA LOGIN MODAL at:', i1);
console.log('MODAL EGRESOS PUBLICO at:', i2);
