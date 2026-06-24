const content = require('fs').readFileSync('js/main.js', 'utf8');
const match = content.match(/const\s+SCRIPT_URL\s*=[^;]+;/);
if (match) {
  console.log('SCRIPT_URL definition:', match[0]);
} else {
  console.log('SCRIPT_URL not found');
}
