const fs = require('fs');
let js = fs.readFileSync('js/main.js', 'utf8');

// Fix 1: Tabs (P-007)
js = js.replace(
  "var tabs = ['pending', 'history', 'reports', 'rejected', 'egresos', 'bulk', 'milestones', 'assistant', 'settings'];",
  "var tabs = ['pending', 'history', 'reports', 'rejected', 'egresos', 'bulk', 'milestones', 'assistant', 'settings', 'students'];"
);

// Fix 2: Login Token (P-002)
const loginTarget = `      adminUser = { 
        email: result.admin.email, 
        name: result.admin.nombre, 
        picture: null, 
        rol: result.admin.rol, 
        seccion: result.admin.seccion,
        username: result.admin.username
      };
      isAdminMode = true;`;

const loginReplacement = `      adminUser = { 
        email: result.admin.email, 
        name: result.admin.nombre, 
        picture: null, 
        rol: result.admin.rol, 
        seccion: result.admin.seccion,
        username: result.admin.username
      };
      localStorage.setItem('siga_jwt', result.token);
      isAdminMode = true;`;
js = js.replace(loginTarget, loginReplacement);

// Fix 3: Hide login button (P-001)
const hideTarget = `      document.getElementById('adminBtn').classList.add('visible');
      document.getElementById('googleLoginBtn').classList.remove('visible');`;
const hideReplacement = `      document.getElementById('adminBtn').classList.add('visible');
      document.getElementById('googleLoginBtn').style.display = 'none';`;
js = js.replace(hideTarget, hideReplacement);

// Fix 4: Google Login (P-002 Google fix & P-001 hide)
const googleTarget = `  const fakeToken = btoa('{}') + '.' + btoa(JSON.stringify({ email: email, exp: (Date.now() / 1000) + 3600 })) + '.';
  localStorage.setItem('siga_jwt', fakeToken);
  
  isAdminMode = true;
  document.body.classList.add('admin-mode');
  const adminBtn = document.getElementById('adminBtn');
  if (adminBtn) adminBtn.classList.add('visible');
  const googleBtn = document.getElementById('googleLoginBtn');
  if (googleBtn) googleBtn.classList.remove('visible');`;

const googleReplacement = `  try {
    document.getElementById('updatedBadge').textContent = '🔑 Verificando...';
    const res = await fetch(SCRIPT_URL + '/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, isGoogle: true })
    });
    const result = await res.json();
    
    if (result.ok) {
      adminUser = { 
        email: result.admin.email, 
        name: result.admin.nombre, 
        picture: payload.picture, 
        rol: result.admin.rol, 
        seccion: result.admin.seccion,
        username: result.admin.username
      };
      localStorage.setItem('siga_jwt', result.token);
      isAdminMode = true;
      document.body.classList.add('admin-mode');
      const adminBtn = document.getElementById('adminBtn');
      if (adminBtn) adminBtn.classList.add('visible');
      const googleBtn = document.getElementById('googleLoginBtn');
      if (googleBtn) googleBtn.style.display = 'none';
    } else {
      alert('Error de acceso: ' + result.error);
      return;
    }
  } catch (err) {
    alert('Error de conexión con el servidor.');
    return;
  }`;
js = js.replace(googleTarget, googleReplacement);

fs.writeFileSync('js/main.js', js, 'utf8');
console.log('js/main.js patched successfully');
