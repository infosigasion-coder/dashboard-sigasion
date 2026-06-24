const fs = require('fs');

const cssPatch = `
@media (max-width: 768px) {
  .header-top-bar {
    flex-wrap: wrap;
    gap: 12px;
  }
  .header-title {
    font-size: 14px !important;
    white-space: normal !important;
    line-height: 1.2 !important;
    max-width: none !important;
  }
  .header-top-right {
    width: 100%;
    justify-content: flex-start !important;
  }
}
`;

function patchCSS(filename) {
    if (!fs.existsSync(filename)) return;
    let content = fs.readFileSync(filename, 'utf8');
    let modified = false;

    // Remove inline white-space:nowrap
    if (content.includes('white-space:nowrap; color:#fff;">Sistema Inteligente')) {
        content = content.replace(/white-space:nowrap; color:#fff;">Sistema Inteligente/g, 'color:#fff;">Sistema Inteligente');
        modified = true;
    }

    if (!content.includes('flex-wrap: wrap;')) {
        if (filename.endsWith('.css')) {
            content += cssPatch;
            modified = true;
        } else if (content.includes('</style>')) {
            content = content.replace('</style>', cssPatch + '\n</style>');
            modified = true;
        }
    }

    if (modified) {
        fs.writeFileSync(filename, content, 'utf8');
        console.log('Patched layout in ' + filename);
    }
}

patchCSS('frontend.js');
patchCSS('index_github.html');
patchCSS('public/css/main.css');
patchCSS('index.html');
