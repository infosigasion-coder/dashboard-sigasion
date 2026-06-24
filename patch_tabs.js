const fs = require('fs');
let js = fs.readFileSync('js/main.js', 'utf8');

// The array inside setAdminTab usually looks like:
// ['pending', 'history', 'reports', 'rejected', 'egresos', 'milestones', 'settings'].forEach(function(t) {
// I need to replace it so 'students' is included.

js = js.replace(/\[\s*'pending',\s*'history',\s*'reports',\s*'rejected',\s*'egresos',\s*'milestones',\s*'settings'\s*\]/, "['pending', 'history', 'reports', 'rejected', 'egresos', 'milestones', 'settings', 'students']");

fs.writeFileSync('js/main.js', js, 'utf8');
console.log('Fixed tab array');
