const fs = require('fs');

function patchHtmlPhase2(filename) {
  if (!fs.existsSync(filename)) return;
  let html = fs.readFileSync(filename, 'utf8');

  // 1. Re-organize Admin Tabs to make them cleaner
  const newTabsHTML = `
      <div class="admin-tabs" style="display:flex; flex-wrap:wrap; gap:5px; justify-content:center; margin-bottom:20px;">
        <div class="admin-tab active" onclick="setAdminTab('pending')" id="atab-pending" style="padding:8px 12px; font-size:12px;">\uD83D\uDCCB Pendientes <span id="pending-count-badge"></span></div>
        <div class="admin-tab" onclick="setAdminTab('history')" id="atab-history" style="padding:8px 12px; font-size:12px;">\uD83D\uDCD6 Historial</div>
        <div class="admin-tab" onclick="setAdminTab('reports')" id="atab-reports" style="padding:8px 12px; font-size:12px;">\uD83D\uDCCA Resumen/Ingresos</div>
        <div class="admin-tab" onclick="setAdminTab('rejected')" id="atab-rejected" style="padding:8px 12px; font-size:12px;">\u274C Rechazados</div>
        <div class="admin-tab" onclick="setAdminTab('egresos')" id="atab-egresos" style="padding:8px 12px; font-size:12px;">\uD83D\uDCB8 Egresos</div>
        <div class="admin-tab" onclick="setAdminTab('settings')" id="atab-settings" style="padding:8px 12px; font-size:12px; background:#4a148c; color:white;">\u2699\uFE0F Config. Actividades</div>
      </div>
  `;
  const oldTabsRegex = /<div class="admin-tabs">[\s\S]*?<\/div>\s*<\/div>\s*<div class="admin-panel-body">/;
  html = html.replace(oldTabsRegex, newTabsHTML + '\n    </div>\n    <div class="admin-panel-body">');

  // 2. Add KPI Summary Cards to the Reports tab
  const kpiCardsHTML = `
      <div id="admin-reports-view" style="display:none;">
        <div class="kpi-container" style="display:flex; gap:10px; margin-bottom:20px; flex-wrap:wrap;">
           <div style="flex:1; background:var(--bg-card); padding:15px; border-radius:10px; border-left:4px solid #4CAF50; text-align:center;">
             <div style="font-size:11px; color:#aaa;">Total Recaudado</div>
             <div id="kpi-recaudado" style="font-size:20px; font-weight:bold; color:#4CAF50;">\u20A10</div>
           </div>
           <div style="flex:1; background:var(--bg-card); padding:15px; border-radius:10px; border-left:4px solid #FF9800; text-align:center;">
             <div style="font-size:11px; color:#aaa;">Total Pendiente</div>
             <div id="kpi-pendiente" style="font-size:20px; font-weight:bold; color:#FF9800;">\u20A10</div>
           </div>
           <div style="flex:1; background:var(--bg-card); padding:15px; border-radius:10px; border-left:4px solid #F44336; text-align:center;">
             <div style="font-size:11px; color:#aaa;">Total Egresos</div>
             <div id="kpi-egresos" style="font-size:20px; font-weight:bold; color:#F44336;">\u20A10</div>
           </div>
        </div>
        <div class="section-title">\uD83D\uDCCA Reportes Detallados</div>
  `;
  if (!html.includes('id="kpi-recaudado"')) {
      html = html.replace('<div id="admin-reports-view" style="display:none;">', kpiCardsHTML);
  }

  // 3. Inject JS logic to populate KPI cards in renderReports()
  const jsKpiPatch = `
function renderReports() {
  if (!isAdminMode || !students.length) return;
  var el = document.getElementById('reports-content');
  
  // Calculate KPIs
  var totalRecaudado = 0;
  var totalPendiente = 0;
  students.forEach(function(s) {
    if (s.pagado) totalRecaudado += s.pagado;
    if (s.pendiente) totalPendiente += s.pendiente;
  });
  
  var elRec = document.getElementById('kpi-recaudado');
  var elPen = document.getElementById('kpi-pendiente');
  if (elRec) elRec.textContent = '\u20A1' + totalRecaudado.toLocaleString();
  if (elPen) elPen.textContent = '\u20A1' + totalPendiente.toLocaleString();
  
  // Calculate Egresos if available
  if (window.adminEgresosData) {
     var totalEg = 0;
     window.adminEgresosData.forEach(function(e) { totalEg += e.monto; });
     var elEg = document.getElementById('kpi-egresos');
     if (elEg) elEg.textContent = '\u20A1' + totalEg.toLocaleString();
  }
`;
  html = html.replace(/function renderReports\(\) {\s*if \(!isAdminMode \|\| !students\.length\) return;\s*var el = document\.getElementById\('reports-content'\);/, jsKpiPatch);

  // 4. Expose the editRubro logic (which is already there, but we ensure it works)
  // Ensure the settings tab is visible by default for super_admin
  const showSettingsJs = `
    if (window.adminData && window.adminData.rol === 'super_admin') {
      document.getElementById('atab-settings').style.display = 'block';
    } else {
      document.getElementById('atab-settings').style.display = 'none';
    }
`;
  html = html.replace("document.getElementById('googleLoginBtn').style.display = 'none';", "document.getElementById('googleLoginBtn').style.display = 'none';\n" + showSettingsJs);

  fs.writeFileSync(filename, html, 'utf8');
  console.log('Patched Phase 2: ' + filename);
}

patchHtmlPhase2('index.html');
patchHtmlPhase2('index_github.html');
