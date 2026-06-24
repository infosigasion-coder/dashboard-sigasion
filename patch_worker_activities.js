const fs = require('fs');

let worker = fs.readFileSync('worker.js', 'utf8');

// 1. Add fecha_actividad and fecha_limite_pago to POST /api/actividades
// Find: const { adminEmail, nombre, ao, asociacion, tipoCobro, cuotaUnica, rubros } = await c.req.json();
worker = worker.replace(
  "const { adminEmail, nombre, año, asociacion, tipoCobro, cuotaUnica, rubros } = await c.req.json();",
  "const { adminEmail, nombre, año, asociacion, tipoCobro, cuotaUnica, rubros, fecha_actividad, fecha_limite_pago, id, activa } = await c.req.json();"
);

worker = worker.replace(
  "const { adminEmail, nombre, ao, asociacion, tipoCobro, cuotaUnica, rubros } = await c.req.json();",
  "const { adminEmail, nombre, ao, asociacion, tipoCobro, cuotaUnica, rubros, fecha_actividad, fecha_limite_pago, id, activa } = await c.req.json();"
);

// 2. Change the insert to an upsert logic
const oldInsert = `    // Crear actividad
    const { data: act, error } = await supabase
      .from('actividades')
      .insert({
        nombre,
        tipo: 'compleja', // por ahora fijo
        seccion: targetSeccion,
        ao,
        milestones: rubros // Guardamos los rubros del presupuesto en la actividad
      })
      .select('id')
      .single();`;

const newUpsert = `    // Crear o Actualizar actividad
    const payload = {
        nombre,
        tipo: 'compleja',
        seccion: targetSeccion,
        ao,
        milestones: rubros,
        fecha_actividad: fecha_actividad || null,
        fecha_limite_pago: fecha_limite_pago || null
    };
    if (activa !== undefined) payload.activa = activa;

    let act, error;
    if (id) {
        const result = await supabase.from('actividades').update(payload).eq('id', id).select('id').single();
        act = result.data;
        error = result.error;
    } else {
        const result = await supabase.from('actividades').insert(payload).select('id').single();
        act = result.data;
        error = result.error;
    }`;

worker = worker.replace(oldInsert, newUpsert);

const oldInsertFallback = `    // Crear actividad
    const { data: act, error } = await supabase
      .from('actividades')
      .insert({
        nombre,
        tipo: 'compleja', // por ahora fijo
        seccion: targetSeccion,
        año,
        milestones: rubros // Guardamos los rubros del presupuesto en la actividad
      })
      .select('id')
      .single();`;

const newUpsertFallback = `    // Crear o Actualizar actividad
    const payload = {
        nombre,
        tipo: 'compleja',
        seccion: targetSeccion,
        año,
        milestones: rubros,
        fecha_actividad: fecha_actividad || null,
        fecha_limite_pago: fecha_limite_pago || null
    };
    if (activa !== undefined) payload.activa = activa;

    let act, error;
    if (id) {
        const result = await supabase.from('actividades').update(payload).eq('id', id).select('id').single();
        act = result.data;
        error = result.error;
    } else {
        const result = await supabase.from('actividades').insert(payload).select('id').single();
        act = result.data;
        error = result.error;
    }`;

worker = worker.replace(oldInsertFallback, newUpsertFallback);

// 3. Update GET /api/data to fetch nearest active activity based on fecha_limite_pago
const oldGetAct = `    // Busca la actividad de esa seccion y ao
    const { data: act } = await supabase.from('actividades').select('id').eq('seccion', seccion).eq('ao', ao).single();`;

const newGetAct = `    // Busca la actividad más próxima activa de esa seccion y ao
    const { data: acts } = await supabase.from('actividades')
      .select('id, activa, fecha_limite_pago')
      .eq('seccion', seccion)
      .eq('ao', ao);
      
    let act = null;
    if (acts && acts.length > 0) {
      const activeActs = acts.filter(a => a.activa);
      if (activeActs.length > 0) {
        // Ordenar por fecha_limite_pago (las nulas al final o inicio, mejor ignorar o tratar como infinito)
        activeActs.sort((a, b) => {
          if (!a.fecha_limite_pago) return 1;
          if (!b.fecha_limite_pago) return -1;
          return new Date(a.fecha_limite_pago) - new Date(b.fecha_limite_pago);
        });
        act = activeActs[0];
      } else {
        // Si no hay activas, coger la última
        act = acts[acts.length - 1];
      }
    }`;
worker = worker.replace(oldGetAct, newGetAct);

const oldGetActFallback = `    // Busca la actividad de esa seccion y año
    const { data: act } = await supabase.from('actividades').select('id').eq('seccion', seccion).eq('año', año).single();`;

const newGetActFallback = `    // Busca la actividad más próxima activa de esa seccion y año
    const { data: acts } = await supabase.from('actividades')
      .select('id, activa, fecha_limite_pago')
      .eq('seccion', seccion)
      .eq('año', año);
      
    let act = null;
    if (acts && acts.length > 0) {
      const activeActs = acts.filter(a => a.activa);
      if (activeActs.length > 0) {
        // Ordenar por fecha_limite_pago (las nulas al final o inicio, mejor ignorar o tratar como infinito)
        activeActs.sort((a, b) => {
          if (!a.fecha_limite_pago) return 1;
          if (!b.fecha_limite_pago) return -1;
          return new Date(a.fecha_limite_pago) - new Date(b.fecha_limite_pago);
        });
        act = activeActs[0];
      } else {
        // Si no hay activas, coger la última
        act = acts[acts.length - 1];
      }
    }`;
worker = worker.replace(oldGetActFallback, newGetActFallback);

fs.writeFileSync('worker.js', worker);
console.log('worker.js modified for Upsert & Dates');
