const fs = require('fs');

function patchImgViewer(filename) {
    if (!fs.existsSync(filename)) return;
    let content = fs.readFileSync(filename, 'utf8');
    
    // Check if it has the buggy 'if (data) {' instead of 'if (data && !data.isReceipt) {'
    let openImgViewerIndex = content.indexOf('function openImgViewer(driveUrl, data)');
    if (openImgViewerIndex === -1) return;
    
    let buggyIf = 'if (data) {';
    let fixedIf = 'if (data && !data.isReceipt) {';
    
    // Look for the block
    let blockStartIndex = content.indexOf(buggyIf, openImgViewerIndex);
    // Make sure we only patch the 'if (data) {' inside openImgViewer
    if (blockStartIndex !== -1 && blockStartIndex < openImgViewerIndex + 2000) {
        content = content.substring(0, blockStartIndex) + fixedIf + content.substring(blockStartIndex + buggyIf.length);
        
        // Also ensure download logic is correct
        if (!content.includes("extBtn.download = data ? data.filename : 'recibo.png';")) {
            const buggyExtBtn = "extBtn.href = driveUrl;";
            const fixedExtBtn = "if (driveUrl.startsWith('data:')) {\n    extBtn.href = driveUrl;\n    extBtn.download = data ? data.filename : 'recibo.png';\n    extBtn.innerHTML = '&#128229; Descargar Recibo';\n  } else {\n    extBtn.href = driveUrl;\n    extBtn.removeAttribute('download');\n    extBtn.innerHTML = '&#128279; Abrir en Drive';\n  }";
            content = content.replace(buggyExtBtn, fixedExtBtn);
        }
        
        fs.writeFileSync(filename, content, 'utf8');
        console.log('Patched openImgViewer in ' + filename);
    } else {
        console.log('Already fixed or not found in ' + filename);
    }
}

patchImgViewer('frontend.js');
patchImgViewer('index_github.html');
patchImgViewer('public/js/main.js');

console.log('Done openImgViewer patch');
