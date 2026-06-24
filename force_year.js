const fs = require('fs');

function forceYear() {
  const file = 'index_github.html';
  let html = fs.readFileSync(file, 'utf8');

  // Find loadConfig and force the years to only be [2026]
  const regex = /const data = await res\.json\(\);\s*if \(data\.ok\) \{/;
  const replace = `const data = await res.json();\n    if (data.ok) {\n      data.years = [2026]; // Forced by user request`;
  
  if (html.match(regex)) {
    html = html.replace(regex, replace);
    fs.writeFileSync(file, html);
    console.log('Forced year 2026');
  } else {
    console.log('Regex not found. Skipping.');
  }
}

forceYear();
