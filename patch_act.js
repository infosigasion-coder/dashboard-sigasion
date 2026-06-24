const fs = require('fs');
let content = fs.readFileSync('worker.js', 'utf8');

// Patch /api/config/actividades to support Upsert
const actLogicOld = `.insert({
        nombre: nombre.trim(),
        tipo: tipoCobro === 'desglose' ? 'compleja' : 'simple',
        seccion: targetSeccion,
        aA\uFFFDo: aA\uFFFDo,
        fecha_actividad: fecha_actividad || null,
        fecha_limite_pago: fecha_limite_pago || null
      })`;

const actLogicNew = `(id ? .update({
        nombre: nombre.trim(),
        tipo: tipoCobro === 'desglose' ? 'compleja' : 'simple',
        seccion: targetSeccion,
        aA\uFFFDo: aA\uFFFDo,
        fecha_actividad: fecha_actividad || null,
        fecha_limite_pago: fecha_limite_pago || null
      }).eq('id', id) : .insert({
        nombre: nombre.trim(),
        tipo: tipoCobro === 'desglose' ? 'compleja' : 'simple',
        seccion: targetSeccion,
        aA\uFFFDo: aA\uFFFDo,
        fecha_actividad: fecha_actividad || null,
        fecha_limite_pago: fecha_limite_pago || null
      }))`;

// A better way is to construct the query dynamically in Javascript.
const replacement = `
    let act;
    if (id) {
       const res = await supabase.from('actividades').update({
        nombre: nombre.trim(), tipo: tipoCobro === 'desglose' ? 'compleja' : 'simple',
        seccion: targetSeccion, aA\uFFFDo: aA\uFFFDo, fecha_actividad: fecha_actividad||null, fecha_limite_pago: fecha_limite_pago||null
       }).eq('id', id).select();
       if(res.error) throw res.error;
       act = res.data;
    } else {
       const res = await supabase.from('actividades').insert({
        nombre: nombre.trim(), tipo: tipoCobro === 'desglose' ? 'compleja' : 'simple',
        seccion: targetSeccion, aA\uFFFDo: aA\uFFFDo, fecha_actividad: fecha_actividad||null, fecha_limite_pago: fecha_limite_pago||null
       }).select();
       if(res.error) throw res.error;
       act = res.data;
    }
`;

content = content.replace(/const { data: act, error: errAct } = await supabase\s*\.from\('actividades'\)\s*\.insert\(\{[\s\S]*?\}\)\s*\.select\(\);/m, replacement + '\n    const errAct = null;');

fs.writeFileSync('worker.js', content, 'utf8');
console.log('Actividades API patched for update');
