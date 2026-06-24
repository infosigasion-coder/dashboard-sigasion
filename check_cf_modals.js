const fs = require('fs');
let html = fs.readFileSync('cf_index.html', 'utf8');
const i1 = html.indexOf('SAGA LOGIN MODAL');
const i2 = html.indexOf('MODAL EGRESOS PUBLICO');
console.log('SAGA at:', i1);
console.log('EGRESOS at:', i2);
