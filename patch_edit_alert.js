const fs = require('fs');
let html = fs.readFileSync('index_github.html', 'utf8');

const oldSubmit = `document.getElementById('activityForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const anio = document.getElementById('anioSelect').value;
        const seccion = document.getElementById('seccionSelect').value;
        if (!anio || !seccion) {
            alert('Selecciona sección y curso lectivo primero');
            return;
        }

        const items = [];`;

const newSubmit = `document.getElementById('activityForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const anio = document.getElementById('anioSelect').value;
        const seccion = document.getElementById('seccionSelect').value;
        if (!anio || !seccion) {
            alert('Selecciona sección y curso lectivo primero');
            return;
        }
        
        const isEdit = document.getElementById('activityId').value !== '';
        if (isEdit) {
            const confirm = await Swal.fire({
                title: '¿Guardar cambios?',
                text: "Si eliminas o editas rubros, recuerda que los estudiantes pueden quedar con saldo a favor si ya habían pagado montos mayores.",
                icon: 'info',
                showCancelButton: true,
                confirmButtonText: 'Sí, guardar',
                cancelButtonText: 'Revisar de nuevo'
            });
            if (!confirm.isConfirmed) return;
        }

        const items = [];`;

html = html.replace(oldSubmit, newSubmit);

fs.writeFileSync('index_github.html', html);
console.log("Added edit warning to index_github.html");
