const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const content = fs.readFileSync('wrangler.toml', 'utf8');
const urlMatch = content.match(/SUPABASE_URL\s*=\s*"(.*?)"/);
const keyMatch = content.match(/SUPABASE_ANON_KEY\s*=\s*"(.*?)"/);

const url = urlMatch ? urlMatch[1] : '';
const key = keyMatch ? keyMatch[1] : '';

async function run() {
  if (!url || !key) {
    console.error('Could not parse Supabase config from wrangler.toml');
    return;
  }
  const supabase = createClient(url, key);
  
  const { data: admins, error: errAdmins } = await supabase.from('admins').select('*');
  console.log('Admins:', admins, 'Error:', errAdmins);

  const { data: acts, error: errActs } = await supabase.from('actividades').select('*');
  console.log('Actividades:', acts, 'Error:', errActs);
}
run();
