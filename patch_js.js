const fs = require('fs');
let js = fs.readFileSync('js/main.js', 'utf8');

const newFunctions = `
// ==========================================
// MÓDULO: GESTIÓN DE ESTUDIANTES Y CUOTAS
// ==========================================

let adminStudentsList = [];
let currentCuotaRubros = [];

function loadStudentsAdmin() {
  document.getElementById('adminStudentsTbody').innerHTML = '<tr><td colspan="7" style="text-align:center;padding:15px;">Cargando...</td></tr>';
  
  const seccion = currentConfig.seccion || '1-1';
  const ao = currentConfig.aAo || currentConfig.anio || '2027';
  const actId = currentConfig.actividadId;
  
  fetch('/api/data?seccion=' + encodeURIComponent(seccion) + '&aAo=' + encodeURIComponent(ao) + (actId ? '&actividadId='+actId : ''))
    .then(r => r.json())
    .then(res => {
      if(res.ok) {
        adminStudentsList = res.students || [];
        currentCuotaRubros = res.actividad ? (res.actividad.rubros || []) : []; // Necesario para el modal de desglose
        renderAdminStudents();
      } else {
        alert('Error cargando estudiantes');
      }
    })
    .catch(e => {
       console.error(e);
       alert('Error de red al cargar estudiantes');
    });
}

function renderAdminStudents() {
  const tbody = document.getElementById('adminStudentsTbody');
  if(!tbody) return;
  tbody.innerHTML = '';
  
  if(adminStudentsList.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:15px;">No hay estudiantes en esta secciA3n</td></tr>';
    return;
  }
  
  adminStudentsList.forEach(st => {
    // Determine the original full object if possible, the backend maps them.
    // The backend /api/data returns mapped properties:
    // id, num, nombre, cedula, fechaNacimiento, genero, tieneHermano, padres, etc.
    
    let genLabel = st.genero === 'niAo' ? '? NiAo' : (st.genero === 'niAa' ? '? NiAa' : st.genero);
    let hermLabel = st.tieneHermano ? '? SA-' : '? No';
    
    const tr = document.createElement('tr');
    tr.style.borderBottom = '1px solid #333';
    tr.innerHTML = \`
      <td style="padding:10px;">\${st.num}</td>
      <td style="padding:10px;">\${st.cedula || '-'}</td>
      <td style="padding:10px; font-weight:bold;">\${st.nombre}</td>
      <td style="padding:10px;">\${genLabel}</td>
      <td style="padding:10px;">\${hermLabel}</td>
      <td style="padding:10px;">\${st.fechaNacimiento || '-'}</td>
      <td style="padding:10px; text-align:center;">
         <button class="btn btn-sm" style="background:#f59e0b; color:white; padding:4px 8px; font-size:11px;" onclick="openCuotaModal('\${st.id}', '\${st.nombre}')">? Cuota Especial</button>
         <button class="btn btn-sm" style="background:#3b82f6; color:white; padding:4px 8px; font-size:11px;" onclick="editStudent('\${st.id}')">? Editar</button>
         <button class="btn btn-sm" style="background:#ef4444; color:white; padding:4px 8px; font-size:11px;" onclick="deleteStudent('\${st.id}', '\${st.nombre}')">? Baja</button>
      </td>
    \`;
    tbody.appendChild(tr);
  });
}

function openStudentModal() {
  document.getElementById('studId').value = '';
  document.getElementById('studNombre').value = '';
  document.getElementById('studCedula').value = '';
  document.getElementById('studNacimiento').value = '';
  document.getElementById('studGenero').value = 'niAo';
  document.getElementById('studHermano').checked = false;
  document.getElementById('studPadre').value = '';
  document.getElementById('studMadre').value = '';
  
  document.getElementById('studentModalTitle').innerText = 'Aadir Nuevo Estudiante';
  document.getElementById('studentModal').style.display = 'flex';
}

function closeStudentModal() {
  document.getElementById('studentModal').style.display = 'none';
}

function editStudent(id) {
  const st = adminStudentsList.find(s => s.id === id);
  if(!st) return;
  
  document.getElementById('studId').value = st.id;
  document.getElementById('studNombre').value = st.nombre;
  document.getElementById('studCedula').value = st.cedula || '';
  
  // Convert CR date to YYYY-MM-DD for input
  let dVal = '';
  if(st.fechaNacimiento && st.fechaNacimiento.includes('/')) {
     const parts = st.fechaNacimiento.split('/');
     if(parts.length === 3) dVal = \`\${parts[2]}-\${parts[1].padStart(2,'0')}-\${parts[0].padStart(2,'0')}\`;
  }
  document.getElementById('studNacimiento').value = dVal;
  
  document.getElementById('studGenero').value = st.genero || 'niAo';
  document.getElementById('studHermano').checked = !!st.tieneHermano;
  
  document.getElementById('studPadre').value = (st.padres && st.padres[0]) ? st.padres[0] : '';
  document.getElementById('studMadre').value = (st.padres && st.padres[1]) ? st.padres[1] : '';
  
  document.getElementById('studentModalTitle').innerText = 'Editar Estudiante';
  document.getElementById('studentModal').style.display = 'flex';
}

async function saveStudent() {
  const btn = document.querySelector('#studentModal .btn-success');
  btn.disabled = true;
  btn.innerText = 'Guardando...';
  
  const payload = {
    id: document.getElementById('studId').value || null,
    seccion: currentConfig.seccion || '1-1',
    ao: currentConfig.aAo || currentConfig.anio || '2027',
    nombre: document.getElementById('studNombre').value,
    cedula: document.getElementById('studCedula').value,
    fecha_nacimiento: document.getElementById('studNacimiento').value || null,
    genero: document.getElementById('studGenero').value,
    tiene_hermano: document.getElementById('studHermano').checked,
    nombre_padre: document.getElementById('studPadre').value,
    nombre_madre: document.getElementById('studMadre').value,
    adminEmail: localStorage.getItem('siga_admin_email')
  };
  
  try {
    const res = await fetch('/api/students/save', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if(data.ok) {
      Swal.fire('!Exito!', 'Estudiante guardado (y secciA3n reordenada)', 'success');
      closeStudentModal();
      loadStudentsAdmin();
      loadData(); // refrescar vista principal
    } else {
      Swal.fire('Error', data.error || 'Error desconocido', 'error');
    }
  } catch(e) {
    Swal.fire('Error', e.message, 'error');
  }
  btn.disabled = false;
  btn.innerText = 'Guardar';
}

async function deleteStudent(id, nombre) {
  const result = await Swal.fire({
    title: 'A?Dar de baja?',
    text: \`A?Seguro que deseas dar de baja y eliminar a \${nombre}? Esta acciA3n es permanente y reordenarA? la lista.\`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ef4444',
    confirmButtonText: 'SA-, Eliminar'
  });
  
  if(!result.isConfirmed) return;
  
  try {
    const res = await fetch('/api/students/delete', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
         id: id,
         seccion: currentConfig.seccion || '1-1',
         ao: currentConfig.aAo || currentConfig.anio || '2027',
         adminEmail: localStorage.getItem('siga_admin_email')
      })
    });
    const data = await res.json();
    if(data.ok) {
      Swal.fire('Eliminado', 'El estudiante fue dado de baja exitosamente.', 'success');
      loadStudentsAdmin();
      loadData();
    } else {
      Swal.fire('Error', data.error || 'No se pudo eliminar', 'error');
    }
  } catch(e) {
    Swal.fire('Error', e.message, 'error');
  }
}

function openCuotaModal(id, nombre) {
  if(!currentConfig.actividadId) {
    Swal.fire('AtenciA3n', 'Debes seleccionar una actividad primero en el filtro superior.', 'warning');
    return;
  }
  
  document.getElementById('cuotaEstId').value = id;
  document.getElementById('cuotaEstName').innerText = nombre;
  
  document.getElementById('cuotaParticipa').checked = true;
  document.getElementById('cuotaMonto').value = '';
  document.getElementById('cuotaMotivo').value = '';
  
  // Buscar si la actividad tiene rubros para armar el UI
  const rubrosList = document.getElementById('cuotaRubrosList');
  rubrosList.innerHTML = '';
  
  // Como no tenemos el objeto dbRubros directamente en el cliente fA!cilmente, pero sA- sabemos que es compleja
  // Dejamos un mensaje de que los overrides compuestos se aplicarA!n solo a la cuota base
  rubrosList.innerHTML = '<small style="color:#888;">Actualmente el backend maneja cuotas compuestas automA!ticamente, si requieres cambiar el valor total de un rubro compuesto, ingresa el total general arriba.</small>';
  
  toggleCuotaFields();
  document.getElementById('cuotaModal').style.display = 'flex';
}

function closeCuotaModal() {
  document.getElementById('cuotaModal').style.display = 'none';
}

function toggleCuotaFields() {
  const participa = document.getElementById('cuotaParticipa').checked;
  const label = document.getElementById('cuotaParticipaLabel');
  const fields = document.getElementById('cuotaFields');
  
  if(participa) {
    label.innerText = 'SA- Participa';
    label.style.color = '#10b981';
    fields.style.display = 'block';
  } else {
    label.innerText = 'NO Participa';
    label.style.color = '#ef4444';
    fields.style.display = 'none';
  }
}

async function saveCuotaEspecial() {
  const btn = document.querySelector('#cuotaModal .btn-success');
  btn.disabled = true;
  btn.innerText = 'Guardando...';
  
  const payload = {
    estudiante_id: document.getElementById('cuotaEstId').value,
    actividad_id: currentConfig.actividadId,
    no_participa: !document.getElementById('cuotaParticipa').checked,
    monto_personalizado: document.getElementById('cuotaMonto').value || null,
    rubros_personalizados: null, // Simplificado para que usen monto_personalizado
    motivo: document.getElementById('cuotaMotivo').value,
    seccion: currentConfig.seccion || '1-1'
  };
  
  try {
    const res = await fetch('/api/students/custom_quota', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if(data.ok) {
      Swal.fire('Guardado', 'Cuota especial aplicada correctamente', 'success');
      closeCuotaModal();
      loadData(); // Refrescar los totales en tiempo real
    } else {
      Swal.fire('Error', data.error || 'Hubo un error al guardar', 'error');
    }
  } catch(e) {
    Swal.fire('Error', e.message, 'error');
  }
  btn.disabled = false;
  btn.innerText = 'Guardar Cuota';
}
// ==========================================
`;

if (!js.includes('GESTIÓN DE ESTUDIANTES Y CUOTAS') && !js.includes('GESTIN DE ESTUDIANTES Y CUOTAS') && !js.includes('function loadStudentsAdmin')) {
  js = js + '\n' + newFunctions;
  
  // Inject logic inside setAdminTab
  js = js.replace(/function setAdminTab\(tab\) \{/g, `function setAdminTab(tab) {
  if (tab === 'students') { loadStudentsAdmin(); }`);
  
  fs.writeFileSync('js/main.js', js, 'utf8');
  console.log('JS functions added');
} else {
  console.log('JS functions already exist');
}
