const fs = require('fs');
let text = fs.readFileSync('index.html', 'utf8');
text = text.replace(/v=2\.0\.4/g, 'v=2.0.5');
fs.writeFileSync('index.html', text, 'utf8');
