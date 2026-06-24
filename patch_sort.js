const fs = require('fs');
let content = fs.readFileSync('worker.js', 'utf8');

const sortLogic = `
// REORDENAMIENTO ALFABÉTICO INTELIGENTE
async function reordenarSeccion(supabase, seccion, anio) {
  const { data: students, error } = await supabase
    .from('students')
    .select('id, nombre, numero')
    .eq('seccion', seccion)
    .eq('año', anio);
    
  if (error || !students || students.length === 0) return;
  
  // Función auxiliar para parsear Nombre1 Nombre2 Apellido1 Apellido2
  function parseName(fullName) {
    const parts = fullName.trim().split(/\s+/);
    // Partículas compuestas comunes en español
    const particles = ['de', 'del', 'la', 'las', 'los', 'y', 'san', 'santa'];
    
    let tokens = [];
    for (let i = 0; i < parts.length; i++) {
      let part = parts[i].toLowerCase();
      if (particles.includes(part) && i + 1 < parts.length) {
        tokens.push(parts[i] + ' ' + parts[i+1]);
        i++; // skip next
      } else {
        tokens.push(parts[i]);
      }
    }
    
    // Si hay menos de 3 tokens, asumimos 1 nombre y 1 apellido
    if (tokens.length <= 2) {
      return { apellidos: tokens[tokens.length - 1] || '', nombres: tokens[0] || '' };
    }
    
    // Por defecto, asumimos que los últimos DOS tokens son los apellidos
    const apellidos = tokens.slice(-2).join(' ').toLowerCase();
    const nombres = tokens.slice(0, -2).join(' ').toLowerCase();
    
    return { apellidos, nombres };
  }

  students.sort((a, b) => {
    const pA = parseName(a.nombre);
    const pB = parseName(b.nombre);
    
    const cmpApellidos = pA.apellidos.localeCompare(pB.apellidos, 'es', { sensitivity: 'base' });
    if (cmpApellidos !== 0) return cmpApellidos;
    
    return pA.nombres.localeCompare(pB.nombres, 'es', { sensitivity: 'base' });
  });
  
  // Actualizar los números consecutivos masivamente
  for (let i = 0; i < students.length; i++) {
    const newNum = i + 1;
    if (students[i].numero !== newNum) {
      await supabase.from('students').update({ numero: newNum }).eq('id', students[i].id);
    }
  }
}

`;

if (!content.includes('async function reordenarSeccion')) {
  content = content.replace("async function authAdmin", sortLogic + "\nasync function authAdmin");
  fs.writeFileSync('worker.js', content, 'utf8');
  console.log('reordenarSeccion function added');
} else {
  console.log('reordenarSeccion already exists');
}
