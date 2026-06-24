const fs = require('fs');

function patchHtml(filename) {
  if (!fs.existsSync(filename)) return;
  let html = fs.readFileSync(filename, 'utf8');

  // 1. Inject Login Modal HTML just before </body>
  const loginModalHTML = `
<!-- SAGA LOGIN MODAL -->
<div class="modal-overlay" id="loginModal" style="display:none; z-index:9999;">
  <div class="modal-content" style="max-width: 350px;">
    <h3 style="margin-bottom:15px; color:#fff; text-align:center;">Acceso Administrativo</h3>
    <div style="margin-bottom:15px;">
      <label style="display:block; font-size:12px; color:#aaa; margin-bottom:5px;">Correo o Usuario</label>
      <input type="text" id="loginEmail" style="width:100%; padding:10px; background:var(--bg-card); border:1px solid rgba(255,255,255,0.1); border-radius:8px; color:#fff;" placeholder="admin@ejemplo.com">
    </div>
    <div style="margin-bottom:20px;">
      <label style="display:block; font-size:12px; color:#aaa; margin-bottom:5px;">Contrase\u00F1a</label>
      <input type="password" id="loginPassword" style="width:100%; padding:10px; background:var(--bg-card); border:1px solid rgba(255,255,255,0.1); border-radius:8px; color:#fff;" placeholder="••••••••">
    </div>
    <div style="display:flex; gap:10px;">
      <button onclick="closeLoginModal()" style="flex:1; padding:10px; background:rgba(255,255,255,0.1); border:none; border-radius:8px; color:#fff; cursor:pointer;">Cancelar</button>
      <button onclick="submitLogin()" style="flex:1; padding:10px; background:var(--accent); border:none; border-radius:8px; color:#000; font-weight:bold; cursor:pointer;">Ingresar</button>
    </div>
  </div>
</div>
`;
  if (!html.includes('id="loginModal"')) {
    html = html.replace('</body>', loginModalHTML + '\n</body>');
  }

  // 2. Change Google Login Button to custom login button
  html = html.replace(
    /onclick="triggerGoogleLogin\(\)"/g, 
    'onclick="openLoginModal()"'
  );

  // 3. Add JS functions for Login
  const loginJs = `
function openLoginModal() {
  document.getElementById('loginModal').style.display = 'flex';
}
function closeLoginModal() {
  document.getElementById('loginModal').style.display = 'none';
}
async function submitLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value.trim();
  if (!email || !password) return alert('Ingresa usuario y contrase\u00F1a');
  
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
      alert('Bienvenido ' + result.admin.nombre);
      await loadData();
    } else {
      alert(result.error || 'Credenciales inv\u00E1lidas');
    }
  } catch(e) {
    alert('Error de conexi\u00F3n');
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
`;

  if (!html.includes('submitLogin() {')) {
    html = html.replace('</script>', loginJs + '\n</script>');
  }

  // 4. Change /login to /api/login in old google handleCredentialResponse
  // Actually, we don't need Google login anymore, but we can leave it broken or remove it. 
  // We'll replace SCRIPT_URL + '/login' with SCRIPT_URL + '/api/login' just in case.
  html = html.replace(/SCRIPT_URL \+ '\/login'/g, "SCRIPT_URL + '/api/login'");

  // 5. Enforce hiding admin tabs if not logged in
  // Modify the tab logic. Currently it might check window.adminEmail. 
  // We will let the existing UI logic handle visibility based on window.adminEmail.

  fs.writeFileSync(filename, html, 'utf8');
  console.log('Patched ' + filename);
}

patchHtml('index.html');
patchHtml('index_github.html');

