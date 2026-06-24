const fs = require('fs');
let worker = fs.readFileSync('worker.js', 'utf8');

// The block to move
const loginBlockRegex = /app\.post\('\/api\/login', async \(c\) => \{[\s\S]+?\}\);\n/;
const loginBlockMatch = worker.match(loginBlockRegex);

if (loginBlockMatch) {
  const loginBlock = loginBlockMatch[0];
  // Remove it from current position
  worker = worker.replace(loginBlock, '');
  
  // Insert it after CORS
  const corsRegex = /app\.use\('\/api\/\*', cors\(\{[\s\S]+?\}\)\);\n/;
  const corsMatch = worker.match(corsRegex);
  
  if (corsMatch) {
    worker = worker.replace(corsMatch[0], corsMatch[0] + '\n' + loginBlock);
    fs.writeFileSync('worker.js', worker);
    console.log('Worker.js route reubicada exitosamente.');
  } else {
    console.log('No se encontro el bloque CORS.');
  }
} else {
  console.log('No se encontro el bloque login.');
}
