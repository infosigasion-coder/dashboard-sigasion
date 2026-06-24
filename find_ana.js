const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function run() {
  const content = fs.readFileSync('wrangler.toml', 'utf8');
  const urlMatch = content.match(/SUPABASE_URL\s*=\s*"(.*?)"/);
  const keyMatch = content.match(/SUPABASE_ANON_KEY\s*=\s*"(.*?)"/);
  const supabase = createClient(urlMatch[1], keyMatch[1]);
  
  const { data: stds } = await supabase.from('students').select('id, nombre');
  const ana = stds.find(s => s.nombre.toLowerCase().includes('ana'));
  console.log(ana);
}

run();
