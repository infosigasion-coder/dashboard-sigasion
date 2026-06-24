const fs = require('fs');
let content = fs.readFileSync('worker.js', 'utf8');

const newEndpoint = `
// ASIGNAR O ACTUALIZAR CUOTA ESPECIAL
app.post('/api/students/custom_quota', async (c) => {
  const env = c.env;
  const { estudiante_id, actividad_id, no_participa, monto_personalizado, rubros_personalizados, motivo, seccion } = await c.req.json();
  
  try {
    const supabase = getSupabase(env);
    const auth = await authAdmin(c, seccion);
    if (!auth.valid) return c.json({ ok: false, error: auth.error }, 403);
    
    const { data, error } = await supabase
      .from('cuotas_especiales')
      .upsert({
        estudiante_id,
        actividad_id,
        no_participa: !!no_participa,
        monto_personalizado: monto_personalizado !== null ? Number(monto_personalizado) : null,
        rubros_personalizados: rubros_personalizados || null,
        motivo: motivo || null
      }, { onConflict: 'estudiante_id,actividad_id' })
      .select();
      
    if (error) throw error;
    return c.json({ ok: true, data });
  } catch (err) {
    return c.json({ ok: false, error: err.message }, 500);
  }
});
`;

if (!content.includes('/api/students/custom_quota')) {
  content = content.replace("app.post('/api/students/bulk', async (c) => {", newEndpoint + "\napp.post('/api/students/bulk', async (c) => {");
  fs.writeFileSync('worker.js', content, 'utf8');
  console.log('Endpoint custom_quota added to worker.js');
} else {
  console.log('Endpoint custom_quota already exists');
}
