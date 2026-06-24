const fs = require('fs');
let content = fs.readFileSync('js/main.js', 'utf8');

// Fix 1: headerDocente -> headerDocenteText
content = content.replace(
  "document.getElementById('headerDocente').textContent = currentDocente;",
  "const headerDoc = document.getElementById('headerDocenteText') || document.getElementById('headerDocente');\n    if (headerDoc) headerDoc.textContent = currentDocente;"
);

// Fix 2: reqDocente null check
content = content.replace(
  "reqDocenteSelect.innerHTML = '<option value=\"\">Todos los docentes</option>';",
  "if (reqDocenteSelect) reqDocenteSelect.innerHTML = '<option value=\"\">Todos los docentes</option>';"
);

// Fix 3: sigaDocenteSelect null check
content = content.replace(
  "formDocenteSelect.innerHTML = '<option value=\"\">Seleccione docente</option>';",
  "if (formDocenteSelect) formDocenteSelect.innerHTML = '<option value=\"\">Seleccione docente</option>';"
);

// Fix 4: reqDocenteSelect inside loop
content = content.replace(
  "reqDocenteSelect.appendChild(opt1);",
  "if (reqDocenteSelect) reqDocenteSelect.appendChild(opt1);"
);

// Fix 5: formDocenteSelect inside loop
content = content.replace(
  "formDocenteSelect.appendChild(opt2);",
  "if (formDocenteSelect) formDocenteSelect.appendChild(opt2);"
);

// Fix 6: admin missing elements protection
content = content.replace(
  "document.getElementById('adminBtn').classList.add('visible');",
  "if(document.getElementById('adminBtn')) document.getElementById('adminBtn').classList.add('visible');"
);
content = content.replace(
  "document.getElementById('googleLoginBtn').classList.remove('visible');",
  "if(document.getElementById('googleLoginBtn')) document.getElementById('googleLoginBtn').classList.remove('visible');"
);
content = content.replace(
  "document.getElementById('adminUserEmail').textContent = email;",
  "if(document.getElementById('adminUserEmail')) document.getElementById('adminUserEmail').textContent = email;"
);
content = content.replace(
  "document.getElementById('sagaSeccionSelect').disabled = false;",
  "if(document.getElementById('sagaSeccionSelect')) document.getElementById('sagaSeccionSelect').disabled = false;"
);

fs.writeFileSync('js/main.js', content, 'utf8');
console.log('Fixed js/main.js');
