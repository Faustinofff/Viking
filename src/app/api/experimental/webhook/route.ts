import { NextResponse } from "next/server";
import {
  TABLA_EVENTOS,
  TABLA_SUSCRIPCIONES,
  activarPremiumDesdeSuscripcion,
  fetchPreapproval,
  getServiceClient,
  leerFirmaWebhook,
  moduloExperimentalHabilitado,
  mpApiBase,
  mpAccessToken,
  obtenerPreapprovalIdDePagoAutorizado,
  upsertDesdePreapproval,
} from "@/lib/experimental-server";
import { esRefSuscripcion, userIdDesdeRef } from "@/lib/experimental";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function noStore() {
  return { "Cache-Control": "no-store, max-age=0, must-revalidate", Pragma: "no-cache" };
}

/**
 * Maneja eventos "payment.*" que en realidad son COBROS DE SUSCRIPCIÓN:
 * MP debita la cuota mensual → crea un pago con external_reference "exp:<userId>:<planId>".
 * No confía en el payload: consulta GET /v1/payments/{id}, exige status approved y
 * resuelve el período desde la suscripción (GET /preapproval) para renovar el Premium.
 */
async function procesarEventoPago(args: {
  eventType: string;
  action: string;
  eventoId: string;
  fechaEvento: string;
  requestId: string;
  body: any;
}): Promise<Response> {
  const client = getServiceClient();
  if (!client) {
    return NextResponse.json({ ok: true, warning: "sin_supabase" }, { headers: noStore() });
  }

  const eventKey = `${args.eventType}|${args.action}|${args.eventoId}|${args.fechaEvento}`;
  const { error: insertErr } = await client.from(TABLA_EVENTOS).insert({
    event_key: eventKey,
    subscription_id: null,
    event_type: args.eventType,
    action: args.action,
    mp_request_id: args.requestId || null,
    payload: args.body,
  });
  if (insertErr) {
    const code = (insertErr as any).code;
    if (code === "23505") {
      return NextResponse.json({ ok: true, duplicate: true }, { headers: noStore() });
    }
    return NextResponse.json({ error: insertErr.message }, { status: 500, headers: noStore() });
  }

  const token = mpAccessToken();
  let payment: any = null;
  try {
    const res = await fetch(`${mpApiBase()}/v1/payments/${encodeURIComponent(args.eventoId)}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (res.ok) payment = await res.json();
  } catch {
    payment = null;
  }
  const ref = String(payment?.external_reference ?? "");
  const aprobado = payment?.status === "approved";
  if (!payment || !aprobado || !esRefSuscripcion(ref)) {
    return NextResponse.json(
      { ok: true, ignored: "no_es_pago_de_suscripcion", payment_id: args.eventoId },
      { headers: noStore() }
    );
  }

  const userId = userIdDesdeRef(ref);
  if (!userId) {
    return NextResponse.json({ ok: true, ignored: "sin_usuario", payment_id: args.eventoId }, { headers: noStore() });
  }

  const { data: sub } = await client
    .from(TABLA_SUSCRIPCIONES)
    .select("subscription_id")
    .eq("user_id", userId)
    .maybeSingle();

  await client
    .from(TABLA_EVENTOS)
    .update({ user_id: userId })
    .eq("event_key", eventKey);

  if (!sub?.subscription_id) {
    return NextResponse.json({ ok: true, ignored: "sin_suscripcion_local", payment_id: args.eventoId }, { headers: noStore() });
  }

  const mp = await fetchPreapproval(String(sub.subscription_id));
  if (!mp) {
    return NextResponse.json(
      { ok: true, warning: "no_se_pudo_consultar_preapproval", payment_id: args.eventoId },
      { headers: noStore() }
    );
  }

  const aplicado = await upsertDesdePreapproval(client, mp, { subscriptionId: String(sub.subscription_id), userId });
  if (!aplicado.ok) {
    return NextResponse.json({ ok: true, ignored: aplicado.motivo, payment_id: args.eventoId }, { headers: noStore() });
  }

  const premium = await activarPremiumDesdeSuscripcion(client, userId, mp);
  return NextResponse.json(
    {
      ok: true,
      duplicate: false,
      payment_id: args.eventoId,
      status: mp.status,
      premium: premium.ok ? premium.premiumExpiresAt : premium.motivo,
    },
    { headers: noStore() }
  );
}

/**
 * POST /api/experimental/webhook — notificaciones de SUSCRIPCIONES de Mercado Pago.
 * Webhook NUEVO y separado. /api/mp/webhook NO se toca.
 *
 * Reglas:
 *  - No confía en el payload: consulta GET /preapproval/{id} y deriva el estado real.
 *  - Idempotente: event_key UNIQUE en la tabla de eventos.
 *  - Solo escribe experimental_subscriptions y la tabla de eventos.
 */
export async function POST(req: Request) {
  if (!moduloExperimentalHabilitado()) {
    return NextResponse.json({ ok: true, ignored: "modulo_experimental_apagado" }, { headers: noStore() });
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400, headers: noStore() });
  }

  const eventType = String(body?.type ?? body?.topic ?? "");
  const action = String(body?.action ?? "");
  const eventoId = String(body?.data?.id ?? body?.id ?? "");
  const fechaEvento = String(body?.date ?? body?.data?.date ?? "");
  const requestId = req.headers.get("x-request-id") ?? "";

  // Los cobros RECURRENTES llegan como evento "payment" (payment.created / payment.updated):
  // la suscripción cobra → MP crea un pago y avisa. Se identifica por external_reference "exp:...".
  if (/^payment/.test(eventType) && /^\d+$/.test(eventoId)) {
    return procesarEventoPago({ eventType, action, eventoId, fechaEvento, requestId, body });
  }

  // Cómo viene el ID según el evento:
  //  - topic "preapproval"        → data.id es el preapproval (hexadecimal largo).
  //  - subscription_authorized    → data.id es el PAGO autorizado (numérico).
  //  - algunos envían una URL en "resource".
  let preapprovalId = "";
  if (/^[a-f0-9]{16,}$/i.test(eventoId)) preapprovalId = eventoId;
  if (!preapprovalId) {
    const resourceUrl = String(body?.resource ?? body?.data?.resource ?? "");
    const segmento = resourceUrl.split("/").filter(Boolean).pop() ?? "";
    if (/^[a-f0-9]{16,}$/i.test(segmento)) preapprovalId = segmento;
  }
  if (!preapprovalId && eventType === "subscription_authorized_payment" && /^\d+$/.test(eventoId)) {
    preapprovalId = (await obtenerPreapprovalIdDePagoAutorizado(eventoId)) ?? "";
  }

  if (!preapprovalId) {
    return NextResponse.json({ ok: true, ignored: "sin_id_de_suscripcion", evento: eventType }, { headers: noStore() });
  }

  const firma = leerFirmaWebhook(req.headers, preapprovalId);
  if (!firma.ok) {
    return NextResponse.json({ error: `Firma inválida: ${firma.motivo}` }, { status: 401, headers: noStore() });
  }

  const client = getServiceClient();
  if (!client) {
    return NextResponse.json({ error: "Falta SUPABASE_SERVICE_ROLE_KEY" }, { status: 500, headers: noStore() });
  }

  // ── Idempotencia: misma notificación → mismo event_key → se ignora ──
  const eventKey = `${eventType}|${action}|${preapprovalId}|${fechaEvento}`;
  const { error: insertErr } = await client.from(TABLA_EVENTOS).insert({
    event_key: eventKey,
    subscription_id: preapprovalId,
    event_type: eventType,
    action,
    mp_request_id: requestId || null,
    payload: body,
  });
  if (insertErr) {
    const code = (insertErr as any).code;
    if (code === "23505") {
      return NextResponse.json({ ok: true, duplicate: true }, { headers: noStore() });
    }
    return NextResponse.json(
      { error: `No se pudo registrar el evento: ${insertErr.message}` },
      { status: 500, headers: noStore() }
    );
  }

  // ── Estado real desde Mercado Pago ──
  const mp = await fetchPreapproval(preapprovalId);
  if (!mp) {
    return NextResponse.json(
      { ok: true, warning: "no_se_pudo_consultar_preapproval", subscription_id: preapprovalId },
      { headers: noStore() }
    );
  }

  const { data: previa } = await client
    .from(TABLA_SUSCRIPCIONES)
    .select("user_id")
    .eq("subscription_id", preapprovalId)
    .maybeSingle();

  const aplicado = await upsertDesdePreapproval(client, mp, {
    subscriptionId: preapprovalId,
    userId: previa?.user_id ?? null,
  });

  await client
    .from(TABLA_EVENTOS)
    .update({ user_id: aplicado.userId ?? previa?.user_id ?? null })
    .eq("event_key", eventKey);

  if (!aplicado.ok) {
    return NextResponse.json(
      { ok: true, ignored: aplicado.motivo, subscription_id: preapprovalId },
      { headers: noStore() }
    );
  }

  // Puente: MP ya cobró / renovó → activamos el Premium hasta current_period_end.
  const premium = await activarPremiumDesdeSuscripcion(client, aplicado.userId!, mp);

  return NextResponse.json(
    {
      ok: true,
      duplicate: false,
      subscription_id: preapprovalId,
      status: mp.status,
      premium: premium.ok ? premium.premiumExpiresAt : premium.motivo,
    },
    { headers: noStore() }
  );
}