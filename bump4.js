const fs = require('fs');
let text = fs.readFileSync('index.html', 'utf8');
text = text.replace(/v=2\.0\.3/g, 'v=2.0.4');
fs.writeFileSync('index.html', text, 'utf8');
