const fs = require('fs');
const js = fs.readFileSync('js/main.js', 'utf8');
const lines = js.split('\n');
let inFn = false;
let braceCount = 0;
for (let i=0; i<lines.length; i++) {
  if (lines[i].includes('async function loadData()')) {
     inFn = true;
     braceCount = 1;
     console.log(lines[i]);
     continue;
  }
  if (inFn) {
    console.log(lines[i]);
    if (lines[i].includes('{')) braceCount += (lines[i].match(/\{/g) || []).length;
    if (lines[i].includes('}')) braceCount -= (lines[i].match(/\}/g) || []).length;
    if (braceCount <= 0) break;
  }
}
