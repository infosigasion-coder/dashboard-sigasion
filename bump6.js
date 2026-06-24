const fs = require('fs');
let text = fs.readFileSync('index.html', 'utf8');
text = text.replace(/v=2\.0\.6/g, 'v=2.0.7');
fs.writeFileSync('index.html', text, 'utf8');
