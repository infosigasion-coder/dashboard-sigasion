const fs = require('fs');
let js = fs.readFileSync('js/main.js', 'utf8');

const target = `var data = await callScript({action:'getPending', adminEmail:adminUser.email});`;
const replacement = `var data = await callScript({
      action:'getPending', 
      adminEmail:adminUser.email,
      seccion: currentSeccion,
      actividadId: window._actividad ? window._actividad.id : null,
      'a\xC3\xB1o': parseInt(currentAnio),
      'a\ufffdo': parseInt(currentAnio),
      'a?o': parseInt(currentAnio),
      año: parseInt(currentAnio),
      ao: parseInt(currentAnio)
    });`;

js = js.replace(target, replacement);

fs.writeFileSync('js/main.js', js, 'utf8');
console.log('js/main.js pending load patched successfully');
