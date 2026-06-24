const fs = require('fs');
let js = fs.readFileSync('public/js/main.js', 'utf8');

// Find the duplication point. The code starts with:
// function openLoginModal()
const searchStr = 'function openLoginModal()';
const firstIndex = js.indexOf(searchStr);
const secondIndex = js.indexOf(searchStr, firstIndex + 1);

if (secondIndex !== -1) {
    console.log('Found duplication at index:', secondIndex);
    js = js.substring(0, secondIndex);
    fs.writeFileSync('public/js/main.js', js, 'utf8');
    console.log('Duplication removed!');
} else {
    console.log('No duplication found.');
}
