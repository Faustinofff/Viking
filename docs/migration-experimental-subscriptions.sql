-- ============================================================
-- Viking — MIGRACIÓN: suscripción recurrente EXPERIMENTAL (PRUEBA)
-- ============================================================
-- Objetivo: probar una suscripción real de Mercado Pago ($15 ARS/mes)
--           para UN único usuario (configurado por env), de forma AISLADA.
--
-- GARANTÍAS DE AISLAMIENTO:
--   1) No modifica ninguna tabla del sistema Premium.
--   2) No modifica profiles.avatar_url (donde vive PremiumData).
--   3) RLS habilitado SIN policies → solo el service_role (backend) accede.
--      El frontend nunca lee/escribe estas tablas directamente.
--   4) El estado siempre se deriva de Mercado Pago (GET /preapproval/{id});
--      esta tabla es un espejo, no una fuente de verdad.
--
-- CÓMO APLICAR: pegar y ejecutar en Supabase → SQL Editor → Run.
-- ============================================================

-- ── Suscripción experimental (una fila por usuario de prueba) ──
CREATE TABLE IF NOT EXISTS public.experimental_subscriptions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subscription_id       TEXT UNIQUE,
  payer_email           TEXT,
  plan_name             TEXT,
  amount                NUMERIC(12, 2),
  currency              TEXT,
  status                TEXT,  -- pending | authorized | active | paused | with_expiration | cancelled
  current_period_start  TIMESTAMPTZ,
  current_period_end    TIMESTAMPTZ,
  next_payment_date     TIMESTAMPTZ,
  external_reference    TEXT,  -- exp:<viking_user_id>
  last_modified         TIMESTAMPTZ,  -- last_modified informado por Mercado Pago
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT experimental_subscriptions_user_id_key UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_experimental_subscriptions_status
  ON public.experimental_subscriptions (status);

-- ── Eventos recibidos del webhook (idempotencia por event_key) ──
CREATE TABLE IF NOT EXISTS public.experimental_subscription_events (
  id                BIGSERIAL PRIMARY KEY,
  event_key         TEXT NOT NULL UNIQUE,  -- type|action|preapproval_id|fecha → deduplica reintentos de MP
  subscription_id   TEXT,
  user_id           UUID,
  event_type        TEXT,
  action            TEXT,
  mp_request_id     TEXT,
  payload           JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_experimental_events_subscription
  ON public.experimental_subscription_events (subscription_id);

-- ── RLS: sin policies a propósito. Solo service_role puede leer/escribir. ──
ALTER TABLE public.experimental_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experimental_subscription_events ENABLE ROW LEVEL SECURITY;

-- Si las tablas ya existían con policies abiertas, se limpian:
DROP POLICY IF EXISTS "experimental_subscriptions_public" ON public.experimental_subscriptions;
DROP POLICY IF EXISTS "experimental_events_public" ON public.experimental_subscription_events;