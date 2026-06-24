const fs = require('fs');
const js = fs.readFileSync('js/main.js', 'utf8');

const regex = /^\s*(?:async\s+)?function\s+(\w+)/gm;
let m;
const globals = new Set();
while ((m = regex.exec(js)) !== null) {
  globals.add(m[1]);
}

const exportRegex = /^window\.(\w+)\s*=\s*(\w+);/gm;
let em;
let invalidExports = [];
while ((em = exportRegex.exec(js)) !== null) {
  if (em[1] === em[2] && !globals.has(em[2])) {
    invalidExports.push(em[0]);
  }
}
console.log('Invalid exports:', invalidExports);
