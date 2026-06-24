const fs = require('fs');
let content = fs.readFileSync('worker.js', 'utf8');

const oldStr = `    // 1. Crear actividad
    const { data: act, error: errAct } = await supabase
      .from('actividades')
      .insert({
        nombre: nombre.trim(),
        tipo: tipoCobro === 'desglose' ? 'compleja' : 'simple',
        seccion: targetSeccion,
        a\uFFFDo: a\uFFFDo,
        fecha_actividad: fecha_actividad || null,
        fecha_limite_pago: fecha_limite_pago || null
      })
      .select();`;

const newStr = `    // 1. Crear o Actualizar actividad
    let act, errAct;
    if (id) {
       const res = await supabase.from('actividades').update({
        nombre: nombre.trim(), tipo: tipoCobro === 'desglose' ? 'compleja' : 'simple',
        seccion: targetSeccion, 'a\uFFFDo': a\uFFFDo, fecha_actividad: fecha_actividad||null, fecha_limite_pago: fecha_limite_pago||null
       }).eq('id', id).select();
       act = res.data; errAct = res.error;
    } else {
       const res = await supabase.from('actividades').insert({
        nombre: nombre.trim(), tipo: tipoCobro === 'desglose' ? 'compleja' : 'simple',
        seccion: targetSeccion, 'a\uFFFDo': a\uFFFDo, fecha_actividad: fecha_actividad||null, fecha_limite_pago: fecha_limite_pago||null
       }).select();
       act = res.data; errAct = res.error;
    }`;

content = content.replace(oldStr, newStr);
fs.writeFileSync('worker.js', content, 'utf8');
console.log('API patched');
