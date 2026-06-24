const fs = require('fs');

// Patch Frontend (index_github.html and index.html)
function patchHtml(filename) {
  if (!fs.existsSync(filename)) return;
  let html = fs.readFileSync(filename, 'utf8');

  // Change raw selects to wrapped selects with labels
  const oldSeccion = '<select id="sagaSeccionSelect" onchange="changeSeccion(this.value)" class="saga-select">';
  const newSeccion = '<div style="display:flex; flex-direction:column; gap:2px;"><label style="font-size:10px; color:rgba(255,255,255,0.7); margin-left:12px;">Secci\u00F3n</label><select id="sagaSeccionSelect" onchange="changeSeccion(this.value)" class="saga-select">';
  
  const oldAnio = '<select id="sagaAnioSelect" onchange="changeAnio(this.value)" class="saga-select">';
  const newAnio = '</select></div><div style="display:flex; flex-direction:column; gap:2px;"><label style="font-size:10px; color:rgba(255,255,255,0.7); margin-left:12px;">Curso Lectivo</label><select id="sagaAnioSelect" onchange="changeAnio(this.value)" class="saga-select">';
  
  const oldActividad = '<select id="sigaActividadSelect" onchange="changeActividad(this.value)" class="saga-select" style="min-width: 180px;">';
  const newActividad = '</select></div><div style="display:flex; flex-direction:column; gap:2px;"><label style="font-size:10px; color:rgba(255,255,255,0.7); margin-left:12px;">Actividad</label><select id="sigaActividadSelect" onchange="changeActividad(this.value)" class="saga-select" style="min-width: 180px;">';
  
  const oldCloseActividad = '</select>\n      <button class="admin-btn"';
  const newCloseActividad = '</select></div>\n      <button class="admin-btn"';

  if (!html.includes('Curso Lectivo</label>')) {
      html = html.replace(oldSeccion, newSeccion);
      html = html.replace(oldAnio, newAnio);
      html = html.replace(oldActividad, newActividad);
      html = html.replace(oldCloseActividad, newCloseActividad);
  }

  // Adjust CSS grid layout if needed (because we wrapped them in divs)
  html = html.replace(
      "#sagaSeccionSelect { grid-column: 1 !important; }", 
      "#sagaSeccionSelect { grid-column: 1 !important; } /* overridden by div wrapper */"
  );
  
  fs.writeFileSync(filename, html, 'utf8');
  console.log('Patched HTML labels in: ' + filename);
}

patchHtml('index.html');
patchHtml('index_github.html');

// Patch Worker.js
let worker = fs.readFileSync('worker.js', 'utf8');
const oldYearFilter = "let years = Array.from(allYears).filter(y => y != null).sort();";
const newYearFilter = "let years = Array.from(allYears).filter(y => y != null && y === 2026).sort(); // Hardcoded 2026 as per request";

if (worker.includes(oldYearFilter)) {
    worker = worker.replace(oldYearFilter, newYearFilter);
    fs.writeFileSync('worker.js', worker, 'utf8');
    console.log('Patched Worker.js year filter');
}
