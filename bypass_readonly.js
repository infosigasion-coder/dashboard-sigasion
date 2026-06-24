const fs = require('fs');

function bypassReadonly() {
  const file = 'index_github.html';
  let html = fs.readFileSync(file, 'utf8');

  // Find all `var isReadonly = false || (window._actividad && !window._actividad.activa) || (isAdminMode && adminUser && adminUser.rol === 'docente');`
  // and replace them to allow admin to bypass activity inactive status
  html = html.replace(/var isReadonly = false \|\| \(window\._actividad && !window\._actividad\.activa\)/g, "var isReadonly = false");

  fs.writeFileSync(file, html);
  console.log('Readonly bypassed successfully.');
}

bypassReadonly();
