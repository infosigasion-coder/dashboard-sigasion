const fs = require('fs');

function repair() {
  const file = 'index_github.html';
  let html = fs.readFileSync(file, 'utf8');

  // Find the start of the modal inside the script
  const modalStartStr = '<!-- SAGA LOGIN MODAL -->';
  const modalStartIdx = html.indexOf(modalStartStr);
  if (modalStartIdx === -1) return;

  // We know it looks like this:
  // '<div style="margin-top:20px;font-size:10px;color:#999;text-align:center;border-top:1px solid #eee;padding-top:10px;">Festival Sin 2026  SINPE 7022-8161  Lmite: 07/05/2026</div>'+
  // '
  // <!-- SAGA LOGIN MODAL -->
  // ...
  // </body></html>';

  // Find the end of the modal HTML
  const modalEndStr = '</body></html>\';';
  const modalEndIdx = html.indexOf(modalEndStr, modalStartIdx);
  
  if (modalEndIdx !== -1) {
    // Extract the modal HTML
    const modalHtml = html.substring(modalStartIdx, modalEndIdx).trim();
    
    // We need to replace the entire broken block with just `'</body></html>';`
    // Let's find the line before modalStartIdx that has `'+` and `\n'`
    
    let prevCodeIdx = html.lastIndexOf('</div>\'+', modalStartIdx);
    if (prevCodeIdx !== -1) {
      let cutStart = prevCodeIdx + '</div>\'+'.length;
      // Replace everything from the end of the div string to the end of the modal with just `\n    '</body></html>';`
      html = html.substring(0, cutStart) + '\n    \'</body></html>\';' + html.substring(modalEndIdx + modalEndStr.length);
      
      // Now, put the modalHtml AT THE END OF THE FILE, just before </body>
      html = html.replace('</body>\n</html>', modalHtml + '\n\n</body>\n</html>');
    }
  }

  // 2. Fix the logo and header overlap
  // Replace the old logo-wrap content
  const oldLogoWrap = `<div class="logo-wrap" style="display:flex;align-items:center;gap:10px;">
      <div class="logo-icon"><img src="escudo_color.png" alt="Sión" style="height:48px; object-fit:contain; margin-right:8px;"></div>
      <div class="header-title" style="font-size:18px;font-weight:700;letter-spacing:-0.5px; white-space:nowrap; color:#fff;">Sistema Inteligente de Gestión de Actividades (S.I.G.A.)</div>
      <div style="font-size:11px; color:rgba(255,255,255,0.6); margin-top:2px;">
        Sección <strong id="headerSeccionText">1-1</strong> (Año <strong id="headerAnioText">2027</strong>)
      </div>
    </div>`;
    
  const newLogoWrap = `<div class="logo-wrap" style="display:flex;align-items:center;gap:10px;">
      <div class="logo-icon"><img src="escudo_white.png" alt="Sión" style="height:64px; object-fit:contain; margin-right:8px;"></div>
      <div style="display:flex; flex-direction:column; justify-content:center;">
        <div class="header-title" style="font-size:20px;font-weight:700;letter-spacing:-0.5px; white-space:nowrap; color:#fff;">Sistema Inteligente de Gestión de Actividades (S.I.G.A.)</div>
        <div style="font-size:12px; color:rgba(255,255,255,0.6); margin-top:2px;">
          Sección <strong id="headerSeccionText">1-1</strong> (Año <strong id="headerAnioText">2027</strong>)
        </div>
      </div>
    </div>`;

  // It's possible the exact string is slightly different. Let's use regex.
  html = html.replace(/<div class="logo-wrap"[\s\S]*?<\/div>\s*<\/div>/, newLogoWrap);

  // 3. Fix the "franja blanca debajo de footer"
  // Let's add padding-bottom:0 to main if it exists, and check testModeBanner
  html = html.replace('.main { padding: 20px; padding-bottom: 60px; }', '.main { padding: 20px; padding-bottom: 20px; }');

  fs.writeFileSync(file, html);
  console.log('Reparado con éxito');
}

repair();
