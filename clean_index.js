const fs = require('fs');

let content = fs.readFileSync('public/index.html', 'utf8');

// Remove duplication
const splitToken = "</head>";
let firstIndex = content.indexOf(splitToken);
if (firstIndex !== -1) {
    let secondIndex = content.indexOf(splitToken, firstIndex + 1);
    if (secondIndex !== -1) {
        content = content.substring(0, secondIndex) + "</body>\n</html>";
    }
}

// Fix bad encoding characters manually based on exactly what was broken
content = content.replace(/GestiA3n/g, "Gestión");
content = content.replace(/tambiAcn/g, "también");
content = content.replace(/SecciA3n/g, "Sección");
content = content.replace(/ContraseAa/g, "Contraseña");
content = content.replace(/ContraseAa/g, "Contraseña");
content = content.replace(/Aadir/g, "Añadir");
content = content.replace(/dY  MODO PRUEBA ACTIVO \?"/g, "⚠️ MODO PRUEBA ACTIVO —");
content = content.replace(/s AI Powered/g, "⚡ AI Powered");
content = content.replace(/dYY Conectado/g, "🟢 Conectado");
content = content.replace(/A-/g, "✕");

fs.writeFileSync('public/index.html', content, 'utf8');
console.log('Successfully cleaned index.html!');
