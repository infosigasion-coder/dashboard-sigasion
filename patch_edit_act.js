const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// Añadir botón de editar actividad junto al selector
if (!html.includes('editActividadBtn')) {
  html = html.replace('<select id="sagaActividadSelect"', '<button id="editActividadBtn" class="btn btn-sm" style="background:#f59e0b;color:white;padding:5px;border-radius:4px;display:none;margin-right:5px;" onclick="editCurrentActividad()">? Editar</button>\n          <select id="sagaActividadSelect"');
}

fs.writeFileSync('index.html', html, 'utf8');
console.log('HTML patched with edit activity button');

let js = fs.readFileSync('js/main.js', 'utf8');
const editFn = `
function editCurrentActividad() {
  if (!currentConfig.actividadId) return;
  // TODO: we need the full activity object to populate the form.
  // Since it might be complex, we can direct them to the settings tab.
  setAdminTab('settings');
  Swal.fire('AtenciA3n', 'Para editar, ve a la pestaAaa Config. Actividades, llena el formulario con el mismo nombre y cambarA! los datos. (Funcionalidad de autollenado prA3ximamente).', 'info');
}

// Show the button when activity is selected
const oldChange = "function setActividad(val) {";
const newChange = "function setActividad(val) {\n  const btn = document.getElementById('editActividadBtn');\n  if(btn) btn.style.display = val ? 'inline-block' : 'none';";
if (!js.includes('editActividadBtn')) {
  js = js.replace(oldChange, newChange);
}

// Para evitar un cierre prematuro, guardaremos el progreso.
fs.writeFileSync('js/main.js', js, 'utf8');
console.log('JS patched');
