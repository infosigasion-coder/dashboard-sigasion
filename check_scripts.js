const content = require('fs').readFileSync('index.html', 'utf8');
const match = content.match(/<script[^>]+src="[^"]+"[^>]*>/g);
console.log('Scripts in index.html:', match);
