const fs = require('fs');

let html = fs.readFileSync('index_github.html', 'utf8');

const fichasLogic = `
function renderActivityCards(activities) {
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
}

async function editActivity(id) {
    const seccion = document.getElementById('seccionSelect').value;
    const anio = document.getElementById('anioSelect').value;
    
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
    
    document.getElementById('activityItems').innerHTML = '';
    if (act.milestones) {
        act.milestones.forEach((m) => {
            const newItem = document.createElement('div');
            newItem.className = 'row g-3 align-items-center mb-2 activity-item';
            newItem.innerHTML = \`
                <div class="col-sm-5"><input type="text" class="form-control" placeholder="Concepto" value="\${m.item}" required></div>
                <div class="col-sm-3"><input type="number" class="form-control" placeholder="Costo" value="\${m.monto}" required></div>
                <div class="col-sm-3"><input type="date" class="form-control" value="\${m.fecha_limite || ''}"></div>
                <div class="col-sm-1"><button type="button" class="btn btn-danger btn-sm" onclick="this.parentElement.parentElement.remove()"><i class="fas fa-trash"></i></button></div>
            \`;
            document.getElementById('activityItems').appendChild(newItem);
        });
    }
    
    document.getElementById('activityFormContainer').style.display = 'block';
    document.getElementById('btnShowActivityForm').style.display = 'none';
}

async function toggleActivityStatus(id, newState) {
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
            document.getElementById('toggleAct_' + id).checked = true;
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
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${localStorage.getItem('siga_jwt')}\` },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.ok) {
            Swal.fire('Éxito', \`Actividad \${newState ? 'abierta' : 'cerrada'} correctamente\`, 'success');
            loadActivities();
        } else {
            Swal.fire('Error', data.error || 'Error al cambiar estado', 'error');
            document.getElementById('toggleAct_' + id).checked = !newState;
        }
    } catch (e) {
        document.getElementById('toggleAct_' + id).checked = !newState;
    }
}

function showActivityForm() {
    document.getElementById('activityForm').reset();
    document.getElementById('activityId').value = '';
    document.getElementById('activityItems').innerHTML = '';
    document.getElementById('activityFormContainer').style.display = 'block';
    document.getElementById('btnShowActivityForm').style.display = 'none';
}

function hideActivityForm() {
    document.getElementById('activityFormContainer').style.display = 'none';
    document.getElementById('btnShowActivityForm').style.display = 'inline-block';
}
`;

if (!html.includes('function renderActivityCards')) {
    html = html.replace('</script>\n<style>', fichasLogic + '\n</script>\n<style>');
}


// Replace loadActivities
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
            document.getElementById('studentsGrid').innerHTML = '<div class="col-12 text-center text-muted">No hay actividades creadas para esta sección en este curso lectivo.</div>';
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
                if (act.id === defaultAct.id) option.selected = true;
                activitySelect.appendChild(option);
            });
            activitySelect.style.display = 'block';
            
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
            
            if (document.getElementById('settings').style.display === 'block') {
                if(typeof renderActivityCards === 'function') renderActivityCards(data.activities);
            }
            loadData();
        } else {
            activitySelect.style.display = 'none';
            document.getElementById('studentsGrid').innerHTML = '<div class="col-12 text-center text-muted">No hay actividades creadas.</div>';
            if (document.getElementById('settings').style.display === 'block') {
                if(typeof renderActivityCards === 'function') renderActivityCards([]);
            }
        }
    } catch (e) {
        console.error('Error cargando actividades:', e);
    }
}`;

if (html.includes("async function loadActivities() {")) {
    // try to replace the exact block if it matches, or use regex
    const blockStart = html.indexOf("async function loadActivities() {");
    const blockEnd = html.indexOf("}", html.indexOf("catch (e)", blockStart)) + 1;
    if (blockStart !== -1 && blockEnd !== -1) {
        html = html.substring(0, blockStart) + newLoadActivities + html.substring(blockEnd);
    }
}

const newSelectListener = `document.getElementById('activitySelect').addEventListener('change', () => {
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
if (!html.includes('activitySelect\').addEventListener(\'change\',')) {
    html = html.replace("document.getElementById('anioSelect').addEventListener('change', loadActivities);", "document.getElementById('anioSelect').addEventListener('change', loadActivities);\n" + newSelectListener);
}

const readonlyBlock = `
    if (window.currentActivityIsReadonly) {
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
html = html.replace("document.getElementById('editBudgetBtn').style.display = 'block';", "document.getElementById('editBudgetBtn').style.display = 'block';\n" + readonlyBlock);

const oldSaveActivity = `const payload = {
            adminEmail: window.adminEmail,
            nombre: document.getElementById('actName').value,
            año: anio,
            asociacion: 'Local',
            tipoCobro: 'Por Rubro',
            cuotaUnica: 0,
            rubros: items
        };`;

const newSaveActivity = `const payload = {
            id: document.getElementById('activityId') ? document.getElementById('activityId').value : undefined,
            adminEmail: window.adminEmail,
            nombre: document.getElementById('actName').value,
            año: anio,
            fecha_actividad: document.getElementById('fechaActividad') ? document.getElementById('fechaActividad').value : null,
            fecha_limite_pago: document.getElementById('fechaLimitePago') ? document.getElementById('fechaLimitePago').value : null,
            asociacion: 'Local',
            tipoCobro: 'Por Rubro',
            cuotaUnica: 0,
            rubros: items
        };`;
html = html.replace(oldSaveActivity, newSaveActivity);

fs.writeFileSync('index_github.html', html);
console.log('index_github.html scripts patched successfully');
