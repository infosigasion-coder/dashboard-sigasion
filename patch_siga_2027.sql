-- ═══════════════════════════════════════════════════════════════
-- SIGA 2026/2027 — Parche SQL de Actualización de Esquema
-- Ejecutar en el SQL Editor de Supabase
-- ═══════════════════════════════════════════════════════════════

-- 1. Agregar columnas a la tabla admins si no existen
ALTER TABLE admins ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS debe_cambiar_pass BOOLEAN DEFAULT TRUE;

-- 2. Crear tabla para relacionar secciones con sus docentes por año
CREATE TABLE IF NOT EXISTS seccion_docentes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  seccion TEXT NOT NULL,
  año INT NOT NULL,
  docente_nombre TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(seccion, año)
);

-- 3. Insertar la docente para la sección 1-1 en el año 2026
INSERT INTO seccion_docentes (seccion, año, docente_nombre)
VALUES ('1-1', 2026, 'María de los Ángeles Mora Calvo')
ON CONFLICT (seccion, año) 
DO UPDATE SET docente_nombre = EXCLUDED.docente_nombre;

-- 4. Insertar/Actualizar administradores y docentes
-- Hash SHA-256 de 'siga2026' = '07183e774dfc9339f0ec94ca2b8511c5d935ab0369520c6bc6a3a1d260ef4fd2'

-- Miguel Alvarado Guevara (super_admin, acceso global)
UPDATE admins 
SET username = 'malvarado',
    password_hash = '07183e774dfc9339f0ec94ca2b8511c5d935ab0369520c6bc6a3a1d260ef4fd2',
    debe_cambiar_pass = TRUE
WHERE email = '2510maag@gmail.com';

-- Yuleisy Martinez (admin, sección 1-1)
UPDATE admins 
SET username = 'ymartinez',
    password_hash = '07183e774dfc9339f0ec94ca2b8511c5d935ab0369520c6bc6a3a1d260ef4fd2',
    debe_cambiar_pass = TRUE
WHERE email = 'mrojas1194@gmail.com';

-- Pamela Bertarioni (admin, sección 1-1)
UPDATE admins 
SET username = 'pbertarioni',
    password_hash = '07183e774dfc9339f0ec94ca2b8511c5d935ab0369520c6bc6a3a1d260ef4fd2',
    debe_cambiar_pass = TRUE
WHERE email = 'pameberta63@gmail.com';

-- María Mora (docente, solo ver, sección 1-1)
INSERT INTO admins (email, nombre, rol, seccion, username, password_hash, debe_cambiar_pass)
VALUES (
  'mmora@siga.com', 
  'María Mora', 
  'docente', 
  '1-1', 
  'mmora', 
  '07183e774dfc9339f0ec94ca2b8511c5d935ab0369520c6bc6a3a1d260ef4fd2', 
  TRUE
)
ON CONFLICT (email) 
DO UPDATE SET 
  nombre = EXCLUDED.nombre,
  rol = EXCLUDED.rol,
  seccion = EXCLUDED.seccion,
  username = EXCLUDED.username,
  password_hash = EXCLUDED.password_hash,
  debe_cambiar_pass = EXCLUDED.debe_cambiar_pass;

-- 5. Modificar el constraint de "tipo" en pagos para permitir devoluciones
ALTER TABLE pagos DROP CONSTRAINT IF EXISTS pagos_tipo_check;
ALTER TABLE pagos ADD CONSTRAINT pagos_tipo_check CHECK (tipo IN ('abono', 'pago_total', 'abono_final', 'devolucion'));
