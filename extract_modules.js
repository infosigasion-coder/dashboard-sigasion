const fs = require('fs');

let js = fs.readFileSync('public/js/legacy_monolith.js', 'utf8');

// The regex might have duplicated the auth script because the Google script tag might not be `<script src="...">` exact match or I matched all `<script>` tags later.
// Actually, `split_html.js` had:
// let allScripts = []; ... rawJs = allScripts.join('\\n\\n'); 
// Which completely OVERWROTE the `rawJs` with only the <script> tags without src.
// Let's re-extract properly directly from index_github.html to avoid issues.

const rawHtml = fs.readFileSync('index_github.html', 'utf8');
let fullJs = '';

const authMatch = rawHtml.match(/<script src="https:\/\/accounts.google.com\/gsi\/client" async defer>([\s\S]*?)<\/script>/);
if (authMatch) fullJs += authMatch[1] + '\\n\\n';

const scriptRegex = /<script>([\s\S]*?)<\/script>/g;
let m;
while ((m = scriptRegex.exec(rawHtml)) !== null) {
    fullJs += m[1] + '\\n\\n';
}

fs.writeFileSync('public/js/main.js', fullJs);
console.log('Cleaned main.js');

// Now we need to expose all function declarations to window so that inline HTML handlers work
// Find all "function foo(" or "async function foo("
const funcRegex = /(?:async\s+)?function\s+([a-zA-Z0-9_]+)\s*\(/g;
let exportsToWindow = '\\n// Expose all functions to window for inline HTML handlers\\n';
let match2;
const seen = new Set();
while ((match2 = funcRegex.exec(fullJs)) !== null) {
    const fnName = match2[1];
    if (!seen.has(fnName)) {
        seen.add(fnName);
        exportsToWindow += "window." + fnName + " = " + fnName + ";\\n";
    }
}

fs.appendFileSync('public/js/main.js', exportsToWindow);
console.log('Appended window exports');

fs.unlinkSync('public/js/legacy_monolith.js');
