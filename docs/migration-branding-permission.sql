-- ============================================================
-- VIKING — Migración: permiso de branding por coach
-- ============================================================
-- Activa la sección "Personalización" para un coach.
-- El admin lo otorga desde /admin/personalizacion.
-- Este ALTER se debe correr una sola vez (ya aplicado = ignorar error "duplicate column").

ALTER TABLE public.profiles
  ADD COLUMN branding_enabled BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_profiles_branding_enabled ON public.profiles(branding_enabled);