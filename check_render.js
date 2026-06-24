const fs = require('fs');
let lines = fs.readFileSync('js/main.js', 'utf8').split('\n');

for(let i=0; i<lines.length; i++) {
  if (lines[i].includes('function renderData(data)')) {
    console.log('Found renderData at line ' + i);
  }
}
