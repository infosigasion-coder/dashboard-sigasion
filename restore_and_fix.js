const fs = require('fs');

function fix() {
  const file = 'index_github.html';
  if (!fs.existsSync(file)) return;
  let html = fs.readFileSync(file, 'utf8');

  // 1. Revert the dummy_old_ prefix
  html = html.replace(/dummy_old_/g, '');

  // 2. Properly remove the old header block completely
  let startIdx = html.indexOf('<!-- HEADER -->\n<div class="header"');
  if (startIdx === -1) startIdx = html.indexOf('<!-- HEADER -->\r\n<div class="header"');
  
  if (startIdx !== -1) {
    let endIdx = html.indexOf('<!-- MAIN -->', startIdx);
    if (endIdx !== -1) {
      html = html.substring(0, startIdx) + html.substring(endIdx);
    }
  }

  // 3. Fix the title and logo in the NEW TWO-TIER HEADER if not already fixed
  // We'll just regex replace the new header's logo and title directly to be safe
  const newHeaderStart = html.indexOf('<!-- TWO-TIER HEADER -->');
  if (newHeaderStart !== -1) {
    const bottomBarStart = html.indexOf('<!-- BOTTOM BAR:', newHeaderStart);
    if (bottomBarStart !== -1) {
      let topBarHtml = html.substring(newHeaderStart, bottomBarStart);
      
      // Force logo replacement
      topBarHtml = topBarHtml.replace(
        /<div class="logo-icon"><img src="[^"]+" alt="Sión"[^>]*><\/div>/,
        '<div class="logo-icon"><img src="https://ik.imagekit.io/yryzllm7u/sion_blanco_logo_no_backgorund.png?updatedAt=1708871625902" alt="Sión" style="height:48px; object-fit:contain; margin-right:8px;"></div>'
      );
      
      // Force title replacement
      topBarHtml = topBarHtml.replace(
        /<div class="header-title"[^>]*>.*?<\/div>/,
        '<div class="header-title" style="font-size:18px;font-weight:700;letter-spacing:-0.5px; white-space:nowrap; color:#fff;">Sistema Inteligente de Gestión de Actividades (S.I.G.A.)</div>'
      );
      
      html = html.substring(0, newHeaderStart) + topBarHtml + html.substring(bottomBarStart);
    }
  }

  fs.writeFileSync(file, html);
  console.log('Restored and fixed header!');
}
fix();
