const fs = require('fs');
let text = fs.readFileSync('index_github.html', 'utf8');
let start = text.indexOf('function openImgViewer');
if (start !== -1) {
    let end = text.indexOf('function ', start + 10);
    console.log(text.substring(start, end));
}
