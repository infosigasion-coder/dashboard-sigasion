const fs = require('fs');
let lines = fs.readFileSync('js/main.js', 'utf8').split('\n');

for(let i=0; i<lines.length; i++){
  if(lines[i].includes('https://cdn.jsdelivr.net/npm/chart.js')){
    console.log(JSON.stringify(lines[i]));
    console.log(JSON.stringify(lines[i+1]));
  }
}
