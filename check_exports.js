const fs = require('fs');
const js = fs.readFileSync('js/main.js', 'utf8');

// match top-level function definitions
const regex = /^async function (\w+)|function (\w+)/gm;
let m;
const globals = new Set();
while ((m = regex.exec(js)) !== null) {
  if (m[1]) globals.add(m[1]);
  if (m[2]) globals.add(m[2]);
}

// now let's find the window.* exports at the end
const exportRegex = /window\.(\w+) = (\w+);/g;
let em;
let invalidExports = [];
while ((em = exportRegex.exec(js)) !== null) {
  if (!globals.has(em[2])) {
    invalidExports.push(em[0]);
  }
}
console.log('Invalid exports:', invalidExports);
