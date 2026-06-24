const fs = require('fs');
let content = fs.readFileSync('worker.js', 'utf8');

// Inject fetch for cuotas_especiales
const fetchCuotas = `
    // 5.5 Obtener cuotas especiales (Overrides integrales)
    let dbCuotasEspeciales = [];
    if (studentIds.length > 0) {
      const { data, error } = await supabase
        .from('cuotas_especiales')
        .select('*')
        .eq('actividad_id', actividad.id)
        .in('estudiante_id', studentIds);
      if (!error) dbCuotasEspeciales = data || [];
    }
`;

content = content.replace("// 6. Obtener egresos", fetchCuotas + "\n    // 6. Obtener egresos");

// Apply cuotas_especiales overrides
const applyCuotas = `
      // ---- APLICAR CUOTA ESPECIAL (si existe) ----
      const cuotaEspecial = dbCuotasEspeciales.find(ce => ce.estudiante_id === student.id);
      let noParticipa = cuotaEspecial ? cuotaEspecial.no_participa : false;
      let rubrosOverrides = cuotaEspecial ? (cuotaEspecial.rubros_personalizados || {}) : {};
      
      if (noParticipa) {
        cuotaCalculada = 0;
        Object.keys(desglose).forEach(k => desglose[k] = 0);
      } else if (cuotaEspecial && cuotaEspecial.monto_personalizado !== null) {
        // Override directo del total (cuota simple)
        cuotaCalculada = Number(cuotaEspecial.monto_personalizado);
        // Ajustamos desglose asumiendo un solo rubro o distribuyendo proporcionalmente (simplificado al primer rubro si es simple)
        if (Object.keys(desglose).length > 0) desglose[Object.keys(desglose)[0]] = cuotaCalculada;
      } else if (cuotaEspecial && Object.keys(rubrosOverrides).length > 0) {
        // Overrides detallados por rubro (cuota compuesta)
        cuotaCalculada = 0;
        Object.keys(desglose).forEach(key => {
          if (rubrosOverrides[key] !== undefined) {
             desglose[key] = Number(rubrosOverrides[key]);
          }
          cuotaCalculada += desglose[key];
        });
      }
      // ---------------------------------------------
`;

content = content.replace("const pagadoCompleto = cuotaCalculada > 0 && pagadoTotal >= cuotaCalculada;", applyCuotas + "\n      const pagadoCompleto = cuotaCalculada > 0 && pagadoTotal >= cuotaCalculada;");

fs.writeFileSync('worker.js', content, 'utf8');
console.log('worker.js patched with cuotas_especiales overrides');
