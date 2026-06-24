-- ═══════════════════════════════════════════════════════════════
-- SIGA 2026/2027 — Actualización de Esquema para Soporte SINPE por Sección
-- Ejecutar en el SQL Editor de Supabase
-- ═══════════════════════════════════════════════════════════════

-- Agregar columnas de SINPE a la tabla seccion_docentes
ALTER TABLE seccion_docentes ADD COLUMN IF NOT EXISTS sinpe_principal TEXT;
ALTER TABLE seccion_docentes ADD COLUMN IF NOT EXISTS sinpe_secundario TEXT;
ALTER TABLE seccion_docentes ADD COLUMN IF NOT EXISTS sinpe_titular TEXT;

-- Opcional: Actualizar la sección 1-1 actual con su SINPE de prueba por defecto
UPDATE seccion_docentes 
SET sinpe_principal = '70228161',
    sinpe_secundario = '83823869',
    sinpe_titular = 'Asociación de Padres Sección 1-1'
WHERE seccion = '1-1' AND año = 2026;
