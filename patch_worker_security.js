const fs = require('fs');

let worker = fs.readFileSync('worker.js', 'utf8');

// 1. Add hono/jwt import
if (!worker.includes('hono/jwt')) {
    worker = worker.replace(
        "import { cors } from 'hono/cors';",
        "import { cors } from 'hono/cors';\nimport { sign, verify } from 'hono/jwt';"
    );
}

// 2. Add crypto functions and login route
const cryptoLogic = `
// --- SECURITY FUNCTIONS ---
async function hashPassword(password, salt = crypto.randomUUID()) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(password), { name: "PBKDF2" }, false, ["deriveBits"]);
  const saltBuf = enc.encode(salt);
  const derivedBits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: saltBuf, iterations: 100000, hash: "SHA-256" }, keyMaterial, 256);
  const hashArray = Array.from(new Uint8Array(derivedBits));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return \`\${salt}:\${hashHex}\`;
}

async function verifyPassword(password, storedHash) {
  if (!storedHash) return false;
  if (!storedHash.includes(':')) {
    const enc = new TextEncoder();
    const data = enc.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex === storedHash;
  }
  const [salt, hash] = storedHash.split(':');
  const expectedHash = await hashPassword(password, salt);
  return expectedHash === storedHash;
}

async function authAdmin(c, reqSeccion) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { valid: false, error: 'Acceso denegado: Token JWT no proporcionado.' };
  }
  const token = authHeader.split(' ')[1];
  try {
    const admin = await verify(token, c.env.JWT_SECRET || 'siga_default_secret_2027');
    if (admin.rol === 'super_admin' || admin.seccion === null) return { valid: true, admin };
    if (admin.seccion === reqSeccion) return { valid: true, admin };
    return { valid: false, error: \`No tienes permisos para administrar la secci\u00F3n \${reqSeccion}.\` };
  } catch (err) {
    return { valid: false, error: 'Token expirado o inv\u00E1lido. Inicia sesi\u00F3n de nuevo.' };
  }
}

app.post('/api/login', async (c) => {
  try {
    const env = c.env;
    const { email, password } = await c.req.json();
    if (!email || !password) return c.json({ ok: false, error: 'Faltan credenciales' }, 400);

    const supabase = getSupabase(env);
    const { data: admin, error } = await supabase
      .from('admins')
      .select('*')
      .eq('email', email)
      .eq('activo', true)
      .single();

    if (error || !admin) return c.json({ ok: false, error: 'Credenciales inv\u00E1lidas' }, 401);

    const isValid = await verifyPassword(password, admin.password_hash);
    if (!isValid) return c.json({ ok: false, error: 'Credenciales inv\u00E1lidas' }, 401);

    // Actualizar hash si es legado (simple SHA-256)
    if (!admin.password_hash.includes(':')) {
        const newHash = await hashPassword(password);
        await supabase.from('admins').update({ password_hash: newHash }).eq('id', admin.id);
    }

    const exp = Math.floor(Date.now() / 1000) + (24 * 60 * 60);
    const payload = {
      id: admin.id,
      email: admin.email,
      nombre: admin.nombre,
      rol: admin.rol,
      seccion: admin.seccion,
      exp: exp
    };
    
    const token = await sign(payload, env.JWT_SECRET || 'siga_default_secret_2027');
    return c.json({ ok: true, token, admin: payload });
  } catch (err) {
    console.error('Error en login:', err);
    return c.json({ ok: false, error: 'Error interno en el servidor.' }, 500);
  }
});
// ----------------------------
`;

if (!worker.includes('async function hashPassword')) {
    worker = worker.replace(
        "const app = new Hono();",
        "const app = new Hono();\n" + cryptoLogic
    );
}

// 3. Remove old verificarAdmin
const oldAuthRegex = /\/\/ Helper para verificar admin[\s\S]+?async function verificarAdmin[\s\S]+?return { valid: false, error: `No tienes permisos para administrar la secci\\u00F3n \${seccion}\.` };\n}/;
worker = worker.replace(oldAuthRegex, '');
// Also without unicode escape if they used actual ó
const oldAuthRegex2 = /\/\/ Helper para verificar admin[\s\S]+?async function verificarAdmin[\s\S]+?return { valid: false, error: `No tienes permisos para administrar la secci[oó]n \${seccion}\.` };\n}/;
worker = worker.replace(oldAuthRegex2, '');

// 4. Replace verificarAdmin usages
worker = worker.replace(/await verificarAdmin\(adminEmail, ([^,]+), supabase\)/g, "await authAdmin(c, $1)");
worker = worker.replace(/await verificarAdmin\(registradoPor, ([^,]+), supabase\)/g, "await authAdmin(c, $1)");

// 5. Fix waitUntil for sendTelegram
worker = worker.replace(/await sendTelegram\(([^)]+)\);/g, "c.executionCtx.waitUntil(sendTelegram($1));");

// 6. Handle Unique Constraint 23505 in POST /api/upload
// The error block currently has `if (errPago) throw errPago;` inside POST /api/upload
worker = worker.replace(
    "if (errPago) throw errPago;",
    "if (errPago) {\n        if (errPago.code === '23505') return c.json({ ok: false, error: 'Esta referencia SINPE ya fue registrada en el sistema. Si crees que es un error, contacta a la administración.' }, 409);\n        throw errPago;\n      }"
);
worker = worker.replace(
    "if (errPendiente) throw errPendiente;",
    "if (errPendiente) {\n      if (errPendiente.code === '23505') return c.json({ ok: false, error: 'Esta referencia SINPE ya fue registrada en el sistema y está pendiente de revisión.' }, 409);\n      throw errPendiente;\n    }"
);


fs.writeFileSync('worker.js', worker);
console.log('Worker.js patched successfully!');
