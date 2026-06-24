const fs = require('fs');

const rawHtml = fs.readFileSync('index_github.html', 'utf8');

// 1. Extract CSS
const styleMatch = rawHtml.match(/<style>([\s\S]*?)<\/style>/);
if (styleMatch) {
    fs.writeFileSync('public/css/main.css', styleMatch[1]);
    console.log('Extracted main.css');
}

// 2. Extract JS blocks
let rawJs = '';
// First block before style (login, fetch interceptor)
const firstScriptMatch = rawHtml.match(/<script src="https:\/\/accounts.google.com\/gsi\/client" async defer>([\s\S]*?)<\/script>/);
if (firstScriptMatch) {
    rawJs += firstScriptMatch[1] + '\n\n';
}

// Last block (main logic)
const lastScriptMatch = rawHtml.match(/<\/style>\s*<script>([\s\S]*?)<\/script>\s*<\/head>/);
if (lastScriptMatch) {
    rawJs += lastScriptMatch[1] + '\n\n';
}

// The very last script that has fichas logic from the patch (before </body> if any? No, it's inside <head> usually, but let's check what was patched)
// Actually, I can just grab everything between <script> tags.
let allScripts = [];
const scriptRegex = /<script>([\s\S]*?)<\/script>/g;
let m;
while ((m = scriptRegex.exec(rawHtml)) !== null) {
    allScripts.push(m[1]);
}
if (allScripts.length > 0) {
    // Overwrite rawJs with the main logic
    rawJs = allScripts.join('\n\n');
}

fs.writeFileSync('public/js/legacy_monolith.js', rawJs);
console.log('Extracted legacy_monolith.js');

// 3. Extract pure HTML body
// Remove all <script> tags (except google's)
let pureHtml = rawHtml.replace(/<script(?!\s+src="https:\/\/accounts.google.com\/gsi\/client")[^>]*>[\s\S]*?<\/script>/gi, '');
pureHtml = pureHtml.replace(/<style>[\s\S]*?<\/style>/gi, '');

// Insert links to new assets
pureHtml = pureHtml.replace('</head>', '  <link rel="stylesheet" href="./css/main.css">\n  <script type="module" src="./js/main.js"></script>\n</head>');

fs.writeFileSync('public/index.html', pureHtml);
console.log('Generated pure public/index.html');
