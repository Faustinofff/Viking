-- ============================================================
-- VIKING — Migración: permiso de página web por coach
-- ============================================================
-- Activa la sección "Página web" (landing pública /l/<slug>) para un coach.
-- El admin lo otorga desde /admin/pagina-web.
-- Este ALTER se debe correr una sola vez (ya aplicado = ignorar error "duplicate column").

ALTER TABLE public.profiles
  ADD COLUMN pagina_web_enabled BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_profiles_pagina_web_enabled ON public.profiles(pagina_web_enabled);