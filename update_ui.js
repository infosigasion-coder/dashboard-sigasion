const fs = require('fs');

function updateUI() {
  const file = 'index_github.html';
  let html = fs.readFileSync(file, 'utf8');

  // 1. Remove the subtitle below SIGA
  // The subtitle was:
  // <div style="font-size:12px; color:rgba(255,255,255,0.6); margin-top:2px;">
  //   Sección <strong id="headerSeccionText">1-1</strong> (Año <strong id="headerAnioText">2027</strong>)
  // </div>
  html = html.replace(/<div style="font-size:12px; color:rgba\(255,255,255,0\.6\); margin-top:2px;">\s*Sección <strong id="headerSeccionText">[\s\S]*?<\/div>/, '');

  // 2. Remove "Docente" from the top right and add "⚡ AI Powered"
  // The old top right was:
  // <div class="header-top-right">
  //   <span class="meta-det" id="headerDocenteText" style="font-size:11px;color:rgba(255,255,255,0.6);">Docente: Control General</span>
  //   <div class="live-dot-new" id="liveDot" title="Conectado a Supabase">🟢 Conectado</div>
  // </div>
  const newTopRight = `<div class="header-top-right">
      <span class="meta-det" style="font-size:12px; font-weight:600; color:var(--accent); background:rgba(255, 193, 7, 0.1); padding:4px 10px; border-radius:12px; border:1px solid rgba(255,193,7,0.3);">⚡ AI Powered</span>
      <div class="live-dot-new" id="liveDot" title="Conectado a Supabase">🟢 Conectado</div>
    </div>`;
  html = html.replace(/<div class="header-top-right">[\s\S]*?<\/div>\s*<\/div>/, newTopRight + '\n  </div>');

  // 3. Update the filters to include Docente, and limit year to 2026
  // Old filters-wrap:
  // <div class="filters-wrap">
  //   ... Seccion Select ...
  //   ... Anio Select ...
  //   ... Actividad Select ...
  // </div>
  const newFilters = `<div class="filters-wrap">
      <div class="filter-group">
        <label>Sección</label>
        <select id="sagaSeccionSelect" onchange="changeSeccion(this.value)" class="saga-select">
          <option value="1-1">Sección 1-1</option>
          <option value="1-2">Sección 1-2</option>
          <option value="2-1">Sección 2-1</option>
          <option value="2-2">Sección 2-2</option>
          <option value="3-1">Sección 3-1</option>
          <option value="3-2">Sección 3-2</option>
          <option value="4-1">Sección 4-1</option>
          <option value="4-2">Sección 4-2</option>
          <option value="5-1">Sección 5-1</option>
          <option value="5-2">Sección 5-2</option>
          <option value="6-1">Sección 6-1</option>
          <option value="6-2">Sección 6-2</option>
        </select>
      </div>
      <div class="filter-group">
        <label>Docente Encargado(a)</label>
        <div class="saga-select" style="display:flex; align-items:center; min-width:180px; background:rgba(255,255,255,0.05); color:#fff; border:1px solid rgba(255,255,255,0.1); font-weight:600; font-size:13px; height: 38px; cursor:default;" id="headerDocenteText">
          Cargando...
        </div>
      </div>
      <div class="filter-group">
        <label>Curso Lectivo</label>
        <select id="sagaAnioSelect" onchange="changeAnio(this.value)" class="saga-select">
          <option value="2026">2026</option>
        </select>
      </div>
      <div class="filter-group">
        <label>Actividad</label>
        <select id="sigaActividadSelect" onchange="changeActividad(this.value)" class="saga-select" style="min-width: 180px;">
          <option value="">Cargando actividades...</option>
        </select>
      </div>
    </div>`;
  html = html.replace(/<div class="filters-wrap">[\s\S]*?<div class="actions-wrap">/, newFilters + '\n    <div class="actions-wrap">');

  // 4. Update the Admin Button prominence
  // Old actions-wrap has googleLoginBtn.
  const oldLoginBtnRegex = /<button class="google-login-btn" id="googleLoginBtn" onclick="openLoginModal\(\)">[\s\S]*?<\/button>/;
  const newLoginBtn = `<button class="google-login-btn" id="googleLoginBtn" onclick="openLoginModal()" style="display:flex; align-items:center; gap:6px; background:#3b82f6; color:#fff; font-weight:600; padding:8px 16px; border-radius:8px; border:none; cursor:pointer; box-shadow:0 4px 6px -1px rgba(0,0,0,0.1); transition:all 0.2s ease; margin-left:8px;">
        <span style="font-size:16px;">🔐</span>
        <span>Acceso Admin</span>
      </button>`;
  html = html.replace(oldLoginBtnRegex, newLoginBtn);

  // 5. Fix JS so headerDocenteText doesn't inject `<br>Gestión...`
  // Old JS: document.getElementById('headerDocenteText').innerHTML = 'Docente: ' + currentDocente + '<br>Gestión de Actividades';
  html = html.replace(/document\.getElementById\('headerDocenteText'\)\.innerHTML = 'Docente: ' \+ currentDocente \+ '<br>Gestión de Actividades';/g, "document.getElementById('headerDocenteText').textContent = currentDocente;");
  // Some versions had 'Gestin' due to encoding. Let's use regex more broadly.
  html = html.replace(/document\.getElementById\('headerDocenteText'\)\.innerHTML = ['"`]Docente: ['"`] \+ currentDocente \+ ['"`]<br>Gest.*?;/g, "document.getElementById('headerDocenteText').textContent = currentDocente;");

  fs.writeFileSync(file, html);
  console.log('UI updated successfully!');
}

updateUI();
