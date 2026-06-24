# Festival Sión 2027 — Arquitectura del Sistema
**Sección 1-1 · Centro Educativo Católico Nuestra Señora de Sión**

---

## Resumen del sistema 2026 (base de referencia)

| Componente | Tecnología 2026 |
|---|---|
| Frontend | index.html en Cloudflare Workers |
| Backend | Google Apps Script |
| Base de datos | Google Sheets |
| Autenticación | Google OAuth |
| Hosting | festival-sion-2026.2510maag.workers.dev |
| IA | Claude API (claude-haiku-4-5) |
| Notificaciones | Telegram Bot |

---

## Arquitectura propuesta 2027

| Componente | Tecnología 2027 | Motivo del cambio |
|---|---|---|
| Frontend | index.html en Cloudflare Workers | Sin cambio, mínimos ajustes |
| Backend | Cloudflare Workers (expandido) | Reemplaza Apps Script, más rápido |
| Base de datos | Supabase (PostgreSQL) | Reemplaza Sheets, queries potentes |
| Autenticación | Supabase Auth | Gestión de roles real |
| Hosting | Cloudflare Workers | Sin cambio |
| IA | Claude API | Sin cambio |
| Notificaciones | Telegram Bot | Sin cambio |

**Ganancia principal:** El cuello de botella más notorio en 2026 fue la lentitud de Apps Script (3-8 segundos por llamada). Con Supabase las respuestas serán menos de 500ms.

---

## Roles de usuario

```
Super Admin (Miguel Alvarado)
├── Crear y gestionar admins
├── Configurar rubros y precios
├── Acceso total al sistema
└── Única cuenta con acceso a configuración

Admin (ej: mrojas1194, pameberta63)
├── Aprobar/rechazar comprobantes
├── Registrar egresos
├── Ver reportes completos
└── Sin acceso a configuración

Docente (María de los Ángeles Mora)
├── Solo lectura
├── Ve el estado de todos los estudiantes
└── Sin capacidad de aprobar ni rechazar
```

---

## Schema de base de datos (Supabase)

### Tabla: `admins`
```sql
CREATE TABLE admins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  rol TEXT CHECK (rol IN ('super_admin','admin','docente')) DEFAULT 'admin',
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO admins (email, nombre, rol) VALUES
  ('2510maag@gmail.com',    'Miguel Alvarado Guevara', 'super_admin'),
  ('mrojas1194@gmail.com',  'Admin 2',                 'admin'),
  ('pameberta63@gmail.com', 'Admin 3',                 'admin');
```

### Tabla: `grupos_rubros`
Agrupa actividades que se activan/desactivan juntas.
```sql
CREATE TABLE grupos_rubros (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,   -- ej: 'General', 'Presentación Artística'
  año INT NOT NULL DEFAULT 2027
);
```

### Tabla: `rubros`
Catálogo con precios diferenciados por género.
```sql
CREATE TABLE rubros (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  grupo_id UUID REFERENCES grupos_rubros(id),
  precio_nino INT,                        -- NULL = no aplica para niños
  precio_nina INT,                        -- NULL = no aplica para niñas
  descuento_hermano_monto INT DEFAULT 0,  -- monto absoluto, no porcentaje
  año INT NOT NULL DEFAULT 2027
);
```

**Ejemplo de datos:**

| Rubro | Precio Niño | Precio Niña | Nota |
|---|---|---|---|
| Bingo | ₡9,000 | ₡9,000 | |
| Camisa Festival | ₡8,000 | ₡8,000 | |
| Vestuario Pres. Artística | ₡18,000 | ₡20,000 | Niñas más caro |
| Coreógrafo | ₡5,000 | ₡5,000 | |
| Maquillaje | NULL | ₡1,000 | Solo niñas |
| Hidratación | ₡4,000 | ₡4,000 | |

### Tabla: `students`
```sql
CREATE TABLE students (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  numero INT NOT NULL,
  nombre TEXT NOT NULL,
  genero TEXT CHECK (genero IN ('niño','niña')) NOT NULL,
  tiene_hermano BOOLEAN DEFAULT FALSE,
  nombre_padres TEXT,
  año INT NOT NULL DEFAULT 2027,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Tabla: `student_rubros`
Participación individual — aquí viven las variaciones de precio.
```sql
CREATE TABLE student_rubros (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES students(id),
  rubro_id UUID REFERENCES rubros(id),
  participa BOOLEAN DEFAULT TRUE,
  precio_override INT,    -- precio especial puntual, NULL = usar catálogo
  cantidad INT DEFAULT 1,
  talla TEXT,
  UNIQUE(student_id, rubro_id)
);
```

### Tabla: `pagos`
```sql
CREATE TABLE pagos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES students(id),
  monto INT NOT NULL,
  fecha DATE NOT NULL,
  tipo TEXT CHECK (tipo IN ('abono','pago_total','abono_final')),
  comprobante_url TEXT,
  comprobante_file_id TEXT,
  banco TEXT,
  remitente TEXT,
  referencia_sinpe TEXT UNIQUE,
  score_ia INT,
  decision_ia TEXT,
  razon_score TEXT,
  estado TEXT CHECK (estado IN ('APROBADO','RECHAZADO','PENDIENTE')) DEFAULT 'APROBADO',
  aprobado_por TEXT,
  is_alternate BOOLEAN DEFAULT FALSE,
  año INT DEFAULT 2027,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Tabla: `egresos`
```sql
CREATE TABLE egresos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  concepto TEXT NOT NULL,
  categoria TEXT NOT NULL,
  monto INT NOT NULL,
  fecha DATE NOT NULL,
  comentario TEXT,
  recibo_url TEXT,
  recibo_file_id TEXT,
  registrado_por TEXT,
  año INT DEFAULT 2027,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Tabla: `historial`
```sql
CREATE TABLE historial (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  accion TEXT NOT NULL,
  student_id UUID REFERENCES students(id),
  monto INT,
  aprobador TEXT,
  detalle TEXT,
  ref_sinpe TEXT,
  año INT DEFAULT 2027,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Función de cálculo de cuota automático

```sql
CREATE OR REPLACE FUNCTION calcular_cuota(p_student_id UUID)
RETURNS INT AS $$
  SELECT COALESCE(SUM(
    CASE
      WHEN sr.precio_override IS NOT NULL
        THEN sr.precio_override
      WHEN s.genero = 'niño'
        THEN COALESCE(r.precio_nino, 0)
      WHEN s.genero = 'niña'
        THEN COALESCE(r.precio_nina, 0)
      ELSE 0
    END * sr.cantidad
    - CASE WHEN s.tiene_hermano
        THEN COALESCE(r.descuento_hermano_monto, 0)
        ELSE 0
      END
  ), 0)
  FROM student_rubros sr
  JOIN students s ON s.id = sr.student_id
  JOIN rubros r ON r.id = sr.rubro_id
  WHERE sr.student_id = p_student_id
    AND sr.participa = TRUE
    AND (
      (s.genero = 'niño' AND r.precio_nino IS NOT NULL) OR
      (s.genero = 'niña' AND r.precio_nina IS NOT NULL) OR
      sr.precio_override IS NOT NULL
    )
$$ LANGUAGE SQL;
```

---

## Lógica de negocio heredada de 2026

| Regla | Descripción |
|---|---|
| Pago total | Un solo comprobante que cubre el 100% desde cero |
| Abono final | Último abono que completa la cuota con múltiples pagos |
| Score IA ≥85% | Auto-aprobado |
| Score IA 50-84% | Pendiente de revisión manual |
| Score IA <50% | Rechazado automático (rescatable por admin) |
| SINPE alterno | 8382-3869 se acepta pero genera alerta |
| Duplicado | Referencia SINPE repetida → rechazo automático |

---

## Categorías de egresos

| Categoría | Rubro relacionado |
|---|---|
| Bingo | Bingo |
| Camisas Festival | Camisa Festival (niños + adultos + entrenador) |
| Vestuario | Vestuario Presentación Artística |
| Cuota Ventas | Cuota Ventas |
| Coreógrafo | Coreógrafo |
| Hidratación | Hidratación Partidos |
| Maquillaje | Maquillaje |
| Otros | Sin rubro asociado |

---

## Cambio principal en el código

### index.html — solo cambiar callScript()
```javascript
// 2026 — Apps Script (lento, 3-8 segundos)
async function callScript(body) {
  const resp = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    headers: {'Content-Type': 'text/plain;charset=utf-8'},
    body: JSON.stringify(body)
  });
  return resp.json();
}

// 2027 — Cloudflare Worker + Supabase (rápido, <500ms)
async function callScript(body) {
  const resp = await fetch(WORKER_URL + '/api', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(body)
  });
  return resp.json();
}
```

---

## Módulos del sistema 2027

| Módulo | Funcionalidad |
|---|---|
| **Configuración** | Rubros, precios, fechas límite, SINPE |
| **Estudiantes** | CRUD, género, hermano, participación por rubro |
| **Usuarios** | Invitar admins, asignar roles, desactivar acceso |
| **Pagos** | Subir comprobantes, análisis IA, aprobar/rechazar |
| **Egresos** | Registrar gastos, vista pública de transparencia |
| **Reportes** | Rendición de cuentas, PDF, CSV, historial |
| **Bot Telegram** | Notificaciones y comandos (sin cambios) |

---

## Checklist de migración 2027

### Enero — Preparación
- [ ] Crear proyecto en Supabase (tier gratuito)
- [ ] Ejecutar schema SQL completo
- [ ] Poblar rubros con precios 2027 actualizados
- [ ] Ingresar lista de estudiantes 2027
- [ ] Configurar roles de admin

### Febrero — Desarrollo
- [ ] Reescribir worker.js con endpoints Supabase
- [ ] Adaptar callScript() en index.html
- [ ] Migrar historial 2026 a Supabase como referencia
- [ ] Renovar/confirmar Claude API key
- [ ] Confirmar bot Telegram activo
- [ ] Pruebas con datos ficticios

### Marzo — Deploy y validación
- [ ] Deploy en Cloudflare Workers
- [ ] Pruebas completas con admins reales
- [ ] Comunicado a padres con instrucciones
- [ ] Activar triggers del bot

---

## Referencias del sistema 2026

```
Dashboard:     https://festival-sion-2026.2510maag.workers.dev
Apps Script:   https://script.google.com/macros/s/AKfycbxXgv2DY-o77pOn2NcCIYQVsKjztlP4FEl5jNv1hM8nIEiQrNYCjgCoOoaZ-gsQf76G/exec
Google Sheet:  https://docs.google.com/spreadsheets/d/1RgaOUmSA1sCaLwkApPNw1gObzOjWAauhxDQflFMkazY/edit
Drive folder:  https://drive.google.com/drive/folders/1GE9Ooshyjak2oD-C5iAQAIpKCpfYuGJa
OAuth Client:  788989901068-hs787j085opuvmocifqt4jcgtuum5vmd.apps.googleusercontent.com
Telegram bot:  @festivalSion2026_bot
Telegram chat: -1003834633524
Claude model:  claude-haiku-4-5-20251001
Sección:       1-1
Docente:       María de los Ángeles Mora
```

> ⚠️ Las API keys, tokens y client secrets deben guardarse en un gestor
> de contraseñas seguro (1Password, Bitwarden). NUNCA subirlos a GitHub.

---

## Notas técnicas de 2026

- Dos Isabellas en la sección: usar **Isabella S.** e **Isabella M.**
- Bot Telegram responde en máximo 1 minuto (polling cada 1 min)
- Comprobantes rechazados rescatables desde panel admin o `/rescatar [ID]`
- `migrarHistorial()` migra pagos pre-dashboard — ejecutar al inicio del año
- `corregirPagoTotal()` corrige checkbox de pago total en casos multi-abono
- `setupTriggers()` configura los triggers del bot — ejecutar una sola vez
