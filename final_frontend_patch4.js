const fs = require('fs');

function patchFile(filename) {
    if (!fs.existsSync(filename)) return;
    let content = fs.readFileSync(filename, 'utf8');
    let modified = false;

    // 1. Add milestones tab if missing
    if (!content.includes('atab-milestones')) {
        content = content.replace(
            /<div class="admin-tab" onclick="setAdminTab\('settings'\)" id="atab-settings"/g,
            '<div class="admin-tab" onclick="setAdminTab(\'milestones\')" id="atab-milestones" style="padding:8px 12px; font-size:12px; background:#e11d48; color:white;">⏰ Cintillo / Cronograma</div>\n        <div class="admin-tab" onclick="setAdminTab(\'settings\')" id="atab-settings"'
        );
        modified = true;
    }

    // 2. Fix fmtShort
    if (content.includes('if(n>=1000000)')) {
        content = content.replace(/function fmtShort\(n\)\s*\{[\s\S]*?return fmt\(n\);\s*\}/, "function fmtShort(n) { return fmt(n); }");
        modified = true;
    }

    // 3. Fix egresos renderKPIs
    if (content.includes('egresosData = resp;\n      renderBalanceCard(resp);') || content.includes('egresosData = resp;\r\n      renderBalanceCard(resp);') || content.includes('egresosData = resp;\nrenderBalanceCard(resp);')) {
        content = content.replace(/egresosData = resp;\r?\n\s*renderBalanceCard\(resp\);/g, "egresosData = resp;\n      window.adminEgresosData = resp.egresos;\n      if(typeof renderKPIs === 'function') renderKPIs();\n      renderBalanceCard(resp);");
        modified = true;
    }

    // 4. Auto-load Admin Tab
    if (content.includes('loadEgresos();\n    } catch(err)') || content.includes('loadEgresos();\r\n    } catch(err)')) {
        content = content.replace(/loadEgresos\(\);\r?\n\s*\}\s*catch\(err\)/, "loadEgresos();\n      if (window.isAdminMode && typeof setAdminTab === 'function') setAdminTab(currentAdminTab);\n    } catch(err)");
        modified = true;
    }

    // 5. Sobrantes Rendicion Logic
    const oldCodeStart = "var catKeys = Object.keys(CAT_COLORS).filter(function(c){return c!=='Otros';});";
    const oldCodeEnd = "var sobrante = presup - gastado;";
    const startIdx = content.indexOf(oldCodeStart, content.indexOf("function exportRendicionPDF()"));
    if (startIdx !== -1) {
        const endIdx = content.indexOf(oldCodeEnd, startIdx) + oldCodeEnd.length;
        const oldCode = content.substring(startIdx, endIdx);
        if (!oldCode.includes("catIngresos")) {
            const newCode = "var catKeys = Object.keys(CAT_COLORS).filter(function(c){return c!=='Otros';});\n" +
            "  var catIngresos = {\n" +
            "    'Bingo': rubroTotales['bingo']||0,\n" +
            "    'Cuota Ventas': rubroTotales['cuotaVentas']||0,\n" +
            "    'Coreógrafo': rubroTotales['coreografo']||0,\n" +
            "    'Vestuario': rubroTotales['vestPres']||0,\n" +
            "    'Camisas Festival': (rubroTotales['camisaFest']||0) + (rubroTotales['camisaAdi']||0) + (rubroTotales['entrenador']||0),\n" +
            "    'Hidratación': rubroTotales['hidratacion']||0,\n" +
            "    'Maquillaje': rubroTotales['maquillaje']||0\n" +
            "  };\n" +
            "  var catFilas = catKeys.map(function(c){\n" +
            "    var gastado = (egresosData&&egresosData.totalesCat&&egresosData.totalesCat[c])||0;\n" +
            "    var presup  = catIngresos[c]||0;\n" +
            "    var sobrante = presup - gastado;";
            content = content.replace(oldCode, newCode);
            modified = true;
        }
    }

    // 6. Fix table headers
    if (content.includes('<th>CategorAa</th><th style="text-align:right;width:15%;">Presupuesto</th>')) {
        content = content.replace(/<th>CategorAa<\/th><th style="text-align:right;width:15%;">Presupuesto<\/th>/g, '<th>CategorAa</th><th style="text-align:right;width:15%;">Recaudado</th>');
        modified = true;
    }
    if (content.includes('<th>Categoría</th><th style="text-align:right;width:15%;">Presupuesto</th>')) {
        content = content.replace(/<th>Categoría<\/th><th style="text-align:right;width:15%;">Presupuesto<\/th>/g, '<th>Categoría</th><th style="text-align:right;width:15%;">Recaudado</th>');
        modified = true;
    }

    // 7. Add Chart.js to frontend.js if missing
    if (!content.includes('chart.umd.js') && !content.includes('chart.js')) {
        content = content.replace(/<\/head>/, "  <script src='https://cdn.jsdelivr.net/npm/chart.js'></script>\n</head>");
        modified = true;
    }

    // Bump version
    content = content.replace(/v=2\.0\.17/g, 'v=2.0.18');

    if (modified || content.includes('v=2.0.18')) {
        fs.writeFileSync(filename, content, 'utf8');
        console.log('Patched: ' + filename);
    }
}

try { patchFile('frontend.js'); } catch(e) { console.log('Error frontend.js', e); }
try { patchFile('index.html'); } catch(e) { console.log('Error index.html', e); }
try { patchFile('js/main.js'); } catch(e) { console.log('Error main.js', e); }
try { patchFile('index_github.html'); } catch(e) { console.log('Error index_github.html', e); }

console.log('Done!');
