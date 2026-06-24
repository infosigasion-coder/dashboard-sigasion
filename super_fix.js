const fs = require('fs');
let html = fs.readFileSync('cf_index.html', 'utf8');

const i1 = html.indexOf('</head>');
const i2 = html.indexOf('</head>', i1 + 1);

const head = html.substring(0, i1 + '</head>'.length);
const body = html.substring(i2 + '</head>'.length);

const finalHtml = head + body;

fs.writeFileSync('public/index.html', finalHtml);
fs.writeFileSync('index.html', finalHtml);
console.log('Fixed completely. Final length:', finalHtml.length);
