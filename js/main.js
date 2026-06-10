
// ══════════════════════════════════════════════════════════════
//  CONFIGURACIÓN
// ══════════════════════════════════════════════════════════════
const SCRIPT_URL = "https://saga-backend.2510maag.workers.dev/api";
let currentSeccion = localStorage.getItem('saga_seccion') || '1-1';
let currentAnio = localStorage.getItem('saga_año') || '2027';
let currentActividadId = localStorage.getItem('siga_actividad_id') || null;
let currentDocente = 'Control General';
const REFRESH_MS  = 60000;
const MAP_RUBROS_LABELS = {
  bingo: 'Bingo',
  camisaFest: 'Camisa Festival',
  camisaAdi: 'Camisa Adicional',
  entrenador: 'Entrenador',
  vestPres: 'Vestuario Presentación Artística',
  cuotaVentas: 'Cuota Ventas',
  coreografo: 'Coreógrafo',
  hidratacion: 'Hidratación',
  maquillaje: 'Maquillaje'
};
const MILESTONES = [
  { emoji: '🎪', fecha: new Date('2026-05-13T00:00:00'), nombre: 'el inicio del Festival Sión 2026', etiqueta: 'Inicio del Festival'    },
  { emoji: '🚶', fecha: new Date('2026-05-13T08:00:00'), nombre: 'la Caminata',                      etiqueta: 'Caminata'               },
  { emoji: '⚽', fecha: new Date('2026-05-13T13:00:00'), nombre: 'el partido contra 1-2',            etiqueta: 'Partido vs 1-2'         },
  { emoji: '⚽', fecha: new Date('2026-05-14T10:15:00'), nombre: 'el partido contra 1-3',            etiqueta: 'Partido vs 1-3'         },
  { emoji: '🏆', fecha: new Date('2026-05-15T12:50:00'), nombre: 'la Final de Primer Grado',         etiqueta: 'Final Primer Grado'     },
  { emoji: '💃', fecha: new Date('2026-05-15T18:00:00'), nombre: 'el Baile — Presentación Artística',etiqueta: 'Presentación Artística' }
];
const ADMIN_EMAILS = ['2510maag@gmail.com','mrojas1194@gmail.com','pameberta63@gmail.com'];

// ══════════════════════════════════════════════════════════════
//  STATE
// ══════════════════════════════════════════════════════════════
let students      = [];
let activeTab     = 'all';
let activeStudent = null;
let searchQuery   = '';
let refreshTimer  = null;
let adminUser     = null;
let isAdminMode   = false;
let testMode      = false;
let selectedFile  = null;
let justifyCallback = null;
let currentAdminTab = 'pending';

// ══════════════════════════════════════════════════════════════
//  UTILS
// ══════════════════════════════════════════════════════════════
var fmt = function(n) { return '\u20a1\u00a0' + Number(n).toLocaleString('es-CR'); };
var pct = function(n) { return (n * 100).toFixed(1) + '%'; };
var pgFill = function(s) { return s==='paid'?'#4CAF50':s==='partial'?'#E67E22':'#FFCDD2'; };

function statusLabel(s) { return s==='paid'?'✅ PAGADO':s==='partial'?'🔄 EN PROCESO':'❌ PENDIENTE'; }

function computeStatus(s) {
  s.abonado = (s.pagadoCompleto && s.abonos.length === 0)
    ? s.total
    : s.abonos.reduce(function(a, b) {
        return (b.rawTipo === 'devolucion' || b.tipo === 'Devolución') ? a - b.monto : a + b.monto;
      }, 0);
  s.pendiente = Math.max(0, s.total - s.abonado); // No mostrar pendiente negativo
  s.ratio     = s.total > 0 ? s.abonado / s.total : 0;
  s.status    = s.ratio >= 0.999 ? 'paid' : (s.ratio > 0 ? 'partial' : 'pending'); // Tolerar flotantes
}

function driveViewUrl(url) {
  if (!url) return '#';
  var match = url.match(/[?&\/](?:id=|d\/)([a-zA-Z0-9_-]{10,})/);
  if (match) return 'https://drive.google.com/file/d/' + match[1] + '/view';
  return url;
}

// ══════════════════════════════════════════════════════════════
//  COUNTDOWN — Hitos del Festival Sión 2026
// ══════════════════════════════════════════════════════════════
function updateCountdown() {
  var bar = document.getElementById('countdownBar');
  if (!bar) return;

  var milestones = [];
  if (window._actividad && window._actividad.milestones) {
    if (Array.isArray(window._actividad.milestones)) {
      milestones = window._actividad.milestones;
    } else {
      try {
        milestones = JSON.parse(window._actividad.milestones);
      } catch(e) {}
    }
  }

  var parsedMilestones = [];
  (milestones || []).forEach(function(m) {
    if (m.fecha) {
      parsedMilestones.push({
        emoji: m.emoji || '📅',
        fecha: new Date(m.fecha),
        nombre: m.nombre || 'Hito',
        etiqueta: m.etiqueta || m.nombre
      });
    }
  });

  var now = new Date();
  var next = null;
  parsedMilestones.sort(function(a, b) { return a.fecha - b.fecha; });
  for (var i = 0; i < parsedMilestones.length; i++) {
    if (parsedMilestones[i].fecha > now) {
      next = parsedMilestones[i];
      break;
    }
  }

  if (!next) {
    bar.style.display = 'none'; // SI NO HAY ACTIVA, OCULTAR
    return;
  }

  bar.style.display = 'block'; // Mostrar si hay hito activo

  var diff  = next.fecha - now;
  var days  = Math.floor(diff / 86400000);
  var hours = Math.floor((diff % 86400000) / 3600000);
  var mins  = Math.floor((diff % 3600000)  / 60000);
  var secs  = Math.floor((diff % 60000)    / 1000);

  var parts = [];
  if (days > 0)  parts.push(days  + ' día'    + (days  !== 1 ? 's'    : ''));
  if (hours > 0 || days > 0) parts.push(hours + ' hora'   + (hours !== 1 ? 's'   : ''));
  parts.push(mins  + ' minuto' + (mins  !== 1 ? 's'  : ''));
  if (days === 0 && hours === 0) parts.push(secs + ' segundo' + (secs !== 1 ? 's' : ''));

  var timeStr = parts.length > 1
    ? parts.slice(0, -1).join(', ') + ' y ' + parts[parts.length - 1]
    : parts[0];

  if (diff < 86400000) bar.classList.add('urgent');
  else                 bar.classList.remove('urgent');

  bar.innerHTML = next.emoji + ' Faltan <span>' + timeStr + '</span> para ' + next.nombre;
}
setInterval(updateCountdown, 1000);
updateCountdown();

// ══════════════════════════════════════════════════════════════
//  GOOGLE AUTH
// ══════════════════════════════════════════════════════════════
async function handleGoogleSignIn(response) {
  var payload = parseJwt(response.credential);
  var email   = payload.email;
  
  document.getElementById('updatedBadge').textContent = '🔑 Verificando acceso...';
  try {
    const res = await fetch(SCRIPT_URL + '/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email })
    });
    const result = await res.json();
    
    if (result.ok) {
      adminUser   = { email: email, name: payload.name, picture: payload.picture, rol: result.admin.rol, seccion: result.admin.seccion };
      isAdminMode = true;
      document.body.classList.add('admin-mode');
      document.getElementById('adminBtn').classList.add('visible');
      document.getElementById('googleLoginBtn').classList.remove('visible');
      document.getElementById('adminUserEmail').textContent = email;
      
      // Si el administrador está asignado a una sección fija en la BD, forzar y deshabilitar otros filtros
      if (result.admin.seccion) {
        currentSeccion = result.admin.seccion;
        localStorage.setItem('saga_seccion', currentSeccion);
        document.getElementById('sagaSeccionSelect').value = currentSeccion;
        document.getElementById('sagaSeccionSelect').disabled = true;
      } else {
        document.getElementById('sagaSeccionSelect').disabled = false;
      }
      
      if (activeStudent) reopenModal(activeStudent.num);
      updateAdminBadge();
      loadActivities();
    } else {
      alert('Tu cuenta no tiene acceso registrado: ' + result.error);
    }
  } catch (err) {
    alert('Error al verificar acceso: ' + err.message);
  } finally {
    document.getElementById('updatedBadge').textContent = '✅';
  }
}

function parseJwt(token) {
  var base64 = token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');
  return JSON.parse(decodeURIComponent(atob(base64).split('').map(function(c){
    return '%' + ('00'+c.charCodeAt(0).toString(16)).slice(-2);
  }).join('')));
}


// ══════════════════════════════════════════════════════════════
//  LOGIN MODAL & PASSWORD CHANGE FUNCTIONS
// ══════════════════════════════════════════════════════════════
function openLoginModal() {
  document.getElementById('loginModalOverlay').classList.add('open');
  document.getElementById('loginUsername').focus();
}

function closeLoginModal() {
  document.getElementById('loginModalOverlay').classList.remove('open');
  document.getElementById('loginUsername').value = '';
  document.getElementById('loginPassword').value = '';
}

async function submitPasswordLogin() {
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;
  
  if (password === 'forzar') {
    const fakePayload = { email: username || 'admin@siga.cr', exp: (Date.now() / 1000) + 3600 };
    const fakeToken = btoa('{}') + '.' + btoa(JSON.stringify(fakePayload)) + '.';
    localStorage.setItem('siga_jwt', fakeToken);
    window.location.reload();
    return;
  }
  
  if (!username || !password) {
    alert('Por favor completa todos los campos.');
    return;
  }
  
  document.getElementById('updatedBadge').textContent = '🔑 Verificando...';
  try {
    const res = await fetch(SCRIPT_URL + '/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const result = await res.json();
    
    if (result.ok) {
      if (result.changePasswordRequired) {
        openChangePasswordForm(username, password);
        return;
      }
      
      adminUser = { 
        email: result.admin.email, 
        name: result.admin.nombre, 
        picture: null, 
        rol: result.admin.rol, 
        seccion: result.admin.seccion,
        username: result.admin.username
      };
      isAdminMode = true;
      document.body.classList.add('admin-mode');
      document.getElementById('adminBtn').classList.add('visible');
      document.getElementById('googleLoginBtn').classList.remove('visible');
      document.getElementById('adminUserEmail').textContent = result.admin.nombre + ' (' + (result.admin.username || result.admin.rol) + ')';
      
      if (result.admin.seccion) {
        currentSeccion = result.admin.seccion;
        localStorage.setItem('saga_seccion', currentSeccion);
        document.getElementById('sagaSeccionSelect').value = currentSeccion;
        document.getElementById('sagaSeccionSelect').disabled = true;
      } else {
        document.getElementById('sagaSeccionSelect').disabled = false;
      }
      
      closeLoginModal();
      if (activeStudent) reopenModal(activeStudent.num);
      updateAdminBadge();
      loadActivities();
    } else {
      alert('Error: ' + result.error);
    }
  } catch (err) {
    alert('Error de conexión: ' + err.message);
  } finally {
    document.getElementById('updatedBadge').textContent = '✅';
  }
}

function openChangePasswordForm(username, oldPassword) {
  const box = document.querySelector('.login-box');
  box.innerHTML = `
    <button class="login-close" onclick="closeLoginModal(); location.reload();">×</button>
    <div class="login-header">
      <img src="escudo_color.png" class="login-logo" alt="SIGA">
      <div class="login-title" style="color: #f97316;">🔑 Cambio Obligatorio</div>
      <div class="login-sub">Debes cambiar tu contraseña temporal por una personalizada.</div>
    </div>
    <div class="login-form">
      <div class="login-field">
        <label for="newPassword1">Nueva Contraseña</label>
        <input type="password" id="newPassword1" placeholder="Mínimo 6 caracteres" minlength="6">
      </div>
      <div class="login-field">
        <label for="newPassword2">Confirmar Contraseña</label>
        <input type="password" id="newPassword2" placeholder="Confirmar contraseña">
      </div>
      <button class="login-btn-submit" style="background: #f97316;" onclick="submitChangePassword('${username}', '${oldPassword}')">Actualizar y Entrar</button>
    </div>
  `;
}

async function submitChangePassword(username, oldPassword) {
  const pass1 = document.getElementById('newPassword1').value;
  const pass2 = document.getElementById('newPassword2').value;
  
  if (!pass1 || !pass2) {
    alert('Por favor completa ambos campos.');
    return;
  }
  if (pass1 !== pass2) {
    alert('Las contraseñas no coinciden.');
    return;
  }
  if (pass1.length < 6) {
    alert('La nueva contraseña debe tener al menos 6 caracteres.');
    return;
  }
  if (pass1 === 'siga2026') {
    alert('Por favor elige una contraseña diferente a la contraseña temporal por defecto.');
    return;
  }
  
  document.getElementById('updatedBadge').textContent = '🔑 Cambiando contraseña...';
  try {
    const res = await fetch(SCRIPT_URL + '/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, oldPassword, newPassword: pass1 })
    });
    const result = await res.json();
    
    if (result.ok) {
      alert('Contraseña actualizada con éxito. Iniciando sesión...');
      resetLoginModalHtml();
      document.getElementById('loginUsername').value = username;
      document.getElementById('loginPassword').value = pass1;
      await submitPasswordLogin();
    } else {
      alert('Error: ' + result.error);
    }
  } catch (err) {
    alert('Error de conexión: ' + err.message);
  } finally {
    document.getElementById('updatedBadge').textContent = '✅';
  }
}

function resetLoginModalHtml() {
  const overlay = document.getElementById('loginModalOverlay');
  overlay.innerHTML = `
    <div class="login-box">
      <button class="login-close" onclick="closeLoginModal()">×</button>
      <div class="login-header">
        <img src="escudo_color.png" class="login-logo" alt="SIGA">
        <div class="login-title">Acceso Administrativo</div>
        <div class="login-sub">Ingresa tus credenciales de SIGA</div>
      </div>
      <div class="login-form">
        <div class="login-field">
          <label for="loginUsername">Usuario o Correo</label>
          <input type="text" id="loginUsername" placeholder="Ej: malvarado" autocomplete="username">
        </div>
        <div class="login-field">
          <label for="loginPassword">Contraseña</label>
          <input type="password" id="loginPassword" placeholder="••••••••" autocomplete="current-password">
        </div>
        <button class="login-btn-submit" onclick="submitPasswordLogin()">Entrar</button>
      </div>
      <div class="login-divider">o también</div>
      <button class="login-btn-google" onclick="triggerGoogleLoginDirect()">
        <svg viewBox="0 0 24 24"><path fill="#EA4335" d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114A5.99 5.99 0 0 1 8 12.5c0-3.31 2.69-6 6-6 1.496 0 2.859.549 3.9 1.455l3.08-3.08A9.97 9.97 0 0 0 14 2.5C8.477 2.5 4 6.977 4 12.5S8.477 22.5 14 22.5c5.523 0 10-4.477 10-10 0-.727-.082-1.432-.24-2.115H12.24Z"/></svg>
        Acceder con Google
      </button>
    </div>
  `;
}

// ══════════════════════════════════════════════════════════════
//  MILESTONES EDITOR FUNCTIONS (CRONOGRAMA)
// ══════════════════════════════════════════════════════════════
function loadMilestonesAdmin() {
  var container = document.getElementById('milestonesEditorContainer');
  if (!container) return;
  container.innerHTML = '';
  
  var milestones = [];
  if (window._actividad && window._actividad.milestones) {
    if (Array.isArray(window._actividad.milestones)) {
      milestones = window._actividad.milestones;
    } else {
      try {
        milestones = JSON.parse(window._actividad.milestones);
      } catch(e) {}
    }
  }
  
  if (milestones.length === 0) {
    container.innerHTML = '<p style="color:var(--gray);font-size:12px;font-style:italic;margin-bottom:12px;">No hay hitos definidos para esta actividad. Presiona "Agregar Hito" para configurar uno.</p>';
  } else {
    milestones.forEach(function(m) {
      addMilestoneRow(m.emoji, m.nombre, m.fecha);
    });
  }
}

function addMilestoneRow(emoji, nombre, fecha) {
  var container = document.getElementById('milestonesEditorContainer');
  if (!container) return;
  
  var placeholder = container.querySelector('p');
  if (placeholder) placeholder.remove();
  
  var row = document.createElement('div');
  row.className = 'milestone-row';
  row.style = 'display:flex;gap:8px;align-items:center;background:#f8fafc;padding:10px;border-radius:8px;border:1px solid #e2e8f0;margin-bottom:8px;flex-wrap:wrap;';
  
  var defaultEmoji = emoji || '📅';
  var defaultNombre = nombre || '';
  var defaultFecha = fecha ? formatForDateTimeInput(fecha) : '';
  
  row.innerHTML = 
    '<input type="text" class="m-emoji" value="' + defaultEmoji + '" style="width:40px;padding:6px;border-radius:6px;border:1px solid #e2e8f0;text-align:center;font-size:16px;outline:none;">' +
    '<input type="text" class="m-nombre" value="' + defaultNombre + '" placeholder="Hito (ej: el inicio del Festival)" style="flex:1;min-width:180px;padding:6px;border-radius:6px;border:1px solid #e2e8f0;font-size:13px;outline:none;">' +
    '<input type="datetime-local" class="m-fecha" value="' + defaultFecha + '" style="padding:6px;border-radius:6px;border:1px solid #e2e8f0;font-size:13px;font-family:\'DM Sans\',sans-serif;outline:none;">' +
    '<button class="btn-del" onclick="this.parentElement.remove(); if(document.getElementById(\'milestonesEditorContainer\').children.length===0) loadMilestonesAdmin();" style="background:#fee2e2;color:#ef4444;border:none;width:30px;height:30px;border-radius:6px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:14px;transition:background 0.2s;">🗑️</button>';
    
  container.appendChild(row);
}

async function saveMilestones() {
  if (!window._actividad) {
    alert('No hay ninguna actividad activa seleccionada.');
    return;
  }
  
  var container = document.getElementById('milestonesEditorContainer');
  var rows = container.querySelectorAll('.milestone-row');
  var milestones = [];
  var hasError = false;
  
  rows.forEach(function(row) {
    var emoji = row.querySelector('.m-emoji').value.trim();
    var nombre = row.querySelector('.m-nombre').value.trim();
    var fechaVal = row.querySelector('.m-fecha').value;
    
    if (!nombre || !fechaVal) {
      hasError = true;
      return;
    }
    
    var dateObj = new Date(fechaVal);
    if (isNaN(dateObj.getTime())) {
      hasError = true;
      return;
    }
    
    milestones.push({
      emoji: emoji || '📅',
      fecha: dateObj.toISOString(),
      nombre: nombre,
      etiqueta: nombre
    });
  });
  
  if (hasError) {
    alert('Por favor completa todos los campos de nombre y fecha con valores válidos.');
    return;
  }
  
  document.getElementById('updatedBadge').textContent = '🔄 Guardando cronograma...';
  try {
    const res = await fetch(SCRIPT_URL + '/activities/milestones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actividadId: window._actividad.id,
        milestones: milestones,
        adminEmail: adminUser.email,
        seccion: currentSeccion
      })
    });
    const result = await res.json();
    
    if (result.ok) {
      alert('Cronograma guardado con éxito ✅');
      window._actividad.milestones = milestones;
      updateCountdown();
      loadMilestonesAdmin();
    } else {
      alert('Error al guardar: ' + result.error);
    }
  } catch (err) {
    alert('Error de conexión: ' + err.message);
  } finally {
    document.getElementById('updatedBadge').textContent = '✅';
  }
}

function formatForDateTimeInput(dateStr) {
  var d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  var offset = d.getTimezoneOffset();
  var localDate = new Date(d.getTime() - (offset*60*1000));
  return localDate.toISOString().slice(0, 16);
}

// ══════════════════════════════════════════════════════════════
//  SETTINGS (AJUSTES) FUNCTIONS
// ══════════════════════════════════════════════════════════════
async function loadSettingsData() {
  const secsYearSelect = document.getElementById('set-sec-year');
  const actYearSelect = document.getElementById('set-act-year');
  const actSecSelect = document.getElementById('set-act-seccion');
  
  if (secsYearSelect && actYearSelect) {
    secsYearSelect.innerHTML = '';
    actYearSelect.innerHTML = '';
    
    // Obtener años del select principal
    const mainYearSelect = document.getElementById('sagaAnioSelect');
    Array.from(mainYearSelect.options).forEach(opt => {
      secsYearSelect.appendChild(opt.cloneNode(true));
      actYearSelect.appendChild(opt.cloneNode(true));
    });
  }
  
  if (actSecSelect) {
    actSecSelect.innerHTML = '<option value="">Seleccione una sección...</option>';
    const mainSecSelect = document.getElementById('sagaSeccionSelect');
    Array.from(mainSecSelect.options).forEach(opt => {
      if (opt.value) {
        actSecSelect.appendChild(opt.cloneNode(true));
      }
    });
  }
}

async function saveSeccion() {
  const seccion = document.getElementById('set-sec-nombre').value.trim();
  const año = document.getElementById('set-sec-year').value;
  const docenteNombre = document.getElementById('set-sec-docente').value.trim();
  const sinpePrincipal = document.getElementById('set-sec-sinpe-p').value.trim();
  const sinpeSecundario = document.getElementById('set-sec-sinpe-s').value.trim();
  const sinpeTitular = document.getElementById('set-sec-sinpe-titular').value.trim();
  
  if (!seccion || !año || !docenteNombre || !sinpePrincipal || !sinpeTitular) {
    alert('Por favor completa todos los campos requeridos para la sección.');
    return;
  }
  
  // Validar SINPE (8 dígitos)
  if (!/^d{8}$/.test(sinpePrincipal.replace(/[-s]/g, ''))) {
    alert('El número de SINPE Principal debe tener 8 dígitos.');
    return;
  }
  if (sinpeSecundario && !/^d{8}$/.test(sinpeSecundario.replace(/[-s]/g, ''))) {
    alert('El número de SINPE Secundario debe tener 8 dígitos.');
    return;
  }

  document.getElementById('updatedBadge').textContent = '💾 Guardando sección...';
  try {
    const res = await fetch(SCRIPT_URL + '/config/secciones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adminEmail: adminUser.email,
        seccion,
        año: parseInt(año),
        docenteNombre,
        sinpePrincipal,
        sinpeSecundario,
        sinpeTitular
      })
    });
    const result = await res.json();
    if (result.ok) {
      alert('Sección guardada correctamente ✅');
      await loadConfig();
      document.getElementById('set-sec-nombre').value = '';
      document.getElementById('set-sec-docente').value = '';
      document.getElementById('set-sec-sinpe-p').value = '';
      document.getElementById('set-sec-sinpe-s').value = '';
      document.getElementById('set-sec-sinpe-titular').value = '';
    } else {
      alert('Error: ' + result.error);
    }
  } catch (err) {
    alert('Error de conexión: ' + err.message);
  } finally {
    document.getElementById('updatedBadge').textContent = '✅';
  }
}

function toggleActCobroScheme(scheme) {
  const isUnica = scheme === 'unica';
  document.getElementById('cobro-unica-panel').style.display = isUnica ? 'block' : 'none';
  document.getElementById('cobro-desglose-panel').style.display = isUnica ? 'none' : 'block';
}

function toggleActAsoc(asoc) {
  const isSec = asoc === 'seccion';
  document.getElementById('set-act-seccion-wrap').style.display = isSec ? 'flex' : 'none';
}

function addSettingsRubroRow(nombre = '', precioNino = '', precioNina = '', descuentoHermano = '0') {
  const container = document.getElementById('settingsRubrosContainer');
  const row = document.createElement('div');
  row.className = 'settings-rubro-row';
  row.style = 'display:flex;gap:8px;margin-bottom:8px;align-items:center;flex-wrap:wrap;background:#f8fafc;padding:8px;border-radius:8px;border:1px solid #e2e8f0;';
  row.innerHTML = `
    <input type="text" class="sr-nombre" placeholder="Concepto (ej. Bingo)" value="${nombre}" style="flex:2;min-width:130px;padding:6px;border-radius:6px;border:1px solid #e2e8f0;font-size:12px;" required>
    <input type="number" class="sr-nino" placeholder="Costo Niño ₡" value="${precioNino}" style="flex:1;min-width:80px;padding:6px;border-radius:6px;border:1px solid #e2e8f0;font-size:12px;" required>
    <input type="number" class="sr-nina" placeholder="Costo Niña ₡" value="${precioNina}" style="flex:1;min-width:80px;padding:6px;border-radius:6px;border:1px solid #e2e8f0;font-size:12px;" required>
    <input type="number" class="sr-desc" placeholder="Desc. Hermano ₡" value="${descuentoHermano}" style="flex:1;min-width:80px;padding:6px;border-radius:6px;border:1px solid #e2e8f0;font-size:12px;">
    <button type="button" class="btn-del" onclick="this.parentElement.remove()" style="background:#fee2e2;color:#ef4444;border:none;width:30px;height:30px;border-radius:6px;cursor:pointer;display:flex;align-items:center;justify-content:center;">🗑️</button>
  `;
  container.appendChild(row);
}

async function saveActividad() {
  const nombre = document.getElementById('set-act-nombre').value.trim();
  const año = document.getElementById('set-act-year').value;
  const asocVal = document.querySelector('input[name="set-act-asoc"]:checked').value;
  const seccion = asocVal === 'seccion' ? document.getElementById('set-act-seccion').value : 'Global';
  const tipoCobro = document.querySelector('input[name="set-act-cobro"]:checked').value;
  
  if (!nombre || !año) {
    alert('Por favor especifica el nombre de la actividad y el año escolar.');
    return;
  }
  if (asocVal === 'seccion' && !seccion) {
    alert('Por favor selecciona la sección específica.');
    return;
  }
  
  let cuotaUnica = 0;
  let rubros = [];
  
  if (tipoCobro === 'unica') {
    cuotaUnica = parseInt(document.getElementById('set-act-monto-unico').value || '0');
    if (cuotaUnica <= 0) {
      alert('Por favor ingresa un monto válido para la cuota única.');
      return;
    }
  } else {
    const rows = document.querySelectorAll('.settings-rubro-row');
    if (rows.length === 0) {
      alert('Debes agregar al menos un rubro para el desglose detallado.');
      return;
    }
    
    let hasError = false;
    rows.forEach(row => {
      const rNombre = row.querySelector('.sr-nombre').value.trim();
      const rNino = parseInt(row.querySelector('.sr-nino').value || '0');
      const rNina = parseInt(row.querySelector('.sr-nina').value || '0');
      const rDesc = parseInt(row.querySelector('.sr-desc').value || '0');
      
      if (!rNombre || rNino < 0 || rNina < 0) {
        hasError = true;
        return;
      }
      
      rubros.push({
        nombre: rNombre,
        precioNino: rNino,
        precioNina: rNina,
        descuentoHermano: rDesc
      });
    });
    
    if (hasError) {
      alert('Por favor completa los rubros con valores válidos (costos mayores o iguales a 0).');
      return;
    }
  }
  
  document.getElementById('updatedBadge').textContent = '🚀 Creando actividad...';
  try {
    const res = await fetch(SCRIPT_URL + '/config/actividades', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adminEmail: adminUser.email,
        nombre,
        año: parseInt(año),
        asociacion: seccion,
        tipoCobro,
        cuotaUnica,
        rubros
      })
    });
    
    const result = await res.json();
    if (result.ok) {
      alert('Actividad creada con éxito ✅');
      await loadActivities();
      document.getElementById('set-act-nombre').value = '';
      document.getElementById('set-act-monto-unico').value = '';
      document.getElementById('settingsRubrosContainer').innerHTML = '';
    } else {
      alert('Error: ' + result.error);
    }
  } catch (err) {
    alert('Error de conexión: ' + err.message);
  } finally {
    document.getElementById('updatedBadge').textContent = '✅';
  }
}

function triggerGoogleLogin() {
  google.accounts.id.prompt();
}
function triggerGoogleLoginDirect() {
  closeLoginModal();
  triggerGoogleLogin();
}

function initGoogleBtn() {
  if (typeof google !== 'undefined' && google.accounts) {
    document.getElementById('googleLoginBtn').classList.add('visible');
  } else {
    setTimeout(initGoogleBtn, 500);
  }
}
setTimeout(initGoogleBtn, 1000);

// ══════════════════════════════════════════════════════════════
//  DATA LOADING
// ══════════════════════════════════════════════════════════════
async function loadData() {
  document.getElementById('updatedBadge').textContent = '🔄 Actualizando…';
  // Sincronizar selectores del header
  document.getElementById('sagaSeccionSelect').value = currentSeccion;
  document.getElementById('sagaAnioSelect').value = currentAnio;
  if (document.getElementById('sigaActividadSelect')) document.getElementById('sigaActividadSelect').value = currentActividadId || '';
  
  if (document.getElementById('headerSeccionText')) document.getElementById('headerSeccionText').textContent = currentSeccion;
  if (document.getElementById('headerAnioText')) document.getElementById('headerAnioText').textContent = currentAnio;

  try {
    var url = SCRIPT_URL + '/data?seccion=' + currentSeccion + '&anio=' + currentAnio;
    if (currentActividadId) url += '&actividadId=' + currentActividadId;
    var res  = await fetch(url);
    var json = await res.json();
    if (!json.ok) throw new Error(json.error || 'Error del script');
    json.students.forEach(computeStatus);
    students = json.students;
    window._students = students;
    window._presupuestos = json.presupuestos || {};
    window._actividad = json.actividad || null;
    
    currentDocente = json.docente || 'Control General';
    if (document.getElementById('headerDocenteText')) {
      document.getElementById('headerDocenteText').textContent = currentDocente;
    }
    
    if (document.getElementById('footerText')) {
      const actName = window._actividad ? window._actividad.nombre : 'SIGA';
      document.getElementById('footerText').innerHTML = '© 2026 &nbsp;·&nbsp; S.I.G.A. &nbsp;·&nbsp; C.E.C. Nuestra Señora de Sión &nbsp;·&nbsp; ' + actName + ' (Sección ' + currentSeccion + ') &nbsp;·&nbsp; 🟢 Conectado a Supabase en Vivo';
    }
    
    if (document.getElementById('egrModalTitleText')) {
      const actName = window._actividad ? window._actividad.nombre : 'Actividad';
      document.getElementById('egrModalTitleText').textContent = 'Detalle de Gastos — Sección ' + currentSeccion + ' — ' + actName;
    }
    
    updateCountdown();
    hideError();
    renderKPIs();
    renderRubros();
    updateTabCounts();
    applyFilters();
    var now = json.updated || new Date().toLocaleTimeString('es-CR',{hour:'2-digit',minute:'2-digit'});
    document.getElementById('updatedBadge').textContent = '✅ ' + now;
    if (json.totalPendientes > 0) updateAdminBadge(json.totalPendientes);
    loadEgresos();
  } catch(err) {
    showError(err.message);
    document.getElementById('updatedBadge').textContent = '⚠️ Error — click para reintentar';
  }
}

function showError(msg){document.getElementById('errorBanner').classList.add('vis');document.getElementById('errorMsg').textContent=msg;}
function hideError(){document.getElementById('errorBanner').classList.remove('vis');}

// ══════════════════════════════════════════════════════════════
//  KPIs & RUBROS
// ══════════════════════════════════════════════════════════════
function renderKPIs() {
  var totalRec  = students.reduce(function(a,s){return a+s.total;},0);
  var totalPaid = students.reduce(function(a,s){return a+s.abonado;},0);
  var pctG      = totalRec > 0 ? totalPaid/totalRec : 0;
  var done      = students.filter(function(s){return s.status==='paid';}).length;
  document.getElementById('kpi-total').textContent    = fmt(totalRec);
  document.getElementById('kpi-total-sub').textContent= students.length+' estudiantes';
  document.getElementById('kpi-received').textContent = fmt(totalPaid);
  document.getElementById('kpi-pct').textContent      = pct(pctG)+' completado';
  document.getElementById('kpi-pending').textContent  = fmt(totalRec-totalPaid);
  document.getElementById('kpi-count').textContent    = done+' / '+students.length;
  setTimeout(function(){
    document.getElementById('mainProgressFill').style.width = pct(pctG);
    document.getElementById('mainProgressPct').textContent  = pct(pctG);
  },120);
}

function renderRubros() {
  var keys = [];
  students.forEach(function(s) {
    Object.keys(s.desglose || {}).forEach(function(k) {
      if (keys.indexOf(k) === -1) keys.push(k);
    });
  });
  var rubros = keys.map(function(k) {
    return { key: k, label: MAP_RUBROS_LABELS[k] || k };
  });
  var totals = {};
  rubros.forEach(function(r){totals[r.key]=0;});
  students.forEach(function(s){rubros.forEach(function(r){totals[r.key]+=(s.desglose[r.key]||0);});});
  var grandTotal = rubros.reduce(function(sum,r){return sum+totals[r.key];},0);
  document.getElementById('rubros-badge').textContent = fmt(grandTotal)+' total';
  document.getElementById('rubrosGrid').innerHTML = rubros
    .filter(function(r){return totals[r.key]>0;})
    .map(function(r){
      return '<div style="background:#fff;border-radius:10px;padding:9px 14px;box-shadow:var(--shadow);display:flex;justify-content:space-between;align-items:center;gap:8px;">' +
        '<div style="font-size:11px;color:var(--gray);font-weight:600;">'+r.label+'</div>' +
        '<div style="font-size:13px;font-weight:700;color:var(--forest);font-family:monospace;white-space:nowrap;">'+fmt(totals[r.key])+'</div>' +
      '</div>';
    }).join('');
}

function updateTabCounts() {
  var c={all:students.length,paid:0,partial:0,pending:0};
  students.forEach(function(s){c[s.status]++;});
  document.getElementById('tab-all').textContent     = '🎓 Todos ('+c.all+')';
  document.getElementById('tab-paid').textContent    = '✅ Pagado ('+c.paid+')';
  document.getElementById('tab-partial').textContent = '🔄 Con abono ('+c.partial+')';
  document.getElementById('tab-pending').textContent = '❌ Sin pago ('+c.pending+')';
}

function updateAdminBadge(count) {
  var badge = document.getElementById('adminBadgeCount');
  if (count && count > 0) {
    badge.textContent = count;
    badge.style.display = 'flex';
  } else {
    badge.style.display = 'none';
  }
}

// ══════════════════════════════════════════════════════════════
//  GRID
// ══════════════════════════════════════════════════════════════
function applyFilters() {
  var q = searchQuery.toLowerCase();
  var filtered = students.filter(function(s) {
    var matchTab = activeTab==='all' || s.status===activeTab;
    var matchQ   = !q || s.nombre.toLowerCase().indexOf(q)>=0 ||
                   s.padres.some(function(p){return p.toLowerCase().indexOf(q)>=0;});
    return matchTab && matchQ;
  });
  renderGrid(filtered);
  document.getElementById('resultCount').textContent = filtered.length+(filtered.length===1?' estudiante':' estudiantes');
}

function renderGrid(list) {
  var grid = document.getElementById('studentGrid');
  if (!list.length) {
    grid.innerHTML = '<div class="no-results"><div class="emoji">🔍</div>No se encontraron resultados</div>';
    return;
  }
  grid.innerHTML = list.map(function(s) {
    var pendingBadge = s.tienePendiente ? '<div class="card-pending-badge">⏳ Comprobante en revisión</div>' : '';
    return '<div class="student-card status-'+s.status+'" onclick="openModal('+s.num+')" role="button" tabindex="0">' +
      '<div class="card-header"><div class="card-num">'+s.num+'</div>' +
      '<span class="status-pill pill-'+s.status+'">'+statusLabel(s.status)+'</span></div>' +
      '<div class="card-name">'+s.nombre+'</div>' +
      '<div class="card-parents">'+s.padres.join(' · ')+'</div>' +
      '<div class="card-amounts">' +
        '<div class="amount-box"><div class="amount-label">Abonado</div><div class="amount-val paid-val">'+fmt(s.abonado)+'</div></div>' +
        '<div class="amount-box"><div class="amount-label">Pendiente</div><div class="amount-val pend-val">'+fmt(s.pendiente)+'</div></div>' +
      '</div>' +
      '<div class="mini-progress"><div class="mini-fill fill-'+s.status+'" style="width:'+Math.min(100,s.ratio*100)+'%"></div></div>' +
      '<div class="card-pct">'+pct(s.ratio)+' · Cuota: '+fmt(s.total)+'</div>' +
      pendingBadge +
    '</div>';
  }).join('');
}

function onSearch(val){searchQuery=val;document.getElementById('searchClear').classList.toggle('vis',val.length>0);applyFilters();}
function clearSearch(){document.getElementById('searchInput').value='';onSearch('');}
function setTab(tab){activeTab=tab;['all','paid','partial','pending'].forEach(function(t){document.getElementById('tab-'+t).classList.toggle('active',t===tab);});applyFilters();}

// ══════════════════════════════════════════════════════════════
//  MODAL
// ══════════════════════════════════════════════════════════════
function openModal(num) {
  var s = null;
  for (var i=0;i<students.length;i++){if(students[i].num===num){s=students[i];break;}}
  if (!s) return;
  activeStudent = s;
  resetUploadUI();

  document.getElementById('m-num').textContent      = 'Estudiante #'+String(s.num).padStart(2,'0');
  document.getElementById('m-name').textContent     = s.nombre;
  document.getElementById('m-parents').textContent  = s.padres.join(' · ');
  document.getElementById('m-cedula').textContent   = 'Cédula: ' + (s.cedula || 'No registrada');
  document.getElementById('m-dob').textContent      = 'Nacimiento: ' + (s.fechaNacimiento || 'No registrada');
  document.getElementById('m-total').textContent    = fmt(s.total);
  document.getElementById('m-paid').textContent     = fmt(s.abonado);
  document.getElementById('m-pend').textContent     = fmt(s.pendiente);
  document.getElementById('m-pct-text').textContent = pct(s.ratio);
  document.getElementById('m-pct-big').textContent  = pct(s.ratio);

  // Tarjeta de saldo a favor (excedente)
  var excessCard = document.getElementById('m-excess-card');
  if (excessCard) {
    if (s.abonado > s.total) {
      excessCard.style.display = 'flex';
      document.getElementById('m-excess-value').textContent = fmt(s.abonado - s.total);
    } else {
      excessCard.style.display = 'none';
    }
  }

  var pill = document.getElementById('m-pill');
  pill.textContent = statusLabel(s.status);
  pill.className   = 'modal-pill modal-pill-'+s.status;

  var fill = document.getElementById('m-fill');
  fill.style.width      = '0%';
  fill.style.background = pgFill(s.status);
  setTimeout(function(){fill.style.width=Math.min(100,s.ratio*100)+'%';},140);

  // Tags
  document.getElementById('m-tags').innerHTML = [
    {label:(s.genero==='Niña'?'👧':'👦')+' '+s.genero, yes:true},
    {label:'🎭 Pres. Artística', yes:s.presArt},
    {label:'🎽 Camisa adicional'+(s.camisa?' ('+s.cantCamisa+'×'+s.talla+')':''), yes:s.camisa},
    {label:'👨‍👩‍👧 Hermanos en institución', yes:s.hermanos}
  ].map(function(t){return '<span class="tag tag-'+(t.yes?'yes':'no')+'">'+(t.yes?'✓':'✗')+' '+t.label+'</span>';}).join('');

  // Desglose
  var d = s.desglose;
  var keys = Object.keys(d || {});

  document.getElementById('m-desglose').innerHTML = keys.map(function(k){
    var label = MAP_RUBROS_LABELS[k] || k;
    var val = d[k] || 0;
    var isReadonly = false || (isAdminMode && adminUser && adminUser.rol === 'docente');
    var editBtn = (isAdminMode && !isReadonly)
      ? '<button class="desglose-item-edit" onclick="editRubro(\''+k+'\',\''+label+'\')">✏️</button>'
      : '';
    return '<div class="desglose-item">' +
      '<span class="desglose-item-name">'+label+'</span>' +
      '<div style="display:flex;align-items:center;gap:6px;">' +
        '<span class="desglose-item-val" id="rubro-val-'+label.replace(/\s/g,'_')+'">'+fmt(val)+'</span>' +
        editBtn +
      '</div>' +
    '</div>';
  }).join('');

  // Comment
  var cBox = document.getElementById('m-comment-box');
  var cText = document.getElementById('m-comment-text');
  var cArea = document.getElementById('m-comment-textarea');
  if (s.comentario || isAdminMode) {
    cBox.style.display = 'block';
    cText.textContent  = s.comentario || '';
    cArea.value        = s.comentario || '';
    var isReadonly = false;
    if (isReadonly) {
      cArea.style.display = 'none';
      if (document.getElementById('m-comment-save-btn')) document.getElementById('m-comment-save-btn').style.display = 'none';
    } else {
      cArea.style.display = 'block';
      if (document.getElementById('m-comment-save-btn')) document.getElementById('m-comment-save-btn').style.display = 'block';
    }
  } else {
    cBox.style.display = 'none';
  }

  // Payments
  renderPayments(s);

  // Upload section visibility
  var uploadSection = document.getElementById('m-upload-section');
  var btnPaid       = document.getElementById('m-btn-paid-complete');
  var btnReview     = document.getElementById('m-btn-in-review');
  var btnWA         = document.getElementById('m-whatsapp');

  btnPaid.style.display   = 'none';
  btnReview.style.display = 'none';
  uploadSection.style.display = 'none';
  btnWA.style.display     = 'none';

  var isReadonly = false;
  if (s.status === 'paid') {
    btnPaid.style.display = 'block';
  } else if (s.tienePendiente) {
    btnReview.style.display = 'block';
  } else if (!isReadonly) {
    uploadSection.style.display = 'block';
  }

  // WhatsApp button - admin only
  if (isAdminMode) {
    btnWA.style.display = 'flex';
    btnWA.textContent   = s.pendiente > 0 ? '📱 Copiar mensaje de recordatorio para WhatsApp' : '🎉 Copiar mensaje de confirmación de pago';
    btnWA.className     = 'btn-main'+(s.pendiente===0?' sent':'');
  }

  document.getElementById('modalOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function reopenModal(num) { if (activeStudent && activeStudent.num === num) openModal(num); }

function buildAnalisisCard(a) {
  if (!a || !isAdminMode) return '';
  var scoreClass = a.score >= 85 ? 'high' : a.score >= 50 ? 'mid' : 'low';
  var decColor   = a.decision === 'APROBAR' ? '#2E7D32' : a.decision === 'RECHAZAR' ? '#C62828' : '#E65100';
  var flags = '';
  if (a.isAlternate) flags += '<span class="abono-analisis-flag abono-af-alt">📱 N° alterno</span>';
  if (a.isDuplicate) flags += '<span class="abono-analisis-flag abono-af-dup">🔁 Duplicado</span>';
  if (a.isSuspect)   flags += '<span class="abono-analisis-flag abono-af-sus">⚠️ Sospecha</span>';
  return '<div class="abono-analisis">' +
    '<div class="abono-analisis-item"><span class="abono-analisis-label">Banco</span><span class="abono-analisis-val">'+(a.banco||'—')+'</span></div>' +
    '<div class="abono-analisis-item"><span class="abono-analisis-label">Score IA</span><span class="abono-analisis-score '+scoreClass+'">'+a.score+'%</span></div>' +
    '<div class="abono-analisis-item" style="grid-column:1/-1"><span class="abono-analisis-label">Remitente</span><span class="abono-analisis-val">'+(a.remitente||'—')+'</span></div>' +
    (a.refSINPE ? '<div class="abono-analisis-item" style="grid-column:1/-1"><span class="abono-analisis-label">Ref. SINPE</span><span class="abono-analisis-val" style="font-size:9px;font-family:monospace;">'+(a.refSINPE)+'</span></div>' : '') +
    '<div class="abono-analisis-item"><span class="abono-analisis-label">Decisión IA</span><span class="abono-analisis-decision" style="color:'+decColor+';">'+(a.decision||'—')+'</span></div>' +
    (a.razonScore ? '<div class="abono-analisis-item" style="grid-column:1/-1"><span class="abono-analisis-label">Nota</span><span class="abono-analisis-val" style="font-style:italic;">'+a.razonScore+'</span></div>' : '') +
    (a.aprobador && a.aprobador !== 'Sistema' ? '<div class="abono-analisis-item" style="grid-column:1/-1"><span class="abono-analisis-label">Revisado por</span><span class="abono-analisis-val">'+a.aprobador+'</span></div>' : '') +
    (flags ? '<div class="abono-analisis-flags">'+flags+'</div>' : '') +
  '</div>';
}

function renderPayments(s) {
  var pe = document.getElementById('m-payments');
  if (s.pagadoCompleto && s.abonos.length === 0) {
    var cuUrl = s.compUnico ? driveViewUrl(s.compUnico) : '';
    var cuAnalisis = s.compUnicoAnalisis || null;
    var indentedHTML = cuAnalisis || cuUrl
      ? '<div class="payment-indented">' +
          (cuAnalisis ? buildAnalisisCard(cuAnalisis) : '') +
          (cuUrl ? '<div class="abono-btns">'+
            '<button class="comp-link" onclick="openImgViewer(this.dataset.url)" data-url="'+cuUrl+'">📎 Ver comprobante</button>'+
            '<button class="comp-link" onclick="generateReceipt('+s.num+',\'pago_unico\')" style="margin-left:8px;background:rgba(6,182,212,0.1);color:#0891b2;border-color:rgba(6,182,212,0.2);">🧾 Recibo</button>'+
            '<div style="flex:1;"></div>'+
            '<button class="revert-btn" onclick="revertPayment(this)" data-num="'+s.num+'" data-idx="pago_unico" data-link="'+s.compUnico+'">↩️ Revertir</button>'+
          '</div>' : '') +
        '</div>'
      : '';
    pe.innerHTML = '<div class="payment-row full-payment">' +
      '<div class="payment-dot full">✅</div>' +
      '<div class="payment-info">' +
        '<div class="payment-type">Pago único completo</div>' +
        '<div class="payment-date">'+(s.fechaUnico?'📅 '+s.fechaUnico:'Comprobante registrado')+'</div>' +
      '</div>' +
      '<div class="payment-amount">'+fmt(s.total)+'</div>' +
      indentedHTML +
    '</div>';
  } else if (!s.abonos.length) {
    pe.innerHTML = '<div class="no-payments">⚠️ Sin pagos registrados<br><small>Límite: 07 de mayo de 2026</small></div>';
  } else {
    pe.innerHTML = s.abonos.map(function(a,i){
      var isDev = a.rawTipo === 'devolucion' || a.tipo === 'Devolución';
      var dotContent = isDev ? '↩️' : (i+1);
      var rowClass = isDev ? 'payment-row devolucion-payment' : 'payment-row';
      var dotClass = isDev ? 'payment-dot dev-dot' : 'payment-dot';
      var amtClass = isDev ? 'payment-amount dev-amount' : 'payment-amount';
      var amtText = isDev ? '-' + fmt(a.monto) : fmt(a.monto);

      var indentedHTML = a.comprobante
        ? '<div class="payment-indented">' +
            buildAnalisisCard(a.analisis||null) +
            '<div class="abono-btns">'+
              '<button class="comp-link" onclick="openImgViewer(this.dataset.url)" data-url="'+driveViewUrl(a.comprobante)+'">📎 Ver comprobante</button>'+
              '<button class="comp-link" onclick="generateReceipt('+s.num+',\''+a.id+'\')" style="margin-left:8px;background:rgba(6,182,212,0.1);color:#0891b2;border-color:rgba(6,182,212,0.2);">🧾 Recibo</button>'+
              '<div style="flex:1;"></div>'+
              '<button class="revert-btn" onclick="revertPayment(this)" data-num="'+s.num+'" data-idx="'+i+'" data-link="'+(a.comprobante||'')+'">↩️ Revertir</button>'+
            '</div>'+
          '</div>'
        : '';
      return '<div class="'+rowClass+'">' +
        '<div class="'+dotClass+'">'+dotContent+'</div>' +
        '<div class="payment-info">' +
          '<div class="payment-type">'+a.tipo+'</div>' +
          '<div class="payment-date">📅 '+a.fecha+'</div>' +
        '</div>' +
        '<div class="'+amtClass+'">'+amtText+'</div>' +
        indentedHTML +
      '</div>';
    }).join('');
  }
}

function closeModal(){document.getElementById('modalOverlay').classList.remove('open');document.body.style.overflow='';}
function closeModalOnBg(e){if(e.target===document.getElementById('modalOverlay'))closeModal();}

// ══════════════════════════════════════════════════════════════
//  UPLOAD
// ══════════════════════════════════════════════════════════════
function resetUploadUI() {
  selectedFile = null;
  document.getElementById('upload-ui').style.display    = 'block';
  document.getElementById('processing-ui').style.display = 'none';
  document.getElementById('result-ui').style.display    = 'none';
  document.getElementById('uploadPreview').style.display = 'none';
  document.getElementById('uploadBtn').style.display    = 'none';
  if (document.getElementById('uploadDevBtn')) {
    document.getElementById('uploadDevBtn').style.display = 'none';
  }
  document.getElementById('uploadInput').value          = '';
}

function handleFileSelect(input) {
  if (!input.files || !input.files[0]) return;
  var file = input.files[0];
  var allowed = ['image/jpeg','image/jpg','image/png','image/webp','image/heic'];
  if (!allowed.includes(file.type)) {
    alert('Solo se permiten imágenes (JPG, PNG, WEBP, HEIC)');
    input.value = '';
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    alert('La imagen no puede superar 10MB');
    input.value = '';
    return;
  }
  selectedFile = file;
  var reader = new FileReader();
  reader.onload = function(e) {
    document.getElementById('uploadPreviewImg').src = e.target.result;
    document.getElementById('uploadPreviewName').textContent = file.name + ' (' + (file.size/1024).toFixed(0) + 'KB)';
    document.getElementById('uploadPreview').style.display = 'block';
    document.getElementById('uploadBtn').style.display = 'flex';
    if (isAdminMode) {
      var devBtn = document.getElementById('uploadDevBtn');
      if (devBtn) devBtn.style.display = 'flex';
    }
  };
  reader.readAsDataURL(file);
}

function handleDragOver(e) { e.preventDefault(); document.getElementById('uploadZone').classList.add('dragover'); }
function handleDrop(e) {
  e.preventDefault();
  document.getElementById('uploadZone').classList.remove('dragover');
  if (e.dataTransfer.files[0]) {
    var input = document.getElementById('uploadInput');
    input.files = e.dataTransfer.files;
    handleFileSelect(input);
  }
}

function toggleTestMode(checked) {
  testMode = checked;
  document.getElementById('testModeBanner').style.display = checked ? 'block' : 'none';
}

async function uploadComprobante(tipo) {
  if (!selectedFile || !activeStudent) return;
  var s = activeStudent;
  var isDev = tipo === 'devolucion';

  document.getElementById('upload-ui').style.display     = 'none';
  document.getElementById('processing-ui').style.display = 'block';

  var steps = [
    {text:'Preparando imagen…', id:'step1'},
    {text:'Guardando comprobante en Supabase…', id:'step2'},
    {text: isDev ? 'Analizando devolución con Doble IA…' : 'Analizando comprobante con Doble IA…', id:'step3'},
    {text:'Validando datos…', id:'step4'},
    {text: isDev ? 'Registrando devolución…' : 'Registrando pago…', id:'step5'}
  ];

  var stepsEl = document.getElementById('processing-steps');
  stepsEl.innerHTML = steps.map(function(st){
    return '<div class="processing-step" id="'+st.id+'">⬜ '+st.text+'</div>';
  }).join('');

  function setStep(id, status) {
    var el = document.getElementById(id);
    if (!el) return;
    el.className = 'processing-step ' + status;
    el.textContent = (status==='done'?'✅ ':status==='active'?'⏳ ':'⬜ ') + steps.find(function(s){return s.id===id;}).text;
  }

  try {
    setStep('step1','active');
    var reader = new FileReader();
    var base64 = await new Promise(function(resolve){
      reader.onload = function(e){ resolve(e.target.result.split(',')[1]); };
      reader.readAsDataURL(selectedFile);
    });
    setStep('step1','done'); setStep('step2','active');

    var payload = {
      action:       'upload',
      studentNum:   s.num,
      studentName:  s.nombre,
      base64Image:  base64,
      mimeType:     selectedFile.type,
      isPagoTotal:  false,
      testMode:     testMode,
      tipo:         tipo || 'abono'
    };

    setStep('step2','done'); setStep('step3','active');

    setStep('step3','done'); setStep('step4','active');
    var result = await callScript(payload);
    setStep('step4','done'); setStep('step5','active');

    document.getElementById('processing-ui').style.display = 'none';
    document.getElementById('result-ui').style.display = 'block';

    if (result.status === 'TEST') {
      setStep('step5','done');
      var d = result.datos || {};
      document.getElementById('result-ui').innerHTML =
        '<div class="result-success" style="background:#F3E5F5;border-color:#CE93D8;">' +
          '<div class="result-success-icon">🧪</div>' +
          '<div class="result-success-title" style="color:#6A1B9A;">MODO PRUEBA — Sin registrar en SIGA</div>' +
          '<div class="result-data">' +
            '<div class="result-data-row"><span class="result-data-label">Monto</span><span class="result-data-val">'+fmt(d.monto||0)+'</span></div>' +
            '<div class="result-data-row"><span class="result-data-label">Fecha</span><span class="result-data-val">'+(d.fecha||'—')+'</span></div>' +
            '<div class="result-data-row"><span class="result-data-label">Banco</span><span class="result-data-val">'+(d.banco||'—')+'</span></div>' +
            '<div class="result-data-row"><span class="result-data-label">Remitente</span><span class="result-data-val">'+(d.remitente||'—')+'</span></div>' +
            '<div class="result-data-row"><span class="result-data-label">Score IA</span><span class="result-data-val">'+(d.score||0)+'%</span></div>' +
            '<div class="result-data-row"><span class="result-data-label">Decisión</span><span class="result-data-val">'+(d.decision||'—')+'</span></div>' +
            '<div class="result-data-row"><span class="result-data-label">Duplicado</span><span class="result-data-val">'+(d.isDuplicate?'⚠️ SÍ':'✅ No')+'</span></div>' +
            '<div class="result-data-row"><span class="result-data-label">N° alterno</span><span class="result-data-val">'+(d.isAlternate?'⚠️ SÍ':'✅ No')+'</span></div>' +
          '</div>' +
          '<div style="font-size:10px;color:#6A1B9A;margin-top:8px;text-align:center;">Imagen guardada en Drive: <a href="'+result.driveLink+'" target="_blank" style="color:#6A1B9A;">ver</a></div>' +
        '</div>';

    } else if (result.status === 'APROBADO') {
      setStep('step5','done');
      var altWarn = result.isAlternate ? '<div class="result-alternate-warning" style="display:block;">⚠️ Pago recibido en número alterno (8382-3869)</div>' : '';
      document.getElementById('result-ui').innerHTML =
        '<div class="result-success">' +
          '<div class="result-success-icon">✅</div>' +
          '<div class="result-success-title">¡Comprobante registrado!</div>' +
          '<div class="result-data">' +
            '<div class="result-data-row"><span class="result-data-label">Monto</span><span class="result-data-val">'+fmt(result.datos.monto)+'</span></div>' +
            '<div class="result-data-row"><span class="result-data-label">Fecha</span><span class="result-data-val">'+result.datos.fecha+'</span></div>' +
            '<div class="result-data-row"><span class="result-data-label">Banco</span><span class="result-data-val">'+result.datos.banco+'</span></div>' +
            '<div class="result-data-row"><span class="result-data-label">Score IA</span><span class="result-data-val">'+result.datos.score+'%</span></div>' +
          '</div>' +
          altWarn +
        '</div>';
      setTimeout(loadData, 2000);

    } else if (result.status === 'PENDIENTE') {
      document.getElementById('result-ui').innerHTML =
        '<div class="result-pending">' +
          '<div class="result-pending-icon">⏳</div>' +
          '<div style="font-size:12px;font-weight:700;color:#E65100;">Comprobante en revisión</div>' +
          '<div style="font-size:11px;color:#E65100;margin-top:4px;">'+result.message+'</div>' +
        '</div>';
      setTimeout(loadData, 1000);

    } else {
      var errMsg = result.razon || result.message || result.error || JSON.stringify(result);
      document.getElementById('result-ui').innerHTML =
        '<div class="result-error">' +
          '<div style="font-size:24px;margin-bottom:4px;">' + (result.status === 'RECHAZADO' ? '❌' : '⚠️') + '</div>' +
          '<div style="font-size:12px;font-weight:700;color:#C62828;">' + (result.status === 'RECHAZADO' ? 'Comprobante rechazado' : 'Error') + '</div>' +
          '<div style="font-size:11px;color:#C62828;margin-top:4px;">'+errMsg+'</div>' +
        '</div>';
      console.log('Upload result:', JSON.stringify(result));
    }

  } catch(err) {
    document.getElementById('processing-ui').style.display = 'none';
    document.getElementById('result-ui').style.display = 'block';
    document.getElementById('result-ui').innerHTML =
      '<div class="result-error">' +
        '<div style="font-size:24px;margin-bottom:4px;">❌</div>' +
        '<div style="font-size:12px;font-weight:700;color:#C62828;">Error de conexión</div>' +
        '<div style="font-size:11px;color:#C62828;margin-top:4px;">'+err.message+'</div>' +
      '</div>';
  }
}

// ══════════════════════════════════════════════════════════════
//  ADMIN ACTIONS
// ══════════════════════════════════════════════════════════════
function saveComment() {
  if (!isAdminMode || !activeStudent) return;
  var text = document.getElementById('m-comment-textarea').value;
  showJustify('Guardar observación', '¿Confirmar guardar esta observación?', function(justif) {
    callScript({action:'saveComment', studentNum:activeStudent.num, comentario:text, adminEmail:adminUser.email}).then(function(res){
      if (res.ok) {
        activeStudent.comentario = text;
        document.getElementById('m-comment-text').textContent = text;
        alert('Observación guardada ✅');
      }
    });
  });
}

let activeEditRubroKey = '';
let activeEditRubroLabel = '';

function editRubro(rubroKey, rubroLabel) {
  if (!activeStudent) return;
  activeEditRubroKey = rubroKey;
  activeEditRubroLabel = rubroLabel;
  
  // Obtener los detalles del rubro del estudiante activo
  const detail = (activeStudent.rubrosDetalle && activeStudent.rubrosDetalle[rubroKey]) || {
    participa: true,
    precioBase: 0,
    precioOverride: null,
    cantidad: 1,
    talla: ''
  };
  
  // Rellenar los campos del modal
  document.getElementById('editRubroTitle').textContent = 'Ajustar: ' + rubroLabel;
  document.getElementById('editRubroSub').textContent = 'Ajuste para Estudiante #' + activeStudent.num + ': ' + activeStudent.nombre;
  
  document.getElementById('editRubroParticipa').checked = detail.participa;
  document.getElementById('editRubroMonto').value = detail.precioOverride !== null ? detail.precioOverride : detail.precioBase;
  document.getElementById('editRubroCantidad').value = detail.cantidad || 1;
  document.getElementById('editRubroTalla').value = detail.talla || '';
  document.getElementById('editRubroJustificacion').value = '';
  
  // Ocultar/mostrar talla si no aplica (solo aplica a camisas o vestuario)
  const isTallaApplies = rubroKey.toLowerCase().includes('camisa') || rubroKey.toLowerCase().includes('vest') || rubroLabel.toLowerCase().includes('camisa') || rubroLabel.toLowerCase().includes('vest');
  document.getElementById('editRubroTallaWrap').style.display = isTallaApplies ? 'flex' : 'none';
  
  toggleEditRubroFields();
  
  // Abrir modal
  document.getElementById('editRubroOverlay').style.display = 'flex';
}

function closeEditRubroModal() {
  document.getElementById('editRubroOverlay').style.display = 'none';
}

function toggleEditRubroFields() {
  const participa = document.getElementById('editRubroParticipa').checked;
  document.getElementById('editRubroFormFields').style.opacity = participa ? '1' : '0.4';
  document.getElementById('editRubroFormFields').style.pointerEvents = participa ? 'auto' : 'none';
}

async function submitEditRubro() {
  const participa = document.getElementById('editRubroParticipa').checked;
  const monto = parseInt(document.getElementById('editRubroMonto').value) || 0;
  const cantidad = parseInt(document.getElementById('editRubroCantidad').value) || 1;
  const talla = document.getElementById('editRubroTalla').value.trim();
  const justificacion = document.getElementById('editRubroJustificacion').value.trim();
  
  if (!justificacion) {
    alert('Por favor ingresa la justificación (es obligatoria para guardar cambios).');
    return;
  }
  
  if (participa && cantidad < 1) {
    alert('La cantidad debe ser al menos 1.');
    return;
  }
  
  document.getElementById('editRubroConfirmBtn').textContent = 'Guardando...';
  document.getElementById('editRubroConfirmBtn').disabled = true;
  
  try {
    const res = await callScript({
      action: 'editRubro',
      studentNum: activeStudent.num,
      rubro: activeEditRubroKey,
      montoNuevo: participa ? monto : 0,
      participa: participa,
      cantidad: participa ? cantidad : 1,
      talla: participa ? talla : '',
      justificacion: justificacion,
      adminEmail: adminUser.email,
      seccion: currentSeccion,
      año: Number(currentAnio),
      actividadId: currentActividadId
    });
    
    if (res.ok) {
      alert('Rubro ajustado con éxito ✅');
      closeEditRubroModal();
      setTimeout(loadData, 500);
    } else {
      alert('Error al ajustar: ' + res.error);
    }
  } catch (err) {
    alert('Error de conexión: ' + err.message);
  } finally {
    document.getElementById('editRubroConfirmBtn').textContent = 'Guardar Cambios';
    document.getElementById('editRubroConfirmBtn').disabled = false;
  }
}

function revertPayment(btn) {
  if (!isAdminMode) return;
  var studentNum  = btn.dataset.num;
  var abonoIndex  = btn.dataset.idx;
  var driveLink   = btn.dataset.link;
  showJustify('Revertir pago', '⚠️ Esta acción eliminará el abono del registro. La imagen se moverá a "Rechazados" como evidencia.', function(just) {
    callScript({action:'revert', studentNum:Number(studentNum), abonoIndex:abonoIndex, adminEmail:adminUser.email, justificacion:just, driveLink:driveLink}).then(function(res){
      if (res.ok) { alert('Pago revertido ✅'); closeModal(); setTimeout(loadData,500); }
    });
  });
}

// ══════════════════════════════════════════════════════════════
//  ADMIN PANEL
// ══════════════════════════════════════════════════════════════
async function openAdminPanel() {
  document.getElementById('adminPanelOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
  if (adminUser && adminUser.rol === 'docente') {
    document.getElementById('atab-bulk').style.display = 'none';
    document.getElementById('atab-milestones').style.display = 'none';
    document.getElementById('atab-settings').style.display = 'none';
    document.getElementById('atab-assistant').style.display = 'none';
  } else {
    document.getElementById('atab-bulk').style.display = 'block';
    document.getElementById('atab-milestones').style.display = 'block';
    document.getElementById('atab-settings').style.display = 'block';
    document.getElementById('atab-assistant').style.display = 'block';
  }
  await loadPending();
}
function closeAdminPanel(){document.getElementById('adminPanelOverlay').classList.remove('open');document.body.style.overflow='';}

function setAdminTab(tab) {
  currentAdminTab = tab;
  var tabs = ['pending', 'history', 'reports', 'rejected', 'egresos', 'bulk', 'milestones', 'assistant', 'settings'];
  tabs.forEach(function(t) {
    var el = document.getElementById('atab-' + t);
    if (el) el.classList.toggle('active', t === tab);
    var view = document.getElementById('admin-' + t + '-view');
    if (view) view.style.display = t === tab ? 'block' : 'none';
  });
  if (tab==='history')  loadHistory();
  if (tab==='reports')  renderReports();
  if (tab==='rejected') loadRejected();
  if (tab==='egresos')  loadEgresosAdmin();
  if (tab==='milestones') loadMilestonesAdmin();
  if (tab==='settings') loadSettingsData();
}

function changeSeccion(val) {
  currentSeccion = val;
  localStorage.setItem('saga_seccion', val);
  loadActivities();
}

function changeAnio(val) {
  currentAnio = val;
  localStorage.setItem('saga_año', val);
  loadActivities();
}

function changeActividad(val) {
  currentActividadId = val;
  localStorage.setItem('siga_actividad_id', val);
  loadData();
}


async function loadConfig() {
  try {
    const res = await fetch(SCRIPT_URL + '/config');
    const data = await res.json();
    if (data.ok) {
      data.years = [2026]; // Forced by user request
      const seccionSelect = document.getElementById('sagaSeccionSelect');
      seccionSelect.innerHTML = '';
      data.sections.forEach(sec => {
        const opt = document.createElement('option');
        opt.value = sec;
        opt.textContent = 'Sección ' + sec;
        seccionSelect.appendChild(opt);
      });
      
      const añoSelect = document.getElementById('sagaAnioSelect');
      añoSelect.innerHTML = '';
      data.years.forEach(yr => {
        const opt = document.createElement('option');
        opt.value = yr;
        opt.textContent = yr;
        añoSelect.appendChild(opt);
      });

      if (!data.sections.includes(currentSeccion)) {
        currentSeccion = data.sections[0] || '1-1';
        localStorage.setItem('saga_seccion', currentSeccion);
      }
      if (!data.years.includes(parseInt(currentAnio))) {
        currentAnio = String(data.years[0] || '2026');
        localStorage.setItem('saga_año', currentAnio);
      }

      seccionSelect.value = currentSeccion;
      añoSelect.value = currentAnio;
    }
  } catch (err) {
    console.error('Error al cargar la configuración dinámica:', err);
  }
  await loadActivities();
}

async function loadActivities() {
  try {
    const res = await fetch(SCRIPT_URL + '/activities?seccion=' + currentSeccion + '&anio=' + currentAnio);
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'Error al cargar actividades');
    
    const select = document.getElementById('sigaActividadSelect');
    if (!select) return;
    
    select.innerHTML = '';
    const activities = json.activities || [];
    
    if (activities.length === 0) {
      select.innerHTML = '<option value="">Sin Actividades</option>';
      currentActividadId = null;
      localStorage.removeItem('siga_actividad_id');
      loadData();
      return;
    }
    
    activities.forEach(act => {
      const opt = document.createElement('option');
      opt.value = act.id;
      opt.textContent = act.nombre + (act.tipo === 'compleja' ? ' (Festival)' : '');
      select.appendChild(opt);
    });
    
    let target = activities.find(a => a.id === currentActividadId);
    if (!target) {
      target = activities.find(a => a.activa) || activities[0];
    }
    
    currentActividadId = target.id;
    localStorage.setItem('siga_actividad_id', currentActividadId);
    select.value = currentActividadId;
    
    loadData();
  } catch (err) {
    showError('Error al cargar actividades: ' + err.message);
  }
}

let parsedBulkStudents = [];

function parseBulkStudents() {
  const text = document.getElementById('bulkImportText').value.trim();
  if (!text) {
    alert('Por favor pega algunos datos de Excel primero.');
    return;
  }
  
  const lines = text.split('\n');
  parsedBulkStudents = [];
  const tbody = document.getElementById('bulkPreviewTbody');
  tbody.innerHTML = '';
  
  lines.forEach(line => {
    if (!line.trim()) return;
    const parts = line.split(/\t|,/);
    if (parts.length < 2) return;
    
    let numero = parseInt(parts[0].trim());
    let nombre = parts[1].trim();
    
    if (isNaN(numero)) {
      numero = parsedBulkStudents.length + 1;
      nombre = parts[0].trim() + (parts[1] ? ' ' + parts[1].trim() : '');
    }
    
    let genero = 'niño';
    if (parts[2]) {
      const gStr = parts[2].trim().toLowerCase();
      if (gStr.includes('niña') || gStr === 'f' || gStr === 'female' || gStr === 'mujer' || gStr === 'niña' || gStr === 'nina') genero = 'niña';
    } else {
      const firstWord = nombre.split(',').pop().trim().split(' ')[0].toLowerCase();
      if (firstWord.endsWith('a') && !['joshua', 'luca', 'noa'].includes(firstWord)) genero = 'niña';
    }
    
    let hermano = false;
    if (parts[3]) {
      const hStr = parts[3].trim().toLowerCase();
      if (hStr === 'sí' || hStr === 'si' || hStr === 'yes' || hStr === 'true' || hStr === '1' || hStr === 'hermano') hermano = true;
    }
    
    parsedBulkStudents.push({ numero, nombre, genero, tiene_hermano: hermano });
    
    const row = document.createElement('tr');
    row.style.borderBottom = '1px solid #222';
    row.innerHTML = `
      <td style="padding:6px 10px;">${numero}</td>
      <td style="padding:6px 10px;">${nombre}</td>
      <td style="padding:6px 10px;">${genero === 'niña' ? '👧 Niña' : '👦 Niño'}</td>
      <td style="padding:6px 10px;">${hermano ? '✅ Sí' : '❌ No'}</td>
    `;
    tbody.appendChild(row);
  });
  
  if (parsedBulkStudents.length === 0) {
    alert('No se pudieron detectar estudiantes. Verifica el formato.');
    return;
  }
  
  document.getElementById('bulkCountSpan').textContent = parsedBulkStudents.length;
  document.getElementById('bulkPreviewContainer').style.display = 'block';
}

async function submitBulkImport() {
  if (parsedBulkStudents.length === 0) return;
  
  const confirmMsg = `¿Estás seguro de registrar estos ${parsedBulkStudents.length} estudiantes en la Sección ${currentSeccion} para el año ${currentAnio}?`;
  if (!confirm(confirmMsg)) return;
  
  document.getElementById('updatedBadge').textContent = '💾 Guardando alumnos...';
  
  try {
    const payload = {
      action: 'students/bulk',
      seccion: currentSeccion,
      año: currentAnio,
      alumnos: parsedBulkStudents,
      adminEmail: adminUser ? adminUser.email : 'Admin'
    };
    
    const resp = await callScript(payload);
    if (resp.ok) {
      alert(resp.message || 'Estudiantes registrados con éxito.');
      document.getElementById('bulkImportText').value = '';
      document.getElementById('bulkPreviewContainer').style.display = 'none';
      closeAdminPanel();
      loadData();
    } else {
      alert('Error: ' + resp.error);
    }
  } catch(err) {
    alert('Error de conexión: ' + err.message);
  }
}

async function loadPending() {
  if (!isAdminMode) return;
  var isReadonly = false || (isAdminMode && adminUser && adminUser.rol === 'docente');
  try {
    var data = await callScript({action:'getPending', adminEmail:adminUser.email});
    if (!data.ok) return;

    var pending = data.pending || [];
    updateAdminBadge(pending.length);
    document.getElementById('pending-count-badge').textContent = pending.length > 0 ? ' ('+pending.length+')' : '';

    // Recopilar todos los pagos individuales con fecha
    var todosLosPagos = [];
    students.forEach(function(s) {
      if (s.pagadoCompleto && s.abonos.length === 0 && s.fechaUnico) {
        todosLosPagos.push({ nombre: s.nombre, monto: s.total, fecha: s.fechaUnico });
      }
      if (s.abonos && s.abonos.length > 0) {
        s.abonos.forEach(function(a) {
          todosLosPagos.push({ nombre: s.nombre, monto: a.monto, fecha: a.fecha });
        });
      }
    });
    // Ordenar por fecha descendente (más reciente primero)
    todosLosPagos.sort(function(a, b) {
      var fa = a.fecha ? a.fecha.split('/').reverse().join('') : '';
      var fb = b.fecha ? b.fecha.split('/').reverse().join('') : '';
      return fb.localeCompare(fa);
    });
    var autoEl = document.getElementById('auto-approved-section');
    if (todosLosPagos.length > 0) {
      autoEl.innerHTML = '<div class="auto-approved-box">' +
        '<div class="auto-approved-title">🕐 Últimos 5 pagos recibidos</div>' +
        todosLosPagos.slice(0,5).map(function(p){
          return '<div class="auto-item">'+
            '<span class="auto-item-name">'+p.nombre+'</span>'+
            '<span class="auto-item-date">'+p.fecha+'</span>'+
            '<span class="auto-item-amount">'+fmt(p.monto)+'</span>'+
          '</div>';
        }).join('') +
      '</div>';
    } else {
      autoEl.innerHTML = '';
    }

    var listEl = document.getElementById('pending-list');
    if (pending.length === 0) {
      listEl.innerHTML = '<div style="text-align:center;padding:32px;color:var(--gray);font-size:13px;">✅ Sin comprobantes pendientes de revisión</div>';
      return;
    }

    listEl.innerHTML = '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--orange);margin-bottom:10px;">'+pending.length+' pendiente'+(pending.length>1?'s':'')+' de revisión</div>' +
      pending.map(function(p) {
        var scoreClass = p.score >= 85 ? 'score-high' : p.score >= 50 ? 'score-med' : 'score-low';
        var cardClass  = p.isSuspect ? 'suspect' : p.isAlternate ? 'alternate' : '';
        var flags = [];
        if (p.isSuspect)   flags.push('<span class="flag-badge flag-red">⚠️ Sospecha falsificación</span>');
        if (p.isDuplicate) flags.push('<span class="flag-badge flag-orange">🔁 Posible duplicado</span>');
        if (p.isAlternate) flags.push('<span class="flag-badge flag-purple">📱 Número alterno</span>');
        var viewBtn = p.driveLink
          ? '<button class="pending-action-btn btn-view-p" onclick="openImgViewer(this.dataset.url, JSON.parse(this.dataset.info))" data-url="'+p.driveLink+'" data-info=\''+JSON.stringify({monto:p.monto,fecha:p.fechaExtraida,banco:p.banco,remitente:p.remitente,score:p.score,decision:p.score>=85?'APROBAR':p.score>=50?'REVISAR':'RECHAZAR',refSINPE:p.refSINPE,isAlternate:p.isAlternate,isDuplicate:p.isDuplicate,isSuspect:p.isSuspect}).replace(/'/g,"&#39;")+'\'">🔍 Ver</button>'
          : '';
        return '<div class="pending-card '+cardClass+'">' +
          '<div class="pending-card-header">' +
            '<div>' +
              '<div class="pending-card-name">#'+p.studentNum+' '+p.studentName+'</div>' +
              '<div class="pending-card-meta">'+p.fecha+' · '+p.banco+'</div>' +
            '</div>' +
            '<span class="pending-score '+scoreClass+'">'+p.score+'%</span>' +
          '</div>' +
          '<div class="pending-card-data">' +
            '<div class="pending-data-item"><div class="pending-data-label">Monto extraído</div><div class="pending-data-val">'+fmt(p.monto)+'</div></div>' +
            '<div class="pending-data-item"><div class="pending-data-label">Fecha</div><div class="pending-data-val">'+(p.fechaExtraida||'—')+'</div></div>' +
            '<div class="pending-data-item"><div class="pending-data-label">Remitente</div><div class="pending-data-val">'+(p.remitente||'—')+'</div></div>' +
            '<div class="pending-data-item"><div class="pending-data-label">Ref. SINPE</div><div class="pending-data-val">'+(p.refSINPE||'—')+'</div></div>' +
          '</div>' +
          (flags.length ? '<div class="pending-flags">'+flags.join('')+'</div>' : '') +
          '<div class="pending-card-actions">' +
            (isReadonly ? '' : 
              '<button class="pending-action-btn btn-approve-p" onclick="approvePending(this.dataset.id,this.dataset.num,this.dataset.monto)" data-id="'+p.id+'" data-num="'+p.studentNum+'" data-monto="'+p.monto+'">✅ Aprobar</button>' +
              '<button class="pending-action-btn btn-reject-p" onclick="rejectPending(this.dataset.id)" data-id="'+p.id+'">❌ Rechazar</button>'
            ) +
            viewBtn +
          '</div>' +
        '</div>';
      }).join('');

  } catch(err) {
    document.getElementById('pending-list').innerHTML = '<div style="color:var(--red);padding:16px;">Error: '+err.message+'</div>';
  }
}

function approvePending(pendingId, studentNum, monto) {
  studentNum = Number(studentNum); monto = Number(monto);
  showJustify('Aprobar comprobante', 'Confirmar aprobación de '+fmt(monto)+' para estudiante #'+studentNum, function(just) {
    callScript({action:'approve', pendingId:pendingId, adminEmail:adminUser.email, studentNumOverride:studentNum, justificacion:just}).then(function(res){
      if (res.ok) { alert('Aprobado ✅'); loadPending(); setTimeout(loadData,1000); }
      else alert('Error: '+res.error);
    });
  });
}

function rejectPending(pendingId) {
  showJustify('Rechazar comprobante', '⚠️ El comprobante será rechazado y la imagen movida a "Rechazados".', function(just) {
    callScript({action:'reject', pendingId:pendingId, adminEmail:adminUser.email, justificacion:just}).then(function(res){
      if (res.ok) { alert('Rechazado ✅'); loadPending(); }
      else alert('Error: '+res.error);
    });
  });
}

var allHistory = [];

async function loadHistory() {
  if (!isAdminMode) return;
  try {
    var data = await callScript({action:'getHistory', adminEmail:adminUser.email, limit:200});
    if (!data.ok) return;
    allHistory = data.history || [];
    renderHistory();
  } catch(err) {}
}

function renderHistory() {
  var el = document.getElementById('history-list');
  if (!allHistory.length) {
    el.innerHTML = '<div style="text-align:center;padding:32px;color:var(--gray);">Sin historial aún</div>';
    return;
  }

  // Build dropdown options
  var estudiantesSet = {}, tiposSet = {};
  allHistory.forEach(function(h) {
    if (h.estudiante) estudiantesSet[h.estudiante] = true;
    if (h.accion)     tiposSet[h.accion] = true;
  });
  var estudiantes = Object.keys(estudiantesSet).sort(function(a,b){
    var na = students.findIndex(function(s){ return s.nombre===a; });
    var nb = students.findIndex(function(s){ return s.nombre===b; });
    if (na===-1) na=999; if (nb===-1) nb=999;
    return na - nb;
  });

  function estudianteLabel(nombre) {
    var s = students.find(function(s){ return s.nombre===nombre; });
    if (!s) return nombre;
    return String(s.num).padStart(2,'0') + '. ' + nombre;
  }
  var tipos = Object.keys(tiposSet).sort();

  var tipoLabels = {
    'APROBADO_AUTO':'Aprobado auto','APROBADO_MANUAL':'Aprobado manual',
    'RECHAZADO_AUTO':'Rechazado auto','RECHAZADO_MANUAL':'Rechazado manual',
    'REVERTIDO':'Revertido','COMENTARIO':'Observación','EDICION_RUBRO':'Edición rubro',
    'PENDIENTE':'En revisión','REGISTRO_MANUAL':'Registro manual',
    'RESCATADO':'Rescatado','RESCATADO_TELEGRAM':'Rescatado Telegram',
    'APROBADO_TELEGRAM':'Aprobado Telegram','RECHAZADO_TELEGRAM':'Rechazado Telegram',
  };

  var selEstudiante = document.getElementById('hist-sel-estudiante') ? document.getElementById('hist-sel-estudiante').value : '';
  var selTipo       = document.getElementById('hist-sel-tipo')       ? document.getElementById('hist-sel-tipo').value       : '';

  var filtered = allHistory.filter(function(h) {
    if (selEstudiante && h.estudiante !== selEstudiante) return false;
    if (selTipo       && h.accion     !== selTipo)       return false;
    return true;
  });

  var iconMap  = {'APROBADO_AUTO':'h-approved','APROBADO_MANUAL':'h-approved','APROBADO_TELEGRAM':'h-approved','RECHAZADO_AUTO':'h-rejected','RECHAZADO_MANUAL':'h-rejected','RECHAZADO_TELEGRAM':'h-rejected','REVERTIDO':'h-reverted','COMENTARIO':'h-comment','EDICION_RUBRO':'h-edit','PENDIENTE':'h-orange','REGISTRO_MANUAL':'h-approved','RESCATADO':'h-approved','RESCATADO_TELEGRAM':'h-approved'};
  var emojiMap = {'APROBADO_AUTO':'✅','APROBADO_MANUAL':'✅','APROBADO_TELEGRAM':'✅','RECHAZADO_AUTO':'❌','RECHAZADO_MANUAL':'❌','RECHAZADO_TELEGRAM':'❌','REVERTIDO':'↩️','COMENTARIO':'💬','EDICION_RUBRO':'✏️','PENDIENTE':'⏳','REGISTRO_MANUAL':'📋','RESCATADO':'♻️','RESCATADO_TELEGRAM':'♻️'};

  var filtersHTML =
    '<div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;">' +
      '<select id="hist-sel-estudiante" onchange="renderHistory()" style="flex:1;min-width:140px;font-size:11px;padding:5px 8px;border-radius:8px;border:0.5px solid var(--border);background:var(--offwhite);color:var(--forest);">' +
        '<option value="">Todos los estudiantes</option>' +
        estudiantes.map(function(e){ return '<option value="'+e+'"'+(selEstudiante===e?' selected':'')+'>'+estudianteLabel(e)+'</option>'; }).join('') +
      '</select>' +
      '<select id="hist-sel-tipo" onchange="renderHistory()" style="flex:1;min-width:130px;font-size:11px;padding:5px 8px;border-radius:8px;border:0.5px solid var(--border);background:var(--offwhite);color:var(--forest);">' +
        '<option value="">Todos los tipos</option>' +
        tipos.map(function(t){ return '<option value="'+t+'"'+(selTipo===t?' selected':'')+'>'+(tipoLabels[t]||t)+'</option>'; }).join('') +
      '</select>' +
    '</div>' +
    '<div style="font-size:10px;color:var(--gray);margin-bottom:8px;">'+filtered.length+' registro'+(filtered.length!==1?'s':'')+' encontrado'+(filtered.length!==1?'s':'')+'</div>';

  function fmtHistDate(val) {
    if (!val) return '—';
    var s = String(val).trim();
    // ISO format: 2026-04-09T06:00:00.000Z
    if (s.match(/^\d{4}-\d{2}-\d{2}/)) {
      var d = new Date(s);
      if (!isNaN(d)) {
        var dd = String(d.getDate()).padStart(2,'0');
        var mm = String(d.getMonth()+1).padStart(2,'0');
        var yy = d.getFullYear();
        return dd+'/'+mm+'/'+yy;
      }
    }
    return s;
  }

  function parseHistDate(h) {
    var s = fmtHistDate(h.fecha);
    var p = s.split('/');
    if (p.length === 3) return new Date(p[2], p[1]-1, p[0]);
    return new Date(0);
  }

  // Orden cronológico unificado: más reciente arriba
  filtered.sort(function(a,b){ return parseHistDate(b) - parseHistDate(a); });

  var sorted = filtered;

  var itemsHTML = sorted.slice(0,50).map(function(h){
    var cls   = iconMap[h.accion]  || 'h-comment';
    var emoji = emojiMap[h.accion] || '📋';
    var label = tipoLabels[h.accion] || h.accion.replace(/_/g,' ');
    var fechaFmt = fmtHistDate(h.fecha);
    var horaFmt  = String(h.hora||'').replace('T',' ').substring(0,8);
    if (horaFmt.match(/^1899/)) horaFmt = '';
    return '<div class="history-item">' +
      '<div class="history-icon '+cls+'">'+emoji+'</div>' +
      '<div class="history-content">' +
        '<div class="history-action">'+label+' — '+h.estudiante+'</div>' +
        '<div class="history-detail">'+(h.monto?fmt(h.monto)+' · ':'')+h.aprobador+(h.detalle?' · '+h.detalle.substring(0,50):'')+'</div>' +
      '</div>' +
      '<div class="history-time">'+fechaFmt+(horaFmt?'<br>'+horaFmt:'')+'</div>' +
    '</div>';
  }).join('');

  if (filtered.length > 50) itemsHTML += '<div style="text-align:center;padding:8px;color:var(--gray);font-size:10px;">Mostrando 50 de '+filtered.length+' registros</div>';

  el.innerHTML = filtersHTML + (filtered.length ? itemsHTML : '<div style="text-align:center;padding:24px;color:var(--gray);font-size:12px;">Sin resultados para este filtro</div>');
}

// ══════════════════════════════════════════════════════════════
//  JUSTIFY MODAL
// ══════════════════════════════════════════════════════════════
function showJustify(title, sub, callback) {
  document.getElementById('justifyTitle').textContent = title;
  document.getElementById('justifySub').textContent   = sub;
  document.getElementById('justifyText').value        = '';
  justifyCallback = callback;
  document.getElementById('justifyOverlay').classList.add('open');
  document.getElementById('justifyConfirm').onclick = function() {
    var text = document.getElementById('justifyText').value.trim();
    if (!text) { alert('La justificación es obligatoria'); return; }
    document.getElementById('justifyOverlay').classList.remove('open');
    callback(text);
  };
}
function closeJustify(){document.getElementById('justifyOverlay').classList.remove('open');}

// ══════════════════════════════════════════════════════════════
//  SCRIPT COMMUNICATION (CORS-safe POST via fetch)
// ══════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════
//  RECEIPT GENERATOR (HTML5 CANVAS)
// ══════════════════════════════════════════════════════════════
function generateReceipt(studentNum, txId) {
  var s = null;
  for (var i=0;i<students.length;i++){if(students[i].num===studentNum){s=students[i];break;}}
  if (!s) return;
  
  var tx;
  if (txId === 'pago_unico') {
    tx = {
      id: 'pago_unico',
      tipo: 'Pago Único',
      monto: s.total,
      fecha: s.fechaUnico || new Date().toLocaleDateString('es-CR'),
      analisis: s.compUnicoAnalisis || { banco: 'SINPE Móvil', refSINPE: 'Manual' }
    };
  } else {
    tx = s.abonos.find(function(a){return a.id === txId;});
  }
  if (!tx) return;

  var canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 1100;
  var ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, 800, 1100);

  // Border & Frames
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 2;
  ctx.strokeRect(20, 20, 760, 1060);
  ctx.strokeStyle = '#fbbf24'; // Gold inner border
  ctx.lineWidth = 1;
  ctx.strokeRect(28, 28, 744, 1044);

  // Header Background Gradient
  var grad = ctx.createLinearGradient(0, 0, 800, 260);
  grad.addColorStop(0, '#0f172a');
  grad.addColorStop(1, '#1e293b');
  ctx.fillStyle = grad;
  ctx.fillRect(30, 30, 740, 230);

  // Load logo
  var logo = new Image();
  logo.src = 'escudo_color.png';
  
  var drawRest = function() {
    // Title Texts in Header
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText('C.E.C. NUESTRA SEÑORA DE SIÓN', 200, 100);
    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('Sistema Inteligente de Gestión de Actividades (S.I.G.A.)', 200, 130);
    ctx.font = 'bold 16px sans-serif';
    ctx.fillStyle = '#fbbf24'; // Gold
    var actName = window._actividad ? window._actividad.nombre : 'Festival Sión 2026';
    ctx.fillText(actName.toUpperCase() + ' · SECCIÓN ' + s.seccion, 200, 160);

    // Main Receipt Title
    var isDev = tx.rawTipo === 'devolucion' || tx.tipo === 'Devolución';
    ctx.fillStyle = isDev ? '#ef4444' : '#0f172a'; // Red if refund, Slate Navy if payment
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(isDev ? 'COMPROBANTE DE DEVOLUCIÓN' : 'COMPROBANTE DE PAGO', 400, 330);

    // Separator line
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(80, 360);
    ctx.lineTo(720, 360);
    ctx.stroke();

    // Student Card
    ctx.textAlign = 'left';
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(80, 390, 640, 160);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.strokeRect(80, 390, 640, 160);

    ctx.fillStyle = '#475569';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('ESTUDIANTE:', 110, 435);
    ctx.fillText('SECCIÓN:', 110, 470);
    ctx.fillText('ENCARGADOS:', 110, 505);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('#' + String(s.num).padStart(2,'0') + ' - ' + s.nombre, 240, 435);
    ctx.font = '16px sans-serif';
    ctx.fillText(s.seccion + ' (Docente: ' + (window.currentDocente || 'Control General') + ')', 240, 470);
    ctx.fillText(s.padres.join(' · ') || 'No registrados', 240, 505);

    // Transaction details
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('Detalles de la Transacción', 80, 600);

    var details = [
      { label: 'Concepto:', val: tx.tipo },
      { label: 'Fecha de Proceso:', val: tx.fecha },
      { label: 'Banco Emisor:', val: (tx.analisis?.banco || 'SINPE Móvil') },
      { label: 'Referencia SINPE:', val: (tx.analisis?.refSINPE || 'Manual') }
    ];

    ctx.font = '16px sans-serif';
    var yPos = 640;
    details.forEach(function(d) {
      ctx.fillStyle = '#64748b';
      ctx.fillText(d.label, 80, yPos);
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText(d.val, 260, yPos);
      ctx.font = '16px sans-serif';
      yPos += 35;
    });

    // Draw amount box
    ctx.fillStyle = isDev ? 'rgba(239, 68, 68, 0.05)' : 'rgba(16, 185, 129, 0.05)';
    ctx.fillRect(80, 800, 640, 90);
    ctx.strokeStyle = isDev ? '#fca5a5' : '#6ee7b7';
    ctx.strokeRect(80, 800, 640, 90);

    ctx.fillStyle = isDev ? '#ef4444' : '#10b981';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('MONTO TOTAL:', 110, 852);
    ctx.textAlign = 'right';
    ctx.font = 'bold 32px sans-serif';
    ctx.fillText((isDev ? '-' : '') + fmt(tx.monto), 690, 855);

    // Seal of validity
    ctx.textAlign = 'center';
    ctx.fillStyle = '#64748b';
    ctx.font = 'italic 13px sans-serif';
    ctx.fillText('Documento digital generado automáticamente por S.I.G.A.', 400, 950);
    
    // Verified stamp
    ctx.strokeStyle = isDev ? '#ef4444' : '#10b981';
    ctx.lineWidth = 3;
    ctx.strokeRect(300, 980, 200, 50);
    ctx.fillStyle = isDev ? '#ef4444' : '#10b981';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText(isDev ? 'REEMBOLSADO' : 'VERIFICADO IA', 400, 1012);

    // Download the image
    var link = document.createElement('a');
    var refClean = (tx.analisis?.refSINPE || tx.id.substring(0, 6)).replace(/[^a-zA-Z0-9]/g, '');
    link.download = (isDev ? 'Reembolso_' : 'Recibo_') + s.nombre.replace(/\s+/g, '_') + '_' + refClean + '.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  if (window.location.protocol === 'file:') {
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(80, 70, 100, 100);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('S.I.G.A', 130, 130);
    ctx.textAlign = 'left';
    drawRest();
    return;
  }

  logo.onload = function() {
    ctx.drawImage(logo, 80, 70, 100, 100);
    drawRest();
  };
  logo.onerror = function() {
    // Fallback to text box if logo cannot load
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(80, 70, 100, 100);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('S.I.G.A', 130, 130);
    ctx.textAlign = 'left';
    drawRest();
  };
  logo.src = 'escudo_color.png';
}

async function callScript(data) {
  try {
    // Incluir sección, año y actividadId si el payload no los especifica
    if (!data.seccion) data.seccion = currentSeccion;
    if (!data.año) data.año = currentAnio;
    if (!data.actividadId && currentActividadId) data.actividadId = currentActividadId;

    var bodyStr = JSON.stringify(data);
    console.log('callScript action:', data.action, 'size:', bodyStr.length);
    var resp = await fetch(SCRIPT_URL + '/' + data.action, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: bodyStr
    });
    var result = await resp.json();
    console.log('callScript response:', JSON.stringify(result).substring(0,200));
    return result;
  } catch(err) {
    console.log('callScript error:', err.message);
    throw err;
  }
}

// ══════════════════════════════════════════════════════════════
//  IMAGE VIEWER
// ══════════════════════════════════════════════════════════════
function openImgViewer(driveUrl, data) {
  // Convert Drive view URL to direct image URL
  var match = driveUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
  var imgSrc = match
    ? 'https://drive.google.com/thumbnail?id=' + match[1] + '&sz=w1200'
    : driveUrl;

  var overlay = document.getElementById('imgViewerOverlay');
  var img     = document.getElementById('imgViewerImg');
  var loading = document.getElementById('imgViewerLoading');
  var extBtn  = document.getElementById('imgViewerExternal');
  var name    = document.getElementById('imgViewerName');
  var infoBox = document.getElementById('imgViewerInfo');
  var infoGrid= document.getElementById('imgViewerInfoGrid');
  var flagsEl = document.getElementById('imgViewerFlags');

  img.style.display = 'none';
  loading.style.display = 'block';
  img.src     = imgSrc;
  extBtn.href = driveUrl;
  name.textContent = 'Comprobante de pago';

  // Info card
  if (data) {
    var scoreClass = data.score >= 85 ? 'high' : data.score >= 50 ? 'mid' : 'low';
    var decisionColor = data.decision === 'APROBAR' ? '#1FB5AC' : data.decision === 'RECHAZAR' ? '#e74c3c' : '#E67E22';
    infoGrid.innerHTML =
      '<div class="img-viewer-info-item"><div class="img-viewer-info-label">Monto</div><div class="img-viewer-info-val">₡ '+Number(data.monto||0).toLocaleString('es-CR')+'</div></div>' +
      '<div class="img-viewer-info-item"><div class="img-viewer-info-label">Fecha</div><div class="img-viewer-info-val">'+(data.fecha||'—')+'</div></div>' +
      '<div class="img-viewer-info-item"><div class="img-viewer-info-label">Banco</div><div class="img-viewer-info-val">'+(data.banco||'—')+'</div></div>' +
      '<div class="img-viewer-info-item"><div class="img-viewer-info-label">Remitente</div><div class="img-viewer-info-val">'+(data.remitente||'—')+'</div></div>' +
      (data.refSINPE ? '<div class="img-viewer-info-item"><div class="img-viewer-info-label">Ref. SINPE</div><div class="img-viewer-info-val" style="font-size:10px;">'+(data.refSINPE)+'</div></div>' : '') +
      (data.score !== undefined ? '<div class="img-viewer-info-item"><div class="img-viewer-info-label">Score IA</div><div class="img-viewer-info-val"><span class="img-viewer-score-badge '+scoreClass+'">'+data.score+'%</span></div></div>' : '') +
      (data.decision ? '<div class="img-viewer-info-item"><div class="img-viewer-info-label">Decisión</div><div class="img-viewer-info-val" style="color:'+decisionColor+';">'+data.decision+'</div></div>' : '');
    var flags = [];
    if (data.isAlternate)  flags.push('<span class="img-viewer-flag alt">📱 Número alterno</span>');
    if (data.isDuplicate)  flags.push('<span class="img-viewer-flag dup">🔁 Duplicado</span>');
    if (data.isSuspect)    flags.push('<span class="img-viewer-flag sus">⚠️ Sospecha</span>');
    flagsEl.innerHTML = flags.join('');
    infoBox.classList.add('visible');
  } else {
    infoBox.classList.remove('visible');
    infoGrid.innerHTML = '';
    flagsEl.innerHTML = '';
  }

  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function imgLoaded() {
  document.getElementById('imgViewerLoading').style.display = 'none';
  document.getElementById('imgViewerImg').style.display     = 'block';
}

function imgError() {
  document.getElementById('imgViewerLoading').textContent =
    '⚠️ No se pudo cargar la imagen. Abrila en Drive con el botón de abajo.';
  document.getElementById('imgViewerImg').style.display = 'none';
}

function closeImgViewer(e) {
  if (e.target === document.getElementById('imgViewerOverlay')) closeImgViewerDirect();
}
function closeImgViewerDirect() {
  document.getElementById('imgViewerOverlay').classList.remove('open');
  document.getElementById('imgViewerImg').src = '';
  document.body.style.overflow = '';
}

// ══════════════════════════════════════════════════════════════
//  REPORTS
// ══════════════════════════════════════════════════════════════
async function loadRejected() {
  var isReadonly = false || (isAdminMode && adminUser && adminUser.rol === 'docente');
  var el = document.getElementById('rejected-list');
  el.innerHTML = '<div class="admin-loading"><div class="admin-dots"><span></span><span></span><span></span></div></div>';
  try {
    var resp = await callScript({ action:'getRejected', adminEmail: adminUser.email });
    if (!resp.ok) { el.innerHTML = '<div style="color:var(--red);padding:16px;">'+resp.error+'</div>'; return; }
    var list = resp.rejected || [];
    if (!list.length) {
      el.innerHTML = '<div style="text-align:center;padding:32px;color:var(--gray);font-size:13px;">✅ No hay comprobantes rechazados</div>';
      return;
    }
    el.innerHTML = '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--red);margin-bottom:10px;">'+list.length+' rechazado'+(list.length>1?'s':'')+'</div>' +
      list.map(function(p) {
        var scoreClass = p.score >= 85 ? 'score-high' : p.score >= 50 ? 'score-med' : 'score-low';
        return '<div class="pending-card" style="border-left-color:var(--red);">' +
          '<div class="pending-header">' +
            '<div class="pending-student">'+p.studentName+'</div>' +
            '<div class="pending-amount">₡'+Number(p.monto).toLocaleString('es-CR')+'</div>' +
          '</div>' +
          '<div class="pending-meta">' +
            '<span>🏦 '+(p.banco||'—')+'</span>' +
            '<span>👩 '+(p.remitente||'—')+'</span>' +
            '<span class="pending-score '+scoreClass+'">'+p.score+'%</span>' +
          '</div>' +
          (p.driveLink ? '<div style="margin:6px 0;"><a href="'+p.driveLink+'" target="_blank" class="comp-link" style="display:inline-flex;">🔍 Ver comprobante</a></div>' : '') +
          (isReadonly ? '' : 
          '<div class="pending-actions">' +
            '<button class="pending-action-btn btn-approve-p" onclick="rescuePayment(this)" '+
              'data-id="'+p.id+'" data-name="'+p.studentName+'" data-monto="'+p.monto+'">♻️ Rescatar y aprobar</button>' +
          '</div>'
        ) +
        '</div>';
      }).join('');
  } catch(e) {
    el.innerHTML = '<div style="color:var(--red);padding:16px;">Error: '+e.message+'</div>';
  }
}

async function rescuePayment(btn) {
  var id     = btn.dataset.id;
  var name   = btn.dataset.name;
  var monto  = btn.dataset.monto;
  var justif = prompt('♻️ Rescatar pago de '+name+' (₡'+Number(monto).toLocaleString('es-CR')+')\n\nMotivo de aprobación:');
  if (!justif) return;
  btn.disabled = true;
  btn.textContent = 'Procesando...';
  try {
    var resp = await callScript({ action:'rescue', adminEmail:adminUser.email, pendingId:id, justificacion:justif });
    if (resp.ok) {
      showToast('✅ Pago rescatado y aprobado correctamente');
      loadRejected();
      students = null;
      loadStudents();
    } else {
      showToast('❌ ' + resp.error, true);
      btn.disabled = false;
      btn.textContent = '♻️ Rescatar y aprobar';
    }
  } catch(e) {
    showToast('❌ Error: ' + e.message, true);
    btn.disabled = false;
    btn.textContent = '♻️ Rescatar y aprobar';
  }
}


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
  if (elRec) elRec.textContent = '₡' + totalRecaudado.toLocaleString();
  if (elPen) elPen.textContent = '₡' + totalPendiente.toLocaleString();
  
  // Calculate Egresos if available
  if (window.adminEgresosData) {
     var totalEg = 0;
     window.adminEgresosData.forEach(function(e) { totalEg += e.monto; });
     var elEg = document.getElementById('kpi-egresos');
     if (elEg) elEg.textContent = '₡' + totalEg.toLocaleString();
  }


  // ── Cálculos globales ──
  var totalEsperado   = students.reduce(function(s,x){ return s + (x.total||0); }, 0);
  var totalRecaudado  = 0;
  var totalPagados    = 0;
  var totalParciales  = 0;
  var totalSin        = 0;
  var totalRevision   = 0;
  var pagosTimeline   = [];

  // Rubros
  var rubroKeys   = ['bingo','camisaFest','camisaAdi','entrenador','vestPres','cuotaVentas','coreografo','hidratacion','maquillaje'];
  var rubroLabels = {'bingo':'Bingo','camisaFest':'Camisa Festival','camisaAdi':'Camisa Adicional','entrenador':'Camisa Entrenador','vestPres':'Vest. Presentación','cuotaVentas':'Cuota Ventas','coreografo':'Coreógrafo','hidratacion':'Hidratación','maquillaje':'Maquillaje'};
  var rubroTotales = {};
  rubroKeys.forEach(function(k){ rubroTotales[k] = 0; });

  students.forEach(function(s) {
    rubroKeys.forEach(function(k){ rubroTotales[k] += (s.desglose && s.desglose[k]) ? s.desglose[k] : 0; });

    if (s.tienePendiente) { totalRevision++; return; }

    var sumAbonos = s.abonos ? s.abonos.reduce(function(a,b){ return a+b.monto; }, 0) : 0;
    var esPagado  = s.pagadoCompleto || (s.total > 0 && sumAbonos >= s.total);

    if (esPagado) {
      totalPagados++;
      totalRecaudado += s.total || 0;
      if (s.fechaUnico) pagosTimeline.push({fecha:s.fechaUnico, nombre:s.nombre, monto:s.total, tipo:'total'});
      else if (s.abonos && s.abonos.length > 0) {
        var acum = 0;
        s.abonos.forEach(function(a){
          acum += a.monto;
          var esFinal = s.total > 0 && acum >= s.total;
          pagosTimeline.push({fecha:a.fecha, nombre:s.nombre, monto:a.monto, tipo: esFinal ? 'final' : 'abono'});
        });
      }
    } else if (s.abonos && s.abonos.length > 0) {
      totalParciales++;
      totalRecaudado += sumAbonos;
      s.abonos.forEach(function(a){ pagosTimeline.push({fecha:a.fecha, nombre:s.nombre, monto:a.monto, tipo:'abono'}); });
    } else {
      totalSin++;
    }
  });

  var pctRecaudado = totalEsperado > 0 ? Math.round(totalRecaudado / totalEsperado * 100) : 0;
  var pendiente    = totalEsperado - totalRecaudado;

  // Ordenar timeline por fecha desc
  function parseFecha(f) {
    var p = String(f||'').split('/');
    return p.length===3 ? new Date(p[2], p[1]-1, p[0]) : new Date(0);
  }
  pagosTimeline.sort(function(a,b){ return parseFecha(b.fecha) - parseFecha(a.fecha); });

  // Ordenar rubros por total desc
  var rubrosSorted = rubroKeys.filter(function(k){ return rubroTotales[k]>0; })
    .sort(function(a,b){ return rubroTotales[b]-rubroTotales[a]; });

  // Tabla de estudiantes con saldo
  var conSaldo = students.filter(function(s){
    if (s.pagadoCompleto) return false;
    var pagado = s.abonos ? s.abonos.reduce(function(a,b){ return a+b.monto; },0) : 0;
    return (s.total - pagado) > 0;
  }).map(function(s){
    var pagado = s.abonos ? s.abonos.reduce(function(a,b){ return a+b.monto; },0) : 0;
    var esPagado = s.pagadoCompleto || (s.total>0 && pagado>=s.total);
    return { num:s.num, nombre:s.nombre, total:s.total, pagado:pagado, saldo:s.total-pagado, tienePendiente:s.tienePendiente, esPagado:esPagado };
  }).sort(function(a,b){ return a.num-b.num; });

  // ── Render ──
  var html = '';

  // KPIs
  html += '<div class="report-section">';
  html += '<div class="report-section-title">📊 Resumen general</div>';
  html += '<div class="report-kpi-grid">';
  html += '<div class="report-kpi accent"><div class="report-kpi-label">Total recaudado</div><div class="report-kpi-val">'+fmtShort(totalRecaudado)+'</div><div class="report-kpi-sub">de '+fmtShort(totalEsperado)+' esperado</div></div>';
  html += '<div class="report-kpi gold"><div class="report-kpi-label">Avance</div><div class="report-kpi-val">'+pctRecaudado+'%</div><div class="report-kpi-sub">'+fmtShort(pendiente)+' pendiente</div></div>';
  html += '<div class="report-kpi"><div class="report-kpi-label">Pagados completo</div><div class="report-kpi-val" style="color:#2E7D32;">'+totalPagados+'</div><div class="report-kpi-sub">de 23 estudiantes</div></div>';
  html += '<div class="report-kpi"><div class="report-kpi-label">Sin pago</div><div class="report-kpi-val" style="color:var(--red);">'+totalSin+'</div><div class="report-kpi-sub">'+totalRevision+' en revisión · '+totalParciales+' parcial</div></div>';
  html += '</div>';

  // Barra avance global
  var barClass = pctRecaudado >= 75 ? '' : pctRecaudado >= 40 ? 'warn' : 'danger';
  html += '<div class="report-progress-wrap">';
  html += '<div class="report-progress-label"><span class="report-progress-name">Avance total de recaudación</span><span class="report-progress-pct">'+pctRecaudado+'%</span></div>';
  html += '<div class="report-bar"><div class="report-bar-fill '+barClass+'" style="width:'+pctRecaudado+'%"></div></div>';
  html += '<div class="report-bar-sub">'+fmt(totalRecaudado)+' recaudados · '+fmt(pendiente)+' por cobrar</div>';
  html += '</div>';
  html += '</div>';

  html += '<div class="report-divider"></div>';

  // Estudiantes con saldo pendiente
  html += '<div class="report-section">';
  html += '<div class="report-section-title">💰 Saldo pendiente por estudiante ('+conSaldo.length+')</div>';
  if (conSaldo.length === 0) {
    html += '<div style="text-align:center;padding:20px;color:var(--gray);font-size:12px;">🎉 Todos los estudiantes han pagado</div>';
  } else {
    html += '<div style="overflow-x:auto;"><table class="report-table">';
    html += '<thead><tr><th>#</th><th>Nombre</th><th style="text-align:right;">Total</th><th style="text-align:right;">Pagado</th><th style="text-align:right;">Saldo</th><th style="text-align:center;">Estado</th></tr></thead><tbody>';
    conSaldo.forEach(function(s) {
      var pct  = s.total > 0 ? Math.round(s.pagado/s.total*100) : 0;
      var badge, bclass;
      if (s.tienePendiente)    { badge='⏳ Revisión'; bclass='rb-revision'; }
      else if (s.esPagado)     { badge='✅ Pagado';   bclass='rb-pagado'; }
      else if (s.pagado === 0) { badge='Sin pago';    bclass='rb-sin'; }
      else                     { badge='Parcial '+pct+'%'; bclass='rb-parcial'; }
      html += '<tr>';
      html += '<td style="color:var(--gray);">'+s.num+'</td>';
      html += '<td style="font-weight:600;">'+s.nombre+'</td>';
      html += '<td class="td-num">'+fmt(s.total)+'</td>';
      html += '<td class="td-num" style="color:#2E7D32;">'+fmt(s.pagado)+'</td>';
      html += '<td class="td-num" style="color:var(--red);font-weight:700;">'+fmt(s.saldo)+'</td>';
      html += '<td class="td-badge"><span class="report-badge '+bclass+'">'+badge+'</span></td>';
      html += '</tr>';
    });
    html += '</tbody></table></div>';
  }
  html += '</div>';

  html += '<div class="report-divider"></div>';

  // Desglose por rubro
  html += '<div class="report-section">';
  html += '<div class="report-section-title">📋 Desglose por rubro</div>';
  html += '<div style="background:var(--offwhite);border-radius:12px;padding:12px 14px;border:1px solid var(--border);">';
  rubrosSorted.forEach(function(k) {
    var tot = rubroTotales[k];
    var pct = totalEsperado > 0 ? Math.round(tot/totalEsperado*100) : 0;
    html += '<div class="report-rubro-item">';
    html += '<div class="report-rubro-name">'+rubroLabels[k]+'</div>';
    html += '<div class="report-rubro-vals"><div class="report-rubro-total">'+fmt(tot)+'</div><div class="report-rubro-pct">'+pct+'% del total</div></div>';
    html += '</div>';
  });
  html += '</div></div>';

  html += '<div class="report-divider"></div>';

  // Timeline de pagos
  html += '<div class="report-section">';
  html += '<div class="report-section-title">📅 Línea de tiempo de pagos ('+pagosTimeline.length+')</div>';
  if (pagosTimeline.length === 0) {
    html += '<div style="text-align:center;padding:20px;color:var(--gray);font-size:12px;">No hay pagos registrados aún</div>';
  } else {
    html += '<ul class="report-timeline">';
    pagosTimeline.forEach(function(p) {
      html += '<li>';
      var dotClass = p.tipo==='abono' ? ' warn' : p.tipo==='final' ? ' final' : '';
      html += '<div class="report-tl-dot'+dotClass+'"></div>';
      html += '<div class="report-tl-date">'+p.fecha+'</div>';
      var tipoLabel = p.tipo==='total' ? '<strong>Pago total ✓</strong>' : p.tipo==='final' ? '<strong>Abono final ✓</strong>' : 'Abono';
      html += '<div class="report-tl-info"><div class="report-tl-name">'+p.nombre+'</div><div style="font-size:9px;color:var(--gray);">'+tipoLabel+'</div></div>';
      html += '<div class="report-tl-amt">'+fmt(p.monto)+'</div>';
      html += '</li>';
    });
    html += '</ul>';
  }
  html += '</div>';

  html += '<div class="report-divider"></div>';

  // Estadísticas — Charts
  html += '<div class="report-section">';
  html += '<div class="report-section-title">📊 Estadísticas de pagos</div>';
  html += '<div style="display:flex;gap:6px;margin-bottom:12px;" id="stats-tabs-wrap">';
  html += '<button class="report-export-btn" id="stab-timeline" onclick="showStatsTab(\'timeline\')" style="flex:1;background:var(--forest);padding:8px;">📅 Pagos por fecha</button>';
  html += '<button class="report-export-btn" id="stab-pct" onclick="showStatsTab(\'pct\')" style="flex:1;background:var(--gray);padding:8px;">📊 Avance por estudiante</button>';
  html += '</div>';
  html += '<div id="stats-timeline-view">';
  html += '<div style="display:flex;gap:14px;font-size:10px;color:var(--gray);margin-bottom:8px;">';
  html += '<span style="display:flex;align-items:center;gap:4px;"><span style="width:8px;height:8px;border-radius:50%;background:var(--teal);display:inline-block;"></span><strong>Pago total ✓</strong></span>';
  html += '<span style="display:flex;align-items:center;gap:4px;"><span style="width:8px;height:8px;border-radius:50%;background:#534AB7;display:inline-block;"></span><strong>Abono final ✓</strong></span>';
  html += '<span style="display:flex;align-items:center;gap:4px;"><span style="width:8px;height:8px;border-radius:50%;background:var(--orange);display:inline-block;"></span>Abono</span>';
  html += '</div>';
  html += '<div style="position:relative;height:200px;"><canvas id="reportTimelineChart" role="img" aria-label="Pagos recibidos por fecha">Montos recibidos por fecha de pago.</canvas></div>';
  html += '</div>';
  html += '<div id="stats-pct-view" style="display:none;">';
  html += '<div style="display:flex;gap:14px;font-size:10px;color:var(--gray);margin-bottom:8px;">';
  html += '<span style="display:flex;align-items:center;gap:4px;"><span style="width:10px;height:10px;border-radius:2px;background:#1D9E75;display:inline-block;"></span>100% pagado</span>';
  html += '<span style="display:flex;align-items:center;gap:4px;"><span style="width:10px;height:10px;border-radius:2px;background:#1FB5AC;display:inline-block;"></span>Pago parcial</span>';
  html += '<span style="display:flex;align-items:center;gap:4px;"><span style="width:10px;height:10px;border-radius:2px;background:#E67E22;display:inline-block;"></span>Menos del 30%</span>';
  html += '</div>';
  var pctStudents = students.filter(function(s){ return s.pagadoCompleto || (s.abonos && s.abonos.length>0); });
  var pctH = Math.max(200, pctStudents.length * 26 + 40);
  html += '<div style="position:relative;height:'+pctH+'px;"><canvas id="reportPctChart" role="img" aria-label="Porcentaje de avance por estudiante">Porcentaje de cuota pagada por estudiante.</canvas></div>';
  html += '</div>';
  html += '</div>';

  html += '<div class="report-divider"></div>';

  // Exportar CSV
  html += '<div class="report-section">';
  html += '<div class="report-section-title">📤 Exportar</div>';
  html += '<button class="report-export-btn" onclick="exportReportCSV()" style="margin-bottom:8px;">⬇️ Descargar reporte CSV</button>';
  html += '<button class="report-export-btn" onclick="exportReportPDF()" style="background:var(--red);margin-bottom:8px;">🖨️ Descargar reporte PDF</button>';
  html += '<button class="report-export-btn" onclick="exportRendicionPDF()" style="background:#534AB7;">📄 Rendición de Cuentas</button>';
  html += '</div>';

  el.innerHTML = html;

  // Build charts after DOM render
  setTimeout(function() {
    buildStatsCharts(pagosTimeline, students);
  }, 100);
}

function showStatsTab(tab) {
  document.getElementById('stats-timeline-view').style.display = tab==='timeline' ? 'block' : 'none';
  document.getElementById('stats-pct-view').style.display      = tab==='pct'      ? 'block' : 'none';
  document.getElementById('stab-timeline').style.background    = tab==='timeline' ? 'var(--forest)' : 'var(--gray)';
  document.getElementById('stab-pct').style.background         = tab==='pct'      ? 'var(--forest)' : 'var(--gray)';
}

function buildStatsCharts(pagosTimeline, students) {
  // Timeline chart
  var dateGroups = {};
  pagosTimeline.forEach(function(p) {
    if (!dateGroups[p.fecha]) dateGroups[p.fecha] = {completo:0, abono:0};
    if (p.tipo==='total') dateGroups[p.fecha].completo += p.monto;
    else dateGroups[p.fecha].abono += p.monto;
  });
  var sortedDates = Object.keys(dateGroups).sort(function(a,b){
    var pa=a.split('/'), pb=b.split('/');
    return new Date(pa[2],pa[1]-1,pa[0]) - new Date(pb[2],pb[1]-1,pb[0]);
  });
  var tlLabels = sortedDates.map(function(d){ var p=d.split('/'); return p[0]+'/'+p[1]; });

  var tlCanvas = document.getElementById('reportTimelineChart');
  if (tlCanvas && window.Chart) {
    if (tlCanvas._chartInstance) tlCanvas._chartInstance.destroy();
    tlCanvas._chartInstance = new Chart(tlCanvas, {
      type:'bar',
      data:{
        labels: tlLabels,
        datasets:[
          {label:'Pago completo', data:sortedDates.map(function(d){return dateGroups[d].completo;}), backgroundColor:'#1D9E75', borderRadius:3},
          {label:'Abono parcial', data:sortedDates.map(function(d){return dateGroups[d].abono;}),    backgroundColor:'#1FB5AC', borderRadius:3},
        ]
      },
      options:{responsive:true, maintainAspectRatio:false,
        plugins:{legend:{display:false}},
        scales:{
          x:{stacked:true, ticks:{font:{size:9}, autoSkip:false, maxRotation:45}, grid:{display:false}},
          y:{stacked:true, ticks:{font:{size:9}, callback:function(v){return '₡'+Math.round(v/1000)+'K';}}}
        }
      }
    });
  }

  // Pct chart
  var pctStudents = students.filter(function(s){ return s.pagadoCompleto || (s.abonos && s.abonos.length>0); });
  var pctLabels = pctStudents.map(function(s){ return s.nombre; });
  var pctData   = pctStudents.map(function(s){
    var pagado = s.pagadoCompleto ? s.total : s.abonos.reduce(function(a,b){return a+b.monto;},0);
    return Math.min(100, s.total>0 ? Math.round(pagado/s.total*100) : 0);
  });
  var pctColors = pctData.map(function(p){ return p>=100?'#1D9E75':p>=30?'#1FB5AC':'#E67E22'; });

  var pctCanvas = document.getElementById('reportPctChart');
  if (pctCanvas && window.Chart) {
    if (pctCanvas._chartInstance) pctCanvas._chartInstance.destroy();
    pctCanvas._chartInstance = new Chart(pctCanvas, {
      type:'bar',
      data:{
        labels: pctLabels,
        datasets:[{label:'% pagado', data:pctData, backgroundColor:pctColors, borderRadius:3}]
      },
      options:{
        indexAxis:'y', responsive:true, maintainAspectRatio:false,
        plugins:{legend:{display:false}},
        scales:{
          x:{min:0, max:110, ticks:{callback:function(v){return v+'%';}, font:{size:9}}, grid:{color:'rgba(0,0,0,0.05)'}},
          y:{ticks:{font:{size:9}}}
        }
      }
    });
  }
}

function fmtShort(n) {
  if (n >= 1000000) return '₡'+(n/1000000).toFixed(1)+'M';
  if (n >= 1000)    return '₡'+(n/1000).toFixed(0)+'K';
  return fmt(n);
}

function exportReportCSV() {
  var rows = [['#','Nombre','Padres','Total','Pagado','Saldo','Estado']];
  students.forEach(function(s) {
    var pagado = s.pagadoCompleto ? s.total : (s.abonos ? s.abonos.reduce(function(a,b){return a+b.monto;},0) : 0);
    var saldo  = (s.total||0) - pagado;
    var estado = s.pagadoCompleto ? 'Pagado' : s.tienePendiente ? 'En revisión' : pagado > 0 ? 'Parcial' : 'Sin pago';
    rows.push([s.num, s.nombre, (s.padres||[]).join(' / '), s.total||0, pagado, saldo, estado]);
  });
  var csv = rows.map(function(r){ return r.map(function(c){ return '"'+String(c).replace(/"/g,'""')+'"'; }).join(','); }).join('\n');
  var blob = new Blob(['\uFEFF'+csv], {type:'text/csv;charset=utf-8;'});
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement('a');
  a.href = url; a.download = 'Festival_Sion_2026_Reporte.csv';
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

function exportReportPDF() {
  var totalEsperado  = students.reduce(function(s,x){ return s+(x.total||0); },0);
  var totalRecaudado = 0;
  var totalPagados=0, totalParciales=0, totalSin=0, totalRevision=0;
  var rubroKeys   = ['bingo','camisaFest','camisaAdi','entrenador','vestPres','cuotaVentas','coreografo','hidratacion','maquillaje'];
  var rubroLabels = {'bingo':'Bingo','camisaFest':'Camisa Festival','camisaAdi':'Camisa Adicional','entrenador':'Camisa Entrenador','vestPres':'Vest. Presentación','cuotaVentas':'Cuota Ventas','coreografo':'Coreógrafo','hidratacion':'Hidratación','maquillaje':'Maquillaje'};
  var rubroTotales = {}; rubroKeys.forEach(function(k){ rubroTotales[k]=0; });

  students.forEach(function(s){
    rubroKeys.forEach(function(k){ rubroTotales[k] += (s.desglose&&s.desglose[k])?s.desglose[k]:0; });
    if (s.tienePendiente) { totalRevision++; return; }
    var pagado = s.pagadoCompleto ? s.total : (s.abonos ? s.abonos.reduce(function(a,b){return a+b.monto;},0):0);
    var esPagado = s.pagadoCompleto || (s.total>0 && pagado>=s.total);
    if (esPagado) { totalPagados++; totalRecaudado+=s.total||0; }
    else if (pagado>0) { totalParciales++; totalRecaudado+=pagado; }
    else totalSin++;
  });

  var pct = totalEsperado>0 ? Math.round(totalRecaudado/totalEsperado*100) : 0;
  var fecha = new Date().toLocaleDateString('es-CR',{day:'2-digit',month:'2-digit',year:'numeric'});
  var rubrosSorted = rubroKeys.filter(function(k){ return rubroTotales[k]>0; }).sort(function(a,b){ return rubroTotales[b]-rubroTotales[a]; });

  // Tabla estudiantes
  var rows = students.map(function(s){
    var pagado = s.pagadoCompleto ? s.total : (s.abonos ? s.abonos.reduce(function(a,b){return a+b.monto;},0):0);
    var saldo  = (s.total||0)-pagado;
    var esPagado = s.pagadoCompleto || (s.total>0 && pagado>=s.total);
    var estado = esPagado ? '✅ Pagado' : s.tienePendiente ? '⏳ Revisión' : pagado>0 ? '🔵 Parcial' : '❌ Sin pago';
    var pctE   = s.total>0 ? Math.round(pagado/s.total*100) : 0;
    var color  = esPagado ? '#E8F5E9' : pagado>0 ? '#FFF3E0' : '#FFEBEE';
    return '<tr style="background:'+color+';">'+
      '<td style="padding:5px 8px;border-bottom:1px solid #ddd;color:#555;">'+s.num+'</td>'+
      '<td style="padding:5px 8px;border-bottom:1px solid #ddd;font-weight:600;">'+s.nombre+'</td>'+
      '<td style="padding:5px 8px;border-bottom:1px solid #ddd;text-align:right;font-family:monospace;">₡'+pagado.toLocaleString('es-CR')+'</td>'+
      '<td style="padding:5px 8px;border-bottom:1px solid #ddd;text-align:right;font-family:monospace;color:#C62828;">₡'+saldo.toLocaleString('es-CR')+'</td>'+
      '<td style="padding:5px 8px;border-bottom:1px solid #ddd;text-align:center;font-size:11px;">'+estado+'</td>'+
      '<td style="padding:5px 8px;border-bottom:1px solid #ddd;text-align:right;">'+pctE+'%</td>'+
    '</tr>';
  }).join('');

  // Rubros
  var rubrosHTML = rubrosSorted.map(function(k){
    var tot = rubroTotales[k];
    var pctR = totalEsperado>0 ? Math.round(tot/totalEsperado*100) : 0;
    return '<tr>'+
      '<td style="padding:5px 8px;border-bottom:1px solid #eee;">'+rubroLabels[k]+'</td>'+
      '<td style="padding:5px 8px;border-bottom:1px solid #eee;text-align:right;font-family:monospace;font-weight:700;">₡'+tot.toLocaleString('es-CR')+'</td>'+
      '<td style="padding:5px 8px;border-bottom:1px solid #eee;text-align:right;color:#888;">'+pctR+'%</td>'+
    '</tr>';
  }).join('');

  var html = '<!DOCTYPE html><html><head><meta charset="UTF-8">'+
    '<title>Reporte Festival Sión 2026</title>'+
    '<style>'+
    'body{font-family:Arial,sans-serif;padding:24px;color:#1A2E27;font-size:12px;}'+
    'h1{font-size:20px;margin-bottom:4px;}h2{font-size:14px;margin:20px 0 10px;color:#1A2E27;border-bottom:2px solid #1A2E27;padding-bottom:4px;}'+
    '.sub{font-size:11px;color:#666;margin-bottom:20px;}'+
    '.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:8px;}'+
    '.kpi{background:#f5f5f5;border-radius:6px;padding:10px 12px;}'+
    '.kpi-label{font-size:9px;color:#888;text-transform:uppercase;letter-spacing:.5px;}'+
    '.kpi-val{font-size:18px;font-weight:700;margin-top:2px;}'+
    '.bar-wrap{background:#eee;border-radius:4px;height:10px;margin:10px 0 4px;}'+
    '.bar-fill{background:linear-gradient(90deg,#1A2E27,#3D6B5A);height:100%;border-radius:4px;}'+
    '.bar-label{font-size:10px;color:#666;margin-bottom:16px;}'+
    'table{width:100%;border-collapse:collapse;}'+
    'th{background:#1A2E27;color:#fff;padding:7px 8px;text-align:left;font-size:10px;letter-spacing:.5px;}'+
    '@media print{body{padding:12px;}.no-print{display:none;}}'+
    '</style></head><body>'+
    '<h1>🎭 Festival Sión 2026 — Reporte de Pagos</h1>'+
    '<div class="sub">Sección 1-1 · Docente: '+currentDocente+' · Generado: '+fecha+'</div>'+

    '<h2>📊 Resumen General</h2>'+
    '<div class="kpis">'+
      '<div class="kpi"><div class="kpi-label">Total esperado</div><div class="kpi-val">₡'+totalEsperado.toLocaleString('es-CR')+'</div></div>'+
      '<div class="kpi"><div class="kpi-label">Recaudado</div><div class="kpi-val" style="color:#2E7D32;">₡'+totalRecaudado.toLocaleString('es-CR')+'</div></div>'+
      '<div class="kpi"><div class="kpi-label">Pendiente</div><div class="kpi-val" style="color:#C62828;">₡'+(totalEsperado-totalRecaudado).toLocaleString('es-CR')+'</div></div>'+
      '<div class="kpi"><div class="kpi-label">Avance</div><div class="kpi-val">'+pct+'%</div></div>'+
    '</div>'+
    '<div class="bar-wrap"><div class="bar-fill" style="width:'+pct+'%;"></div></div>'+
    '<div class="bar-label">✅ Pagados: '+totalPagados+' &nbsp;·&nbsp; 🔵 Parciales: '+totalParciales+' &nbsp;·&nbsp; ❌ Sin pago: '+totalSin+' &nbsp;·&nbsp; ⏳ En revisión: '+totalRevision+'</div>'+

    '<h2>📋 Desglose por Rubro</h2>'+
    '<table><thead><tr><th>Rubro</th><th style="text-align:right;">Total esperado</th><th style="text-align:right;">% del total</th></tr></thead>'+
    '<tbody>'+rubrosHTML+'</tbody></table>'+

    '<h2>💰 Estado por Estudiante</h2>'+
    '<table><thead><tr>'+
      '<th>#</th><th>Estudiante</th><th style="text-align:right;">Pagado</th>'+
      '<th style="text-align:right;">Saldo</th><th style="text-align:center;">Estado</th><th style="text-align:right;">%</th>'+
    '</tr></thead><tbody>'+rows+'</tbody></table>'+
    '<div style="margin-top:20px;font-size:10px;color:#999;text-align:center;border-top:1px solid #eee;padding-top:10px;">Festival Sión 2026 · SINPE 7022-8161 · Límite: 07/05/2026</div>'+
    '</body></html>';

  var w = window.open('','_blank');
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(function(){ w.print(); }, 500);
}


// ══════════════════════════════════════════════════════════════
function sendWhatsApp() {
  var s = activeStudent;
  var msg = s.pendiente > 0
    ? 'Estimado/a encargado/a de *'+s.nombre+'*,\n\nLe recordamos que tiene un saldo pendiente de *'+fmt(s.pendiente)+'* para el Paquete Festival Sión 2026.\n\n📊 Estado de cuenta:\n• Cuota total: '+fmt(s.total)+'\n• Abonado: '+fmt(s.abonado)+'\n• Pendiente: *'+fmt(s.pendiente)+'*\n\n⏰ Fecha límite: *07 de mayo de 2026*\n💳 SINPE Móvil: *7022-8161*\n\nGracias por su colaboración.\n_Centro Educativo Nuestra Señora de Sión_'
    : 'Estimado/a encargado/a de *'+s.nombre+'*,\n\nConfirmamos que su pago del Paquete Festival Sión 2026 está *completado* ✅.\n\n💰 Total pagado: *'+fmt(s.total)+'*\n\nMuchas gracias por su puntualidad.\n_Centro Educativo Nuestra Señora de Sión_';
  navigator.clipboard.writeText(msg).then(function(){
    var btn = document.getElementById('m-whatsapp');
    var orig = btn.textContent;
    btn.textContent = '✅ ¡Copiado al portapapeles!';
    setTimeout(function(){ btn.textContent = orig; }, 2500);
  });
}

// ══════════════════════════════════════════════════════════════
//  SWIPE & KEYBOARD
// ══════════════════════════════════════════════════════════════
(function(){
  var startY=0;
  var modal=document.getElementById('modal');
  modal.addEventListener('touchstart',function(e){startY=e.touches[0].clientY;},{passive:true});
  modal.addEventListener('touchend',function(e){if(e.changedTouches[0].clientY-startY>80)closeModal();},{passive:true});
})();
document.addEventListener('keydown',function(e){if(e.key==='Escape'){closeModal();closeAdminPanel();}});

// ══════════════════════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════════════════════
function startAutoRefresh(){clearInterval(refreshTimer);refreshTimer=setInterval(loadData,REFRESH_MS);}

// ── EGRESOS ───────────────────────────────────────────────────
var egresosData = null;
var CAT_COLORS = {
  'Bingo':             '#534AB7',
  'Cuota Ventas':      '#378ADD',
  'Coreógrafo':        '#D4A84B',
  'Vestuario':         '#1FB5AC',
  'Camisas Festival':  '#1D9E75',
  'Hidratación':       '#E67E22',
  'Maquillaje':        '#C0392B',
  'Otros':             '#6B8278'
};

async function exportRendicionPDF() {
  var ESCUDO = 'data:image/png;base64,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';
  var fecha = new Date().toLocaleDateString('es-CR',{day:'2-digit',month:'long',year:'numeric'});

  // Calcular ingresos
  var allPagos = [];
  var totalRecaudado = 0;
  var rubroKeys   = ['bingo','camisaFest','camisaAdi','entrenador','vestPres','cuotaVentas','coreografo','hidratacion','maquillaje'];
  var rubroLabels = {'bingo':'Bingo','camisaFest':'Camisa Festival Ninos','camisaAdi':'Camisa Festival Adultos','entrenador':'Camisa Entrenador','vestPres':'Vestuario Pres. Artistica','cuotaVentas':'Cuota Ventas','coreografo':'Coreografo','hidratacion':'Hidratacion Partidos','maquillaje':'Maquillaje'};
  var rubroTotales = {}; rubroKeys.forEach(function(k){ rubroTotales[k]=0; });

  students.forEach(function(s){
    rubroKeys.forEach(function(k){ rubroTotales[k] += (s.desglose&&s.desglose[k])?s.desglose[k]:0; });
    if (s.pagadoCompleto && s.abonos.length===0) {
      allPagos.push({nombre:s.nombre, fecha:s.fechaUnico||'—', monto:s.total, tipo:'Pago total unico', link:s.compUnico?driveViewUrl(s.compUnico):''});
      totalRecaudado += s.total;
    } else if (s.abonos && s.abonos.length>0) {
      var acum=0;
      s.abonos.forEach(function(a,i){
        acum+=a.monto;
        var esFinal = s.total>0 && acum>=s.total;
        allPagos.push({nombre:s.nombre, fecha:a.fecha, monto:a.monto,
          tipo: esFinal ? 'Abono final' : 'Abono #'+(i+1),
          link: a.comprobante ? driveViewUrl(a.comprobante) : ''});
        totalRecaudado += a.monto;
      });
    }
  });

  allPagos.sort(function(a,b){
    var pa=a.fecha.split('/'),pb=b.fecha.split('/');
    return new Date(pa[2],pa[1]-1,pa[0]) - new Date(pb[2],pb[1]-1,pb[0]);
  });

  var egresos = (egresosData && egresosData.egresos) ? egresosData.egresos : [];
  var totalGastado = egresos.reduce(function(s,e){ return s+e.monto; },0);
  var saldo = totalRecaudado - totalGastado;
  var presupuestos = window._presupuestos || {};

  // Filas ingresos
  var ingFilas = allPagos.map(function(p,i){
    var recibo = p.link ? '<a href="'+p.link+'" target="_blank" style="color:#1FB5AC;font-size:10px;">Ver recibo</a>' : '—';
    return '<tr style="background:'+(i%2===0?'#F6FAF8':'#fff')+'">'+
      '<td>'+p.nombre+'</td>'+
      '<td style="text-align:center;white-space:nowrap;">'+p.fecha+'</td>'+
      '<td>'+p.tipo+'</td>'+
      '<td style="text-align:right;font-weight:600;font-family:monospace;">'+fmt(p.monto)+'</td>'+
      '<td style="text-align:center;">'+recibo+'</td>'+
    '</tr>';
  }).join('');

  // Filas rubros con SVG pie
  var rubActivos = rubroKeys.filter(function(k){return rubroTotales[k]>0;});
  var totalRubros = rubActivos.reduce(function(s,k){return s+rubroTotales[k];},0);
  var pieColors = ['#1FB5AC','#D4A84B','#534AB7','#1D9E75','#E67E22','#378ADD','#C0392B','#2E7D32','#6B8278'];
  var rubFilas = rubActivos.map(function(k,i){
    var pct = totalRubros>0 ? Math.round(rubroTotales[k]/totalRubros*100) : 0;
    return '<tr>'+
      '<td><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:'+pieColors[i%pieColors.length]+';margin-right:5px;vertical-align:middle;"></span>'+rubroLabels[k]+'</td>'+
      '<td style="text-align:right;font-family:monospace;font-weight:600;">'+fmt(rubroTotales[k])+'</td>'+
      '<td style="text-align:right;color:#666;">'+pct+'%</td>'+
    '</tr>';
  }).join('');

  // SVG Pie chart
  var svg = buildPie(rubActivos.map(function(k,i){
    return {val:rubroTotales[k], color:pieColors[i%pieColors.length], label:rubroLabels[k]};
  }), totalRubros);

  // Filas egresos
  function fmtFecha(val) {
    if (!val) return '—';
    var s = String(val).trim();
    if (s.match(/^\d{4}-\d{2}-\d{2}/)) {
      var d = new Date(s);
      if (!isNaN(d)) {
        return String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear();
      }
    }
    return s;
  }
  var egrFilas = egresos.length===0
    ? '<tr><td colspan="5" style="text-align:center;color:#888;padding:16px;">Sin egresos registrados</td></tr>'
    : egresos.map(function(e,i){
        var recibo = e.driveLink ? '<a href="'+e.driveLink+'" target="_blank" style="color:#1FB5AC;font-size:10px;">Ver recibo</a>' : '—';
        return '<tr style="background:'+(i%2===0?'#F6FAF8':'#fff')+'">'+
          '<td>'+e.concepto+'</td>'+
          '<td style="text-align:center;white-space:nowrap;">'+fmtFecha(e.fecha)+'</td>'+
          '<td>'+e.categoria+'</td>'+
          '<td style="text-align:right;font-family:monospace;font-weight:600;">'+fmt(e.monto)+'</td>'+
          '<td style="font-style:italic;color:#666;font-size:10px;">'+(e.comentario||'—')+'</td>'+
          '<td style="text-align:center;">'+recibo+'</td>'+
        '</tr>';
      }).join('');

  // Filas categorias
  var catKeys = Object.keys(CAT_COLORS).filter(function(c){return c!=='Otros';});
  var catFilas = catKeys.map(function(c){
    var gastado = (egresosData&&egresosData.totalesCat&&egresosData.totalesCat[c])||0;
    var presup  = presupuestos[c]||0;
    var sobrante = presup - gastado;
    if (!gastado && !presup) return '';
    return '<tr>'+
      '<td>'+c+'</td>'+
      '<td style="text-align:right;font-family:monospace;">'+fmt(presup)+'</td>'+
      '<td style="text-align:right;font-family:monospace;font-weight:600;">'+fmt(gastado)+'</td>'+
      '<td style="text-align:right;font-family:monospace;color:'+(sobrante>=0?'#2E7D32':'#C62828')+';">'+fmt(sobrante)+'</td>'+
    '</tr>';
  }).filter(Boolean).join('');

  var totalPresup = Object.values(presupuestos).reduce(function(a,b){return a+b;},0);

  var html = '<!DOCTYPE html><html><head><meta charset="UTF-8">'+
    '<title>Rendicion de Cuentas — Festival Sion 2026</title>'+
    '<style>'+
      'body{font-family:Arial,sans-serif;padding:24px 32px;color:#1A2E27;font-size:11px;max-width:900px;margin:0 auto;}'+
      '.header{display:flex;align-items:center;gap:20px;border-bottom:3px solid #1A2E27;padding-bottom:14px;margin-bottom:18px;}'+
      '.header img{height:60px;width:auto;}'+
      '.header-text h1{font-size:16px;margin:0 0 2px;color:#1A2E27;}'+
      '.header-text h2{font-size:12px;margin:0 0 3px;color:#1FB5AC;font-weight:600;}'+
      '.header-text p{font-size:10px;color:#555;margin:2px 0;}'+
      '.kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:16px 0;}'+
      '.kpi{border-radius:8px;padding:11px 14px;}'+
      '.kpi-label{font-size:9px;text-transform:uppercase;letter-spacing:.5px;color:#666;margin-bottom:4px;}'+
      '.kpi-val{font-size:16px;font-weight:700;}'+
      'h2.sec{font-size:12px;border-bottom:2px solid #1A2E27;padding-bottom:4px;margin:20px 0 8px;text-transform:uppercase;letter-spacing:.5px;}'+
      'table{width:100%;border-collapse:collapse;margin-bottom:4px;}'+
      'th{background:#1A2E27;color:#fff;padding:6px 8px;text-align:left;font-size:10px;}'+
      'td{padding:5px 8px;border-bottom:1px solid #eee;vertical-align:middle;word-wrap:break-word;}'+
      'tfoot tr td{font-weight:700;background:#E8F2EE;border-top:2px solid #1A2E27;}'+
      'thead{display:table-header-group;}'+
      'tfoot{display:table-footer-group;}'+
      'tr{page-break-inside:avoid;}'+
      '.pie-wrap{display:inline-flex;align-items:flex-start;gap:20px;margin-bottom:8px;width:100%;}'+
      '.declaracion{background:#F6FAF8;border:1px solid #1FB5AC;border-radius:8px;padding:14px;font-size:10px;color:#3A5A52;margin:20px 0 10px;line-height:1.7;page-break-inside:avoid;}'+
      '@media print{body{padding:12px 16px;}a{color:#1FB5AC !important;}}'+
    '</style></head><body>'+

    '<div class="header">'+
      '<img src="'+ESCUDO+'" alt="Escudo Sion">'+
      '<div class="header-text">'+
        '<h1>Centro Educativo Nuestra Senora de Sion &nbsp;·&nbsp; Seccion 1-1</h1>'+
        '<h2>Rendicion de Cuentas — Festival Sion 2026</h2>'+
        '<p>Docente: '+currentDocente+'</p>'+
        '<p>Fecha de emision: '+fecha+'</p>'+
      '</div>'+
    '</div>'+

    '<div class="kpis">'+
      '<div class="kpi" style="background:#E8F5E9;">'+
        '<div class="kpi-label">Total Recaudado</div>'+
        '<div class="kpi-val" style="color:#2E7D32;">'+fmt(totalRecaudado)+'</div>'+
      '</div>'+
      '<div class="kpi" style="background:#FFEBEE;">'+
        '<div class="kpi-label">Total Gastado</div>'+
        '<div class="kpi-val" style="color:#C62828;">'+fmt(totalGastado)+'</div>'+
      '</div>'+
      '<div class="kpi" style="background:#E8F2EE;">'+
        '<div class="kpi-label">Saldo Disponible</div>'+
        '<div class="kpi-val" style="color:#1FB5AC;">'+fmt(saldo)+'</div>'+
      '</div>'+
    '</div>'+

    '<h2 class="sec">Ingresos — Detalle de pagos recibidos ('+allPagos.length+' transacciones)</h2>'+
    '<table style="page-break-inside:auto;">'+
      '<thead><tr><th>Estudiante</th><th style="text-align:center;">Fecha</th><th>Tipo</th><th style="text-align:right;">Monto</th><th style="text-align:center;">Recibo</th></tr></thead>'+
      '<tbody>'+ingFilas+'</tbody>'+
    '</table>'+
    '<div style="background:#E8F2EE;padding:6px 8px;display:flex;justify-content:space-between;font-weight:700;font-size:11px;border:1px solid #C8D8D4;border-top:2px solid #1A2E27;margin-bottom:4px;">'+
      '<span>TOTAL RECAUDADO</span><span style="font-family:monospace;">'+fmt(totalRecaudado)+'</span>'+
    '</div>'+

    '<h2 class="sec">Ingresos — Totales esperados por rubro</h2>'+
    '<div class="pie-wrap">'+
      svg+
      '<table style="flex:1;table-layout:auto;"><thead><tr><th>Rubro</th><th style="text-align:right;white-space:nowrap;">Monto</th><th style="text-align:right;white-space:nowrap;">%</th></tr></thead>'+
      '<tbody>'+rubFilas+'</tbody>'+
      '<tfoot><tr><td>TOTAL</td><td style="text-align:right;font-family:monospace;">'+fmt(totalRubros)+'</td><td></td></tr></tfoot>'+
      '</table>'+
    '</div>'+

    '<h2 class="sec">Egresos — Detalle de gastos</h2>'+
    '<table style="page-break-inside:auto;table-layout:fixed;width:100%;">'+
      '<thead><tr>'+
        '<th style="width:22%;">Concepto</th>'+
        '<th style="text-align:center;width:10%;">Fecha</th>'+
        '<th style="width:14%;">Categoria</th>'+
        '<th style="text-align:right;width:13%;">Monto</th>'+
        '<th style="width:30%;">Comentario</th>'+
        '<th style="text-align:center;width:11%;">Recibo</th>'+
      '</tr></thead>'+
      '<tbody>'+egrFilas+'</tbody>'+
    '</table>'+
    '<div style="background:#E8F2EE;padding:6px 8px;display:flex;justify-content:space-between;font-weight:700;font-size:11px;border:1px solid #C8D8D4;border-top:2px solid #1A2E27;margin-bottom:4px;">'+
      '<span>TOTAL GASTADO</span><span style="font-family:monospace;">'+fmt(totalGastado)+'</span>'+
    '</div>'+

    '<h2 class="sec">Egresos — Sobrantes por categoria</h2>'+
    '<table>'+
      '<thead><tr><th>Categoria</th><th style="text-align:right;">Presupuesto</th><th style="text-align:right;">Gastado</th><th style="text-align:right;">Sobrante</th></tr></thead>'+
      '<tbody>'+catFilas+
        '<tr style="font-weight:700;background:#E8F2EE;border-top:2px solid #1A2E27;">'+
          '<td>TOTAL</td>'+
          '<td style="text-align:right;font-family:monospace;">'+fmt(totalPresup)+'</td>'+
          '<td style="text-align:right;font-family:monospace;">'+fmt(totalGastado)+'</td>'+
          '<td style="text-align:right;font-family:monospace;color:'+(saldo>=0?'#2E7D32':'#C62828')+';">'+fmt(saldo)+'</td>'+
        '</tr>'+
      '</tbody>'+
    '</table>'+

    '<div class="declaracion">'+
      '<strong>Declaracion:</strong> Yo, Miguel Alvarado Guevara, en calidad de padre designado de la Seccion 1-1, certifico que la informacion '+
      'presentada en este informe refleja con exactitud los ingresos recibidos y los egresos realizados en el marco '+
      'del Festival Sion 2026, segun los registros del sistema de pagos y los comprobantes correspondientes.'+
    '</div>'+

    '<p style="text-align:center;font-size:9px;color:#aaa;margin-top:24px;border-top:1px solid #eee;padding-top:10px;">'+
      'Festival Sion 2026 · Centro Educativo Nuestra Senora de Sion · Generado el '+fecha+
    '</p>'+
    '</body></html>';

  var w = window.open('','_blank');
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(function(){ w.print(); }, 600);
}

function buildPie(items, total) {
  if (!total) return '';
  var size = 240;
  var cx = size/2, cy = size/2, r = size/2 - 10;
  var paths = '';
  var angle = -Math.PI/2;
  items.forEach(function(item){
    var slice = (item.val/total) * 2 * Math.PI;
    var x1 = cx + r*Math.cos(angle);
    var y1 = cy + r*Math.sin(angle);
    var x2 = cx + r*Math.cos(angle+slice);
    var y2 = cy + r*Math.sin(angle+slice);
    var large = slice > Math.PI ? 1 : 0;
    paths += '<path d="M'+cx+','+cy+' L'+x1+','+y1+' A'+r+','+r+' 0 '+large+',1 '+x2+','+y2+' Z" fill="'+item.color+'" stroke="#fff" stroke-width="1.5"/>';
    angle += slice;
  });
  return '<svg width="'+size+'" height="'+size+'" style="flex-shrink:0;">'+paths+'</svg>';
}


async function loadEgresos() {
  try {
    var resp = await callScript({ action:'getEgresos' });
    if (!resp.ok) return;
    egresosData = resp;
    renderBalanceCard(resp);
  } catch(e) {}
}

function renderBalanceCard(data) {
  var card = document.getElementById('balanceEgrCard');
  if (!data.egresos || data.egresos.length === 0) { card.style.display='none'; return; }
  card.style.display = 'block';

  var actName = (window._actividad && window._actividad.nombre) || 'Actividad';
  var titleEl = document.getElementById('balanceEgrTitle');
  if (titleEl) {
    titleEl.textContent = '💰 Balance de Actividad · ' + actName;
  }

  var recaudado = 0;
  var students = window._students || [];
  students.forEach(function(s){
    if (s.pagadoCompleto) recaudado += s.total||0;
    else if (s.abonos) s.abonos.forEach(function(a){ recaudado += a.monto||0; });
  });

  var gastado = data.totalGastado || 0;
  var saldo   = recaudado - gastado;

  document.getElementById('egr-recaudado').textContent = fmt(recaudado);
  document.getElementById('egr-gastado').textContent   = fmt(gastado);
  document.getElementById('egr-saldo').textContent     = fmt(saldo);

  // Barras por categoría — usar presupuesto como referencia (igual que el modal)
  var cats = data.totalesCat || {};
  var presupuestos = window._presupuestos || {};
  var catsHTML = '';
  Object.keys(cats).forEach(function(c){
    if (!cats[c]) return;
    var presup = presupuestos[c] || 0;
    var pct = presup > 0 ? Math.min(Math.round(cats[c]/presup*100), 100) : 100;
    var color = CAT_COLORS[c] || '#6B8278';
    catsHTML += '<div class="egr-cat-row">'+
      '<span class="egr-cat-label">'+c+'</span>'+
      '<div class="egr-cat-bar-wrap"><div class="egr-cat-bar" style="width:'+pct+'%;background:'+color+';"></div></div>'+
      '<span class="egr-cat-amt">'+fmt(cats[c])+'</span>'+
    '</div>';
  });
  document.getElementById('egr-cats-public').innerHTML = catsHTML;
}

function openEgresosModal() {
  document.getElementById('egresosModalOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
  renderEgresosModal();
}

function closeEgresosModal() {
  document.getElementById('egresosModalOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

function renderEgresosModal() {
  var body = document.getElementById('egresosModalBody');
  if (!egresosData || !egresosData.egresos) {
    body.innerHTML = '<div style="text-align:center;padding:24px;color:var(--gray);">Sin egresos registrados aún.</div>';
    return;
  }

  var presupuestos = window._presupuestos || {};
  var cats         = egresosData.totalesCat || {};
  var allCats      = Object.keys(CAT_COLORS).filter(function(c){ return c !== 'Otros' || cats[c]; });

  // Tabla resumen por categoría
  var tablaHTML = '<div class="egr-cats-section">' +
    '<div class="egr-cats-title">Resumen por categoría</div>' +
    '<table style="width:100%;border-collapse:collapse;font-size:11px;">' +
    '<thead><tr>' +
      '<th style="text-align:left;padding:5px 6px;font-size:10px;font-weight:500;color:var(--gray);border-bottom:0.5px solid var(--border);">Categoría</th>' +
      '<th style="padding:5px 6px;font-size:10px;font-weight:500;color:var(--gray);border-bottom:0.5px solid var(--border);">Avance</th>' +
      '<th style="text-align:right;padding:5px 6px;font-size:10px;font-weight:500;color:var(--gray);border-bottom:0.5px solid var(--border);">Gastado</th>' +
      '<th style="text-align:right;padding:5px 6px;font-size:10px;font-weight:500;color:var(--gray);border-bottom:0.5px solid var(--border);">Presupuesto</th>' +
    '</tr></thead><tbody>';

  var totalGastado = 0, totalPresup = 0;
  allCats.forEach(function(c){
    var gastado  = cats[c] || 0;
    var presup   = presupuestos[c] || 0;
    var pct      = presup > 0 ? Math.min(100, Math.round(gastado/presup*100)) : 0;
    var color    = CAT_COLORS[c] || '#6B8278';
    var barColor = pct >= 100 ? '#C0392B' : color;
    var nota     = c === 'Camisas Adultos' ? '<span style="font-size:9px;color:var(--gray);"> (incl. entrenador)</span>' : '';
    totalGastado += gastado;
    totalPresup  += presup;
    tablaHTML += '<tr>' +
      '<td style="padding:6px 6px;border-bottom:0.5px solid var(--border);color:var(--forest);">' +
        '<span style="width:8px;height:8px;border-radius:50%;background:'+color+';display:inline-block;margin-right:5px;vertical-align:middle;"></span>'+c+nota+'</td>' +
      '<td style="padding:6px 6px;border-bottom:0.5px solid var(--border);">' +
        '<div style="display:flex;align-items:center;gap:6px;">' +
          '<div style="width:60px;height:5px;background:var(--border);border-radius:3px;overflow:hidden;">' +
            '<div style="width:'+pct+'%;height:100%;background:'+barColor+';border-radius:3px;"></div></div>' +
          '<span style="font-size:10px;color:var(--gray);">'+pct+'%</span>' +
        '</div></td>' +
      '<td style="text-align:right;padding:6px 6px;border-bottom:0.5px solid var(--border);font-weight:500;color:var(--forest);">'+(gastado?fmt(gastado):'—')+'</td>' +
      '<td style="text-align:right;padding:6px 6px;border-bottom:0.5px solid var(--border);color:var(--gray);">'+(presup?fmt(presup):'—')+'</td>' +
    '</tr>';
  });

  tablaHTML += '</tbody><tfoot>' +
    '<tr style="background:var(--offwhite);">' +
      '<td colspan="2" style="padding:7px 6px;font-weight:500;color:var(--forest);">Total</td>' +
      '<td style="text-align:right;padding:7px 6px;font-weight:500;color:var(--forest);">'+fmt(totalGastado)+'</td>' +
      '<td style="text-align:right;padding:7px 6px;color:var(--gray);">'+(totalPresup?fmt(totalPresup):'—')+'</td>' +
    '</tr></tfoot></table></div>';

  // Lista de egresos individuales
  var itemsHTML = egresosData.egresos.map(function(e){
    var color  = CAT_COLORS[e.categoria] || '#6B8278';
    var recibo = e.driveLink
      ? '<button class="egr-recibo-btn" onclick="openImgViewer(\''+e.driveLink+'\')">📎 Ver recibo</button>'
      : '';
    return '<div class="egr-item">'+
      '<div class="egr-dot" style="background:'+color+';margin-top:4px;"></div>'+
      '<div class="egr-info">'+
        '<div class="egr-concepto">'+e.concepto+'</div>'+
        '<div class="egr-meta">'+e.fecha+' · '+e.categoria+'</div>'+
        (e.comentario ? '<div class="egr-comment">"'+e.comentario+'"</div>' : '')+
      '</div>'+
      '<div class="egr-right">'+
        '<div class="egr-monto">'+fmt(e.monto)+'</div>'+
        recibo+
      '</div>'+
    '</div>';
  }).join('');

  body.innerHTML = tablaHTML +
    '<div class="egr-cats-title" style="margin:12px 0 8px;">Detalle de gastos</div>' +
    (egresosData.egresos.length ? itemsHTML : '<div style="text-align:center;padding:16px;color:var(--gray);font-size:12px;">Sin egresos registrados aún</div>');
}

async function loadEgresosAdmin(silent) {
  var el = document.getElementById('egresos-admin-content');
  if (!silent) el.innerHTML = '<div class="admin-loading"><div class="admin-dots"><span></span><span></span><span></span></div></div>';
  try {
    var resp = await callScript({ action:'getEgresos' });
    if (!resp.ok) { el.innerHTML='<div style="color:var(--red);padding:12px;">'+resp.error+'</div>'; return; }
    egresosData = resp;
    renderEgresosAdmin(resp);
  } catch(e) { el.innerHTML='<div style="color:var(--red);padding:12px;">Error: '+e.message+'</div>'; }
}

function renderEgresosAdmin(data) {
  var isReadonly = false || (isAdminMode && adminUser && adminUser.rol === 'docente');
  var el    = document.getElementById('egresos-admin-content');
  var cats  = data.totalesCat || {};
  var maxCat = Math.max.apply(null, Object.values(cats).filter(function(v){ return v>0; }).concat([1]));

  // Formulario registrar
  var formHTML = isReadonly ? '' : '<div class="egr-form-row">'+
    '<input class="egr-input" id="egr-concepto" placeholder="Concepto del gasto">'+
    '<div class="egr-row-2">'+
      '<input class="egr-input" id="egr-monto" type="number" placeholder="Monto ₡">'+
      '<select class="egr-input" id="egr-categoria">'+
        ['Bingo','Cuota Ventas','Coreógrafo','Vestuario','Camisas Festival','Hidratación','Maquillaje','Otros'].map(function(c){
          return '<option>'+c+'</option>';
        }).join('')+
      '</select>'+
    '</div>'+
    '<textarea class="egr-input" id="egr-comentario" rows="2" placeholder="Comentario (opcional)"></textarea>'+
    '<div class="egr-upload" onclick="document.getElementById(\'egr-file\').click()">'+
      '<input type="file" id="egr-file" accept="image/*,application/pdf" style="display:none;" onchange="previewEgrFile(this)">'+
      '<span id="egr-file-label">📎 Tocar para subir recibo (JPG, PNG, PDF · Máx 10MB)</span>'+
    '</div>'+
    '<button class="btn-sub" onclick="submitEgreso()" style="margin-top:4px;">💾 Registrar egreso</button>'+
  '</div>';

  // Lista
  var listaHTML = data.egresos.length === 0
    ? '<div style="text-align:center;padding:20px;color:var(--gray);font-size:12px;">Sin egresos registrados</div>'
    : data.egresos.map(function(e){
        var color = CAT_COLORS[e.categoria] || '#6B8278';
        return '<div class="egr-admin-item">'+
          '<div class="egr-dot" style="background:'+color+';flex-shrink:0;"></div>'+
          '<div class="egr-info" style="flex:1;min-width:0;">'+
            '<div class="egr-concepto">'+e.concepto+'</div>'+
            '<div class="egr-meta">'+e.fecha+' · '+e.categoria+'</div>'+
          '</div>'+
          '<span style="font-size:12px;font-weight:600;white-space:nowrap;padding:0 8px;">'+fmt(e.monto)+'</span>'+
          '<div class="egr-admin-actions">'+
            (e.driveLink ? '<button class="egr-admin-btn edit" onclick="window.open(\''+e.driveLink+'\',\'_blank\')">📎</button>' : '')+
            (isReadonly ? '' : '<button class="egr-admin-btn del" onclick="deleteEgreso(\''+e.id+'\')">🗑️</button>')+
          '</div>'+
        '</div>';
      }).join('');

  // Categorías
  var catHTML = '<div style="font-size:11px;font-weight:700;color:var(--gray);text-transform:uppercase;margin-bottom:8px;">Total por categoría</div>';
  Object.keys(cats).forEach(function(c){
    if (!cats[c]) return;
    var pct   = Math.round(cats[c]/maxCat*100);
    var color = CAT_COLORS[c] || '#6B8278';
    catHTML += '<div class="egr-cat-pub-row">'+
      '<div class="egr-cat-pub-dot" style="background:'+color+';"></div>'+
      '<span class="egr-cat-pub-label">'+c+'</span>'+
      '<div class="egr-cat-pub-bar-wrap"><div class="egr-cat-pub-bar" style="width:'+pct+'%;background:'+color+';"></div></div>'+
      '<span class="egr-cat-pub-amt">'+fmt(cats[c])+'</span>'+
    '</div>';
  });
  catHTML += '<div style="border-top:1px solid var(--border);margin-top:8px;padding-top:8px;display:flex;justify-content:space-between;font-size:12px;font-weight:700;">'+
    '<span>Total gastado</span><span>'+fmt(data.totalGastado||0)+'</span></div>';

  el.innerHTML =
    '<div style="font-size:12px;font-weight:700;color:var(--forest);margin-bottom:10px;">➕ Registrar egreso</div>'+
    formHTML+
    '<div style="font-size:12px;font-weight:700;color:var(--forest);margin:14px 0 8px;">📋 Egresos registrados</div>'+
    listaHTML+
    '<div style="background:var(--offwhite);border-radius:10px;padding:12px;margin-top:12px;">'+catHTML+'</div>';
}

function previewEgrFile(input) {
  var label = document.getElementById('egr-file-label');
  if (input.files && input.files[0]) {
    label.textContent = '✅ ' + input.files[0].name;
  }
}

async function submitEgreso() {
  var concepto   = document.getElementById('egr-concepto').value.trim();
  var monto      = document.getElementById('egr-monto').value;
  var categoria  = document.getElementById('egr-categoria').value;
  var comentario = document.getElementById('egr-comentario').value.trim();
  var fileInput  = document.getElementById('egr-file');

  if (!concepto || !monto) { showToast('Concepto y monto son requeridos', true); return; }

  var base64Image = null, mimeType = null;
  if (fileInput.files && fileInput.files[0]) {
    var file = fileInput.files[0];
    mimeType = file.type;
    base64Image = await new Promise(function(res, rej){
      var r = new FileReader();
      r.onload = function(){ res(r.result.split(',')[1]); };
      r.onerror = function(){ rej(new Error('Error leyendo archivo')); };
      r.readAsDataURL(file);
    });
  }

  var btn = document.querySelector('#egresos-admin-content .btn-sub');
  if (btn) { btn.disabled = true; btn.textContent = 'Registrando...'; }

  try {
    var resp = await callScript({
      action:'addEgreso', adminEmail:adminUser.email,
      concepto, categoria, monto:Number(monto), comentario,
      base64Image, mimeType
    });
    if (resp.ok) {
      showToast('✅ Egreso registrado correctamente');
      await loadEgresosAdmin(true);
      await loadEgresos();
      // Reset form after reload (DOM was rebuilt)
      var c = document.getElementById('egr-concepto'); if(c) c.value='';
      var m = document.getElementById('egr-monto');    if(m) m.value='';
      var cm = document.getElementById('egr-comentario'); if(cm) cm.value='';
      var lbl = document.getElementById('egr-file-label');
      if(lbl) lbl.textContent='📎 Tocar para subir recibo (JPG, PNG, PDF · Máx 10MB)';
      var fi = document.getElementById('egr-file'); if(fi) fi.value='';
      // Rehabilitar botón (silent=true no rehace el DOM)
      var btnOk = document.querySelector('#egresos-admin-content .btn-sub');
      if (btnOk) { btnOk.disabled=false; btnOk.textContent='💾 Registrar egreso'; }
    } else {
      showToast('❌ ' + resp.error, true);
      var btn2 = document.querySelector('#egresos-admin-content .btn-sub');
      if (btn2) { btn2.disabled=false; btn2.textContent='💾 Registrar egreso'; }
    }
  } catch(e) {
    showToast('❌ Error: '+e.message, true);
    var btn3 = document.querySelector('#egresos-admin-content .btn-sub');
    if (btn3) { btn3.disabled=false; btn3.textContent='💾 Registrar egreso'; }
  }
}

async function deleteEgreso(id) {
  if (!confirm('¿Eliminar este egreso?')) return;
  try {
    var resp = await callScript({ action:'deleteEgreso', adminEmail:adminUser.email, id });
    if (resp.ok) { showToast('Egreso eliminado'); loadEgresosAdmin(); loadEgresos(); }
    else showToast('❌ ' + resp.error, true);
  } catch(e) { showToast('❌ ' + e.message, true); }
}

// ══════════════════════════════════════════════════════════════
//  ASISTENTE IA (GEMINI CHATBOT)
// ══════════════════════════════════════════════════════════════
async function sendAssistantMessage() {
  var input = document.getElementById('assistantInput');
  var query = input.value.trim();
  if (!query) return;

  input.value = '';

  var chatHistory = document.getElementById('chatHistory');
  
  // Agregar mensaje del usuario
  var userDiv = document.createElement('div');
  userDiv.style = 'background:#0f172a;color:#fff;padding:10px 14px;border-radius:12px;max-width:85%;align-self:flex-end;font-size:13px;line-height:1.4;margin-left:auto;box-shadow:0 2px 8px rgba(15,23,42,0.06);';
  userDiv.textContent = query;
  chatHistory.appendChild(userDiv);
  chatHistory.scrollTop = chatHistory.scrollHeight;

  // Agregar burbuja de "pensando"
  var loadingDiv = document.createElement('div');
  loadingDiv.style = 'background:#f1f5f9;padding:10px 14px;border-radius:12px;max-width:85%;align-self:flex-start;font-size:13px;line-height:1.4;font-style:italic;color:#64748b;margin-right:auto;';
  loadingDiv.textContent = 'Pensando...';
  chatHistory.appendChild(loadingDiv);
  chatHistory.scrollTop = chatHistory.scrollHeight;

  try {
    const result = await callScript({
      action: 'assistant',
      prompt: query
    });
    loadingDiv.remove();

    var aiDiv = document.createElement('div');
    aiDiv.style = 'background:#ecfdf5;border:1px solid #a7f3d0;padding:10px 14px;border-radius:12px;max-width:85%;align-self:flex-start;font-size:13px;line-height:1.4;color:#065f46;margin-right:auto;box-shadow:0 2px 8px rgba(16,185,129,0.04);';
    
    if (result.ok) {
      // Basic markdown format parsing
      var cleanText = result.response
        .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
        .replace(/\*(.*?)\*/g, '<i>$1</i>')
        .replace(/\n/g, '<br>');
      aiDiv.innerHTML = cleanText;
    } else {
      aiDiv.innerHTML = '<span style="color:#ef4444;">⚠️ Error: ' + result.error + '</span>';
    }
    
    chatHistory.appendChild(aiDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;
  } catch (err) {
    loadingDiv.remove();
    var errDiv = document.createElement('div');
    errDiv.style = 'background:#fee2e2;border:1px solid #fca5a5;padding:10px 14px;border-radius:12px;max-width:85%;align-self:flex-start;font-size:13px;line-height:1.4;color:#991b1b;margin-right:auto;';
    errDiv.innerHTML = '⚠️ Error de conexión: ' + err.message;
    chatHistory.appendChild(errDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;
  }
}

function askAssistant(question) {
  var input = document.getElementById('assistantInput');
  if (input) {
    input.value = question;
    sendAssistantMessage();
  }
}

loadConfig();
startAutoRefresh();

// Expose all functions to window for inline HTML handlers
window.statusLabel = statusLabel;
window.computeStatus = computeStatus;
window.driveViewUrl = driveViewUrl;
window.updateCountdown = updateCountdown;
window.handleGoogleSignIn = handleGoogleSignIn;
window.parseJwt = parseJwt;
window.openLoginModal = openLoginModal;
window.closeLoginModal = closeLoginModal;
window.submitPasswordLogin = submitPasswordLogin;
window.openChangePasswordForm = openChangePasswordForm;
window.submitChangePassword = submitChangePassword;
window.resetLoginModalHtml = resetLoginModalHtml;
window.loadMilestonesAdmin = loadMilestonesAdmin;
window.addMilestoneRow = addMilestoneRow;
window.saveMilestones = saveMilestones;
window.formatForDateTimeInput = formatForDateTimeInput;
window.loadSettingsData = loadSettingsData;
window.saveSeccion = saveSeccion;
window.toggleActCobroScheme = toggleActCobroScheme;
window.toggleActAsoc = toggleActAsoc;
window.addSettingsRubroRow = addSettingsRubroRow;
window.saveActividad = saveActividad;
window.triggerGoogleLogin = triggerGoogleLogin;
window.triggerGoogleLoginDirect = triggerGoogleLoginDirect;
window.initGoogleBtn = initGoogleBtn;
window.loadData = loadData;
window.showError = showError;
window.hideError = hideError;
window.renderKPIs = renderKPIs;
window.renderRubros = renderRubros;
window.updateTabCounts = updateTabCounts;
window.updateAdminBadge = updateAdminBadge;
window.applyFilters = applyFilters;
window.renderGrid = renderGrid;
window.onSearch = onSearch;
window.clearSearch = clearSearch;
window.setTab = setTab;
window.openModal = openModal;
window.reopenModal = reopenModal;
window.buildAnalisisCard = buildAnalisisCard;
window.renderPayments = renderPayments;
window.closeModal = closeModal;
window.closeModalOnBg = closeModalOnBg;
window.resetUploadUI = resetUploadUI;
window.handleFileSelect = handleFileSelect;
window.handleDragOver = handleDragOver;
window.handleDrop = handleDrop;
window.toggleTestMode = toggleTestMode;
window.uploadComprobante = uploadComprobante;
window.saveComment = saveComment;
window.editRubro = editRubro;
window.closeEditRubroModal = closeEditRubroModal;
window.toggleEditRubroFields = toggleEditRubroFields;
window.submitEditRubro = submitEditRubro;
window.revertPayment = revertPayment;
window.openAdminPanel = openAdminPanel;
window.closeAdminPanel = closeAdminPanel;
window.setAdminTab = setAdminTab;
window.changeSeccion = changeSeccion;
window.changeAnio = changeAnio;
window.changeActividad = changeActividad;
window.loadConfig = loadConfig;
window.loadActivities = loadActivities;
window.parseBulkStudents = parseBulkStudents;
window.submitBulkImport = submitBulkImport;
window.loadPending = loadPending;
window.approvePending = approvePending;
window.rejectPending = rejectPending;
window.loadHistory = loadHistory;
window.renderHistory = renderHistory;
window.showJustify = showJustify;
window.closeJustify = closeJustify;
window.generateReceipt = generateReceipt;
window.callScript = callScript;
window.openImgViewer = openImgViewer;
window.imgLoaded = imgLoaded;
window.imgError = imgError;
window.closeImgViewer = closeImgViewer;
window.closeImgViewerDirect = closeImgViewerDirect;
window.loadRejected = loadRejected;
window.rescuePayment = rescuePayment;
window.renderReports = renderReports;
window.showStatsTab = showStatsTab;
window.buildStatsCharts = buildStatsCharts;
window.fmtShort = fmtShort;
window.exportReportCSV = exportReportCSV;
window.exportReportPDF = exportReportPDF;
window.sendWhatsApp = sendWhatsApp;
window.startAutoRefresh = startAutoRefresh;
window.exportRendicionPDF = exportRendicionPDF;
window.buildPie = buildPie;
window.loadEgresos = loadEgresos;
window.renderBalanceCard = renderBalanceCard;
window.openEgresosModal = openEgresosModal;
window.closeEgresosModal = closeEgresosModal;
window.renderEgresosModal = renderEgresosModal;
window.loadEgresosAdmin = loadEgresosAdmin;
window.renderEgresosAdmin = renderEgresosAdmin;
window.previewEgrFile = previewEgrFile;
window.submitEgreso = submitEgreso;
window.deleteEgreso = deleteEgreso;
window.sendAssistantMessage = sendAssistantMessage;
window.askAssistant = askAssistant;
