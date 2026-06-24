const fs = require('fs');
let content = fs.readFileSync('frontend.js', 'utf8');

if (!content.includes('justify-content: flex-start !important;')) {
    content = content.replace('</style>', `
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
</style>`);
    content = content.replace(/white-space:nowrap;\s*color:#fff;">Sistema Inteligente/g, 'color:#fff;">Sistema Inteligente');
    fs.writeFileSync('frontend.js', content, 'utf8');
    console.log('Force patched frontend.js');
} else {
    console.log('frontend.js already has the mobile CSS patch');
}
