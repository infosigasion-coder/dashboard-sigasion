const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// 1. Add Tab Button
const newTab = `<div class="admin-tab" onclick="setAdminTab('students')" id="atab-students" style="padding:8px 12px; font-size:12px; background:#10b981; color:white;">?? GestiA3n Estudiantes</div>`;
if (!html.includes('atab-students')) {
  html = html.replace('</div>\n    <div class="admin-panel-body">', '  ' + newTab + '\n      </div>\n    <div class="admin-panel-body">');
}

// 2. Add Tab Content
const studentHtml = `
      <div id="admin-students-view" style="display:none;">
        <h4 style="color:#10b981;margin-bottom:15px; border-bottom:1px solid #333; padding-bottom:10px;">GestiA3n de Estudiantes</h4>
        <div style="display:flex; justify-content:space-between; margin-bottom:15px;">
           <button class="btn" style="background:#10b981;color:white;" onclick="openStudentModal()">+ Nuevo Estudiante</button>
           <button class="btn btn-secondary" onclick="loadStudentsAdmin()">?? Recargar Lista</button>
        </div>
        
        <div class="table-responsive">
          <table style="width:100%;border-collapse:collapse;color:#fff;font-size:12px;text-align:left;">
            <thead>
              <tr style="background:#222;border-bottom:1px solid #333;">
                <th style="padding:10px;">#</th>
                <th style="padding:10px;">Cdula</th>
                <th style="padding:10px;">Nombre</th>
                <th style="padding:10px;">Gnero</th>
                <th style="padding:10px;">Hermanos</th>
                <th style="padding:10px;">Nacimiento</th>
                <th style="padding:10px;text-align:center;">Acciones</th>
              </tr>
            </thead>
            <tbody id="adminStudentsTbody">
              <tr><td colspan="7" style="text-align:center;padding:15px;">Cargando estudiantes...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
`;

if (!html.includes('admin-students-view')) {
  html = html.replace('<div id="admin-pending-view">', studentHtml + '\n      <div id="admin-pending-view">');
}

// 3. Add Student Form Modal
const studentModalHtml = `
  <!-- MODAL ESTUDIANTE -->
  <div class="modal-overlay" id="studentModal">
    <div class="modal-content" style="max-width:500px;">
      <div class="modal-header">
        <h3 id="studentModalTitle" style="color:#10b981;">Aadir Estudiante</h3>
        <button class="btn btn-secondary" onclick="closeStudentModal()">X</button>
      </div>
      <div class="modal-body">
        <input type="hidden" id="studId">
        <div class="form-group">
          <label>Nombre Completo (Apellidos y Nombres)</label>
          <input type="text" id="studNombre" class="form-control" placeholder="Ej. MA?rquez BA?ker MarA-a JesAos" required>
        </div>
        <div style="display:flex; gap:10px;">
          <div class="form-group" style="flex:1;">
            <label>Cdula</label>
            <input type="text" id="studCedula" class="form-control" placeholder="Ej. 1-1234-5678">
          </div>
          <div class="form-group" style="flex:1;">
            <label>Fecha Nacimiento</label>
            <input type="date" id="studNacimiento" class="form-control">
          </div>
        </div>
        <div style="display:flex; gap:10px;">
          <div class="form-group" style="flex:1;">
            <label>Gnero</label>
            <select id="studGenero" class="form-control">
              <option value="niAo">NiAo (VarA3n)</option>
              <option value="niAa">NiAa (Mujer)</option>
            </select>
          </div>
          <div class="form-group" style="flex:1; display:flex; align-items:center; justify-content:center; gap:10px; padding-top:20px;">
            <input type="checkbox" id="studHermano" style="width:20px;height:20px;">
            <label for="studHermano" style="margin:0;cursor:pointer;">? Tiene Hermano(s)</label>
          </div>
        </div>
        <div class="form-group">
          <label>Nombre del Padre</label>
          <input type="text" id="studPadre" class="form-control">
        </div>
        <div class="form-group">
          <label>Nombre de la Madre</label>
          <input type="text" id="studMadre" class="form-control">
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeStudentModal()">Cancelar</button>
        <button class="btn btn-success" style="background:#10b981;" onclick="saveStudent()">Guardar</button>
      </div>
    </div>
  </div>
`;

if (!html.includes('id="studentModal"')) {
  html = html.replace('<!-- MODAL CONFIG -->', studentModalHtml + '\n  <!-- MODAL CONFIG -->');
}

// 4. Add Cuotas Especiales Modal
const cuotasModalHtml = `
  <!-- MODAL CUOTA ESPECIAL -->
  <div class="modal-overlay" id="cuotaModal">
    <div class="modal-content" style="max-width:450px;">
      <div class="modal-header">
        <h3 style="color:#f59e0b;">? Cuota Especial</h3>
        <button class="btn btn-secondary" onclick="closeCuotaModal()">X</button>
      </div>
      <div class="modal-body">
        <input type="hidden" id="cuotaEstId">
        <p style="margin-bottom:15px; font-size:14px; color:#aaa;">Configurando cuota de <strong id="cuotaEstName" style="color:#fff;"></strong> para la actividad actual.</p>
        
        <div style="background:#222; padding:15px; border-radius:8px; border:1px solid #333; margin-bottom:15px;">
           <div style="display:flex; justify-content:space-between; align-items:center;">
             <label style="margin:0; font-weight:bold;">Estado de ParticipaciA3n</label>
             <label class="toggle-switch" style="display:flex;align-items:center;gap:10px;cursor:pointer;">
                <input type="checkbox" id="cuotaParticipa" onchange="toggleCuotaFields()" checked style="width:18px;height:18px;">
                <span id="cuotaParticipaLabel" style="color:#10b981;font-weight:bold;">S Participa</span>
             </label>
           </div>
           <p style="font-size:12px; color:#888; margin-top:5px;">Si desmarcas esta opciA3n, el estudiante quedarA? exento de la cuota.</p>
        </div>

        <div id="cuotaFields">
           <div class="form-group">
             <label>Monto Personalizado (Opcional)</label>
             <input type="number" id="cuotaMonto" class="form-control" placeholder="Ej. 15000 (dejar vacA-o para usar rubros)">
             <small style="color:#888;">Si ingresas un monto aquA-, ignorarA? el desglose compuesto.</small>
           </div>
           
           <div class="form-group" id="cuotaRubrosContainer" style="display:none; border-top:1px solid #333; padding-top:15px; margin-top:10px;">
             <label>Ajuste de Rubros (Desglose)</label>
             <div id="cuotaRubrosList"></div>
           </div>
        </div>

        <div class="form-group" style="margin-top:15px;">
          <label>Motivo / ObservaciA3n</label>
          <input type="text" id="cuotaMotivo" class="form-control" placeholder="Ej. Pago doble por excepciA3n">
        </div>

      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeCuotaModal()">Cancelar</button>
        <button class="btn btn-success" style="background:#f59e0b;" onclick="saveCuotaEspecial()">Guardar Cuota</button>
      </div>
    </div>
  </div>
`;

if (!html.includes('id="cuotaModal"')) {
  html = html.replace('<!-- MODAL CONFIG -->', cuotasModalHtml + '\n  <!-- MODAL CONFIG -->');
}

fs.writeFileSync('index.html', html, 'utf8');
console.log('HTML updated');
