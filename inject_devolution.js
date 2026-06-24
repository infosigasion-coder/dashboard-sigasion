const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function run() {
  const content = fs.readFileSync('wrangler.toml', 'utf8');
  const urlMatch = content.match(/SUPABASE_URL\s*=\s*"(.*?)"/);
  const keyMatch = content.match(/SUPABASE_ANON_KEY\s*=\s*"(.*?)"/);
  
  if (!urlMatch || !keyMatch) {
    console.error('Missing Supabase config');
    return;
  }
  
  const supabase = createClient(urlMatch[1], keyMatch[1]);
  
  // Find Ana Lucía
  const { data: stds, error: errStds } = await supabase.from('students')
    .select('*')
    .eq('nombre', 'Ana Lucía Castro Mejías');
    
  if (errStds || !stds || stds.length === 0) {
    console.error('Student not found', errStds);
    return;
  }
  
  const student = stds[0];
  console.log('Found student:', student.nombre);
  
  let abonos = student.abonos || [];
  
  // Add devolution
  abonos.push({
    id: 'dev_' + Date.now().toString(36),
    tipo: 'devolucion',
    monto: -4500,
    fecha: new Date().toLocaleDateString('es-CR'),
    comprobante: 'URL_MANUAL_SUPABASE', // Placeholder
    estado: 'APROBADO',
    analisis: { banco: 'Manual', refSINPE: 'Devolucion' },
    timestamp: new Date().toISOString()
  });
  
  let comentario = (student.comentario || '') + '\n\n' + new Date().toLocaleDateString('es-CR') + ': Depositó por error el monto de ₡ 55.00,00, se realiza devolución de ₡ 4.500.';
  
  const { error: errUpd } = await supabase.from('students')
    .update({ abonos: abonos, comentario: comentario })
    .eq('id', student.id);
    
  if (errUpd) {
    console.error('Error updating:', errUpd);
  } else {
    console.log('Devolution injected successfully for', student.nombre);
  }
}

run();
