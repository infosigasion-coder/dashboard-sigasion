const fs = require('fs');

function patchHeader(filename) {
  if (!fs.existsSync(filename)) return;
  let html = fs.readFileSync(filename, 'utf8');

  // 1. Inject the new CSS right before </style>
  const newCss = `
/* NEW TWO-TIER HEADER CSS */
.header-two-tier {
  display: flex;
  flex-direction: column;
  width: 100%;
  position: sticky;
  top: 0;
  z-index: 1000;
}
.header-top-bar {
  background: var(--dark);
  padding: 12px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.header-top-right {
  display: flex;
  align-items: center;
  gap: 16px;
}
.live-dot-new {
  font-size: 11px;
  color: #4CAF50;
  background: rgba(76, 175, 80, 0.1);
  padding: 4px 10px;
  border-radius: 12px;
  border: 1px solid rgba(76, 175, 80, 0.3);
  display: flex;
  align-items: center;
  font-weight: 600;
  animation: pulseGreen 2s infinite;
}
@keyframes pulseGreen {
  0% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.4); }
  70% { box-shadow: 0 0 0 6px rgba(76, 175, 80, 0); }
  100% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0); }
}
.header-bottom-bar {
  background: rgba(26, 46, 39, 0.85);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  padding: 10px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255,255,255,0.08);
}
.filters-wrap {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}
.filter-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.filter-group label {
  font-size: 10px;
  font-weight: 600;
  color: rgba(255,255,255,0.5);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-left: 6px;
}
.saga-select {
  background-color: rgba(0, 0, 0, 0.2) !important;
  border: 1px solid rgba(255,255,255,0.1) !important;
  color: #fff !important;
  border-radius: 8px !important;
  padding: 8px 30px 8px 12px !important;
  transition: all 0.2s ease;
}
.saga-select:hover {
  background-color: rgba(0, 0, 0, 0.3) !important;
  border-color: rgba(255,255,255,0.2) !important;
}
.actions-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
}
.sinpe-badge-new {
  font-size: 11px;
  font-weight: 600;
  color: rgba(255,255,255,0.7);
  background: rgba(255,255,255,0.05);
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.1);
  display: flex;
  align-items: center;
  gap: 6px;
}
@media (max-width: 768px) {
  .header-top-bar { padding: 12px 14px; }
  .header-bottom-bar { padding: 10px 14px; flex-direction: column; gap: 12px; align-items: flex-start; }
  .filters-wrap { width: 100%; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .filter-group:last-child { grid-column: 1 / span 2; }
  .actions-wrap { width: 100%; justify-content: space-between; }
  .header-title { font-size: 14px !important; }
}
/* Hide the old header */
.header { display: none !important; }
</style>`;
  html = html.replace('</style>', newCss);

  // 2. We extract the logo src dynamically just in case
  let logoMatch = html.match(/<div class="logo-icon"><img src="(.*?)" alt="Sión"><\/div>/);
  let logoSrc = logoMatch ? logoMatch[1] : '';

  // 3. Inject the New Header HTML right before the old <div class="header">
  const newHeaderHtml = `
<!-- TWO-TIER HEADER -->
<div class="header-two-tier">
  <!-- TOP BAR: Identity & Status -->
  <div class="header-top-bar">
    <div class="logo-wrap" style="display:flex;align-items:center;gap:10px;">
      <div class="logo-icon"><img src="${logoSrc}" alt="Sión" style="width:36px;height:36px;"></div>
      <div class="header-title" style="font-size:18px;font-weight:700;">S.I.G.A.</div>
    </div>
    <div class="header-top-right">
      <span class="meta-det" id="headerDocenteText" style="font-size:11px;color:rgba(255,255,255,0.6);">Docente: Control General</span>
      <div class="live-dot-new" id="liveDot" title="Conectado a Supabase">🟢 Conectado</div>
    </div>
  </div>

  <!-- BOTTOM BAR: Filters & Action -->
  <div class="header-bottom-bar">
    <div class="filters-wrap">
      <div class="filter-group">
        <label>Sección</label>
        <select id="sagaSeccionSelect" onchange="changeSeccion(this.value)" class="saga-select">
          <option value="">Cargando secciones...</option>
        </select>
      </div>
      <div class="filter-group">
        <label>Curso Lectivo</label>
        <select id="sagaAnioSelect" onchange="changeAnio(this.value)" class="saga-select">
          <option value="">Cargando años...</option>
        </select>
      </div>
      <div class="filter-group">
        <label>Actividad</label>
        <select id="sigaActividadSelect" onchange="changeActividad(this.value)" class="saga-select" style="min-width: 180px;">
          <option value="">Cargando actividades...</option>
        </select>
      </div>
    </div>
    <div class="actions-wrap">
      <div class="sinpe-badge-new">📱 SINPE: 7022-8161</div>
      <button class="admin-btn" id="adminBtn" onclick="openAdminPanel()">
        ⚙️ Admin
        <span class="admin-badge-count" id="adminBadgeCount" style="display:none;">0</span>
      </button>
      <button class="google-login-btn" id="googleLoginBtn" onclick="initGoogleLogin()">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/></svg>
      </button>
    </div>
  </div>
</div>
<!-- HEADER -->
<div class="header"`;
  html = html.replace('<!-- HEADER -->\r\n<div class="header"', newHeaderHtml);
  html = html.replace('<!-- HEADER -->\n<div class="header"', newHeaderHtml);

  fs.writeFileSync(filename, html);
  console.log('Patched header in ' + filename);
}

patchHeader('index_github.html');
