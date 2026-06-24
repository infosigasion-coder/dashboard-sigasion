const fs = require('fs');

let frontend = fs.readFileSync('frontend.js', 'utf8');

// Modificar loadActivities en frontend.js
const oldLoadActivities = `async function loadActivities() {
    const seccion = document.getElementById('seccionSelect').value;
    const anio = document.getElementById('anioSelect').value;
    if (!seccion || !anio) return;

    try {
        const res = await fetch(\`\${SCRIPT_URL}/api/activities?seccion=\${seccion}&anio=\${anio}\`, {
            headers: window.adminEmail ? { 'Authorization': \`Bearer \${localStorage.getItem('siga_jwt')}\` } : {}
        });
        const data = await res.json();
        
        const activitySelect = document.getElementById('activitySelect');
        activitySelect.innerHTML = '';
        
        if (data.ok && data.activities && data.activities.length > 0) {
            data.activities.forEach(act => {
                const option = document.createElement('option');
                option.value = act.id;
                option.textContent = act.nombre;
                activitySelect.appendChild(option);
            });
            activitySelect.style.display = 'block';
            loadData();
        } else {
            activitySelect.style.display = 'none';
            // Mostrar mensaje de no hay actividades si es necesario
            document.getElementById('studentsGrid').innerHTML = '<div class="col-12 text-center text-muted">No hay actividades creadas para esta secci\u00F3n en este curso lectivo.</div>';
        }
    } catch (e) {
        console.error('Error cargando actividades:', e);
    }
}`;

const newLoadActivities = `async function loadActivities() {
    const seccion = document.getElementById('seccionSelect').value;
    const anio = document.getElementById('anioSelect').value;
    if (!seccion || !anio) return;

    try {
        const res = await fetch(\`\${SCRIPT_URL}/api/activities?seccion=\${seccion}&anio=\${anio}\`, {
            headers: window.adminEmail ? { 'Authorization': \`Bearer \${localStorage.getItem('siga_jwt')}\` } : {}
        });
        const data = await res.json();
        
        const activitySelect = document.getElementById('activitySelect');
        activitySelect.innerHTML = '';
        
        if (data.ok && data.activities && data.activities.length > 0) {
            // Lógica para ordenar y seleccionar la más próxima activa
            const activeActs = data.activities.filter(a => a.activa !== false);
            activeActs.sort((a, b) => {
                if (!a.fecha_limite_pago) return 1;
                if (!b.fecha_limite_pago) return -1;
                return new Date(a.fecha_limite_pago) - new Date(b.fecha_limite_pago);
            });
            const defaultAct = activeActs.length > 0 ? activeActs[0] : data.activities[data.activities.length - 1];

            data.activities.forEach(act => {
                const option = document.createElement('option');
                option.value = act.id;
                let estado = act.activa === false ? ' (CERRADA)' : '';
                option.textContent = act.nombre + estado;
                if (act.id === defaultAct.id) {
                    option.selected = true;
                }
                activitySelect.appendChild(option);
            });
            activitySelect.style.display = 'block';
            
            // Renderizar el Badge "SOLO LECTURA" si está cerrada
            const selectedActData = data.activities.find(a => a.id === activitySelect.value);
            const badgeCerrado = document.getElementById('badgeCerrado');
            if (badgeCerrado) {
                if (selectedActData && selectedActData.activa === false) {
                    badgeCerrado.style.display = 'inline-block';
                    window.currentActivityIsReadonly = true;
                } else {
                    badgeCerrado.style.display = 'none';
                    window.currentActivityIsReadonly = false;
                }
            }
            
            // Si el tab de Ajustes está activo, renderizar fichas
            if (document.getElementById('settings').style.display === 'block') {
                renderActivityCards(data.activities);
            }

            loadData();
        } else {
            activitySelect.style.display = 'none';
            document.getElementById('studentsGrid').innerHTML = '<div class="col-12 text-center text-muted">No hay actividades creadas para esta secci\u00F3n en este curso lectivo.</div>';
            if (document.getElementById('settings').style.display === 'block') {
                renderActivityCards([]);
            }
        }
    } catch (e) {
        console.error('Error cargando actividades:', e);
    }
}`;

if (frontend.includes("async function loadActivities()")) {
    frontend = frontend.replace(oldLoadActivities, newLoadActivities);
} else {
    console.error("loadActivities not found exactly!");
}

// Event listener for Activity Select Change
const newSelectListener = `document.getElementById('activitySelect').addEventListener('change', () => {
    // Al cambiar la actividad en el dropdown, re-verificar si está cerrada
    const text = document.getElementById('activitySelect').options[document.getElementById('activitySelect').selectedIndex].text;
    const badgeCerrado = document.getElementById('badgeCerrado');
    if (badgeCerrado) {
        if (text.includes('(CERRADA)')) {
            badgeCerrado.style.display = 'inline-block';
            window.currentActivityIsReadonly = true;
        } else {
            badgeCerrado.style.display = 'none';
            window.currentActivityIsReadonly = false;
        }
    }
    loadData();
});\n`;
if (!frontend.includes('activitySelect\').addEventListener(\'change\',')) {
    frontend = frontend.replace("document.getElementById('anioSelect').addEventListener('change', loadActivities);", "document.getElementById('anioSelect').addEventListener('change', loadActivities);\n" + newSelectListener);
}

// Logic to block elements when readonly
const readonlyBlock = `
    // Check if readonly
    if (window.currentActivityIsReadonly) {
        // Find all pago and devolucion buttons
        document.querySelectorAll('.btn-success, .btn-warning').forEach(btn => {
            if (btn.textContent.includes('Pago') || btn.textContent.includes('Devolución')) {
                btn.disabled = true;
                btn.title = "Evento Cerrado";
            }
        });
        const editBtn = document.getElementById('editBudgetBtn');
        if (editBtn) editBtn.disabled = true;
    }
`;

frontend = frontend.replace("document.getElementById('editBudgetBtn').style.display = 'block';", "document.getElementById('editBudgetBtn').style.display = 'block';\n" + readonlyBlock);


// Actividad Fichas Render Logic
const fichasLogic = `
window.renderActivityCards = function(activities) {
    const container = document.getElementById('activityCardsContainer');
    if (!container) return;
    container.innerHTML = '';
    
    if (activities.length === 0) {
        container.innerHTML = '<p class="text-muted">No hay actividades creadas. Crea una nueva.</p>';
        return;
    }
    
    activities.forEach(act => {
        const isClosed = act.activa === false;
        const color = isClosed ? 'danger' : 'success';
        const stateText = isClosed ? 'CERRADO' : 'ACTIVO';
        
        const card = document.createElement('div');
        card.className = 'col-md-6 col-lg-4 mb-3';
        card.innerHTML = \`
            <div class="card shadow-sm h-100 border-\${color}">
                <div class="card-body">
                    <h5 class="card-title">\${act.nombre}</h5>
                    <span class="badge bg-\${color} mb-2">\${stateText}</span>
                    <p class="card-text text-muted small mb-1">
                        <i class="fas fa-calendar-alt"></i> Actividad: \${act.fecha_actividad || 'No definida'}<br>
                        <i class="fas fa-clock"></i> Límite de pago: \${act.fecha_limite_pago || 'No definida'}
                    </p>
                </div>
                <div class="card-footer bg-transparent border-0 d-flex justify-content-between align-items-center">
                    <button class="btn btn-sm btn-outline-primary" onclick="editActivity('\${act.id}')"><i class="fas fa-edit"></i> Editar</button>
                    <div class="form-check form-switch">
                        <input class="form-check-input" type="checkbox" role="switch" id="toggleAct_\${act.id}" \${!isClosed ? 'checked' : ''} onchange="toggleActivityStatus('\${act.id}', this.checked)">
                        <label class="form-check-label" for="toggleAct_\${act.id}">Activo</label>
                    </div>
                </div>
            </div>
        \`;
        container.appendChild(card);
    });
};

window.editActivity = async function(id) {
    const seccion = document.getElementById('seccionSelect').value;
    const anio = document.getElementById('anioSelect').value;
    
    // Fetch all activities and find this one
    const res = await fetch(\`\${SCRIPT_URL}/api/activities?seccion=\${seccion}&anio=\${anio}\`, {
        headers: { 'Authorization': \`Bearer \${localStorage.getItem('siga_jwt')}\` }
    });
    const data = await res.json();
    const act = data.activities.find(a => a.id === id);
    if (!act) return;
    
    document.getElementById('activityId').value = act.id;
    document.getElementById('actName').value = act.nombre;
    document.getElementById('fechaActividad').value = act.fecha_actividad || '';
    document.getElementById('fechaLimitePago').value = act.fecha_limite_pago || '';
    
    // Pre-fill budget
    document.getElementById('activityItems').innerHTML = '';
    if (act.milestones) {
        act.milestones.forEach((m, idx) => {
            const newItem = document.createElement('div');
            newItem.className = 'row g-3 align-items-center mb-2 activity-item';
            newItem.innerHTML = \`
                <div class="col-sm-5"><input type="text" class="form-control" placeholder="Concepto (ej. Transporte)" value="\${m.item}" required></div>
                <div class="col-sm-3"><input type="number" class="form-control" placeholder="Costo por estudiante (₡)" value="\${m.monto}" required></div>
                <div class="col-sm-3"><input type="date" class="form-control" title="Fecha límite sugerida" value="\${m.fecha_limite || ''}"></div>
                <div class="col-sm-1"><button type="button" class="btn btn-danger btn-sm" onclick="this.parentElement.parentElement.remove()"><i class="fas fa-trash"></i></button></div>
            \`;
            document.getElementById('activityItems').appendChild(newItem);
        });
    }
    
    document.getElementById('activityFormContainer').style.display = 'block';
    document.getElementById('btnShowActivityForm').style.display = 'none';
};

window.toggleActivityStatus = async function(id, newState) {
    if (!newState) {
        const confirm = await Swal.fire({
            title: '¿Cerrar actividad?',
            text: "Los estudiantes ya no podrán realizar pagos y el evento pasará a modo de solo lectura.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, cerrar',
            cancelButtonText: 'Cancelar'
        });
        if (!confirm.isConfirmed) {
            document.getElementById('toggleAct_' + id).checked = true; // revert
            return;
        }
    }
    
    const seccion = document.getElementById('seccionSelect').value;
    try {
        const payload = {
            id: id,
            activa: newState,
            seccion: seccion,
            adminEmail: window.adminEmail
        };
        const res = await fetch(\`\${SCRIPT_URL}/api/actividades\`, {
            method: 'POST', // or PUT if you changed it, but our worker patch uses POST
            headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${localStorage.getItem('siga_jwt')}\` },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.ok) {
            Swal.fire('Éxito', \`Actividad \${newState ? 'abierta' : 'cerrada'} correctamente\`, 'success');
            loadActivities(); // Reload to refresh everything
        } else {
            Swal.fire('Error', data.error || 'Error al cambiar estado', 'error');
            document.getElementById('toggleAct_' + id).checked = !newState; // revert
        }
    } catch (e) {
        console.error(e);
        document.getElementById('toggleAct_' + id).checked = !newState; // revert
    }
};

window.showActivityForm = function() {
    document.getElementById('activityForm').reset();
    document.getElementById('activityId').value = '';
    document.getElementById('activityItems').innerHTML = '';
    document.getElementById('activityFormContainer').style.display = 'block';
    document.getElementById('btnShowActivityForm').style.display = 'none';
};

window.hideActivityForm = function() {
    document.getElementById('activityFormContainer').style.display = 'none';
    document.getElementById('btnShowActivityForm').style.display = 'inline-block';
};
`;

if (!frontend.includes('renderActivityCards')) {
    frontend += '\n' + fichasLogic;
}

// Modificar saveActivity
const oldSaveActivity = `const payload = {
            adminEmail: window.adminEmail,
            nombre: document.getElementById('actName').value,
            a\u00F1o: anio,
            asociacion: 'Local',
            tipoCobro: 'Por Rubro',
            cuotaUnica: 0,
            rubros: items
        };`;

const newSaveActivity = `const payload = {
            id: document.getElementById('activityId') ? document.getElementById('activityId').value : undefined,
            adminEmail: window.adminEmail,
            nombre: document.getElementById('actName').value,
            a\u00F1o: anio,
            fecha_actividad: document.getElementById('fechaActividad') ? document.getElementById('fechaActividad').value : null,
            fecha_limite_pago: document.getElementById('fechaLimitePago') ? document.getElementById('fechaLimitePago').value : null,
            asociacion: 'Local',
            tipoCobro: 'Por Rubro',
            cuotaUnica: 0,
            rubros: items
        };`;

frontend = frontend.replace(oldSaveActivity, newSaveActivity);

fs.writeFileSync('frontend.js', frontend);
console.log('frontend.js patched successfully');
