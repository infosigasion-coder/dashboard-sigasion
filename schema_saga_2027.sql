-- ═══════════════════════════════════════════════════════════════
-- SIGA (Sistema Inteligente de Gestión de Actividades) — 2026/2027
-- Script SQL para base de datos Supabase (PostgreSQL)
-- ═══════════════════════════════════════════════════════════════

-- 1. Crear tabla de administradores con soporte multi-sección
CREATE TABLE admins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  rol TEXT CHECK (rol IN ('super_admin','admin','docente')) DEFAULT 'admin',
  seccion TEXT, -- NULL = Acceso total (todas las secciones). Ej: '1-1' = Solo ve esa sección.
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Registrar administradores iniciales
-- Miguel Alvarado tiene acceso global (seccion = NULL)
-- Los otros administradores están asignados a la sección '1-1' como ejemplo
INSERT INTO admins (email, nombre, rol, seccion) VALUES
  ('2510maag@gmail.com',    'Miguel Alvarado Guevara', 'super_admin', NULL),
  ('mrojas1194@gmail.com',  'Yuleisy Martinez',        'admin',       '1-1'),
  ('pameberta63@gmail.com', 'Pamela Bertarioni',       'admin',       '1-1');

-- 2. Crear tabla de actividades (Festival, Día de la Madre, etc.)
CREATE TABLE actividades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  tipo TEXT CHECK (tipo IN ('compleja','simple')) DEFAULT 'simple',
  seccion TEXT, -- NULL = Global. Ej: '1-1' = Exclusivo de una sección.
  año INT NOT NULL,
  activa BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(nombre, año)
);

-- 3. Crear tabla de grupos de rubros (para organizar conceptos de cobro)
CREATE TABLE grupos_rubros (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  actividad_id UUID REFERENCES actividades(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  seccion TEXT, -- NULL = Global. Ej: '1-1' = Exclusivo de esa sección.
  año INT NOT NULL
);

-- 4. Crear tabla de catálogo de rubros (precios)
CREATE TABLE rubros (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  actividad_id UUID REFERENCES actividades(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  grupo_id UUID REFERENCES grupos_rubros(id) ON DELETE SET NULL,
  precio_nino INT,
  precio_nina INT,
  descuento_hermano_monto INT DEFAULT 0,
  seccion TEXT, -- NULL = Global. Ej: '1-1' = Exclusivo de esa sección.
  año INT NOT NULL
);

-- 5. Crear tabla de estudiantes (con cédula y fecha de nacimiento)
CREATE TABLE students (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  numero INT NOT NULL,                     -- Número de lista
  nombre TEXT NOT NULL,
  cedula TEXT,                             -- Número de identificación
  fecha_nacimiento DATE,                   -- Fecha de nacimiento
  genero TEXT CHECK (genero IN ('niño','niña')) NOT NULL,
  tiene_hermano BOOLEAN DEFAULT FALSE,
  nombre_padre TEXT,                       -- Nombre de encargado 1 (Padre)
  nombre_madre TEXT,                       -- Nombre de encargado 2 (Madre)
  nombre_padres TEXT,                      -- Campo combinado histórico (retrocompatibilidad)
  seccion TEXT NOT NULL,                   -- Ej. '1-1', '2-1', etc.
  año INT NOT NULL,                        -- Año lectivo
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Crear tabla de participación de estudiantes en rubros (para overrides y exclusiones)
CREATE TABLE student_rubros (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  rubro_id UUID REFERENCES rubros(id) ON DELETE CASCADE,
  participa BOOLEAN DEFAULT TRUE,
  precio_override INT,
  cantidad INT DEFAULT 1,
  talla TEXT,
  UNIQUE(student_id, rubro_id)
);

-- 7. Crear tabla de pagos (comprobantes SINPE)
CREATE TABLE pagos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  actividad_id UUID REFERENCES actividades(id) ON DELETE CASCADE,
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
  estado TEXT CHECK (estado IN ('APROBADO','RECHAZADO','PENDIENTE')) DEFAULT 'PENDIENTE',
  aprobado_por TEXT,
  is_alternate BOOLEAN DEFAULT FALSE,
  año INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Crear tabla de egresos (gastos)
CREATE TABLE egresos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  actividad_id UUID REFERENCES actividades(id) ON DELETE CASCADE,
  concepto TEXT NOT NULL,
  categoria TEXT NOT NULL,
  monto INT NOT NULL,
  fecha DATE NOT NULL,
  comentario TEXT,
  recibo_url TEXT,
  recibo_file_id TEXT,
  registrado_por TEXT,
  seccion TEXT, -- NULL = Gasto global. Ej: '1-1' = Gasto cargado a esa sección.
  año INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Crear tabla de historial de auditoría
CREATE TABLE historial (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  actividad_id UUID REFERENCES actividades(id) ON DELETE SET NULL,
  accion TEXT NOT NULL,
  student_id UUID REFERENCES students(id) ON DELETE SET NULL,
  seccion TEXT, -- Sección asociada a la acción
  monto INT,
  aprobador TEXT,
  detalle TEXT,
  ref_sinpe TEXT,
  año INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Función plpgsql para calcular la cuota del estudiante dinámicamente por actividad
CREATE OR REPLACE FUNCTION calcular_cuota(p_student_id UUID, p_actividad_id UUID)
RETURNS INT AS $$
DECLARE
  v_tipo TEXT;
  v_cuota INT;
BEGIN
  -- Obtener el tipo de la actividad
  SELECT tipo INTO v_tipo FROM actividades WHERE id = p_actividad_id;
  
  IF v_tipo = 'simple' THEN
    -- Para actividades de cuota simple, sumar el precio del rubro de la actividad (aplicando overrides)
    SELECT COALESCE(SUM(
      CASE 
        WHEN sr.precio_override IS NOT NULL THEN sr.precio_override
        ELSE (CASE WHEN s.genero = 'niño' THEN COALESCE(r.precio_nino, 0) ELSE COALESCE(r.precio_nina, 0) END)
      END * COALESCE(sr.cantidad, 1)
    ), 0) INTO v_cuota
    FROM rubros r
    CROSS JOIN students s
    LEFT JOIN student_rubros sr ON sr.rubro_id = r.id AND sr.student_id = s.id
    WHERE s.id = p_student_id
      AND r.actividad_id = p_actividad_id
      AND (sr.participa IS NULL OR sr.participa = TRUE);
      
  ELSE
    -- Para actividades complejas (como el festival) con múltiples rubros y descuentos
    SELECT COALESCE(SUM(
      CASE
        WHEN sr.precio_override IS NOT NULL
          THEN sr.precio_override
        WHEN s.genero = 'niño'
          THEN COALESCE(r.precio_nino, 0)
        WHEN s.genero = 'niña'
          THEN COALESCE(r.precio_nina, 0)
        ELSE 0
      END * COALESCE(sr.cantidad, 1)
      - CASE WHEN s.tiene_hermano
          THEN COALESCE(r.descuento_hermano_monto, 0)
          ELSE 0
        END
    ), 0) INTO v_cuota
    FROM rubros r
    CROSS JOIN students s
    LEFT JOIN student_rubros sr ON sr.rubro_id = r.id AND sr.student_id = s.id
    WHERE s.id = p_student_id
      AND r.actividad_id = p_actividad_id
      AND (sr.participa IS NULL OR sr.participa = TRUE)
      AND (
        (s.genero = 'niño' AND r.precio_nino IS NOT NULL) OR
        (s.genero = 'niña' AND r.precio_nina IS NOT NULL) OR
        sr.precio_override IS NOT NULL
      );
  END IF;
  
  RETURN v_cuota;
END;
$$ LANGUAGE plpgsql;
