/**
 * SIGA (Sistema Inteligente de Gestión de Actividades)
 * Script de Migración Histórica: Excel 2026 a Supabase
 * 
 * Uso:
 * $env:SUPABASE_URL="https://your-project.supabase.co"
 * $env:SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
 * node migrate_2026.js
 */

const XLSX = require('xlsx');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// ══════════════════════════════════════════════════════════════
//  1. CONFIGURACIÓN Y CLIENTE SUPABASE
// ══════════════════════════════════════════════════════════════
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // Usar Service Role Key para evitar políticas RLS en la migración

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ ERROR: Faltan las variables de entorno SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.');
  console.error('Por favor ejecútalo definiéndolas en tu terminal:');
  console.error('  En PowerShell:');
  console.error('    $env:SUPABASE_URL="https://tu-proyecto.supabase.co"');
  console.error('    $env:SUPABASE_SERVICE_ROLE_KEY="tu-service-role-key"');
  console.error('    node migrate_2026.js');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: false
  }
});

// ══════════════════════════════════════════════════════════════
//  2. HELPERS
// ══════════════════════════════════════════════════════════════

// Convertir fechas de número serie de Excel a String YYYY-MM-DD
function excelDateToISO(serial) {
  if (!serial) return null;
  // Si ya es un string, retornar directo
  if (typeof serial === 'string') {
    if (serial.includes('/')) {
      const parts = serial.split('/');
      return `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
    }
    return serial;
  }
  const utcd = new Date((serial - 25569) * 86400 * 1000);
  const y = utcd.getUTCFullYear();
  const m = String(utcd.getUTCMonth() + 1).padStart(2, '0');
  const d = String(utcd.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Extraer ID de archivo de Google Drive
function getDriveId(url) {
  if (!url) return null;
  const match = url.match(/[?&\/](?:id=|d\/)([a-zA-Z0-9_-]{10,})/);
  return match ? match[1] : null;
}

// Descargar archivo desde Google Drive a Buffer
async function downloadDriveFile(fileId) {
  const url = `https://docs.google.com/uc?export=download&id=${fileId}`;
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status} al descargar el archivo de Drive ${fileId}`);
  }
  const arrayBuffer = await resp.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// Subir un buffer a Supabase Storage y retornar la URL pública
async function uploadToSupabaseStorage(filePath, buffer, mimeType = 'image/jpeg') {
  const { data, error } = await supabase
    .storage
    .from('comprobantes')
    .upload(filePath, buffer, {
      contentType: mimeType,
      upsert: true
    });

  if (error) {
    throw error;
  }

  const { data: urlData } = supabase.storage.from('comprobantes').getPublicUrl(filePath);
  return urlData.publicUrl;
}

// Intentar descargar y migrar imagen de Drive a Supabase Storage
async function migrateImage(driveUrl, storagePath, defaultFallbackUrl = '') {
  const fileId = getDriveId(driveUrl);
  if (!fileId) {
    console.log(`  ⚠️ URL de Drive inválida o vacía: ${driveUrl}. Se usará fallback.`);
    return { url: defaultFallbackUrl, path: '' };
  }

  try {
    console.log(`  ⏳ Descargando imagen de Drive ID: ${fileId}...`);
    const buffer = await downloadDriveFile(fileId);
    console.log(`  ⏳ Subiendo imagen a Supabase Storage: ${storagePath}...`);
    const publicUrl = await uploadToSupabaseStorage(storagePath, buffer);
    console.log(`  ✅ Imagen migrada con éxito a: ${publicUrl}`);
    return { url: publicUrl, path: storagePath };
  } catch (err) {
    console.error(`  ❌ Error al migrar la imagen de Drive (${fileId}): ${err.message}. Se usará la URL original.`);
    return { url: driveUrl, path: '' };
  }
}

// ══════════════════════════════════════════════════════════════
//  3. PROCESAMIENTO PRINCIPAL
// ══════════════════════════════════════════════════════════════
async function run() {
  console.log('🏁 Iniciando proceso de migración histórica 2026...\n');

  // Cargar libro de Excel
  const workbookPath = path.join(__dirname, 'Festival_2026.xlsx');
  console.log(`📖 Leyendo archivo Excel: ${workbookPath}`);
  const workbook = XLSX.readFile(workbookPath);

  // ────────────────────────────────────────────────────────────
  //  PASO A: Crear/Obtener Actividad "Festival Sión 2026"
  // ────────────────────────────────────────────────────────────
  console.log('\n--- PASO A: Creando Actividad "Festival Sión 2026" ---');
  let { data: actividad, error: errAct } = await supabase
    .from('actividades')
    .select('*')
    .eq('nombre', 'Festival Sión 2026')
    .eq('año', 2026)
    .maybeSingle();

  if (errAct) {
    console.error('❌ Error al buscar actividad:', errAct.message);
    process.exit(1);
  }

  if (!actividad) {
    const { data: newAct, error: errCreateAct } = await supabase
      .from('actividades')
      .insert({
        nombre: 'Festival Sión 2026',
        tipo: 'compleja',
        seccion: '1-1',
        año: 2026,
        activa: false // Al ser histórica, se crea como inactiva
      })
      .select()
      .single();

    if (errCreateAct) {
      console.error('❌ Error al crear la actividad:', errCreateAct.message);
      process.exit(1);
    }
    actividad = newAct;
    console.log('✅ Actividad "Festival Sión 2026" creada con ID:', actividad.id);
  } else {
    console.log('ℹ️ Actividad "Festival Sión 2026" ya existe con ID:', actividad.id);
  }

  // ────────────────────────────────────────────────────────────
  //  PASO B: Crear Grupo de Rubros y Rubros del Festival 2026
  // ────────────────────────────────────────────────────────────
  console.log('\n--- PASO B: Creando Rubros del Festival ---');
  
  // Crear el grupo de rubros
  let { data: grupo, error: errGrupo } = await supabase
    .from('grupos_rubros')
    .select('*')
    .eq('actividad_id', actividad.id)
    .eq('nombre', 'Paquete Festival')
    .maybeSingle();
    
  if (!grupo) {
    const { data: newGrupo, error: errCreateGrupo } = await supabase
      .from('grupos_rubros')
      .insert({
        actividad_id: actividad.id,
        nombre: 'Paquete Festival',
        seccion: '1-1',
        año: 2026
      })
      .select()
      .single();
    if (errCreateGrupo) {
      console.error('❌ Error al crear el grupo de rubros:', errCreateGrupo.message);
      process.exit(1);
    }
    grupo = newGrupo;
  }

  // Definir rubros y sus precios base 2026
  const rubrosBase = [
    { nombre: 'Bingo', precio_nino: 9000, precio_nina: 9000, descuento_hermano_monto: 3000 },
    { nombre: 'Camisa Festival', precio_nino: 8000, precio_nina: 8000, descuento_hermano_monto: 0 },
    { nombre: 'Camisa Adicional', precio_nino: 8500, precio_nina: 8500, descuento_hermano_monto: 0 },
    { nombre: 'Entrenador', precio_nino: 500, precio_nina: 500, descuento_hermano_monto: 0 },
    { nombre: 'Vestuario Presentación Artística', precio_nino: 19000, precio_nina: 20000, descuento_hermano_monto: 0 },
    { nombre: 'Cuota Ventas', precio_nino: 3000, precio_nina: 3000, descuento_hermano_monto: 1000 },
    { nombre: 'Coreógrafo', precio_nino: 5000, precio_nina: 5000, descuento_hermano_monto: 0 },
    { nombre: 'Hidratación', precio_nino: 4000, precio_nina: 4000, descuento_hermano_monto: 0 },
    { nombre: 'Maquillaje', precio_nino: 0, precio_nina: 1000, descuento_hermano_monto: 0 }
  ];

  const rubrosMapeados = {}; // Guardará rubroName -> rubroId
  for (const rb of rubrosBase) {
    let { data: rub, error: errRub } = await supabase
      .from('rubros')
      .select('*')
      .eq('actividad_id', actividad.id)
      .eq('nombre', rb.nombre)
      .maybeSingle();

    if (!rub) {
      const { data: newRub, error: errCreateRub } = await supabase
        .from('rubros')
        .insert({
          actividad_id: actividad.id,
          nombre: rb.nombre,
          grupo_id: grupo.id,
          precio_nino: rb.precio_nino,
          precio_nina: rb.precio_nina,
          descuento_hermano_monto: rb.descuento_hermano_monto,
          seccion: '1-1',
          año: 2026
        })
        .select()
        .single();
      if (errCreateRub) {
        console.error(`❌ Error al crear el rubro ${rb.nombre}:`, errCreateRub.message);
        process.exit(1);
      }
      rub = newRub;
    }
    rubrosMapeados[rb.nombre] = rub.id;
    console.log(`✅ Rubro "${rb.nombre}" cargado con ID: ${rub.id}`);
  }

  // ────────────────────────────────────────────────────────────
  //  PASO C: Cargar Estudiantes de 2026
  // ────────────────────────────────────────────────────────────
  console.log('\n--- PASO C: Cargando Estudiantes de 2026 ---');
  
  // 1. Cargar "Cedula y Nacimiento" en memoria
  const sheetCed = workbook.Sheets['Cedula y Nacimiento'];
  const dataCed = XLSX.utils.sheet_to_json(sheetCed);
  // Crear mapa de numLista -> { cedula, fechaNacimiento }
  const mapaCedulas = {};
  dataCed.forEach(row => {
    const num = parseInt(row['#']);
    if (!isNaN(num)) {
      mapaCedulas[num] = {
        cedula: row['Cédula'] ? String(row['Cédula']).trim() : null,
        fechaNacimiento: excelDateToISO(row['Nacimiento'])
      };
    }
  });

  // 2. Leer estudiantes de "CÁLCULO DE CUOTA"
  const sheetCalculo = workbook.Sheets['CÁLCULO DE CUOTA'];
  const rawCalculoData = XLSX.utils.sheet_to_json(sheetCalculo, { header: 1 });
  
  const estudiantesList = [];
  
  // Recorrer los registros de estudiantes. 
  // Empezar en la fila 11 (index 10) hasta el final.
  for (let i = 10; i < rawCalculoData.length; i++) {
    const row = rawCalculoData[i];
    const numLista = parseInt(row[0]);
    
    // Si la primera columna tiene un número, es un estudiante
    if (!isNaN(numLista)) {
      const nombre = String(row[1]).trim();
      const nombrePadre = row[2] ? String(row[2]).trim() : null;
      const generoRaw = String(row[3]).trim().toLowerCase();
      const genero = (generoRaw.includes('niña') || generoRaw.includes('f') || generoRaw.includes('mujer')) ? 'niña' : 'niño';
      
      const tieneHermano = !!row[4];
      const comentario = row[21] ? String(row[21]).trim() : null;
      
      // La madre está en la fila inmediatamente siguiente, en la columna 3 (index 2)
      let nombreMadre = null;
      const nextRow = rawCalculoData[i + 1];
      if (nextRow && nextRow[0] === null && nextRow[2]) {
        nombreMadre = String(nextRow[2]).trim();
      }
      
      // Obtener datos de Cédula y Nacimiento
      const extraInfo = mapaCedulas[numLista] || { cedula: null, fechaNacimiento: null };
      
      // Valores de desglose en el Excel (para saber participación)
      // Índices: Bingo=9, CamisasFest=10, CamisasAdi=11, Entrenador=12, VestPres=13, CuotaVentas=14, Coreografo=15, Hidratacion=16, Maquillaje=17
      const desgloseExcel = {
        'Bingo': parseFloat(row[9]) || 0,
        'Camisa Festival': parseFloat(row[10]) || 0,
        'Camisa Adicional': parseFloat(row[11]) || 0,
        'Entrenador': parseFloat(row[12]) || 0,
        'Vestuario Presentación Artística': parseFloat(row[13]) || 0,
        'Cuota Ventas': parseFloat(row[14]) || 0,
        'Coreógrafo': parseFloat(row[15]) || 0,
        'Hidratación': parseFloat(row[16]) || 0,
        'Maquillaje': parseFloat(row[17]) || 0
      };

      // Modificadores de camisas adicionales (Talla=8, Cantidad=7)
      const cantCamisaAdi = parseFloat(row[7]) || 1;
      const tallaCamisaAdi = row[8] ? String(row[8]).trim() : null;

      estudiantesList.push({
        numero: numLista,
        nombre,
        genero,
        tiene_hermano: tieneHermano,
        nombre_padre: nombrePadre,
        nombre_madre: nombreMadre,
        nombre_padres: comentario, // Guardar el comentario histórico en el campo observaciones
        cedula: extraInfo.cedula,
        fecha_nacimiento: extraInfo.fechaNacimiento,
        desgloseExcel,
        cantCamisaAdi,
        tallaCamisaAdi
      });
      
      // Saltar la siguiente fila del loop (la de la madre)
      i++;
    }
  }

  console.log(`Identificados ${estudiantesList.length} estudiantes del Excel.`);

  const studentMap = {}; // Guardará numero -> studentUuid

  for (const est of estudiantesList) {
    // Verificar si el estudiante ya existe
    let { data: dbEst, error: errEst } = await supabase
      .from('students')
      .select('*')
      .eq('numero', est.numero)
      .eq('seccion', '1-1')
      .eq('año', 2026)
      .maybeSingle();

    if (!dbEst) {
      const { data: newEst, error: errCreateEst } = await supabase
        .from('students')
        .insert({
          numero: est.numero,
          nombre: est.nombre,
          cedula: est.cedula,
          fecha_nacimiento: est.fecha_nacimiento,
          genero: est.genero,
          tiene_hermano: est.tiene_hermano,
          nombre_padre: est.nombre_padre,
          nombre_madre: est.nombre_madre,
          nombre_padres: est.nombre_padres, // Observaciones históricas
          seccion: '1-1',
          año: 2026
        })
        .select()
        .single();
        
      if (errCreateEst) {
        console.error(`❌ Error al crear estudiante ${est.nombre}:`, errCreateEst.message);
        process.exit(1);
      }
      dbEst = newEst;
    }
    
    studentMap[est.numero] = dbEst.id;
    console.log(` Estudiante #${est.numero} "${est.nombre}" ID Supabase: ${dbEst.id}`);

    // Insertar student_rubros de acuerdo a los valores del desglose
    for (const rubName of Object.keys(est.desgloseExcel)) {
      const val = est.desgloseExcel[rubName];
      const rubId = rubrosMapeados[rubName];
      
      // Si el rubro no existe en Supabase, omitir
      if (!rubId) continue;

      let participa = val > 0;
      let overridePrice = null;
      let cantidad = 1;
      let talla = null;

      // Camisa adicional específica
      if (rubName === 'Camisa Adicional' && participa) {
        cantidad = est.cantCamisaAdi;
        talla = est.tallaCamisaAdi;
      }

      // Calcular el precio esperado por defecto
      let defaultPrice = 0;
      if (participa) {
        const rBase = rubrosBase.find(r => r.nombre === rubName);
        const basePrice = est.genero === 'niño' ? rBase.precio_nino : rBase.precio_nina;
        const desc = est.tiene_hermano ? rBase.descuento_hermano_monto : 0;
        defaultPrice = (basePrice * cantidad) - desc;
        if (defaultPrice < 0) defaultPrice = 0;

        // Si el precio real difiere del esperado, definimos precio_override
        // Nota: en el desglose de conceptos del Excel, ya viene el monto final calculado.
        // Si el valor del excel no coincide con defaultPrice, es un override.
        if (val !== defaultPrice) {
          // Si el rubro es complejo, guardamos el precio unitario del override
          // (monto excel + descuento) / cantidad
          overridePrice = (val + desc) / cantidad;
        }
      }

      // Insertar o actualizar la participación en el rubro
      const { error: errSR } = await supabase
        .from('student_rubros')
        .upsert({
          student_id: dbEst.id,
          rubro_id: rubId,
          participa: participa,
          precio_override: overridePrice,
          cantidad: cantidad,
          talla: talla
        }, { onConflict: 'student_id,rubro_id' });

      if (errSR) {
        console.error(`  ❌ Error al guardar participación de rubro ${rubName} para estudiante ${est.nombre}:`, errSR.message);
      }
    }
  }

  // ────────────────────────────────────────────────────────────
  //  PASO D: Migración de Pagos y Comprobantes
  // ────────────────────────────────────────────────────────────
  console.log('\n--- PASO D: Migrando Pagos y Comprobantes desde Google Drive ---');
  
  const sheetPagos = workbook.Sheets['Análisis Comprobantes'];
  const dataPagos = XLSX.utils.sheet_to_json(sheetPagos);
  console.log(`Encontradas ${dataPagos.length} transacciones de pago en el Excel.`);

  let totalPagosMigrados = 0;
  for (const row of dataPagos) {
    const studentNum = parseInt(row['StudentNum']);
    const studentId = studentMap[studentNum];
    
    if (!studentId) {
      console.warn(`  ⚠️ Alumno no encontrado para el pago: StudentNum=${studentNum}. Omitiendo.`);
      continue;
    }

    const refSinpe = row['RefSINPE'] ? String(row['RefSINPE']).trim() : `HISTORICO_2026_${Date.now()}_${Math.random()}`;

    // Validar si el pago ya fue migrado
    let { data: existingPago } = await supabase
      .from('pagos')
      .select('id')
      .eq('referencia_sinpe', refSinpe)
      .maybeSingle();

    if (existingPago) {
      console.log(`  ℹ️ Pago con referencia ${refSinpe} ya existe en Supabase. Omitiendo.`);
      totalPagosMigrados++;
      continue;
    }

    // Descargar imagen de Drive y subirla a Supabase Storage
    const driveLink = row['DriveLink'];
    const fileName = row['FileName'] || `pago_${studentNum}_${refSinpe}.jpg`;
    const storagePath = `2026/1-1/${fileName}`;
    
    // Ejecutar migración de imagen
    const media = await migrateImage(driveLink, storagePath, driveLink);

    // Identificar el tipo de pago
    const isPagoTotal = String(row['FileName'] || '').toLowerCase().includes('total');
    const tipo = isPagoTotal ? 'pago_total' : 'abono';

    // Insertar pago
    const { error: errInsertPago } = await supabase
      .from('pagos')
      .insert({
        student_id: studentId,
        actividad_id: actividad.id,
        monto: parseFloat(row['Monto']) || 0,
        fecha: excelDateToISO(row['Fecha']),
        tipo: tipo,
        comprobante_url: media.url,
        comprobante_file_id: media.path,
        banco: row['Banco'] ? String(row['Banco']).trim() : 'Desconocido',
        remitente: row['Remitente'] ? String(row['Remitente']).trim() : null,
        referencia_sinpe: refSinpe,
        score_ia: parseInt(row['Score']) || 100,
        decision_ia: row['Decision'] || 'APROBAR',
        razon_score: row['RazonScore'] || 'Migración histórica',
        estado: 'APROBADO',
        aprobado_por: row['Aprobador'] || 'MigraciónMasiva',
        año: 2026
      });

    if (errInsertPago) {
      console.error(`  ❌ Error al insertar pago ref ${refSinpe}:`, errInsertPago.message);
    } else {
      console.log(`  ✅ Pago de ${row['StudentName']} (₡${row['Monto']}) ref: ${refSinpe} insertado.`);
      totalPagosMigrados++;
    }
  }
  console.log(`Pagos migrados con éxito: ${totalPagosMigrados}/${dataPagos.length}`);

  // ────────────────────────────────────────────────────────────
  //  PASO E: Migración de Egresos
  // ────────────────────────────────────────────────────────────
  console.log('\n--- PASO E: Migrando Egresos y Recibos ---');
  
  const sheetEgresos = workbook.Sheets['Egresos'];
  const dataEgresos = XLSX.utils.sheet_to_json(sheetEgresos);
  console.log(`Encontrados ${dataEgresos.length} egresos en el Excel.`);

  let totalEgresosMigrados = 0;
  for (const row of dataEgresos) {
    const idEgreso = row['ID'] || `egr_hist_${Date.now()}_${Math.random()}`;

    // Validar si ya existe
    let { data: existingEgreso } = await supabase
      .from('egresos')
      .select('id')
      .eq('concepto', row['Concepto'])
      .eq('monto', row['Monto'])
      .eq('año', 2026)
      .maybeSingle();

    if (existingEgreso) {
      console.log(`  ℹ️ Egreso "${row['Concepto']}" ya existe en Supabase. Omitiendo.`);
      totalEgresosMigrados++;
      continue;
    }

    // Migrar comprobante
    const driveLink = row['DriveLink'];
    const conceptSlug = String(row['Concepto']).toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 15);
    const fileName = `egreso_${conceptSlug}_${Date.now()}.jpg`;
    const storagePath = `2026/egresos/${fileName}`;

    const media = await migrateImage(driveLink, storagePath, driveLink);

    // Insertar egreso
    const { error: errInsertEgreso } = await supabase
      .from('egresos')
      .insert({
        actividad_id: actividad.id,
        concepto: row['Concepto'],
        categoria: row['Categoria'],
        monto: parseFloat(row['Monto']) || 0,
        fecha: excelDateToISO(row['Fecha']),
        comentario: row['Comentario'] || null,
        recibo_url: media.url,
        recibo_file_id: media.path,
        registrado_por: row['AdminEmail'] || '2510maag@gmail.com',
        seccion: '1-1',
        año: 2026
      });

    if (errInsertEgreso) {
      console.error(`  ❌ Error al insertar egreso "${row['Concepto']}":`, errInsertEgreso.message);
    } else {
      console.log(`  ✅ Egreso "${row['Concepto']}" (₡${row['Monto']}) insertado.`);
      totalEgresosMigrados++;
    }
  }
  console.log(`Egresos migrados con éxito: ${totalEgresosMigrados}/${dataEgresos.length}`);

  // ────────────────────────────────────────────────────────────
  //  PASO F: Migración de Historial de Auditoría
  // ────────────────────────────────────────────────────────────
  console.log('\n--- PASO F: Migrando Historial de Auditoría ---');
  
  const sheetHistorial = workbook.Sheets['Historial'];
  const dataHistorial = XLSX.utils.sheet_to_json(sheetHistorial);
  console.log(`Encontrados ${dataHistorial.length} registros de historial en el Excel.`);

  let totalHistorialMigrados = 0;
  for (const row of dataHistorial) {
    const studentNum = parseInt(row['Num']);
    const studentId = studentMap[studentNum];

    // Formatear fecha e incorporar hora
    const fechaISO = excelDateToISO(row['Fecha']);
    let timestamp = fechaISO;
    if (row['Hora']) {
      const decTime = parseFloat(row['Hora']);
      if (!isNaN(decTime)) {
        const h = Math.floor(decTime * 24);
        const m = Math.floor((decTime * 24 - h) * 60);
        const s = Math.round(((decTime * 24 - h) * 60 - m) * 60);
        timestamp = `${fechaISO}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.000Z`;
      }
    }

    const { error: errInsertHistorial } = await supabase
      .from('historial')
      .insert({
        actividad_id: actividad.id,
        accion: row['Acción'],
        student_id: studentId || null,
        seccion: '1-1',
        monto: parseFloat(row['Monto']) || null,
        aprobador: row['Aprobador'] ? String(row['Aprobador']).trim() : null,
        detalle: row['Detalle'] ? String(row['Detalle']).trim() : null,
        ref_sinpe: row['Ref SINPE'] ? String(row['Ref SINPE']).trim() : null,
        año: 2026,
        created_at: timestamp
      });

    if (errInsertHistorial) {
      console.error(`  ❌ Error al insertar historial:`, errInsertHistorial.message);
    } else {
      totalHistorialMigrados++;
    }
  }
  console.log(`Historial migrado con éxito: ${totalHistorialMigrados}/${dataHistorial.length}`);

  console.log('\n🏁 ¡Proceso de migración terminado con éxito! 🎉');
}

run();
