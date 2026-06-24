const content = require('fs').readFileSync('js/main.js', 'utf8');
const lines = content.split('\n');
console.log('First 50 lines of js/main.js:');
console.log(lines.slice(0, 50).join('\n'));
