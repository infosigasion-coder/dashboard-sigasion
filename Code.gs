// ═══════════════════════════════════════════════════════════════
//  Festival Sión 2026 — Apps Script API  (v19 — Telegram Bot)
// ═══════════════════════════════════════════════════════════════

// ── SECRETOS: leídos desde PropertiesService (NO hardcodear) ───
function getSecret(key) {
  var val = PropertiesService.getScriptProperties().getProperty(key);
  if (!val) throw new Error('Falta la propiedad de script: ' + key);
  return val;
}

const CONFIG = {
  FOLDER_ID:       '1GE9Ooshyjak2oD-C5iAQAIpKCpfYuGJa',
  get CLAUDE_API_KEY() { return getSecret('CLAUDE_API_KEY'); },
  get TELEGRAM_TOKEN() { return getSecret('TELEGRAM_TOKEN'); },
  ADMIN_EMAILS:    ['2510maag@gmail.com','mrojas1194@gmail.com','pameberta63@gmail.com'],
  VALID_PHONES:    ['70228161','7022-8161','83823869','8382-3869'],
  ALTERNATE_PHONE: '83823869',
  MIN_MONTO:       1000,
  MAX_MONTO:       200000,
  NOMBRE_CON_INICIAL: {'Isabella': ['S','M']},
  TELEGRAM_CHAT:   '-1003834633524',
  DASHBOARD_URL:   'https://festival-sion-2026.2510maag.workers.dev',
};

// ── CORS HELPER ───────────────────────────────────────────────
function outCORS(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ══════════════════════════════════════════════════════════════
//  TELEGRAM BOT
// ══════════════════════════════════════════════════════════════
function sendTelegram(text) {
  try {
    UrlFetchApp.fetch('https://api.telegram.org/bot' + CONFIG.TELEGRAM_TOKEN + '/sendMessage', {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({
        chat_id: CONFIG.TELEGRAM_CHAT,
        text: text,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      }),
      muteHttpExceptions: true
    });
  } catch(e) {
    Logger.log('Telegram error: ' + e.message);
  }
}

function buildRazones(analysis) {
  const razones = [];
  const f = analysis.flags || {};
  if (analysis.score < 85)         razones.push('Score menor a 85% (' + analysis.score + '%)');
  if (analysis.isAlternate)        razones.push('Número de teléfono alterno (8382-3869)');
  if (analysis.isDuplicate)        razones.push('Referencia SINPE duplicada');
  if (f.posibleFalsificacion)      razones.push('Posible falsificación detectada');
  if (f.posibleIA)                 razones.push('Imagen posiblemente generada por IA');
  if (f.textoEditado)              razones.push('Texto posiblemente editado');
  if (f.imagenBorrosa)             razones.push('Imagen borrosa o ilegible');
  if (analysis.monto < CONFIG.MIN_MONTO || analysis.monto > CONFIG.MAX_MONTO)
                                   razones.push('Monto fuera de rango permitido');
  return razones;
}

function notifyPendiente(studentName, analysis, driveLink) {
  const razones = buildRazones(analysis);
  const razonesText = razones.length > 0
    ? '\n⚠️ <b>Razones:</b>\n' + razones.map(r => '  • ' + r).join('\n')
    : '';
  const alertIcon = (analysis.flags && (analysis.flags.posibleFalsificacion || analysis.flags.posibleIA)) ? '🚨' : '⏳';
  sendTelegram(
    alertIcon + ' <b>Comprobante en revisión</b>\n' +
    '👤 <b>Estudiante:</b> ' + studentName + '\n' +
    '💰 <b>Monto:</b> ₡' + Number(analysis.monto||0).toLocaleString('es-CR') + '\n' +
    '🏦 <b>Banco:</b> ' + (analysis.banco||'Desconocido') + '\n' +
    '👩 <b>Remitente:</b> ' + (analysis.remitente||'—') + '\n' +
    '📊 <b>Score IA:</b> ' + (analysis.score||0) + '%' +
    razonesText + '\n' +
    '🔗 <a href="' + CONFIG.DASHBOARD_URL + '">Abrir dashboard</a>'
  );
}

function notifyAprobadoAuto(studentName, analysis) {
  sendTelegram(
    '✅ <b>Pago aprobado automáticamente</b>\n' +
    '👤 <b>Estudiante:</b> ' + studentName + '\n' +
    '💰 <b>Monto:</b> ₡' + Number(analysis.monto||0).toLocaleString('es-CR') + '\n' +
    '🏦 <b>Banco:</b> ' + (analysis.banco||'—') + '\n' +
    '👩 <b>Remitente:</b> ' + (analysis.remitente||'—') + '\n' +
    '📊 <b>Score IA:</b> ' + (analysis.score||0) + '%'
  );
}

function notifyRechazadoAuto(studentName, analysis) {
  sendTelegram(
    '❌ <b>Comprobante rechazado automáticamente</b>\n' +
    '👤 <b>Estudiante:</b> ' + studentName + '\n' +
    '💰 <b>Monto:</b> ₡' + Number(analysis.monto||0).toLocaleString('es-CR') + '\n' +
    '📊 <b>Score IA:</b> ' + (analysis.score||0) + '%\n' +
    '⚠️ <b>Razón:</b> ' + (analysis.razonScore||'—')
  );
}

function notifyAprobadoManual(studentName, monto, adminEmail, justificacion) {
  sendTelegram(
    '✅ <b>Pago aprobado manualmente</b>\n' +
    '👤 <b>Estudiante:</b> ' + studentName + '\n' +
    '💰 <b>Monto:</b> ₡' + Number(monto||0).toLocaleString('es-CR') + '\n' +
    '👮 <b>Admin:</b> ' + adminEmail +
    (justificacion ? '\n📝 <b>Nota:</b> ' + justificacion : '')
  );
}

function notifyRechazadoManual(studentName, monto, adminEmail, justificacion) {
  sendTelegram(
    '❌ <b>Pago rechazado manualmente</b>\n' +
    '👤 <b>Estudiante:</b> ' + studentName + '\n' +
    '💰 <b>Monto:</b> ₡' + Number(monto||0).toLocaleString('es-CR') + '\n' +
    '👮 <b>Admin:</b> ' + adminEmail + '\n' +
    '📝 <b>Razón:</b> ' + (justificacion||'—')
  );
}

function notifyRevertido(studentName, monto, adminEmail, justificacion) {
  sendTelegram(
    '↩️ <b>Pago revertido</b>\n' +
    '👤 <b>Estudiante:</b> ' + studentName + '\n' +
    '💰 <b>Monto:</b> ₡' + Number(monto||0).toLocaleString('es-CR') + '\n' +
    '👮 <b>Admin:</b> ' + adminEmail + '\n' +
    '📝 <b>Razón:</b> ' + (justificacion||'—')
  );
}

// ── RESUMEN DIARIO (ejecutar con trigger a las 8pm) ───────────
function enviarResumenDiario() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const shControl = ss.getSheetByName('Control de Pagos') || ss.getSheets()[1];
  const shCuota   = ss.getSheetByName('Cálculo de Cuota') || ss.getSheets()[0];
  const dControl  = shControl.getDataRange().getValues();
  const dCuota    = shCuota.getDataRange().getValues();

  let totalEsperado=0, totalRecaudado=0, pagadosCompleto=0, sinPago=0, conAbono=0;
  const sinPagoList = [];

  for (let n=1; n<=23; n++) {
    let cuota=0, pagado=0, isPagado=false;
    for (let i=0; i<dCuota.length; i++) {
      if (Number(dCuota[i][0])===n) { cuota=Number(dCuota[i][18])||0; break; }
    }
    for (let i=0; i<dControl.length; i++) {
      if (Number(dControl[i][0])===n) {
        isPagado = dControl[i][4]===true || String(dControl[i][4]).toLowerCase()==='true';
        for (let a=0; a<5; a++) pagado += Number(dControl[i][7+a*2])||0;
        break;
      }
    }
    totalEsperado += cuota;
    if (isPagado || pagado>=cuota) { pagadosCompleto++; totalRecaudado+=cuota; }
    else if (pagado>0) { conAbono++; totalRecaudado+=pagado; }
    else {
      sinPago++;
      for (let i=0; i<dCuota.length; i++) {
        if (Number(dCuota[i][0])===n) { sinPagoList.push(String(dCuota[i][1]).trim().split(' ')[0]); break; }
      }
    }
  }

  const pct = totalEsperado>0 ? Math.round(totalRecaudado/totalEsperado*100) : 0;
  const hoy = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy');
  const limite = new Date('2026-05-07');
  const diasRestantes = Math.ceil((limite - new Date()) / (1000*60*60*24));

  const pendingSheet = ss.getSheetByName('Pendientes');
  const pendingData  = pendingSheet ? pendingSheet.getDataRange().getValues() : [];
  let pendientes = 0;
  for (let i=1; i<pendingData.length; i++) {
    if (pendingData[i][16]==='PENDIENTE') pendientes++;
  }

  let msg = '📊 <b>Resumen Festival Sión — ' + hoy + '</b>\n\n' +
    '💰 <b>Total recaudado:</b> ₡' + totalRecaudado.toLocaleString('es-CR') + ' (' + pct + '%)\n' +
    '🎯 <b>Meta:</b> ₡' + totalEsperado.toLocaleString('es-CR') + '\n' +
    '✅ <b>Pagados completo:</b> ' + pagadosCompleto + '/23\n' +
    '🔵 <b>Con abono parcial:</b> ' + conAbono + '\n' +
    '❌ <b>Sin pago:</b> ' + sinPago + '\n' +
    (pendientes>0 ? '⏳ <b>Pendientes de revisión:</b> ' + pendientes + '\n' : '') +
    '📅 <b>Días restantes:</b> ' + diasRestantes;

  if (sinPagoList.length > 0) {
    msg += '\n\n⚠️ <b>Sin pago:</b> ' + sinPagoList.join(', ');
  }

  sendTelegram(msg);
}

// ── ALERTA ÚLTIMOS 7 DÍAS ─────────────────────────────────────
function alertaLimite() {
  const limite = new Date('2026-05-07');
  const diasRestantes = Math.ceil((limite - new Date()) / (1000*60*60*24));
  if (diasRestantes > 7) return;

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const shControl = ss.getSheetByName('Control de Pagos') || ss.getSheets()[1];
  const shCuota   = ss.getSheetByName('Cálculo de Cuota') || ss.getSheets()[0];
  const dControl  = shControl.getDataRange().getValues();
  const dCuota    = shCuota.getDataRange().getValues();

  const sinPagoList = [];
  for (let n=1; n<=23; n++) {
    let cuota=0, pagado=0, isPagado=false;
    for (let i=0; i<dCuota.length; i++) {
      if (Number(dCuota[i][0])===n) { cuota=Number(dCuota[i][18])||0; break; }
    }
    for (let i=0; i<dControl.length; i++) {
      if (Number(dControl[i][0])===n) {
        isPagado = dControl[i][4]===true || String(dControl[i][4]).toLowerCase()==='true';
        for (let a=0; a<5; a++) pagado += Number(dControl[i][7+a*2])||0;
        break;
      }
    }
    if (!isPagado && pagado<cuota) {
      for (let i=0; i<dCuota.length; i++) {
        if (Number(dCuota[i][0])===n) {
          sinPagoList.push(String(dCuota[i][1]).trim());
          break;
        }
      }
    }
  }

  if (sinPagoList.length === 0) return;

  sendTelegram(
    '🚨 <b>ALERTA — ' + diasRestantes + ' días para el límite de pago</b>\n\n' +
    '📅 Límite: 07 de mayo de 2026\n\n' +
    '❌ <b>Estudiantes sin pago completo (' + sinPagoList.length + '):</b>\n' +
    sinPagoList.map((n,i) => (i+1)+'. '+n).join('\n') + '\n\n' +
    '🔗 <a href="' + CONFIG.DASHBOARD_URL + '">Abrir dashboard</a>'
  );
}

// ── POLLING BOT (trigger cada 2 min) ─────────────────────────
function procesarComandosBot() {
  const props = PropertiesService.getScriptProperties();
  const lastUpdate = parseInt(props.getProperty('lastUpdateId') || '0');

  const resp = UrlFetchApp.fetch(
    'https://api.telegram.org/bot' + CONFIG.TELEGRAM_TOKEN +
    '/getUpdates?offset=' + (lastUpdate+1) + '&timeout=1',
    { muteHttpExceptions: true }
  );
  const data = JSON.parse(resp.getContentText());
  if (!data.ok || !data.result.length) return;

  let maxId = lastUpdate;
  data.result.forEach(function(update) {
    maxId = Math.max(maxId, update.update_id);
    const msg = update.message;
    if (!msg || !msg.text) return;

    const chatId = String(msg.chat.id);
    const userId = msg.from.id;
    const text   = msg.text.trim();

    // Solo responder en el grupo correcto
    if (chatId !== CONFIG.TELEGRAM_CHAT) return;

    const parts = text.split(' ');
    const cmd   = parts[0].toLowerCase().replace('@festivalSion2026_bot','');

    switch(cmd) {
      case '/resumen':     botResumen(); break;
      case '/pendientes':  botPendientes(); break;
      case '/rechazados':  botRechazados(); break;
      case '/sinpago':     botSinPago(); break;
      case '/estudiante':  botEstudiante(parts.slice(1).join(' ')); break;
      case '/aprobar':     botAprobar(parts[1], parts.slice(2).join(' '), userId); break;
      case '/rechazar':    botRechazar(parts[1], parts.slice(2).join(' '), userId); break;
      case '/rescatar':    botRescatar(parts[1], parts.slice(2).join(' '), userId); break;
      case '/ayuda':       botAyuda(); break;
    }
  });

  props.setProperty('lastUpdateId', String(maxId));
}

function botAyuda() {
  sendTelegram(
    '🤖 <b>Comandos disponibles:</b>\n\n' +
    '/resumen — Estado actual de pagos\n' +
    '/pendientes — Comprobantes en revisión\n' +
    '/rechazados — Comprobantes rechazados\n' +
    '/sinpago — Estudiantes sin pago\n' +
    '/estudiante [nombre] — Estado de un estudiante\n' +
    '/aprobar [ID] [nota] — Aprobar comprobante pendiente\n' +
    '/rechazar [ID] [motivo] — Rechazar comprobante pendiente\n' +
    '/rescatar [ID] [motivo] — Rescatar comprobante rechazado\n' +
    '/ayuda — Esta lista'
  );
}

function botResumen() {
  enviarResumenDiario();
}

function botPendientes() {
  const sh   = getPendingSheet();
  const data = sh.getDataRange().getValues();
  const list = [];
  for (let i=1; i<data.length; i++) {
    if (data[i][16]==='PENDIENTE') {
      list.push('• <b>'+data[i][3]+'</b> — ₡'+Number(data[i][4]).toLocaleString('es-CR')+
        ' (Score: '+data[i][8]+'%) ID: <code>'+data[i][0]+'</code>');
    }
  }
  if (!list.length) {
    sendTelegram('✅ No hay comprobantes pendientes de revisión.');
  } else {
    sendTelegram('⏳ <b>Pendientes de revisión ('+list.length+'):</b>\n\n'+list.join('\n'));
  }
}

function botRechazados() {
  const sh   = getPendingSheet();
  const data = sh.getDataRange().getValues();
  const list = [];
  for (let i=1; i<data.length; i++) {
    if (data[i][16]==='RECHAZADO') {
      list.push('• <b>'+data[i][3]+'</b> — ₡'+Number(data[i][4]).toLocaleString('es-CR')+
        '\n  Score: '+data[i][8]+'% | ID: <code>'+data[i][0]+'</code>');
    }
  }
  if (!list.length) {
    sendTelegram('✅ No hay comprobantes rechazados.');
  } else {
    sendTelegram('❌ <b>Comprobantes rechazados ('+list.length+'):</b>\n\n'+list.join('\n\n')+
      '\n\n💡 Para rescatar: /rescatar [ID] [motivo]');
  }
}

function botRescatar(pendingId, justificacion, userId) {
  if (!pendingId || !justificacion) { sendTelegram('❓ Uso: /rescatar [ID] [motivo]'); return; }
  const sh   = getPendingSheet();
  const data = sh.getDataRange().getValues();
  for (let i=1; i<data.length; i++) {
    if (data[i][0] === pendingId && data[i][16]==='RECHAZADO') {
      const studentNum  = Number(data[i][2]);
      const studentName = data[i][3];
      const monto       = Number(data[i][4]);
      const fecha       = data[i][5];
      const fileId      = data[i][9];
      const driveLink   = data[i][11];

      try {
        const file = DriveApp.getFileById(fileId);
        file.moveTo(DriveApp.getFolderById(CONFIG.FOLDER_ID));
      } catch(e) {}

      registerPaymentInSheet(studentNum, fecha, monto, driveLink, false);
      const analysisData = {
        fecha: fecha, monto: monto, banco: data[i][6],
        remitente: data[i][7], referenciaSINPE: data[i][12],
        score: Number(data[i][8]), decision: 'APROBAR',
        isAlternate: data[i][13]==='SI', isDuplicate: data[i][14]==='SI',
        flags: {}, razonScore: 'Rescatado vía Telegram: ' + justificacion
      };
      saveComprobante(studentNum, studentName, analysisData, fileId, data[i][10], driveLink, 'Telegram');
      sh.getRange(i+1,17).setValue('RESCATADO');
      sh.getRange(i+1,18).setValue('Telegram');
      sh.getRange(i+1,19).setValue(nowStr());
      sh.getRange(i+1,20).setValue('RESCATADO: ' + justificacion);
      logHistory('RESCATADO_TELEGRAM', studentName, studentNum, monto, 'Telegram', justificacion, data[i][12]);
      sendTelegram('♻️ <b>Comprobante rescatado y aprobado</b>\n👤 '+studentName+'\n💰 ₡'+monto.toLocaleString('es-CR')+'\n📝 '+justificacion);
      return;
    }
  }
  sendTelegram('❌ No encontré ese ID o ya fue procesado.');
}

function botSinPago() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const shControl = ss.getSheetByName('Control de Pagos') || ss.getSheets()[1];
  const shCuota   = ss.getSheetByName('Cálculo de Cuota') || ss.getSheets()[0];
  const dControl  = shControl.getDataRange().getValues();
  const dCuota    = shCuota.getDataRange().getValues();
  const list = [];
  for (let n=1; n<=23; n++) {
    let cuota=0, pagado=0, isPagado=false, nombre='';
    for (let i=0; i<dCuota.length; i++) {
      if (Number(dCuota[i][0])===n) { cuota=Number(dCuota[i][18])||0; nombre=String(dCuota[i][1]).trim(); break; }
    }
    for (let i=0; i<dControl.length; i++) {
      if (Number(dControl[i][0])===n) {
        isPagado = dControl[i][4]===true || String(dControl[i][4]).toLowerCase()==='true';
        for (let a=0; a<5; a++) pagado += Number(dControl[i][7+a*2])||0;
        break;
      }
    }
    if (!isPagado && pagado<cuota) {
      const saldo = cuota-pagado;
      list.push((n)+'. <b>'+nombre+'</b> — Saldo: ₡'+saldo.toLocaleString('es-CR'));
    }
  }
  if (!list.length) {
    sendTelegram('🎉 ¡Todos los estudiantes han pagado!');
  } else {
    sendTelegram('❌ <b>Sin pago completo ('+list.length+'):</b>\n\n'+list.join('\n'));
  }
}

function botEstudiante(nombre) {
  if (!nombre) { sendTelegram('❓ Uso: /estudiante [nombre o número de lista]'); return; }
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const shControl = ss.getSheetByName('Control de Pagos') || ss.getSheets()[1];
  const shCuota   = ss.getSheetByName('Cálculo de Cuota') || ss.getSheets()[0];
  const dControl  = shControl.getDataRange().getValues();
  const dCuota    = shCuota.getDataRange().getValues();

  const q = nombre.trim().toLowerCase();
  const esNumero = /^\d+$/.test(q);

  const encontrados = [];
  for (let i=0; i<dCuota.length; i++) {
    const num = Number(dCuota[i][0]);
    if (!num || num<1 || num>23) continue;
    if (esNumero) {
      if (num === Number(q)) {
        encontrados.push({ num, nombre:String(dCuota[i][1]).trim(), cuota:Number(dCuota[i][18])||0 });
        break;
      }
    } else {
      if (String(dCuota[i][1]).toLowerCase().includes(q)) {
        encontrados.push({ num, nombre:String(dCuota[i][1]).trim(), cuota:Number(dCuota[i][18])||0 });
      }
    }
  }

  if (!encontrados.length) {
    sendTelegram('❓ No encontré estudiante con ese nombre o número.');
    return;
  }

  // Múltiples coincidencias
  if (encontrados.length > 1) {
    const lista = encontrados.map(e => '  ' + String(e.num).padStart(2,'0') + '. ' + e.nombre).join('\n');
    sendTelegram(
      '👥 Se encontraron <b>'+encontrados.length+' estudiantes</b>:\n\n' + lista +
      '\n\nEscribí el número de lista para consultar:\n' +
      encontrados.map(e => '/estudiante '+e.num).join('  o  ')
    );
    return;
  }

  const found = encontrados[0];
  let pagado=0, isPagado=false;
  for (let i=0; i<dControl.length; i++) {
    if (Number(dControl[i][0])===found.num) {
      isPagado = dControl[i][4]===true || String(dControl[i][4]).toLowerCase()==='true';
      for (let a=0; a<5; a++) pagado += Number(dControl[i][7+a*2])||0;
      break;
    }
  }
  const saldo = found.cuota - pagado;
  const pct   = found.cuota>0 ? Math.round(pagado/found.cuota*100) : 0;
  const estado = isPagado || pagado>=found.cuota ? '✅ Pagado completo' : pagado>0 ? '🔵 Pago parcial' : '❌ Sin pago';
  sendTelegram(
    '👤 <b>'+String(found.num).padStart(2,'0')+'. '+found.nombre+'</b>\n' +
    '📊 <b>Estado:</b> '+estado+'\n' +
    '💰 <b>Cuota:</b> ₡'+found.cuota.toLocaleString('es-CR')+'\n' +
    '✅ <b>Pagado:</b> ₡'+pagado.toLocaleString('es-CR')+' ('+pct+'%)\n' +
    '⚠️ <b>Saldo:</b> ₡'+saldo.toLocaleString('es-CR')
  );
}

function botAprobar(pendingId, justificacion, userId) {
  if (!pendingId) { sendTelegram('❓ Uso: /aprobar [ID] [nota opcional]'); return; }
  const sh   = getPendingSheet();
  const data = sh.getDataRange().getValues();
  for (let i=1; i<data.length; i++) {
    if (data[i][0] === pendingId && data[i][16]==='PENDIENTE') {
      const studentNum  = Number(data[i][2]);
      const studentName = data[i][3];
      const monto       = Number(data[i][4]);
      const fecha       = data[i][5];
      const driveLink   = data[i][11];
      registerPaymentInSheet(studentNum, fecha, monto, driveLink, false);
      const analysisData = {
        fecha:data[i][5], monto:Number(data[i][4]), banco:data[i][6],
        remitente:data[i][7], referenciaSINPE:data[i][12],
        score:Number(data[i][8]), decision:'APROBAR',
        isAlternate:data[i][13]==='SI', isDuplicate:data[i][14]==='SI',
        flags:{}, razonScore:justificacion||'Aprobado vía Telegram'
      };
      saveComprobante(studentNum, studentName, analysisData, data[i][9], data[i][10], driveLink, 'Telegram');
      sh.getRange(i+1,17).setValue('APROBADO');
      sh.getRange(i+1,18).setValue('Telegram');
      sh.getRange(i+1,19).setValue(nowStr());
      sh.getRange(i+1,20).setValue(justificacion||'Aprobado vía Telegram');
      logHistory('APROBADO_TELEGRAM', studentName, studentNum, monto, 'Telegram', justificacion||'', data[i][12]);
      sendTelegram('✅ <b>Aprobado desde Telegram</b>\n👤 '+studentName+'\n💰 ₡'+monto.toLocaleString('es-CR'));
      return;
    }
  }
  sendTelegram('❌ No encontré ese ID o ya fue procesado.');
}

function botRechazar(pendingId, justificacion, userId) {
  if (!pendingId || !justificacion) { sendTelegram('❓ Uso: /rechazar [ID] [motivo]'); return; }
  const sh   = getPendingSheet();
  const data = sh.getDataRange().getValues();
  for (let i=1; i<data.length; i++) {
    if (data[i][0] === pendingId && data[i][16]==='PENDIENTE') {
      try { DriveApp.getFileById(data[i][9]).moveTo(getRejectedFolder()); } catch(e){}
      sh.getRange(i+1,17).setValue('RECHAZADO');
      sh.getRange(i+1,18).setValue('Telegram');
      sh.getRange(i+1,19).setValue(nowStr());
      sh.getRange(i+1,20).setValue(justificacion);
      logHistory('RECHAZADO_TELEGRAM', data[i][3], Number(data[i][2]), Number(data[i][4]), 'Telegram', justificacion, data[i][12]);
      sendTelegram('❌ <b>Rechazado desde Telegram</b>\n👤 '+data[i][3]+'\n📝 '+justificacion);
      return;
    }
  }
  sendTelegram('❌ No encontré ese ID o ya fue procesado.');
}

// ── SETUP TRIGGERS ────────────────────────────────────────────
function setupTriggers() {
  // Eliminar triggers existentes
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));

  // Polling bot cada 1 minuto
  ScriptApp.newTrigger('procesarComandosBot')
    .timeBased().everyMinutes(1).create();

  // Resumen diario a las 8pm Costa Rica
  ScriptApp.newTrigger('enviarResumenDiario')
    .timeBased().everyDays(1).atHour(20).create();

  // Alerta límite diaria a las 9am
  ScriptApp.newTrigger('alertaLimite')
    .timeBased().everyDays(1).atHour(9).create();

  Logger.log('✅ Triggers configurados correctamente');
  sendTelegram('🤖 <b>Bot Festival Sión 2026 activado</b>\n\nEscribo /ayuda para ver los comandos disponibles.');
}

// ── HOJAS AUTOMÁTICAS ─────────────────────────────────────────
function getHistorySheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName('Historial');
  if (!sh) {
    sh = ss.insertSheet('Historial');
    sh.appendRow(['Fecha','Hora','Acción','Estudiante','Num','Monto','Aprobador','Detalle','Ref SINPE']);
    sh.setFrozenRows(1);
  }
  return sh;
}

function getPendingSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName('Pendientes');
  if (!sh) {
    sh = ss.insertSheet('Pendientes');
    sh.appendRow(['ID','Fecha','Estudiante Num','Estudiante Nombre','Monto','Fecha Extraida','Banco','Remitente','Score','FileId','FileName','LinkDrive','RefSINPE','FlagAlterno','FlagDuplicado','FlagSospecha','Estado','Aprobador','FechaResolucion','Justificacion']);
    sh.setFrozenRows(1);
  }
  return sh;
}

function getRejectedFolder() {
  const parent = DriveApp.getFolderById(CONFIG.FOLDER_ID);
  const it = parent.getFoldersByName('Rechazados');
  if (it.hasNext()) return it.next();
  return parent.createFolder('Rechazados');
}

function getComprobantesSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName('Análisis Comprobantes');
  if (!sh) {
    sh = ss.insertSheet('Análisis Comprobantes');
    sh.appendRow(['FileId','FileName','DriveLink','StudentNum','StudentName','Fecha','Monto','Banco','Remitente','RefSINPE','Score','Decision','IsAlternate','IsDuplicate','IsSuspect','RazonScore','FechaAnalisis','Aprobador']);
    sh.setFrozenRows(1);
    sh.getRange(1,1,1,18).setBackground('#1A2E27').setFontColor('#fff').setFontWeight('bold');
  }
  return sh;
}

function saveComprobante(studentNum, studentName, analysis, fileId, fileName, driveLink, aprobador) {
  const sh = getComprobantesSheet();
  const f  = analysis.flags || {};
  sh.appendRow([
    fileId, fileName, driveLink, studentNum, studentName,
    analysis.fecha||'', analysis.monto||0, analysis.banco||'', analysis.remitente||'',
    analysis.referenciaSINPE||'', analysis.score||0, analysis.decision||'',
    analysis.isAlternate ? 'SI' : '',
    analysis.isDuplicate ? 'SI' : '',
    (f.posibleFalsificacion||f.posibleIA||f.textoEditado) ? 'SI' : '',
    analysis.razonScore||'', nowStr(), aprobador||'Sistema'
  ]);
}

// ── HELPERS ───────────────────────────────────────────────────
function toBool(v) {
  if (typeof v === 'boolean') return v;
  return ['true','sí','si','1'].includes(String(v).trim().toLowerCase());
}

function fmtDate(v) {
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), 'dd/MM/yyyy');
  return String(v||'').trim();
}

function nowStr() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm:ss');
}

function logHistory(accion, estudiante, num, monto, aprobador, detalle, refSinpe) {
  const sh    = getHistorySheet();
  const now   = new Date();
  const fecha = Utilities.formatDate(now, Session.getScriptTimeZone(), 'dd/MM/yyyy');
  const hora  = Utilities.formatDate(now, Session.getScriptTimeZone(), 'HH:mm:ss');
  sh.appendRow([fecha, hora, accion, estudiante, num, monto||'', aprobador||'', detalle||'', refSinpe||'']);
}

// ── NOMBRE DE ARCHIVO EN DRIVE ────────────────────────────────
function buildFileName(num, nombre, esPagoTotal, numAbono) {
  const pad2 = n => String(n).padStart(2,'0');
  let primerNombre = nombre.trim();
  if (primerNombre.includes(',')) {
    primerNombre = primerNombre.split(',')[1].trim().split(' ')[0];
  } else {
    primerNombre = primerNombre.split(' ')[0];
  }
  let sufijo = '';
  if (CONFIG.NOMBRE_CON_INICIAL[primerNombre]) {
    const partes = nombre.replace(',','').trim().split(' ');
    sufijo = ' ' + partes[partes.length-1][0].toUpperCase() + '.';
  }
  const prefijo = pad2(num) + '. ' + primerNombre + sufijo;
  if (esPagoTotal) return prefijo + ' (Pago Total)';
  return prefijo + ' (#' + pad2(numAbono) + ')';
}

function countExistingFiles(num) {
  const folder = DriveApp.getFolderById(CONFIG.FOLDER_ID);
  const pad2   = n => String(n).padStart(2,'0');
  const prefix = pad2(num) + '.';
  const files  = folder.getFiles();
  let count    = 0;
  while (files.hasNext()) {
    const f = files.next();
    if (f.getName().startsWith(prefix)) count++;
  }
  return count;
}

// ── ANALIZAR CON CLAUDE ───────────────────────────────────────
function analyzeWithClaude(base64Image, mimeType) {
  const prompt = `Eres un sistema de validación de comprobantes SINPE de Costa Rica.
Analiza esta imagen y extrae la información. Responde SOLO en JSON válido, sin texto adicional ni backticks.

{
  "fecha": "dd/MM/yyyy o vacío",
  "monto": numero del campo Monto o Monto transferido (NUNCA el Costo de transacción ni comisiones, que suelen ser 0), sin comas ni símbolos,
  "banco": "nombre del banco o Desconocido",
  "remitente": "nombre completo del remitente o vacío",
  "telefonoDestino": "número destino sin guiones o vacío",
  "referenciaSINPE": "número de referencia o comprobante o vacío",
  "score": numero del 0 al 100,
  "flags": {
    "imagenBorrosa": false,
    "posibleFalsificacion": false,
    "posibleIA": false,
    "textoEditado": false,
    "datosInconsistentes": false,
    "formatoDesconocido": false
  },
  "razonScore": "explicación breve en español",
  "recomendacion": "APROBAR o REVISAR o RECHAZAR"
}

Criterios importantes:
- El campo "monto" debe ser el monto principal de la transferencia. NUNCA uses el campo "Costo de transacción" o "Comisión" (que suele ser ₡0.00). Si ves dos montos, el correcto es el más alto o el etiquetado como "Monto".
- APROBAR: score >= 85, sin flags críticos, número destino válido
- REVISAR: score 50-84, algún flag o imagen dudosa
- RECHAZAR: score < 50, ilegible, o posibleFalsificacion/posibleIA true`;

  const payload = {
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1000,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64Image } },
        { type: 'text', text: prompt }
      ]
    }]
  };

  const resp = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post',
    headers: {
      'x-api-key': CONFIG.CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  const data = JSON.parse(resp.getContentText());
  if (data.error) throw new Error('Claude API: ' + data.error.message);
  const text = data.content[0].text.replace(/```json|```/g,'').trim();
  return JSON.parse(text);
}

function validateAnalysis(analysis) {
  const flags    = analysis.flags || {};
  const phone    = String(analysis.telefonoDestino||'').replace(/[-\s]/g,'');
  const isValidPhone  = CONFIG.VALID_PHONES.some(p => p.replace(/[-\s]/g,'') === phone);
  const isAlternate   = phone === CONFIG.ALTERNATE_PHONE.replace(/[-\s]/g,'');
  const isDuplicate   = analysis.referenciaSINPE ? checkDuplicate(analysis.referenciaSINPE) : false;

  let decision = analysis.recomendacion || 'REVISAR';
  if (flags.posibleFalsificacion || flags.posibleIA) decision = 'RECHAZAR';
  if (phone && !isValidPhone) decision = 'REVISAR';
  if (isDuplicate) decision = 'REVISAR';
  if (analysis.monto < CONFIG.MIN_MONTO || analysis.monto > CONFIG.MAX_MONTO) decision = 'REVISAR';

  return { ...analysis, isValidPhone, isAlternate, isDuplicate, decision };
}

function checkDuplicate(refSINPE) {
  if (!refSINPE) return false;
  const sh   = getPendingSheet();
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][12]).trim() === String(refSINPE).trim() && data[i][16] !== 'RECHAZADO') return true;
  }
  return false;
}

function savePending(studentNum, studentName, analysis, fileId, fileName, driveLink) {
  const sh  = getPendingSheet();
  const id  = Utilities.getUuid();
  const f   = analysis.flags || {};
  sh.appendRow([
    id, nowStr(), studentNum, studentName,
    analysis.monto, analysis.fecha, analysis.banco, analysis.remitente,
    analysis.score, fileId, fileName, driveLink,
    analysis.referenciaSINPE,
    analysis.isAlternate ? 'SI' : '',
    analysis.isDuplicate ? 'SI' : '',
    (f.posibleFalsificacion || f.posibleIA || f.textoEditado) ? 'SI' : '',
    'PENDIENTE', '', '', ''
  ]);
  return id;
}

function registerPaymentInSheet(studentNum, fecha, monto, driveLink, isPagoTotal) {
  const ss        = SpreadsheetApp.getActiveSpreadsheet();
  const shControl = ss.getSheetByName('Control de Pagos') || ss.getSheets()[1];
  const shCuota   = ss.getSheetByName('Cálculo de Cuota') || ss.getSheets()[0];
  const data      = shControl.getDataRange().getValues();
  const dCuota    = shCuota.getDataRange().getValues();

  let studentRowIdx = -1;
  for (let i = 0; i < data.length; i++) {
    if (Number(data[i][0]) === studentNum) { studentRowIdx = i; break; }
  }
  if (studentRowIdx < 0) throw new Error('Estudiante no encontrado: ' + studentNum);

  const p = data[studentRowIdx];

  // Obtener cuota total
  let cuotaTotal = Number(p[3]) || 0;
  if (!cuotaTotal) {
    for (let i = 0; i < dCuota.length; i++) {
      if (Number(dCuota[i][0]) === studentNum) { cuotaTotal = Number(dCuota[i][18])||0; break; }
    }
  }

  // Calcular abonos existentes y primer slot libre
  let abonosExistentes = 0;
  let primerSlotLibre  = -1;
  for (let a = 0; a < 5; a++) {
    const mi = 7 + a * 2;
    const m  = Number(p[mi]) || 0;
    if (m > 0) abonosExistentes += m;
    else if (primerSlotLibre < 0) primerSlotLibre = a;
  }

  // Pago único: solo si no hay abonos previos Y el monto solo cubre el 100%
  const esUnicoReal = isPagoTotal || (abonosExistentes === 0 && cuotaTotal > 0 && monto >= cuotaTotal);

  // ¿La suma total llega al 100%?
  const sumaTras     = abonosExistentes + monto;
  const completaTotal = cuotaTotal > 0 && sumaTras >= cuotaTotal;

  if (esUnicoReal) {
    // Escribir en columna pago único
    shControl.getRange(studentRowIdx + 1, 5).setValue(true);
    shControl.getRange(studentRowIdx + 2, 5).setValue(fecha);
    const rv = SpreadsheetApp.newRichTextValue().setText('Comprobante').setLinkUrl(driveLink).build();
    shControl.getRange(studentRowIdx + 2, 6).setRichTextValue(rv);
  } else {
    // Registrar como abono en primer slot libre
    if (primerSlotLibre >= 0) {
      const fi = 6 + primerSlotLibre * 2;
      const mi = 7 + primerSlotLibre * 2;
      shControl.getRange(studentRowIdx + 1, fi + 1).setValue(fecha);
      shControl.getRange(studentRowIdx + 1, mi + 1).setValue(monto);
      const rv = SpreadsheetApp.newRichTextValue().setText('Comprobante').setLinkUrl(driveLink).build();
      shControl.getRange(studentRowIdx + 2, fi + 1).setRichTextValue(rv);
    }
    // NUNCA activar checkbox pago total si hay abonos — el dashboard calcula el 100% por suma
  }

  return esUnicoReal;
}

// ═══════════════════════════════════════════════════════════════
//  doGet
// ═══════════════════════════════════════════════════════════════
function doGet(e) {
  try {
    const ss        = SpreadsheetApp.getActiveSpreadsheet();
    const shCuota   = ss.getSheetByName('Cálculo de Cuota') || ss.getSheets()[0];
    const shControl = ss.getSheetByName('Control de Pagos') || ss.getSheets()[1];
    const dCuota    = shCuota.getDataRange().getValues();
    const dControl  = shControl ? shControl.getDataRange().getValues() : [];
    const richCtrl  = shControl ? shControl.getDataRange().getRichTextValues() : [];

    function getLink(rowIdx, colIdx) {
      try {
        const rt = richCtrl[rowIdx] && richCtrl[rowIdx][colIdx];
        if (!rt) return '';
        let url = rt.getLinkUrl() || '';
        if (!url) for (const r of rt.getRuns()) { url = r.getLinkUrl()||''; if(url) break; }
        return url;
      } catch(e) { return ''; }
    }

    const cuotaMap = {};
    for (let i = 0; i < dCuota.length; i++) {
      const n = dCuota[i][0];
      if (typeof n==='number' && Number.isInteger(n) && n>=1 && n<=23)
        cuotaMap[n] = { row: dCuota[i], nextRow: dCuota[i+1]||[] };
    }

    const controlMap = {};
    for (let i = 0; i < dControl.length; i++) {
      const n = dControl[i][0];
      if (typeof n==='number' && Number.isInteger(n) && n>=1 && n<=23)
        controlMap[n] = { row: dControl[i], rowIdx: i };
    }

    const pendingSheet = ss.getSheetByName('Pendientes');
    const pendingData  = pendingSheet ? pendingSheet.getDataRange().getValues() : [];

    // Mapa de análisis por fileId (más confiable que driveLink)
    const compSheet = ss.getSheetByName('Análisis Comprobantes');
    const compData  = compSheet ? compSheet.getDataRange().getValues().slice(1) : [];
    const compMap   = {};
    compData.forEach(function(r) {
      const fileId = String(r[0]||'').trim();
      if (fileId) compMap[fileId] = {
        banco:r[7], remitente:r[8], score:Number(r[10]), decision:r[11],
        isAlternate:r[12]==='SI', isDuplicate:r[13]==='SI', isSuspect:r[14]==='SI',
        refSINPE:r[9], fecha:r[5], monto:Number(r[6]),
        razonScore:String(r[15]||'').trim(), aprobador:String(r[17]||'').trim()
      };
    });

    const students = [];
    for (let n = 1; n <= 23; n++) {
      const cObj = cuotaMap[n]; if (!cObj) continue;
      const c    = cObj.row;
      const pObj = controlMap[n];
      const p    = pObj ? pObj.row : [];
      const pIdx = pObj ? pObj.rowIdx : -1;
      const nRow = pIdx >= 0 ? (dControl[pIdx+1]||[]) : [];
      const padre2 = String(cObj.nextRow[2]||'').trim();

      const pagadoCompleto = toBool(p[4]);
      const fechaUnico     = pagadoCompleto ? fmtDate(nRow[4]) : '';
      const compUnicoUrl   = (pagadoCompleto && pIdx>=0) ? getLink(pIdx+1, 5) : '';
      const compUnicoMatch = compUnicoUrl ? compUnicoUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) : null;
      const compUnicoId    = compUnicoMatch ? compUnicoMatch[1] : '';
      const compUnico      = compUnicoUrl;
      const compUnicoAnalisis = compUnicoId && compMap[compUnicoId] ? compMap[compUnicoId] : null;

      const abonos = [];
      for (let a = 0; a < 5; a++) {
        const fi = 6 + a*2, mi = 7 + a*2;
        const monto = Number(p[mi])||0;
        if (monto <= 0) continue;
        const compUrl = pIdx>=0 ? getLink(pIdx+1, fi) : '';
        // Extraer fileId de la URL para buscar análisis
        const fileIdMatch = compUrl ? compUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) : null;
        const fileId = fileIdMatch ? fileIdMatch[1] : '';
        const analisis = fileId && compMap[fileId] ? compMap[fileId] : null;
        abonos.push({
          fecha: fmtDate(p[fi]), monto,
          tipo: 'Abono #'+(abonos.length+1),
          comprobante: compUrl,
          analisis: analisis
        });
      }

      const total      = Number(p[3])||Number(c[18])||0;
      const comentario = String(c[21]||'').trim();

      let tienePendiente = false;
      for (let i = 1; i < pendingData.length; i++) {
        if (Number(pendingData[i][2]) === n && pendingData[i][16] === 'PENDIENTE') {
          tienePendiente = true; break;
        }
      }

      students.push({
        num: n, nombre: String(c[1]||'').trim(),
        padres: [String(c[2]||'').trim(), padre2].filter(Boolean),
        genero: String(c[3]||'Niño').trim(),
        hermanos: toBool(c[4]), presArt: toBool(c[5]),
        camisa: toBool(c[6]), cantCamisa: Number(c[7])||0,
        talla: String(c[8]||'—').trim()||'—',
        total, pagadoCompleto, fechaUnico, compUnico, compUnicoAnalisis, comentario, tienePendiente,
        desglose: {
          bingo: Number(c[9])||0, camisaFest: Number(c[10])||0,
          camisaAdi: Number(c[11])||0, entrenador: Number(c[12])||0,
          vestPres: Number(c[13])||0, cuotaVentas: Number(c[14])||0,
          coreografo: Number(c[15])||0, hidratacion: Number(c[16])||0,
          maquillaje: Number(c[17])||0,
        },
        abonos
      });
    }

    let totalPendientes = 0;
    for (let i = 1; i < pendingData.length; i++) {
      if (pendingData[i][16] === 'PENDIENTE') totalPendientes++;
    }

    // Presupuestos por categoría — fila 58 (índice 57) de Cálculo de Cuota
    const fila58 = dCuota[57] || [];
    const presupuestos = {
      'Bingo':             Number(fila58[9])  || 0,
      'Camisas Festival':  (Number(fila58[10])||0) + (Number(fila58[11])||0) + (Number(fila58[12])||0),
      'Vestuario':         Number(fila58[13]) || 0,
      'Cuota Ventas':      Number(fila58[14]) || 0,
      'Coreógrafo':        Number(fila58[15]) || 0,
      'Hidratación':       Number(fila58[16]) || 0,
      'Maquillaje':        Number(fila58[17]) || 0,
    };

    return outCORS({ ok:true, students, totalPendientes, presupuestos,
      updated: Utilities.formatDate(new Date(), Session.getScriptTimeZone(),'dd/MM/yyyy HH:mm') });

  } catch(err) {
    return outCORS({ ok:false, error:err.message });
  }
}

// ═══════════════════════════════════════════════════════════════
//  doPost
// ═══════════════════════════════════════════════════════════════
function doPost(e) {
  try {
    const body   = JSON.parse(e.postData.contents);
    const action = body.action;
    switch(action) {
      case 'upload':          return handleUpload(body);
      case 'approve':         return handleApprove(body);
      case 'reject':          return handleReject(body);
      case 'revert':          return handleRevert(body);
      case 'saveComment':     return handleSaveComment(body);
      case 'editRubro':       return handleEditRubro(body);
      case 'getPending':      return handleGetPending(body);
      case 'getHistory':      return handleGetHistory(body);
      case 'getComprobantes': return handleGetComprobantes(body);
      case 'getRejected':     return handleGetRejected(body);
      case 'rescue':          return handleRescue(body);
      case 'getEgresos':      return handleGetEgresos(body);
      case 'addEgreso':       return handleAddEgreso(body);
      case 'editEgreso':      return handleEditEgreso(body);
      case 'deleteEgreso':    return handleDeleteEgreso(body);
      default:            return outCORS({ ok:false, error:'Acción desconocida: ' + action });
    }
  } catch(err) {
    return outCORS({ ok:false, error:err.message });
  }
}

// ── UPLOAD ────────────────────────────────────────────────────
function handleUpload(body) {
  const { studentNum, studentName, base64Image, mimeType, isPagoTotal, testMode } = body;
  if (!studentNum || !base64Image) return outCORS({ ok:false, error:'Faltan datos requeridos' });

  const allowed = ['image/jpeg','image/jpg','image/png','image/webp','image/heic'];
  if (!allowed.includes(mimeType)) return outCORS({ ok:false, error:'Solo se permiten imágenes (JPG, PNG, WEBP, HEIC)' });

  const existingCount = countExistingFiles(studentNum);
  const numAbono      = existingCount + 1;
  const fileName      = buildFileName(studentNum, studentName, isPagoTotal, numAbono);

  const folder = DriveApp.getFolderById(CONFIG.FOLDER_ID);
  const blob   = Utilities.newBlob(Utilities.base64Decode(base64Image), mimeType, fileName);
  const file   = folder.createFile(blob);
  const fileId    = file.getId();
  const driveLink = 'https://drive.google.com/file/d/' + fileId + '/view';

  let analysis;
  try {
    analysis = analyzeWithClaude(base64Image, mimeType);
    analysis = validateAnalysis(analysis);
  } catch(err) {
    analysis = {
      score:0, decision:'REVISAR', monto:0, fecha:'', banco:'Desconocido',
      remitente:'', referenciaSINPE:'', isAlternate:false, isDuplicate:false,
      flags:{}, razonScore:'Error al analizar: ' + err.message
    };
  }

  if (testMode) {
    return outCORS({
      ok:true, status:'TEST',
      message:'[MODO PRUEBA] Análisis completado sin registrar en Sheet',
      datos:{ fecha:analysis.fecha, monto:analysis.monto, banco:analysis.banco,
              score:analysis.score, decision:analysis.decision,
              remitente:analysis.remitente, refSINPE:analysis.referenciaSINPE,
              isAlternate:analysis.isAlternate, isDuplicate:analysis.isDuplicate,
              razonScore:analysis.razonScore },
      driveLink
    });
  }

  if (analysis.decision === 'APROBAR') {
    registerPaymentInSheet(studentNum, analysis.fecha, analysis.monto, driveLink, isPagoTotal);
    saveComprobante(studentNum, studentName, analysis, fileId, fileName, driveLink, 'Sistema');
    logHistory('APROBADO_AUTO', studentName, studentNum, analysis.monto, 'Sistema', 'Score:'+analysis.score, analysis.referenciaSINPE);
    notifyAprobadoAuto(studentName, analysis);
    return outCORS({ ok:true, status:'APROBADO', message:'¡Comprobante registrado exitosamente!',
      datos:{ fecha:analysis.fecha, monto:analysis.monto, banco:analysis.banco, score:analysis.score },
      isAlternate:analysis.isAlternate });
  }

  if (analysis.decision === 'RECHAZAR') {
    try { file.moveTo(getRejectedFolder()); } catch(e){}
    logHistory('RECHAZADO_AUTO', studentName, studentNum, analysis.monto, 'Sistema', analysis.razonScore, analysis.referenciaSINPE);
    notifyRechazadoAuto(studentName, analysis);
    return outCORS({ ok:true, status:'RECHAZADO',
      message:'El comprobante no pudo ser validado. Por favor verificá la imagen e intentá de nuevo.',
      razon:analysis.razonScore });
  }

  const pendingId = savePending(studentNum, studentName, analysis, fileId, fileName, driveLink);
  logHistory('PENDIENTE', studentName, studentNum, analysis.monto, 'Sistema', 'Score:'+analysis.score+' — '+analysis.razonScore, analysis.referenciaSINPE);
  notifyPendiente(studentName, analysis, driveLink);
  return outCORS({ ok:true, status:'PENDIENTE',
    message:'Tu comprobante fue recibido y está siendo revisado. Te confirmamos en breve.',
    pendingId });
}

// ── APPROVE ───────────────────────────────────────────────────
function handleApprove(body) {
  const { pendingId, adminEmail, studentNumOverride, justificacion, isPagoTotal } = body;
  if (!CONFIG.ADMIN_EMAILS.includes(adminEmail)) return outCORS({ ok:false, error:'No autorizado' });

  const sh   = getPendingSheet();
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === pendingId) {
      const studentNum  = studentNumOverride || Number(data[i][2]);
      const studentName = data[i][3];
      const monto       = Number(data[i][4]);
      const fecha       = data[i][5];
      const driveLink   = data[i][11];
      registerPaymentInSheet(studentNum, fecha, monto, driveLink, isPagoTotal||false);
      // Recuperar datos de análisis de la fila pendiente para guardar en Comprobantes
      const analysisData = {
        fecha: data[i][5], monto: Number(data[i][4]), banco: data[i][6],
        remitente: data[i][7], referenciaSINPE: data[i][12],
        score: Number(data[i][8]), decision: 'APROBAR',
        isAlternate: data[i][13]==='SI', isDuplicate: data[i][14]==='SI',
        flags: { posibleFalsificacion: data[i][15]==='SI' },
        razonScore: justificacion||'Aprobado manualmente'
      };
      saveComprobante(studentNum, studentName, analysisData, data[i][9], data[i][10], driveLink, adminEmail);
      sh.getRange(i+1,17).setValue('APROBADO');
      sh.getRange(i+1,18).setValue(adminEmail);
      sh.getRange(i+1,19).setValue(nowStr());
      sh.getRange(i+1,20).setValue(justificacion||'');
      logHistory('APROBADO_MANUAL', studentName, studentNum, monto, adminEmail, justificacion||'', data[i][12]);
      notifyAprobadoManual(studentName, monto, adminEmail, justificacion||'');
      return outCORS({ ok:true, message:'Pago aprobado y registrado.' });
    }
  }
  return outCORS({ ok:false, error:'Pendiente no encontrado' });
}

// ── REJECT ────────────────────────────────────────────────────
function handleReject(body) {
  const { pendingId, adminEmail, justificacion } = body;
  if (!CONFIG.ADMIN_EMAILS.includes(adminEmail)) return outCORS({ ok:false, error:'No autorizado' });
  if (!justificacion) return outCORS({ ok:false, error:'Se requiere justificación' });

  const sh   = getPendingSheet();
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === pendingId) {
      try { DriveApp.getFileById(data[i][9]).moveTo(getRejectedFolder()); } catch(e){}
      sh.getRange(i+1,17).setValue('RECHAZADO');
      sh.getRange(i+1,18).setValue(adminEmail);
      sh.getRange(i+1,19).setValue(nowStr());
      sh.getRange(i+1,20).setValue(justificacion);
      logHistory('RECHAZADO_MANUAL', data[i][3], Number(data[i][2]), Number(data[i][4]), adminEmail, justificacion, data[i][12]);
      notifyRechazadoManual(data[i][3], Number(data[i][4]), adminEmail, justificacion);
      return outCORS({ ok:true, message:'Comprobante rechazado.' });
    }
  }
  return outCORS({ ok:false, error:'Pendiente no encontrado' });
}

// ── REVERT ────────────────────────────────────────────────────
function handleRevert(body) {
  const { studentNum, abonoIndex, adminEmail, justificacion, driveLink } = body;
  if (!CONFIG.ADMIN_EMAILS.includes(adminEmail)) return outCORS({ ok:false, error:'No autorizado' });
  if (!justificacion) return outCORS({ ok:false, error:'Se requiere justificación' });

  const ss        = SpreadsheetApp.getActiveSpreadsheet();
  const shControl = ss.getSheetByName('Control de Pagos') || ss.getSheets()[1];
  const data      = shControl.getDataRange().getValues();

  let studentRowIdx = -1, studentName = '';
  for (let i = 0; i < data.length; i++) {
    if (Number(data[i][0]) === Number(studentNum)) { studentRowIdx=i; studentName=data[i][1]; break; }
  }
  if (studentRowIdx < 0) return outCORS({ ok:false, error:'Estudiante no encontrado' });

  if (abonoIndex === 'pago_unico') {
    shControl.getRange(studentRowIdx+1, 5).setValue(false);
    shControl.getRange(studentRowIdx+2, 5).clearContent();
    shControl.getRange(studentRowIdx+2, 6).clearContent();
  } else {
    const fi = 6 + Number(abonoIndex)*2;
    const mi = 7 + Number(abonoIndex)*2;
    const montoOriginal = Number(data[studentRowIdx][mi])||0;
    shControl.getRange(studentRowIdx+1, fi+1).clearContent();
    shControl.getRange(studentRowIdx+1, mi+1).clearContent();
    shControl.getRange(studentRowIdx+2, fi+1).clearContent();
    logHistory('REVERTIDO', studentName, studentNum, montoOriginal, adminEmail, justificacion, '');
    notifyRevertido(studentName, montoOriginal, adminEmail, justificacion);
  }

  if (driveLink) {
    try {
      const match = driveLink.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (match) DriveApp.getFileById(match[1]).moveTo(getRejectedFolder());
    } catch(e){}
  }
  return outCORS({ ok:true, message:'Pago revertido correctamente.' });
}

// ── SAVE COMMENT ──────────────────────────────────────────────
function handleSaveComment(body) {
  const { studentNum, comentario, adminEmail } = body;
  if (!CONFIG.ADMIN_EMAILS.includes(adminEmail)) return outCORS({ ok:false, error:'No autorizado' });

  const ss      = SpreadsheetApp.getActiveSpreadsheet();
  const shCuota = ss.getSheetByName('Cálculo de Cuota') || ss.getSheets()[0];
  const data    = shCuota.getDataRange().getValues();
  for (let i = 0; i < data.length; i++) {
    if (Number(data[i][0]) === Number(studentNum)) {
      shCuota.getRange(i+1, 22).setValue(comentario);
      logHistory('COMENTARIO', data[i][1], studentNum, null, adminEmail, comentario, '');
      return outCORS({ ok:true, message:'Comentario guardado.' });
    }
  }
  return outCORS({ ok:false, error:'Estudiante no encontrado' });
}

// ── EDIT RUBRO ────────────────────────────────────────────────
function handleEditRubro(body) {
  const { studentNum, rubro, montoNuevo, justificacion, adminEmail } = body;
  if (!CONFIG.ADMIN_EMAILS.includes(adminEmail)) return outCORS({ ok:false, error:'No autorizado' });
  if (!justificacion) return outCORS({ ok:false, error:'Se requiere justificación' });

  const rubroColMap = {
    bingo:9, camisaFest:10, camisaAdi:11, entrenador:12,
    vestPres:13, cuotaVentas:14, coreografo:15, hidratacion:16, maquillaje:17
  };
  const colIdx = rubroColMap[rubro];
  if (colIdx === undefined) return outCORS({ ok:false, error:'Rubro desconocido' });

  const ss      = SpreadsheetApp.getActiveSpreadsheet();
  const shCuota = ss.getSheetByName('Cálculo de Cuota') || ss.getSheets()[0];
  const data    = shCuota.getDataRange().getValues();
  for (let i = 0; i < data.length; i++) {
    if (Number(data[i][0]) === Number(studentNum)) {
      const montoAnterior = data[i][colIdx];
      shCuota.getRange(i+1, colIdx+1).setValue(montoNuevo);
      logHistory('EDICION_RUBRO', data[i][1], studentNum, montoNuevo, adminEmail,
        rubro+': ₡'+montoAnterior+' → ₡'+montoNuevo+' | '+justificacion, '');
      return outCORS({ ok:true, message:'Rubro actualizado.' });
    }
  }
  return outCORS({ ok:false, error:'Estudiante no encontrado' });
}

// ── GET PENDING ───────────────────────────────────────────────
function handleGetPending(body) {
  const { adminEmail } = body;
  if (!CONFIG.ADMIN_EMAILS.includes(adminEmail)) return outCORS({ ok:false, error:'No autorizado' });

  const sh   = getPendingSheet();
  const data = sh.getDataRange().getValues();
  const pending = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][16] === 'PENDIENTE') {
      pending.push({
        id:data[i][0], fecha:data[i][1],
        studentNum:Number(data[i][2]), studentName:data[i][3],
        monto:Number(data[i][4]), fechaExtraida:data[i][5],
        banco:data[i][6], remitente:data[i][7], score:Number(data[i][8]),
        fileId:data[i][9], fileName:data[i][10], driveLink:data[i][11],
        refSINPE:data[i][12], isAlternate:data[i][13]==='SI',
        isDuplicate:data[i][14]==='SI', isSuspect:data[i][15]==='SI',
      });
    }
  }
  return outCORS({ ok:true, pending });
}

// ── GET HISTORY ───────────────────────────────────────────────
function handleGetHistory(body) {
  const { adminEmail, limit } = body;
  if (!CONFIG.ADMIN_EMAILS.includes(adminEmail)) return outCORS({ ok:false, error:'No autorizado' });

  const sh      = getHistorySheet();
  const data    = sh.getDataRange().getValues();
  const maxRows = limit || 200;

  const normales = [], manuales = [];

  for (let i = 1; i < data.length; i++) {
    const entry = {
      fecha:data[i][0], hora:data[i][1], accion:data[i][2],
      estudiante:data[i][3], num:data[i][4], monto:data[i][5],
      aprobador:data[i][6], detalle:data[i][7], refSINPE:data[i][8],
    };
    if (String(data[i][2]).trim() === 'REGISTRO_MANUAL') manuales.push(entry);
    else normales.push(entry);
  }

  // Normales: más reciente primero (ya vienen en orden cronológico del Sheet)
  normales.reverse();

  // Manuales: ordenar por fecha ascendente (más antiguos primero, van al fondo)
  manuales.sort(function(a, b) {
    const pa = String(a.fecha).split('/'), pb = String(b.fecha).split('/');
    const da = new Date(pa[2], pa[1]-1, pa[0]);
    const db = new Date(pb[2], pb[1]-1, pb[0]);
    return da - db;
  });

  // Combinar: recientes arriba, manuales al fondo
  const history = normales.concat(manuales).slice(0, maxRows);

  return outCORS({ ok:true, history });
}

// ── GET REJECTED ──────────────────────────────────────────────
function handleGetRejected(body) {
  const { adminEmail } = body;
  if (!CONFIG.ADMIN_EMAILS.includes(adminEmail)) return outCORS({ ok:false, error:'No autorizado' });

  const sh   = getPendingSheet();
  const data = sh.getDataRange().getValues();
  const list = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][16] === 'RECHAZADO') {
      list.push({
        id:         data[i][0],
        fecha:      data[i][1],
        studentNum: Number(data[i][2]),
        studentName:data[i][3],
        monto:      Number(data[i][4]),
        fechaExtraida: data[i][5],
        banco:      data[i][6],
        remitente:  data[i][7],
        score:      Number(data[i][8]),
        fileId:     data[i][9],
        fileName:   data[i][10],
        driveLink:  data[i][11],
        refSINPE:   data[i][12],
        isAlternate:data[i][13]==='SI',
        isDuplicate:data[i][14]==='SI',
        isSuspect:  data[i][15]==='SI',
        aprobador:  data[i][17],
        justificacion: data[i][19],
      });
    }
  }
  return outCORS({ ok:true, rejected: list });
}

// ── RESCUE (rescatar pago rechazado) ──────────────────────────
function handleRescue(body) {
  const { pendingId, adminEmail, justificacion, isPagoTotal } = body;
  if (!CONFIG.ADMIN_EMAILS.includes(adminEmail)) return outCORS({ ok:false, error:'No autorizado' });
  if (!justificacion) return outCORS({ ok:false, error:'Se requiere justificación' });

  const sh   = getPendingSheet();
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === pendingId && data[i][16] === 'RECHAZADO') {
      const studentNum  = Number(data[i][2]);
      const studentName = data[i][3];
      const monto       = Number(data[i][4]);
      const fecha       = data[i][5];
      const fileId      = data[i][9];
      const driveLink   = data[i][11];

      // Mover archivo de vuelta a la carpeta principal
      try {
        const file = DriveApp.getFileById(fileId);
        file.moveTo(DriveApp.getFolderById(CONFIG.FOLDER_ID));
      } catch(e) { Logger.log('No se pudo mover archivo: ' + e.message); }

      // Registrar pago en Sheet
      registerPaymentInSheet(studentNum, fecha, monto, driveLink, isPagoTotal||false);

      // Guardar en Análisis Comprobantes
      const analysisData = {
        fecha: fecha, monto: monto, banco: data[i][6],
        remitente: data[i][7], referenciaSINPE: data[i][12],
        score: Number(data[i][8]), decision: 'APROBAR',
        isAlternate: data[i][13]==='SI', isDuplicate: data[i][14]==='SI',
        flags: {}, razonScore: 'Rescatado por admin: ' + justificacion
      };
      saveComprobante(studentNum, studentName, analysisData, fileId, data[i][10], driveLink, adminEmail);

      // Actualizar estado en Pendientes
      sh.getRange(i+1,17).setValue('RESCATADO');
      sh.getRange(i+1,18).setValue(adminEmail);
      sh.getRange(i+1,19).setValue(nowStr());
      sh.getRange(i+1,20).setValue('RESCATADO: ' + justificacion);

      logHistory('RESCATADO', studentName, studentNum, monto, adminEmail, justificacion, data[i][12]);
      notifyAprobadoManual(studentName, monto, adminEmail, '♻️ Rescatado: ' + justificacion);
      return outCORS({ ok:true, message:'Pago rescatado y registrado correctamente.' });
    }
  }
  return outCORS({ ok:false, error:'Comprobante no encontrado o no está rechazado' });
}

// ── GET COMPROBANTES ──────────────────────────────────────────
function handleGetComprobantes(body) {
  const { adminEmail, studentNum } = body;
  if (!CONFIG.ADMIN_EMAILS.includes(adminEmail)) return outCORS({ ok:false, error:'No autorizado' });

  const sh   = getComprobantesSheet();
  const data = sh.getDataRange().getValues();
  const list = [];
  for (let i = 1; i < data.length; i++) {
    if (studentNum && Number(data[i][3]) !== Number(studentNum)) continue;
    list.push({
      fileId:     data[i][0],
      fileName:   data[i][1],
      driveLink:  data[i][2],
      studentNum: Number(data[i][3]),
      studentName:data[i][4],
      fecha:      data[i][5],
      monto:      Number(data[i][6]),
      banco:      data[i][7],
      remitente:  data[i][8],
      refSINPE:   data[i][9],
      score:      Number(data[i][10]),
      decision:   data[i][11],
      isAlternate:data[i][12]==='SI',
      isDuplicate:data[i][13]==='SI',
      isSuspect:  data[i][14]==='SI',
      razonScore: data[i][15],
      fechaAnalisis: data[i][16],
      aprobador:  data[i][17],
    });
  }
  return outCORS({ ok:true, comprobantes: list });
}

// ── ANALIZAR IMÁGENES EXISTENTES EN DRIVE ─────────────────────
// Ejecutar manualmente desde el editor para procesar imágenes ya subidas
function analizarDriveExistentes() {
  const folder  = DriveApp.getFolderById(CONFIG.FOLDER_ID);
  const files   = folder.getFiles();
  const shComp  = getComprobantesSheet();
  const existing = shComp.getDataRange().getValues().slice(1).map(r => r[0]); // fileIds ya procesados

  const ss        = SpreadsheetApp.getActiveSpreadsheet();
  const shCuota   = ss.getSheetByName('Cálculo de Cuota') || ss.getSheets()[0];
  const dCuota    = shCuota.getDataRange().getValues();

  // Mapa num → nombre
  const nameMap = {};
  for (let i = 0; i < dCuota.length; i++) {
    const n = dCuota[i][0];
    if (typeof n==='number' && Number.isInteger(n) && n>=1 && n<=23)
      nameMap[n] = String(dCuota[i][1]||'').trim();
  }

  let procesados = 0, omitidos = 0, errores = 0;
  const resultados = [];

  while (files.hasNext()) {
    const file = files.next();
    const fileId   = file.getId();
    const fileName = file.getName();
    const mimeType = file.getMimeType();

    // Omitir si ya está en la hoja
    if (existing.includes(fileId)) { omitidos++; continue; }

    // Solo imágenes
    const allowed = ['image/jpeg','image/jpg','image/png','image/webp'];
    if (!allowed.includes(mimeType)) { omitidos++; continue; }

    // Detectar número de estudiante del nombre del archivo (ej: "16. Isabella...")
    const match = fileName.match(/^(\d+)\./);
    const studentNum  = match ? parseInt(match[1]) : 0;
    const studentName = nameMap[studentNum] || 'Desconocido';
    const driveLink   = 'https://drive.google.com/file/d/' + fileId + '/view';

    try {
      // Leer imagen como base64
      const blob    = file.getBlob();
      const b64     = Utilities.base64Encode(blob.getBytes());
      let analysis  = analyzeWithClaude(b64, mimeType);
      analysis      = validateAnalysis(analysis);
      saveComprobante(studentNum, studentName, analysis, fileId, fileName, driveLink, 'AnálisisMasivo');
      resultados.push('✅ ' + fileName + ' — ' + analysis.decision + ' Score:' + analysis.score);
      procesados++;
      Utilities.sleep(1500); // evitar rate limit
    } catch(err) {
      resultados.push('❌ ' + fileName + ' — Error: ' + err.message);
      errores++;
    }
  }

  const resumen = 'Procesados: '+procesados+' | Omitidos: '+omitidos+' | Errores: '+errores;
  Logger.log(resumen);
  resultados.forEach(r => Logger.log(r));
}

// ── LIMPIAR REGISTROS MANUALES (ejecutar antes de migrar de nuevo) ──
// ── CORREGIR PAGO TOTAL EN SHEET ──────────────────────────────
// Limpia fecha/comprobante de la columna "Pago Total" para
// estudiantes que llegaron al 100% con múltiples abonos.
function corregirPagoTotal() {
  const ss        = SpreadsheetApp.getActiveSpreadsheet();
  const shControl = ss.getSheetByName('Control de Pagos') || ss.getSheets()[1];
  const shCuota   = ss.getSheetByName('Cálculo de Cuota') || ss.getSheets()[0];
  const data      = shControl.getDataRange().getValues();
  const dCuota    = shCuota.getDataRange().getValues();

  const cuotaMap = {};
  for (let i = 0; i < dCuota.length; i++) {
    const n = Number(dCuota[i][0]);
    if (n >= 1 && n <= 23) cuotaMap[n] = Number(dCuota[i][18]) || 0;
  }

  let corregidos = 0;

  for (let i = 0; i < data.length; i++) {
    const num = Number(data[i][0]);
    if (!num || num < 1 || num > 23) continue;

    const isPagado = data[i][4] === true || String(data[i][4]).toLowerCase() === 'true';
    if (!isPagado) continue;

    // Contar abonos existentes
    let tieneAbonos = false;
    for (let a = 0; a < 5; a++) {
      const mi = 7 + a * 2;
      if ((Number(data[i][mi]) || 0) > 0) { tieneAbonos = true; break; }
    }

    // Si tiene abonos → llegó al 100% con múltiples pagos
    // → limpiar fecha y comprobante de columna pago total (fila i+2)
    if (tieneAbonos) {
      const nRow     = data[i+1] || [];
      const fechaPT  = nRow[4];
      const tieneCheckbox = data[i][4] === true || String(data[i][4]).toLowerCase() === 'true';
      const tieneFechaPT  = fechaPT && String(fechaPT).trim() !== '';

      if (tieneCheckbox || tieneFechaPT) {
        shControl.getRange(i + 1, 5).setValue(false); // desmarcar checkbox
        shControl.getRange(i + 2, 5).clearContent();  // limpiar fecha pago total
        shControl.getRange(i + 2, 6).clearContent();  // limpiar comprobante pago total
        Logger.log('Corregido: ' + String(data[i][1]).trim());
        corregidos++;
      }
    }
  }

  Logger.log('Corrección completada. ' + corregidos + ' estudiante(s) corregido(s).');
}

function limpiarRegistrosManuales() {
  const sh   = getHistorySheet();
  const data = sh.getDataRange().getValues();
  let deleted = 0;
  for (let i = data.length - 1; i >= 1; i--) {
    if (String(data[i][2]).trim() === 'REGISTRO_MANUAL') {
      sh.deleteRow(i + 1);
      deleted++;
    }
  }
  Logger.log('Se eliminaron ' + deleted + ' registros manuales.');
}

// ── MIGRAR HISTORIAL (ejecutar una sola vez tras limpiar) ─────
function migrarHistorial() {
  const ss        = SpreadsheetApp.getActiveSpreadsheet();
  const shControl = ss.getSheetByName('Control de Pagos') || ss.getSheets()[1];
  const shCuota   = ss.getSheetByName('Cálculo de Cuota') || ss.getSheets()[0];
  const shHist    = getHistorySheet();

  const dControl  = shControl.getDataRange().getValues();
  const dCuota    = shCuota.getDataRange().getValues();
  const dHist     = shHist.getDataRange().getValues();

  // Set de claves ya en historial: num_monto_fecha
  const existing = new Set();
  for (let i = 1; i < dHist.length; i++) {
    const num   = String(dHist[i][4]).trim();
    const monto = String(dHist[i][5]).trim();
    const fecha = String(dHist[i][0]).trim();
    existing.add(num + '_' + monto + '_' + fecha);
    // También por num+monto para evitar duplicados con distinta fecha
    existing.add(num + '_' + monto);
  }

  // Mapa num → nombre
  const nameMap = {};
  for (let i = 0; i < dCuota.length; i++) {
    const n = Number(dCuota[i][0]);
    if (n >= 1 && n <= 23) nameMap[n] = String(dCuota[i][1]).trim();
  }

  const richCtrl = shControl.getDataRange().getRichTextValues();

  function getLinkFromRich(rowIdx, colIdx) {
    try {
      const rt = richCtrl[rowIdx] && richCtrl[rowIdx][colIdx];
      if (!rt) return '';
      let url = rt.getLinkUrl() || '';
      if (!url) for (const r of rt.getRuns()) { url = r.getLinkUrl()||''; if(url) break; }
      return url;
    } catch(e) { return ''; }
  }

  function safeDate(val) {
    if (!val) return '';
    if (val instanceof Date) return Utilities.formatDate(val, Session.getScriptTimeZone(), 'dd/MM/yyyy');
    const s = String(val).trim();
    // Handle ISO format 2026-04-09T...
    if (s.match(/^\d{4}-\d{2}-\d{2}/)) {
      const d = new Date(s);
      if (!isNaN(d)) return Utilities.formatDate(d, Session.getScriptTimeZone(), 'dd/MM/yyyy');
    }
    return s;
  }

  const newRows = [];

  for (let i = 0; i < dControl.length; i++) {
    const num = Number(dControl[i][0]);
    if (!num || num < 1 || num > 23) continue;
    const nombre = nameMap[num] || 'Estudiante ' + num;

    // Abonos (hasta 5)
    for (let a = 0; a < 5; a++) {
      const fi    = 6 + a * 2;
      const mi    = 7 + a * 2;
      const monto = Number(dControl[i][mi]) || 0;
      if (monto <= 0) continue;
      const fecha = safeDate(dControl[i][fi]);
      if (!fecha) continue;

      const key1 = String(num) + '_' + String(monto) + '_' + fecha;
      const key2 = String(num) + '_' + String(monto);
      if (existing.has(key1) || existing.has(key2)) continue;

      const driveLink = getLinkFromRich(i, fi) || '';
      newRows.push([
        fecha, '00:00:00', 'REGISTRO_MANUAL', nombre, num,
        monto, 'Migracion',
        'Abono #'+(a+1)+' registrado antes del dashboard' + (driveLink ? ' | '+driveLink : ''),
        ''
      ]);
      existing.add(key1);
      existing.add(key2);
    }

    // Pago único completo — SOLO si no hay abonos en columnas de abono
    const isPagado = dControl[i][4] === true || String(dControl[i][4]).toLowerCase() === 'true';
    if (isPagado) {
      // Verificar que no haya abonos registrados
      let tieneAbonos = false;
      for (let a = 0; a < 5; a++) {
        if ((Number(dControl[i][7 + a*2]) || 0) > 0) { tieneAbonos = true; break; }
      }
      if (!tieneAbonos) {
        const nRow  = dControl[i+1] || [];
        const fecha = safeDate(nRow[4]);
        const cuota = Number(dControl[i][3]) || 0;
        if (cuota > 0 && fecha) {
          const key1 = String(num) + '_' + String(cuota) + '_' + fecha;
          const key2 = String(num) + '_' + String(cuota);
          if (!existing.has(key1) && !existing.has(key2)) {
            const driveLink = getLinkFromRich(i+1, 5) || '';
            newRows.push([
              fecha, '00:00:00', 'REGISTRO_MANUAL', nombre, num,
              cuota, 'Migracion',
              'Pago unico completo registrado antes del dashboard' + (driveLink ? ' | '+driveLink : ''),
              ''
            ]);
            existing.add(key1);
            existing.add(key2);
          }
        }
      }
    }
  }

  // Ordenar newRows por fecha ascendente antes de insertar
  newRows.sort(function(a, b) {
    const pa = a[0].split('/'), pb = b[0].split('/');
    const da = new Date(pa[2], pa[1]-1, pa[0]);
    const db = new Date(pb[2], pb[1]-1, pb[0]);
    return da - db;
  });

  newRows.forEach(function(row) { shHist.appendRow(row); });

  const msg = 'Migracion completada. ' + newRows.length + ' registro(s) nuevo(s) agregado(s) al Historial.';
  Logger.log(msg);
}

// ══════════════════════════════════════════════════════════════
//  EGRESOS
// ══════════════════════════════════════════════════════════════

const EGRESOS_FOLDER_NAME = 'Egresos Festival Sión 2026';
const CATEGORIAS = ['Bingo','Cuota Ventas','Coreógrafo','Vestuario','Camisas Festival','Hidratación','Maquillaje','Otros'];

function getEgresosSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName('Egresos');
  if (!sh) {
    sh = ss.insertSheet('Egresos');
    sh.appendRow(['ID','Fecha','Concepto','Categoria','Monto','Comentario','DriveFileId','DriveLink','AdminEmail','Timestamp']);
    sh.getRange(1,1,1,10).setFontWeight('bold');
  }
  return sh;
}

function getEgresosFolder() {
  const folders = DriveApp.getFoldersByName(EGRESOS_FOLDER_NAME);
  if (folders.hasNext()) return folders.next();
  return DriveApp.getFolderById(CONFIG.FOLDER_ID).createFolder(EGRESOS_FOLDER_NAME);
}

function handleGetEgresos(body) {
  // Público — no requiere auth
  const sh   = getEgresosSheet();
  const data = sh.getDataRange().getValues();
  const egresos = [];
  for (let i = 1; i < data.length; i++) {
    if (!data[i][0]) continue;
    egresos.push({
      id:         data[i][0],
      fecha:      data[i][1],
      concepto:   data[i][2],
      categoria:  data[i][3],
      monto:      Number(data[i][4]) || 0,
      comentario: data[i][5],
      fileId:     data[i][6],
      driveLink:  data[i][7],
      adminEmail: data[i][8],
    });
  }
  // Ordenar por fecha descendente
  egresos.sort(function(a,b){
    const pa=String(a.fecha).split('/'), pb=String(b.fecha).split('/');
    const da=new Date(pa[2],pa[1]-1,pa[0]), db=new Date(pb[2],pb[1]-1,pb[0]);
    return db - da;
  });
  // Totales por categoría
  const totalesCat = {};
  CATEGORIAS.forEach(function(c){ totalesCat[c] = 0; });
  egresos.forEach(function(e){ totalesCat[e.categoria] = (totalesCat[e.categoria]||0) + e.monto; });
  const totalGastado = egresos.reduce(function(s,e){ return s+e.monto; }, 0);
  return outCORS({ ok:true, egresos, totalesCat, totalGastado });
}

function handleAddEgreso(body) {
  const { adminEmail, concepto, categoria, monto, comentario, base64Image, mimeType, fecha } = body;
  if (!CONFIG.ADMIN_EMAILS.includes(adminEmail)) return outCORS({ ok:false, error:'No autorizado' });
  if (!concepto || !monto) return outCORS({ ok:false, error:'Concepto y monto son requeridos' });

  const sh  = getEgresosSheet();
  const id  = 'egr-' + Utilities.getUuid().substring(0,8);
  const fch = fecha || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy');
  const ts  = nowStr();

  let fileId = '', driveLink = '';
  if (base64Image) {
    try {
      const folder  = getEgresosFolder();
      const blob    = Utilities.newBlob(Utilities.base64Decode(base64Image), mimeType || 'image/jpeg', id + '_recibo');
      const file    = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      fileId    = file.getId();
      driveLink = 'https://drive.google.com/file/d/' + fileId + '/view';
    } catch(e) { Logger.log('Error subiendo recibo: ' + e.message); }
  }

  sh.appendRow([id, fch, concepto, categoria||'Otro', Number(monto), comentario||'', fileId, driveLink, adminEmail, ts]);

  // Notificar Telegram
  sendTelegram(
    '💸 <b>Egreso registrado</b>\n' +
    '📋 <b>Concepto:</b> ' + concepto + '\n' +
    '🏷️ <b>Categoría:</b> ' + (categoria||'Otro') + '\n' +
    '💰 <b>Monto:</b> ₡' + Number(monto).toLocaleString('es-CR') + '\n' +
    '👮 <b>Admin:</b> ' + adminEmail +
    (comentario ? '\n📝 ' + comentario : '')
  );

  return outCORS({ ok:true, id, message:'Egreso registrado correctamente.' });
}

function handleEditEgreso(body) {
  const { adminEmail, id, concepto, categoria, monto, comentario } = body;
  if (!CONFIG.ADMIN_EMAILS.includes(adminEmail)) return outCORS({ ok:false, error:'No autorizado' });

  const sh   = getEgresosSheet();
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
      if (concepto)   sh.getRange(i+1, 3).setValue(concepto);
      if (categoria)  sh.getRange(i+1, 4).setValue(categoria);
      if (monto)      sh.getRange(i+1, 5).setValue(Number(monto));
      if (comentario !== undefined) sh.getRange(i+1, 6).setValue(comentario);
      return outCORS({ ok:true, message:'Egreso actualizado.' });
    }
  }
  return outCORS({ ok:false, error:'Egreso no encontrado.' });
}

function handleDeleteEgreso(body) {
  const { adminEmail, id } = body;
  if (!CONFIG.ADMIN_EMAILS.includes(adminEmail)) return outCORS({ ok:false, error:'No autorizado' });

  const sh   = getEgresosSheet();
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
      // Eliminar archivo de Drive si existe
      if (data[i][6]) {
        try { DriveApp.getFileById(data[i][6]).setTrashed(true); } catch(e){}
      }
      sh.deleteRow(i+1);
      return outCORS({ ok:true, message:'Egreso eliminado.' });
    }
  }
  return outCORS({ ok:false, error:'Egreso no encontrado.' });
}