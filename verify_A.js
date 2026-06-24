const fs = require('fs');
let lines = fs.readFileSync('js/main.js', 'utf8').split('\n');
let hasErrors = false;
for (let i = 0; i < 50; i++) {
  if (lines[i].includes('¿')) {
    console.log('Line ' + (i+1) + ' has ¿: ' + lines[i]);
    hasErrors = true;
  }
}
if(!hasErrors) console.log('No ¿ found in first 50 lines.');
