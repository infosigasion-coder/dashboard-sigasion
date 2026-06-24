const fs = require('fs');
let content = fs.readFileSync('worker.js', 'utf8');

const endpoints = `
// GESTION DE ESTUDIANTES: ALTA INDIVIDUAL Y EDICIÓN
app.post('/api/students/save', async (c) => {
  const env = c.env;
  const { id, seccion, ao, nombre, genero, tiene_hermano, cedula, fecha_nacimiento, nombre_padre, nombre_madre, adminEmail } = await c.req.json();
  
  try {
    const supabase = getSupabase(env);
    const auth = await authAdmin(c, seccion);
    if (!auth.valid) return c.json({ ok: false, error: auth.error }, 403);
    
    let resultData;
    if (id) {
      // Editar
      const { data, error } = await supabase.from('students').update({
        nombre: nombre.trim(), genero, tiene_hermano: !!tiene_hermano, cedula, fecha_nacimiento, nombre_padre, nombre_madre
      }).eq('id', id).select();
      if (error) throw error;
      resultData = data;
    } else {
      // Alta (ponemos número 999 temporal, el reordenamiento lo arreglará)
      const { data, error } = await supabase.from('students').insert({
        seccion, ao: parseInt(ao || '2027'), numero: 999, nombre: nombre.trim(), genero, tiene_hermano: !!tiene_hermano, cedula, fecha_nacimiento, nombre_padre, nombre_madre
      }).select();
      if (error) throw error;
      resultData = data;
    }
    
    // Reordenar sección
    await reordenarSeccion(supabase, seccion, parseInt(ao || '2027'));
    
    return c.json({ ok: true, data: resultData });
  } catch (err) {
    return c.json({ ok: false, error: err.message }, 500);
  }
});

// GESTION DE ESTUDIANTES: BAJA INDIVIDUAL
app.post('/api/students/delete', async (c) => {
  const env = c.env;
  const { id, seccion, ao, adminEmail } = await c.req.json();
  
  try {
    const supabase = getSupabase(env);
    const auth = await authAdmin(c, seccion);
    if (!auth.valid) return c.json({ ok: false, error: auth.error }, 403);
    
    const { error } = await supabase.from('students').delete().eq('id', id);
    if (error) throw error;
    
    // Reordenar sección
    await reordenarSeccion(supabase, seccion, parseInt(ao || '2027'));
    
    return c.json({ ok: true });
  } catch (err) {
    return c.json({ ok: false, error: err.message }, 500);
  }
});
`;

if (!content.includes('/api/students/save')) {
  content = content.replace("app.post('/api/students/bulk'", endpoints + "\napp.post('/api/students/bulk'");
  fs.writeFileSync('worker.js', content, 'utf8');
  console.log('Student management endpoints added');
} else {
  console.log('Student management endpoints already exist');
}
