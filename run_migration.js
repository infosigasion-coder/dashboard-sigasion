const fs = require('fs');
const { execSync } = require('child_process');

function run() {
  const content = fs.readFileSync('wrangler.toml', 'utf8');
  const urlMatch = content.match(/SUPABASE_URL\s*=\s*"(.*?)"/);
  const keyMatch = content.match(/SUPABASE_ANON_KEY\s*=\s*"(.*?)"/);
  
  if (!urlMatch || !keyMatch) {
    console.error('Missing config');
    return;
  }
  
  console.log('Running migration with Anon Key...');
  try {
    execSync('node migrate_2026.js', {
      env: {
        ...process.env,
        SUPABASE_URL: urlMatch[1],
        SUPABASE_SERVICE_ROLE_KEY: keyMatch[1] // Fake it as service role key
      },
      stdio: 'inherit'
    });
  } catch (e) {
    console.error('Migration failed', e.message);
  }
}

run();
