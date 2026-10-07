/**
 * Módulo EXPERIMENTAL de suscripción recurrente de Mercado Pago — helpers de servidor.
 * PRUEBA AISLADA. No toca el sistema Premium ni los endpoints /api/mp/*.
 *
 * Seguridad:
 *  - El gate se resuelve contra el usuario autenticado real (Supabase auth.getUser(token)).
 *  - Todo acceso a Supabase usa el service_role leído desde variables de entorno.
 *  - El Access Token de Mercado Pago nunca sale del servidor.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import crypto from "crypto";
import {
  EXPERIMENTAL_CURRENCY,
  esCambioProgramadoPorRef,
  planIdDesdeRef,
  planSuscripcionPorId,
  refSuscripcion,
  userIdDesdeRef,
} from "./experimental";

// ─────────────────────────── Feature flag + gate ───────────────────────────

export function moduloExperimentalHabilitado(): boolean {
  return (process.env.RECURRING_SUBSCRIPTIONS_ENABLED ?? "").trim().toLowerCase() === "true";
}

// ─────────────────────────── Clientes ───────────────────────────

export function getServiceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url || !key) return null;
  return createClient(url, key);
}

export function mpAccessToken(): string {
  return process.env.MP_ACCESS_TOKEN ?? "";
}

export function mpApiBase(): string {
  return process.env.MP_API_BASE ?? "https://api.mercadopago.com";
}

export interface UsuarioExperimental {
  id: string;
  email: string;
}

/** Gate server-side real: cualquier usuario autenticado puede usar la suscripción. */
export async function requireUsuarioExperimental(
  token: string | null | undefined
): Promise<UsuarioExperimental | null> {
  if (!token) return null;
  if (!moduloExperimentalHabilitado()) return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  if (!url || !anon) return null;
  const anonClient = createClient(url, anon);
  const { data, error } = await anonClient.auth.getUser(token);
  if (error || !data?.user) return null;
  return { id: data.user.id, email: data.user.email ?? "" };
}

// ─────────────────────────── Mercado Pago ───────────────────────────

export interface PreapprovalMP {
  id?: string;
  status?: string;
  external_reference?: string;
  current_period_start?: string | null;
  current_period_end?: string | null;
  next_payment_date?: string | null;
  last_modified?: string | null;
  payer?: { email?: string | null } | null;
  [k: string]: unknown;
}

/** Estado real de la suscripción (fuente única de verdad). */
export async function fetchPreapproval(subscriptionId: string): Promise<PreapprovalMP | null> {
  const token = mpAccessToken();
  if (!token || !subscriptionId) return null;
  try {
    const res = await fetch(`${mpApiBase()}/preapproval/${encodeURIComponent(subscriptionId)}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as PreapprovalMP;
  } catch {
    return null;
  }
}

/**
 * Crea la suscripción recurrente y devuelve el init_point alojado de Mercado Pago.
 * IMPORTANTE: `POST /preapproval` con `preapproval_plan_id` exige `card_token_id`
 * (solo sirve si tokenizás la tarjeta vos). El checkout alojado funciona con
 * `auto_recurring` + `payer_email` + `back_url` (string singular, NO back_urls).
 * El plan define importe y nombre; la cadencia es 1 mes.
 */
export async function crearPreapproval(args: {
  email: string;
  userId: string;
  origin: string;
  plan: { id: string; nombre: string; precioCobro: number };
  /** Cambio de plan: fecha ISO en el futuro en la que arranca el nuevo plan. No debita nada hoy. */
  startDate?: string | null;
}): Promise<{ ok: true; init_point: string; id: string } | { ok: false; error: string; status: number }> {
  const token = mpAccessToken();
  if (!token) return { ok: false, error: "MP_ACCESS_TOKEN no configurado", status: 500 };
  const base = args.origin.replace(/\/+$/, "");
  const autoRecurring: Record<string, unknown> = {
    frequency: 1,
    frequency_type: "months",
    transaction_amount: args.plan.precioCobro,
    currency_id: EXPERIMENTAL_CURRENCY,
  };
  // Inicio programado (cambio de plan): el cobro del plan nuevo recién arranca
  // cuando termina el período ya pagado del plan actual.
  if (args.startDate) autoRecurring.start_date = args.startDate;
  const body = {
    reason: `Viking ${args.plan.nombre} — ${args.plan.precioCobro.toLocaleString("es-AR")} ARS/mes`,
    external_reference: refSuscripcion(args.userId, args.plan.id),
    payer_email: args.email,
    back_url: `${base}/experimental/subscription?estado=ok`,
    notification_url: `${base}/api/experimental/webhook`,
    status: "pending",
    auto_recurring: autoRecurring,
  };
  try {
    const res = await fetch(`${mpApiBase()}/preapproval`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data?.message ?? data?.error?.message ?? "Error al crear la suscripción";
      return { ok: false, error: String(msg), status: 502 };
    }
    const initPoint = (data?.init_point ?? data?.sandbox_init_point) as string | undefined;
    if (!initPoint) return { ok: false, error: "Mercado Pago no devolvió init_point", status: 502 };
    return { ok: true, init_point: initPoint, id: String(data?.id ?? "") };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Error de red", status: 500 };
  }
}

export async function actualizarEstadoPreapproval(
  subscriptionId: string,
  status: "cancelled" | "paused"
): Promise<{ ok: boolean; error?: string }> {
  const token = mpAccessToken();
  if (!token || !subscriptionId) return { ok: false, error: "Falta token o subscription_id" };
  try {
    const res = await fetch(`${mpApiBase()}/preapproval/${encodeURIComponent(subscriptionId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
      cache: "no-store",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { ok: false, error: String(data?.message ?? `MP respondió ${res.status}`) };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Error de red" };
  }
}

/**
 * Resuelve el ID de la suscripción (preapproval) desde un evento
 * `subscription_authorized_payment`, cuyo data.id es el ID del PAGO autorizado
 * (numérico), no el de la suscripción (hexadecimal).
 */
export async function obtenerPreapprovalIdDePagoAutorizado(authorizedPaymentId: string): Promise<string | null> {
  const token = mpAccessToken();
  if (!token || !authorizedPaymentId) return null;
  try {
    const res = await fetch(`${mpApiBase()}/authorized_payments/${encodeURIComponent(authorizedPaymentId)}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json().catch(() => ({}));
    const preapprovalId = String(data?.preapproval_id ?? "").trim();
    return preapprovalId || null;
  } catch {
    return null;
  }
}

// ─────────────────────────── Firma del webhook ───────────────────────────

/** Validación oficial MP: manifest `id:...;request-id:...;ts:...;` + HMAC-SHA256. */
export function validarFirmaWebhook(args: {
  secret: string;
  dataId: string;
  ts: string;
  v1: string;
  requestId: string;
}): boolean {
  const manifest = `id:${args.dataId.toLowerCase()};request-id:${args.requestId.toLowerCase()};ts:${args.ts.toLowerCase()};`;
  const hmac = crypto.createHmac("sha256", args.secret);
  hmac.update(manifest);
  const esperado = hmac.digest("hex");
  const a = Buffer.from(esperado, "utf8");
  const b = Buffer.from(args.v1.toLowerCase(), "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function leerFirmaWebhook(headers: Headers, dataId: string): { ok: boolean; motivo?: string } {
  const secret = (process.env.MP_WEBHOOK_SECRET ?? "").trim();
  if (!secret) return { ok: true }; // sin secreto configurado → no se valida
  const raw = headers.get("x-signature");
  const requestId = headers.get("x-request-id") ?? "";
  if (!raw || !requestId) return { ok: false, motivo: "faltan headers de firma" };
  const partes: Record<string, string> = {};
  for (const chunk of raw.split(",")) {
    const [k, v] = chunk.split("=");
    if (k && v) partes[k.trim()] = v.trim();
  }
  if (!partes.ts || !partes.v1) return { ok: false, motivo: "firma incompleta" };
  const valido = validarFirmaWebhook({
    secret,
    dataId,
    ts: partes.ts,
    v1: partes.v1,
    requestId,
  });
  return valido ? { ok: true } : { ok: false, motivo: "firma no coincide" };
}

// ─────────────────────────── Puente suscripción → Premium ───────────────────────────

/** Plan de la suscripción según el external_reference (exp:<userId>:<planId>). */
export function planIdDesdePreapproval(mp: PreapprovalMP): string {
  return planIdDesdeRef(mp?.external_reference) ?? "viking_marca_web";
}

/**
 * PUENTE: activa el Premium de Viking a partir de una suscripción recurrente.
 *  - El vencimiento NUNCA se inventa: sale de Mercado Pago (current_period_end,
 *    o next_payment_date, o +30 días como último recurso).
 *  - Nunca acorta un Premium que ya vence más lejos (no borra planes pagados).
 *  - Solo se llama desde el webhook/sync del módulo experimental.
 */
export async function activarPremiumDesdeSuscripcion(
  client: SupabaseClient,
  userId: string,
  mp: PreapprovalMP
): Promise<{ ok: boolean; motivo?: string; premiumExpiresAt?: string }> {
  const estado = String(mp?.status ?? "").trim().toLowerCase();
  const finPeriodo = Date.parse(String(mp?.current_period_end ?? "")) || 0;
  const proximoCobro = Date.parse(String(mp?.next_payment_date ?? "")) || 0;
  const ahora = Date.now();

  // Cambio de plan programado (creado por la API con external_reference "...:prog" y
  // start_date futuro): mientras no exista un período ya PAGADO del plan nuevo, NO se
  // tocan los beneficios actuales. El plan nuevo recién se hace efectivo cuando
  // Mercado Pago registra su primer cobro (current_period_end futuro).
  const programado = esCambioProgramadoPorRef(mp?.external_reference);
  const inicioRaw = String((mp as any)?.auto_recurring?.start_date ?? "");
  const inicioProgramado = inicioRaw ? (Date.parse(inicioRaw) || 0) > ahora + 60 * 1000 : false;
  if ((programado || inicioProgramado) && !(finPeriodo > ahora)) {
    return { ok: false, motivo: "inicio_futuro_programado" };
  }

  // Regla: el Premium solo se activa si hay un período PAGADO (Mercado Pago
  // informa current_period_end), nunca si la suscripción está pendiente de pago.
  let vencimiento = 0;
  if (finPeriodo > ahora) {
    vencimiento = finPeriodo;
  } else if (estado === "active" || estado === "authorized") {
    vencimiento = proximoCobro > ahora ? proximoCobro : ahora + 30 * 24 * 60 * 60 * 1000;
  } else {
    return { ok: false, motivo: `no_pagado(${estado || "sin_estado"})` };
  }

  const plan = planSuscripcionPorId(planIdDesdePreapproval(mp)) ?? planSuscripcionPorId("viking_marca_web")!;

  const { data: profile } = await client.from("profiles").select("avatar_url").eq("id", userId).maybeSingle();
  let blob: Record<string, any> = {};
  if (profile?.avatar_url) {
    try {
      const parsed = JSON.parse(profile.avatar_url);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) blob = parsed;
    } catch {
      blob = {};
    }
  }

  const actualVencimiento = Date.parse(String(blob.premium?.premiumExpiresAt ?? 0)) || 0;
  if (actualVencimiento > vencimiento) {
    // Ya hay un Premium pagado que vence después: no lo acortamos.
    return { ok: false, motivo: "premium_posterior_no_modificado", premiumExpiresAt: String(blob.premium?.premiumExpiresAt ?? "") };
  }

  const now = new Date().toISOString();
  blob.premium = {
    planId: plan.id,
    planName: plan.nombre,
    planDurationDays: 30,
    planPrice: plan.precioMuestra,
    premiumExpiresAt: new Date(vencimiento).toISOString(),
    paymentStatus: "approved",
    paymentDate: now,
  };

  const { error } = await client.from("profiles").update({ avatar_url: JSON.stringify(blob) }).eq("id", userId);
  if (error) return { ok: false, motivo: error.message };
  return { ok: true, premiumExpiresAt: blob.premium.premiumExpiresAt };
}

// ─────────────────────────── Persistencia aislada ───────────────────────────

export const TABLA_SUSCRIPCIONES = "experimental_subscriptions";
export const TABLA_EVENTOS = "experimental_subscription_events";

/**
 * Deriva el estado desde Mercado Pago y lo escribe en la tabla experimental.
 * NO escribe Premium, NO toca profiles.avatar_url.
 * Idempotente por diseño: el estado siempre se deriva de MP (no se acumula).
 */
export async function upsertDesdePreapproval(
  client: SupabaseClient,
  mp: PreapprovalMP,
  hint?: { subscriptionId?: string | null; userId?: string | null }
): Promise<{ ok: boolean; motivo?: string; userId?: string }> {
  const subscriptionId = String(mp?.id ?? hint?.subscriptionId ?? "");
  const externalRef = String(mp?.external_reference ?? "");

  let userId = userIdDesdeRef(externalRef) ?? hint?.userId ?? null;
  if (!userId && subscriptionId) {
    const { data } = await client
      .from(TABLA_SUSCRIPCIONES)
      .select("user_id")
      .eq("subscription_id", subscriptionId)
      .maybeSingle();
    userId = data?.user_id ?? null;
  }
  if (!userId) return { ok: false, motivo: "no se pudo identificar el usuario de Viking" };

  const { data: profile } = await client
    .from("profiles")
    .select("id, email")
    .eq("id", userId)
    .maybeSingle();
  if (!profile?.id) return { ok: false, motivo: "no se encontró el perfil de Viking" };

  const plan = planSuscripcionPorId(planIdDesdeRef(externalRef)) ?? planSuscripcionPorId("viking_marca_web")!;

  const row = {
    user_id: userId,
    subscription_id: subscriptionId || null,
    payer_email: mp?.payer?.email ?? profile?.email ?? null,
    plan_name: plan.nombre,
    amount: plan.precioCobro,
    currency: EXPERIMENTAL_CURRENCY,
    status: String(mp?.status ?? "pending"),
    current_period_start: mp?.current_period_start ?? null,
    current_period_end: mp?.current_period_end ?? null,
    next_payment_date: mp?.next_payment_date ?? null,
    external_reference: externalRef || null,
    last_modified: mp?.last_modified ?? null,
    updated_at: new Date().toISOString(),
  };

  const { data: existing } = await client
    .from(TABLA_SUSCRIPCIONES)
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    const { error } = await client.from(TABLA_SUSCRIPCIONES).update(row).eq("id", existing.id);
    if (error) return { ok: false, motivo: error.message };
  } else {
    const { error } = await client
      .from(TABLA_SUSCRIPCIONES)
      .insert({ ...row, created_at: new Date().toISOString() });
    if (error) return { ok: false, motivo: error.message };
  }
  return { ok: true, userId };
}

// ─────────────────────────── Cambio de plan programado ───────────────────────────

/**
 * True cuando la suscripción fue creada como cambio de plan PROGRAMADO
 * (external_reference con sufijo `:prog`, inicio en el futuro) y todavía no comenzó
 * su período pagado. El usuario conserva su plan actual hasta esa fecha.
 * NO compara contra el plan del Premium: el Premium previo puede ser un resto de un
 * pago único y no implica ningún cambio de plan real.
 */
export function cambioDePlanEnCurso(subRow: Record<string, any> | null | undefined): boolean {
  if (!subRow?.external_reference) return false;
  const est = String(subRow.status ?? "").trim().toLowerCase();
  if (!["pending", "authorized", "active"].includes(est)) return false;
  if (!esCambioProgramadoPorRef(subRow.external_reference)) return false;
  const finPeriodo = Date.parse(String(subRow.current_period_end ?? "")) || 0;
  return !(finPeriodo > Date.now());
}