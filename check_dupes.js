const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// The file has two <div class="header-two-tier">.
// We want to delete everything from the first </head> that appears AFTER the first header,
// all the way to <body>
const splitTag = '</head>';
const firstEndHead = html.indexOf(splitTag);
const secondEndHead = html.indexOf(splitTag, firstEndHead + 1);

console.log('First </head>:', firstEndHead);
console.log('Second </head>:', secondEndHead);

let match = html.match(/<\/head>\s*<body>/g);
console.log('Bad transitions:', match ? match.length : 0);
