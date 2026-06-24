const fs = require('fs');
let html = fs.readFileSync('index_github.html', 'utf8');

// 1. Add Badge "CERRADA" to the main view, next to the activity select
// Assuming there is: <div class="col-md-3"><select id="activitySelect"...
const oldActivitySelectHtml = `<select id="activitySelect" class="form-select" style="display:none;"></select>`;
const newActivitySelectHtml = `<div class="d-flex align-items-center">
    <select id="activitySelect" class="form-select me-2" style="display:none;"></select>
    <span id="badgeCerrado" class="badge bg-danger" style="display:none;">SOLO LECTURA</span>
</div>`;
html = html.replace(oldActivitySelectHtml, newActivitySelectHtml);

// 2. Modify Settings Tab
const oldSettingsTab = `<div id="settings" class="tab-content" style="display:none;">
            <div class="card mb-4 shadow-sm">
                <div class="card-header bg-white">
                    <h5 class="mb-0">Gestión de Actividad y Presupuesto</h5>
                </div>
                <div class="card-body">
                    <form id="activityForm">`;
                    
const newSettingsTab = `<div id="settings" class="tab-content" style="display:none;">
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h4 class="mb-0">Centro de Control de Actividades</h4>
                <button id="btnShowActivityForm" class="btn btn-primary" onclick="showActivityForm()"><i class="fas fa-plus"></i> Crear Nueva Actividad</button>
            </div>
            
            <div id="activityCardsContainer" class="row mb-4">
                <!-- Tarjetas de actividad se renderizan aquí -->
            </div>
            
            <div id="activityFormContainer" class="card mb-4 shadow-sm" style="display:none;">
                <div class="card-header bg-white d-flex justify-content-between align-items-center">
                    <h5 class="mb-0">Detalles de Actividad</h5>
                    <button type="button" class="btn-close" onclick="hideActivityForm()"></button>
                </div>
                <div class="card-body">
                    <form id="activityForm">
                        <input type="hidden" id="activityId" value="">`;
html = html.replace(oldSettingsTab, newSettingsTab);

// 3. Add Fecha Actividad and Fecha Limite Pago inputs
// Before `<div class="mb-3"><label class="form-label fw-bold">Rubros de Cobro</label>`
const oldRubrosSection = `<div class="mb-3">
                            <label class="form-label fw-bold">Rubros de Cobro</label>`;
const newDatesHtml = `<div class="row mb-3">
                            <div class="col-md-6">
                                <label for="fechaActividad" class="form-label fw-bold">Fecha de la Actividad</label>
                                <input type="date" id="fechaActividad" class="form-control" required>
                            </div>
                            <div class="col-md-6">
                                <label for="fechaLimitePago" class="form-label fw-bold">Fecha Límite de Pago</label>
                                <input type="date" id="fechaLimitePago" class="form-control" required>
                            </div>
                        </div>
                        <div class="mb-3">
                            <label class="form-label fw-bold">Rubros de Cobro</label>`;
html = html.replace(oldRubrosSection, newDatesHtml);

fs.writeFileSync('index_github.html', html);
console.log('index_github.html patched successfully');
