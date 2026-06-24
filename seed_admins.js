const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const content = fs.readFileSync('wrangler.toml', 'utf8');
const urlMatch = content.match(/SUPABASE_URL\s*=\s*"(.*?)"/);
const keyMatch = content.match(/SUPABASE_ANON_KEY\s*=\s*"(.*?)"/);

const url = urlMatch ? urlMatch[1] : '';
const key = keyMatch ? keyMatch[1] : '';

const admins = [
  {
    email: '2510maag@gmail.com',
    nombre: 'Miguel Alvarado Guevara',
    rol: 'super_admin',
    seccion: null,
    username: 'malvarado',
    password_hash: '07183e774dfc9339f0ec94ca2b8511c5d935ab0369520c6bc6a3a1d260ef4fd2', // sha-256 for siga2026
    debe_cambiar_pass: true,
    activo: true
  },
  {
    email: 'mrojas1194@gmail.com',
    nombre: 'Yuleisy Martinez',
    rol: 'admin',
    seccion: '1-1',
    username: 'ymartinez',
    password_hash: '07183e774dfc9339f0ec94ca2b8511c5d935ab0369520c6bc6a3a1d260ef4fd2',
    debe_cambiar_pass: true,
    activo: true
  },
  {
    email: 'pameberta63@gmail.com',
    nombre: 'Pamela Bertarioni',
    rol: 'admin',
    seccion: '1-1',
    username: 'pbertarioni',
    password_hash: '07183e774dfc9339f0ec94ca2b8511c5d935ab0369520c6bc6a3a1d260ef4fd2',
    debe_cambiar_pass: true,
    activo: true
  },
  {
    email: 'mmora@siga.com',
    nombre: 'María Mora',
    rol: 'docente',
    seccion: '1-1',
    username: 'mmora',
    password_hash: '07183e774dfc9339f0ec94ca2b8511c5d935ab0369520c6bc6a3a1d260ef4fd2',
    debe_cambiar_pass: true,
    activo: true
  }
];

async function run() {
  if (!url || !key) {
    console.error('Could not parse Supabase config from wrangler.toml');
    return;
  }
  const supabase = createClient(url, key);
  
  console.log('Seeding admins into Supabase...');
  for (const admin of admins) {
    const { data, error } = await supabase
      .from('admins')
      .upsert(admin, { onConflict: 'email' })
      .select();
    
    if (error) {
      console.error(`Error seeding ${admin.email}:`, error);
    } else {
      console.log(`Successfully seeded/updated ${admin.email}:`, data);
    }
  }
}
run();
