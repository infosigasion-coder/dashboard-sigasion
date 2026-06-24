const fs = require('fs');

let css = fs.readFileSync('public/css/main.css', 'utf8');
if (!css.includes('.admin-mode .login-btn')) {
    css += `\n/* Hide login button when admin is logged in */\n.admin-mode .login-btn { display: none !important; }\n`;
    fs.writeFileSync('public/css/main.css', css, 'utf8');
    
    // Also patch index_github.html so it persists
    let html = fs.readFileSync('index_github.html', 'utf8');
    html = html.replace('</style>', `  /* Hide login button when admin is logged in */\n  .admin-mode .login-btn { display: none !important; }\n</style>`);
    fs.writeFileSync('index_github.html', html, 'utf8');
    console.log('Added .admin-mode .login-btn CSS rules');
}

// Regenerate frontend.js
let htmlFile = fs.readFileSync('index_github.html', 'utf8');
let escudoColorBase64 = fs.existsSync('public/escudo_color.png') ? 'data:image/png;base64,' + fs.readFileSync('public/escudo_color.png').toString('base64') : '';
let escudoWhiteBase64 = fs.existsSync('public/escudo_white.png') ? 'data:image/png;base64,' + fs.readFileSync('public/escudo_white.png').toString('base64') : '';

let frontendJs = `// Archivo generado automáticamente. No editar manualmente.
export const html = ${JSON.stringify(htmlFile)};
export const escudoColorBase64 = '${escudoColorBase64}';
export const escudoWhiteBase64 = '${escudoWhiteBase64}';
`;
fs.writeFileSync('frontend.js', frontendJs, 'utf8');
console.log('Regenerated frontend.js');

// Push to github
require('child_process').execSync('git add . && git commit -m "Fix UI, hide login btn on admin, fix mobile layout" && git push origin main', {stdio: 'inherit'});
