const fs = require('fs');
let html = fs.readFileSync('public/index.html', 'utf8');

// Add a cache-buster to main.js and main.css
html = html.replace(/src='\.\/js\/main\.js'/g, "src='./js/main.js?v=" + Date.now() + "'");
html = html.replace(/href='\.\/css\/main\.css'/g, "href='./css/main.css?v=" + Date.now() + "'");

fs.writeFileSync('public/index.html', html, 'utf8');
console.log('Added cache buster');
