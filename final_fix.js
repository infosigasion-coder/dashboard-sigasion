const fs = require('fs');

function finalFix() {
  const file = 'index_github.html';
  if (!fs.existsSync(file)) return;
  let html = fs.readFileSync(file, 'utf8');

  // Fix sagaSeccionSelect options
  const seccionOptions = `
        <option value="1-1">Sección 1-1</option>
        <option value="1-2">Sección 1-2</option>
        <option value="2-1">Sección 2-1</option>
        <option value="2-2">Sección 2-2</option>
        <option value="3-1">Sección 3-1</option>
        <option value="3-2">Sección 3-2</option>
        <option value="4-1">Sección 4-1</option>
        <option value="4-2">Sección 4-2</option>
        <option value="5-1">Sección 5-1</option>
        <option value="5-2">Sección 5-2</option>
        <option value="6-1">Sección 6-1</option>
        <option value="6-2">Sección 6-2</option>
`;
  html = html.replace(
    /<select id="sagaSeccionSelect"[\s\S]*?<\/select>/,
    '<select id="sagaSeccionSelect" onchange="changeSeccion(this.value)" class="saga-select">' + seccionOptions + '</select>'
  );

  // Fix sagaAnioSelect options
  const anioOptions = `
        <option value="2026">2026</option>
        <option value="2027">2027</option>
        <option value="2028">2028</option>
        <option value="2029">2029</option>
`;
  html = html.replace(
    /<select id="sagaAnioSelect"[\s\S]*?<\/select>/,
    '<select id="sagaAnioSelect" onchange="changeAnio(this.value)" class="saga-select">' + anioOptions + '</select>'
  );

  // Fix missing IDs that JS relies on: headerSeccionText and headerAnioText
  const subtitleHtml = `
      <div style="font-size:11px; color:rgba(255,255,255,0.6); margin-top:2px;">
        Sección <strong id="headerSeccionText">1-1</strong> (Año <strong id="headerAnioText">2027</strong>)
      </div>`;
  
  if (!html.includes('id="headerSeccionText"')) {
    // Put it right after the header-title
    html = html.replace(
      /(<div class="header-title"[^>]*>.*?<\/div>)/,
      '$1' + subtitleHtml
    );
  }

  // Restore the correct onclick for google login button
  html = html.replace(/initGoogleLogin\(\)/g, 'openLoginModal()');

  // Fix the logo to use the local escudo_color.png to avoid broken external links
  html = html.replace(
    /https:\/\/ik.imagekit.io\/yryzllm7u\/sion_blanco_logo_no_backgorund.png\?updatedAt=1708871625902/g,
    'escudo_color.png'
  );

  fs.writeFileSync(file, html);
  console.log('Final fix applied to ' + file);
}

finalFix();
