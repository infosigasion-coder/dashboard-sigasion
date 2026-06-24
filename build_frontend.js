const fs = require('fs');
let html = fs.readFileSync('index_github.html', 'utf8');
let escudoColorBase64 = '';
let escudoWhiteBase64 = '';

if (fs.existsSync('public/escudo_color.png')) {
    escudoColorBase64 = 'data:image/png;base64,' + fs.readFileSync('public/escudo_color.png').toString('base64');
}
if (fs.existsSync('public/escudo_white.png')) {
    escudoWhiteBase64 = 'data:image/png;base64,' + fs.readFileSync('public/escudo_white.png').toString('base64');
}

// Convert physical newlines to actual \n inside the string
let jsonHtml = JSON.stringify(html);

let frontendJs = `// Archivo generado automáticamente. No editar manualmente.
export const html = ${jsonHtml};
export const escudoColorBase64 = '${escudoColorBase64}';
export const escudoWhiteBase64 = '${escudoWhiteBase64}';
`;

fs.writeFileSync('frontend.js', frontendJs, 'utf8');
console.log('Successfully regenerated frontend.js from index_github.html');
