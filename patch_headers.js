const fs = require('fs');
let content = fs.readFileSync('js/main.js', 'utf8');

// Replace { 'Content-Type': 'application/json' } with a helper call
const headerFix = `(() => { 
  const h = { 'Content-Type': 'application/json' };
  const t = localStorage.getItem('siga_jwt');
  if (t) h['Authorization'] = 'Bearer ' + t;
  return h;
})()`;

content = content.replace(/headers:\s*\{\s*'Content-Type':\s*'application\/json'\s*\}/g, `headers: ${headerFix}`);

fs.writeFileSync('js/main.js', content, 'utf8');
console.log('Patched headers in js/main.js');
