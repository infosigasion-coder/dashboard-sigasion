const fs = require('fs');
const files = ['js/main.js', 'public/js/main.js', 'index.html', 'index_github.html', 'public/index.html'];

files.forEach(f => {
  if (fs.existsSync(f)) {
    const lines = fs.readFileSync(f, 'utf8').split('\n');
    lines.forEach((line, i) => {
      if (line.includes('¿')) {
        console.log(`${f}:${i+1}: ${line.trim()}`);
      }
    });
  }
});
