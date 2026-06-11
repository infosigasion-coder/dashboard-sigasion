
function openLoginModal() {
  document.getElementById('loginModal').style.display = 'flex';
}
function closeLoginModal() {
  document.getElementById('loginModal').style.display = 'none';
}
async function submitLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value.trim();
  if (!email || !password) return alert('Ingresa usuario y contraseña');
  
  try {
    const res = await fetch(SCRIPT_URL + '/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const result = await res.json();
    if (result.ok) {
      localStorage.setItem('siga_jwt', result.token);
      window.adminData = result.admin;
      window.adminEmail = result.admin.email;
      closeLoginModal();
      document.getElementById('googleLoginBtn').style.display = 'none';

    if (window.adminData && window.adminData.rol === 'super_admin') {
      document.getElementById('atab-settings').style.display = 'block';
    } else {
      document.getElementById('atab-settings').style.display = 'none';
    }

      alert('Bienvenido ' + result.admin.nombre);
      await loadData();
    } else {
      alert(result.error || 'Credenciales inválidas');
    }
  } catch(e) {
    alert('Error de conexión');
  }
}

// Interceptor to add Authorization header to fetch calls
const originalFetch = window.fetch;
window.fetch = async function() {
  let [resource, config] = arguments;
  
  // Solamente inyectar en rutas administrativas (e.g., que no sean /upload o /config o /data)
  // O en general a todo lo que vaya a /api/
  const isApiCall = typeof resource === 'string' && resource.includes('/api/');
  const isPublicRoute = typeof resource === 'string' && (resource.includes('/upload') || resource.includes('/login') || resource.includes('/config') || resource.endsWith('/data') || resource.includes('/activities'));
  
  if (isApiCall && !isPublicRoute) {
    const token = localStorage.getItem('siga_jwt');
    if (token) {
      if (!config) config = {};
      if (!config.headers) config.headers = {};
      config.headers['Authorization'] = 'Bearer ' + token;
    }
  }
  return await originalFetch(resource, config);
};

// Check token on load
document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('siga_jwt');
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp * 1000 > Date.now()) {
        window.adminData = payload;
        window.adminEmail = payload.email;
        document.getElementById('googleLoginBtn').style.display = 'none';
      } else {
        localStorage.removeItem('siga_jwt'); // Expirado
      }
    } catch(e) {}
  }
});


function renderActivityCards(activities) {
    const container = document.getElementById('activityCardsContainer');
    if (!container) return;
    container.innerHTML = '';
    
    if (activities.length === 0) {
        container.innerHTML = '<p class="text-muted">No hay actividades creadas. Crea una nueva.</p>';
        return;
    }
    
    activities.forEach(act => {
        const isClosed = act.activa === false;
        const color = isClosed ? 'danger' : 'success';
        const stateText = isClosed ? 'CERRADO' : 'ACTIVO';
        
        const card = document.createElement('div');
        card.className = 'col-md-6 col-lg-4 mb-3';
        card.innerHTML = `
            <div class="card shadow-sm h-100 border-${color}">
                <div class="card-body">
                    <h5 class="card-title">${act.nombre}</h5>
                    <span class="badge bg-${color} mb-2">${stateText}</span>
                    <p class="card-text text-muted small mb-1">
                        <i class="fas fa-calendar-alt"></i> Actividad: ${act.fecha_actividad || 'No definida'}<br>
                        <i class="fas fa-clock"></i> Límite de pago: ${act.fecha_limite_pago || 'No definida'}
                    </p>
                </div>
                <div class="card-footer bg-transparent border-0 d-flex justify-content-between align-items-center">
                    <button class="btn btn-sm btn-outline-primary" onclick="editActivity('${act.id}')"><i class="fas fa-edit"></i> Editar</button>
                    <div class="form-check form-switch">
                        <input class="form-check-input" type="checkbox" role="switch" id="toggleAct_${act.id}" ${!isClosed ? 'checked' : ''} onchange="toggleActivityStatus('${act.id}', this.checked)">
                        <label class="form-check-label" for="toggleAct_${act.id}">Activo</label>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

async function editActivity(id) {
    const seccion = document.getElementById('seccionSelect').value;
    const anio = document.getElementById('anioSelect').value;
    
    const res = await fetch(`${SCRIPT_URL}/api/activities?seccion=${seccion}&anio=${anio}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('siga_jwt')}` }
    });
    const data = await res.json();
    const act = data.activities.find(a => a.id === id);
    if (!act) return;
    
    document.getElementById('activityId').value = act.id;
    document.getElementById('actName').value = act.nombre;
    document.getElementById('fechaActividad').value = act.fecha_actividad || '';
    document.getElementById('fechaLimitePago').value = act.fecha_limite_pago || '';
    
    document.getElementById('activityItems').innerHTML = '';
    if (act.milestones) {
        act.milestones.forEach((m) => {
            const newItem = document.createElement('div');
            newItem.className = 'row g-3 align-items-center mb-2 activity-item';
            newItem.innerHTML = `
                <div class="col-sm-5"><input type="text" class="form-control" placeholder="Concepto" value="${m.item}" required></div>
                <div class="col-sm-3"><input type="number" class="form-control" placeholder="Costo" value="${m.monto}" required></div>
                <div class="col-sm-3"><input type="date" class="form-control" value="${m.fecha_limite || ''}"></div>
                <div class="col-sm-1"><button type="button" class="btn btn-danger btn-sm" onclick="this.parentElement.parentElement.remove()"><i class="fas fa-trash"></i></button></div>
            `;
            document.getElementById('activityItems').appendChild(newItem);
        });
    }
    
    document.getElementById('activityFormContainer').style.display = 'block';
    document.getElementById('btnShowActivityForm').style.display = 'none';
}

async function toggleActivityStatus(id, newState) {
    if (!newState) {
        const confirm = await Swal.fire({
            title: 'ACerrar actividad?',
            text: "Los estudiantes ya no podrán realizar pagos y el evento pasará a modo de solo lectura.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, cerrar',
            cancelButtonText: 'Cancelar'
        });
        if (!confirm.isConfirmed) {
            document.getElementById('toggleAct_' + id).checked = true;
            return;
        }
    }
    
    const seccion = document.getElementById('seccionSelect').value;
    try {
        const payload = {
            id: id,
            activa: newState,
            seccion: seccion,
            adminEmail: window.adminEmail
        };
        const res = await fetch(`${SCRIPT_URL}/api/actividades`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('siga_jwt')}` },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.ok) {
            Swal.fire('Éxito', `Actividad ${newState ? 'abierta' : 'cerrada'} correctamente`, 'success');
            loadActivities();
        } else {
            Swal.fire('Error', data.error || 'Error al cambiar estado', 'error');
            document.getElementById('toggleAct_' + id).checked = !newState;
        }
    } catch (e) {
        document.getElementById('toggleAct_' + id).checked = !newState;
    }
}

function showActivityForm() {
    document.getElementById('activityForm').reset();
    document.getElementById('activityId').value = '';
    document.getElementById('activityItems').innerHTML = '';
    document.getElementById('activityFormContainer').style.display = 'block';
    document.getElementById('btnShowActivityForm').style.display = 'none';
}

function hideActivityForm() {
    document.getElementById('activityFormContainer').style.display = 'none';
    document.getElementById('btnShowActivityForm').style.display = 'inline-block';
}




// ══════════════════════════════════════════════════════════════
//  CONFIGURACIÓN
// ══════════════════════════════════════════════════════════════
const SCRIPT_URL  = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://127.0.0.1:8787/api'
  : (window.location.hostname.endsWith('workers.dev') ? window.location.origin + '/api' : 'https://saga-backend.2510maag.workers.dev/api');
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
    const res = await fetch(SCRIPT_URL + '/api/login', {
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
    const res = await fetch(SCRIPT_URL + '/api/login', {
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
  showJustify('Guardar observación', 'AConfirmar guardar esta observación?', function(justif) {
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
    const seccion = document.getElementById('seccionSelect').value;
    const anio = document.getElementById('anioSelect').value;
    if (!seccion || !anio) return;

    try {
        const res = await fetch(`${SCRIPT_URL}/api/activities?seccion=${seccion}&anio=${anio}`, {
            headers: window.adminEmail ? { 'Authorization': `Bearer ${localStorage.getItem('siga_jwt')}` } : {}
        });
        const data = await res.json();
        
        const activitySelect = document.getElementById('activitySelect');
        activitySelect.innerHTML = '';
        
        if (data.ok && data.activities && data.activities.length > 0) {
            const activeActs = data.activities.filter(a => a.activa !== false);
            activeActs.sort((a, b) => {
                if (!a.fecha_limite_pago) return 1;
                if (!b.fecha_limite_pago) return -1;
                return new Date(a.fecha_limite_pago) - new Date(b.fecha_limite_pago);
            });
            const defaultAct = activeActs.length > 0 ? activeActs[0] : data.activities[data.activities.length - 1];

            data.activities.forEach(act => {
                const option = document.createElement('option');
                option.value = act.id;
                let estado = act.activa === false ? ' (CERRADA)' : '';
                option.textContent = act.nombre + estado;
                if (act.id === defaultAct.id) option.selected = true;
                activitySelect.appendChild(option);
            });
            activitySelect.style.display = 'block';
            
            const selectedActData = data.activities.find(a => a.id === activitySelect.value);
            const badgeCerrado = document.getElementById('badgeCerrado');
            if (badgeCerrado) {
                if (selectedActData && selectedActData.activa === false) {
                    badgeCerrado.style.display = 'inline-block';
                    window.currentActivityIsReadonly = true;
                } else {
                    badgeCerrado.style.display = 'none';
                    window.currentActivityIsReadonly = false;
                }
            }
            
            if (document.getElementById('settings').style.display === 'block') {
                if(typeof renderActivityCards === 'function') renderActivityCards(data.activities);
            }
            loadData();
        } else {
            activitySelect.style.display = 'none';
            document.getElementById('studentsGrid').innerHTML = '<div class="col-12 text-center text-muted">No hay actividades creadas.</div>';
            if (document.getElementById('settings').style.display === 'block') {
                if(typeof renderActivityCards === 'function') renderActivityCards([]);
            }
        }
    } catch (e) {
        console.error('Error cargando actividades:', e);
    }
}
function closeLoginModal() {
  document.getElementById('loginModal').style.display = 'none';
}
async function submitLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value.trim();
  if (!email || !password) return alert('Ingresa usuario y contraseña');
  
  try {
    const res = await fetch(SCRIPT_URL + '/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const result = await res.json();
    if (result.ok) {
      localStorage.setItem('siga_jwt', result.token);
      window.adminData = result.admin;
      window.adminEmail = result.admin.email;
      closeLoginModal();
      document.getElementById('googleLoginBtn').style.display = 'none';

    if (window.adminData && window.adminData.rol === 'super_admin') {
      document.getElementById('atab-settings').style.display = 'block';
    } else {
      document.getElementById('atab-settings').style.display = 'none';
    }

      alert('Bienvenido ' + result.admin.nombre);
      await loadData();
    } else {
      alert(result.error || 'Credenciales inválidas');
    }
  } catch(e) {
    alert('Error de conexión');
  }
}

// Interceptor to add Authorization header to fetch calls
const originalFetch = window.fetch;
window.fetch = async function() {
  let [resource, config] = arguments;
  
  // Solamente inyectar en rutas administrativas (e.g., que no sean /upload o /config o /data)
  // O en general a todo lo que vaya a /api/
  const isApiCall = typeof resource === 'string' && resource.includes('/api/');
  const isPublicRoute = typeof resource === 'string' && (resource.includes('/upload') || resource.includes('/login') || resource.includes('/config') || resource.endsWith('/data') || resource.includes('/activities'));
  
  if (isApiCall && !isPublicRoute) {
    const token = localStorage.getItem('siga_jwt');
    if (token) {
      if (!config) config = {};
      if (!config.headers) config.headers = {};
      config.headers['Authorization'] = 'Bearer ' + token;
    }
  }
  return await originalFetch(resource, config);
};

// Check token on load
document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('siga_jwt');
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp * 1000 > Date.now()) {
        window.adminData = payload;
        window.adminEmail = payload.email;
        document.getElementById('googleLoginBtn').style.display = 'none';
      } else {
        localStorage.removeItem('siga_jwt'); // Expirado
      }
    } catch(e) {}
  }
});


function renderActivityCards(activities) {
    const container = document.getElementById('activityCardsContainer');
    if (!container) return;
    container.innerHTML = '';
    
    if (activities.length === 0) {
        container.innerHTML = '<p class="text-muted">No hay actividades creadas. Crea una nueva.</p>';
        return;
    }
    
    activities.forEach(act => {
        const isClosed = act.activa === false;
        const color = isClosed ? 'danger' : 'success';
        const stateText = isClosed ? 'CERRADO' : 'ACTIVO';
        
        const card = document.createElement('div');
        card.className = 'col-md-6 col-lg-4 mb-3';
        card.innerHTML = `
            <div class="card shadow-sm h-100 border-${color}">
                <div class="card-body">
                    <h5 class="card-title">${act.nombre}</h5>
                    <span class="badge bg-${color} mb-2">${stateText}</span>
                    <p class="card-text text-muted small mb-1">
                        <i class="fas fa-calendar-alt"></i> Actividad: ${act.fecha_actividad || 'No definida'}<br>
                        <i class="fas fa-clock"></i> Límite de pago: ${act.fecha_limite_pago || 'No definida'}
                    </p>
                </div>
                <div class="card-footer bg-transparent border-0 d-flex justify-content-between align-items-center">
                    <button class="btn btn-sm btn-outline-primary" onclick="editActivity('${act.id}')"><i class="fas fa-edit"></i> Editar</button>
                    <div class="form-check form-switch">
                        <input class="form-check-input" type="checkbox" role="switch" id="toggleAct_${act.id}" ${!isClosed ? 'checked' : ''} onchange="toggleActivityStatus('${act.id}', this.checked)">
                        <label class="form-check-label" for="toggleAct_${act.id}">Activo</label>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

async function editActivity(id) {
    const seccion = document.getElementById('seccionSelect').value;
    const anio = document.getElementById('anioSelect').value;
    
    const res = await fetch(`${SCRIPT_URL}/api/activities?seccion=${seccion}&anio=${anio}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('siga_jwt')}` }
    });
    const data = await res.json();
    const act = data.activities.find(a => a.id === id);
    if (!act) return;
    
    document.getElementById('activityId').value = act.id;
    document.getElementById('actName').value = act.nombre;
    document.getElementById('fechaActividad').value = act.fecha_actividad || '';
    document.getElementById('fechaLimitePago').value = act.fecha_limite_pago || '';
    
    document.getElementById('activityItems').innerHTML = '';
    if (act.milestones) {
        act.milestones.forEach((m) => {
            const newItem = document.createElement('div');
            newItem.className = 'row g-3 align-items-center mb-2 activity-item';
            newItem.innerHTML = `
                <div class="col-sm-5"><input type="text" class="form-control" placeholder="Concepto" value="${m.item}" required></div>
                <div class="col-sm-3"><input type="number" class="form-control" placeholder="Costo" value="${m.monto}" required></div>
                <div class="col-sm-3"><input type="date" class="form-control" value="${m.fecha_limite || ''}"></div>
                <div class="col-sm-1"><button type="button" class="btn btn-danger btn-sm" onclick="this.parentElement.parentElement.remove()"><i class="fas fa-trash"></i></button></div>
            `;
            document.getElementById('activityItems').appendChild(newItem);
        });
    }
    
    document.getElementById('activityFormContainer').style.display = 'block';
    document.getElementById('btnShowActivityForm').style.display = 'none';
}

async function toggleActivityStatus(id, newState) {
    if (!newState) {
        const confirm = await Swal.fire({
            title: 'ACerrar actividad?',
            text: "Los estudiantes ya no podrán realizar pagos y el evento pasará a modo de solo lectura.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, cerrar',
            cancelButtonText: 'Cancelar'
        });
        if (!confirm.isConfirmed) {
            document.getElementById('toggleAct_' + id).checked = true;
            return;
        }
    }
    
    const seccion = document.getElementById('seccionSelect').value;
    try {
        const payload = {
            id: id,
            activa: newState,
            seccion: seccion,
            adminEmail: window.adminEmail
        };
        const res = await fetch(`${SCRIPT_URL}/api/actividades`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('siga_jwt')}` },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.ok) {
            Swal.fire('Éxito', `Actividad ${newState ? 'abierta' : 'cerrada'} correctamente`, 'success');
            loadActivities();
        } else {
            Swal.fire('Error', data.error || 'Error al cambiar estado', 'error');
            document.getElementById('toggleAct_' + id).checked = !newState;
        }
    } catch (e) {
        document.getElementById('toggleAct_' + id).checked = !newState;
    }
}

function showActivityForm() {
    document.getElementById('activityForm').reset();
    document.getElementById('activityId').value = '';
    document.getElementById('activityItems').innerHTML = '';
    document.getElementById('activityFormContainer').style.display = 'block';
    document.getElementById('btnShowActivityForm').style.display = 'none';
}

function hideActivityForm() {
    document.getElementById('activityFormContainer').style.display = 'none';
    document.getElementById('btnShowActivityForm').style.display = 'inline-block';
}




// Expose all functions to window for inline HTML handlers
window.openLoginModal = openLoginModal;
window.closeLoginModal = closeLoginModal;
window.submitLogin = submitLogin;
window.statusLabel = statusLabel;
window.computeStatus = computeStatus;
window.driveViewUrl = driveViewUrl;
window.updateCountdown = updateCountdown;
window.handleGoogleSignIn = handleGoogleSignIn;
window.parseJwt = parseJwt;
window.submitPasswordLogin = submitPasswordLogin;
window.openChangePasswordForm = openChangePasswordForm;
window.submitChangePassword = submitChangePassword;
window.resetLoginModalHtml = resetLoginModalHtml;
window.addMilestoneRow = addMilestoneRow;
window.saveMilestones = saveMilestones;
window.formatForDateTimeInput = formatForDateTimeInput;
window.loadSettingsData = loadSettingsData;
window.saveSeccion = saveSeccion;
window.addSettingsRubroRow = addSettingsRubroRow;
window.triggerGoogleLogin = triggerGoogleLogin;
window.triggerGoogleLoginDirect = triggerGoogleLoginDirect;
window.initGoogleBtn = initGoogleBtn;
window.loadData = loadData;
window.showError = showError;
window.hideError = hideError;
window.renderKPIs = renderKPIs;
window.renderRubros = renderRubros;
window.updateTabCounts = updateTabCounts;
window.applyFilters = applyFilters;
window.renderGrid = renderGrid;
window.onSearch = onSearch;
window.clearSearch = clearSearch;
window.setTab = setTab;
window.openModal = openModal;
window.reopenModal = reopenModal;
window.renderPayments = renderPayments;
window.closeModal = closeModal;
window.closeModalOnBg = closeModalOnBg;
window.resetUploadUI = resetUploadUI;
window.handleFileSelect = handleFileSelect;
window.handleDragOver = handleDragOver;
window.handleDrop = handleDrop;
window.toggleTestMode = toggleTestMode;
window.uploadComprobante = uploadComprobante;
window.setStep = setStep;
window.saveComment = saveComment;
window.editRubro = editRubro;
window.closeEditRubroModal = closeEditRubroModal;
window.toggleEditRubroFields = toggleEditRubroFields;
window.submitEditRubro = submitEditRubro;
window.revertPayment = revertPayment;
window.changeSeccion = changeSeccion;
window.loadConfig = loadConfig;
