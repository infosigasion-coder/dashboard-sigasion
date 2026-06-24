const fs = require('fs');
const js = fs.readFileSync('js/main.js', 'utf8');
const lines = js.split('\n');
let inFn = false;
for (let i=0; i<lines.length; i++) {
  if (lines[i].includes('async function loadConfig()')) inFn = true;
  if (inFn) {
    console.log(lines[i]);
    if (lines[i].includes('} catch (e) {')) break;
  }
}
