const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const badTransitionRegex = /<\/head>\s*<body>/g;
let match;
while ((match = badTransitionRegex.exec(html)) !== null) {
  console.log('Bad transition at index:', match.index);
}
const loginOverlayRegex = /<div class="login-overlay"/g;
while ((match = loginOverlayRegex.exec(html)) !== null) {
  console.log('Login overlay at index:', match.index);
}
