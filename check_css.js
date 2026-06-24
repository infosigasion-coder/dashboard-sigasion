const fs = require('fs');
let text = fs.readFileSync('frontend.js', 'utf8');
console.log('Has style tag:', text.includes('<style>'));
console.log('Has main.css link:', text.includes('main.css'));
