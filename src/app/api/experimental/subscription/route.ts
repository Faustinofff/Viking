import { NextRequest, NextResponse } from "next/server";
import {
  EXPERIMENTAL_CURRENCY,
  PLANES_SUSCRIPCION,
  planIdDesdeRef,
  planSuscripcionPorId,
  refSuscripcion,
} from "@/lib/experimental";
import {
  TABLA_SUSCRIPCIONES,
  actualizarEstadoPreapproval,
  cambioDePlanEnCurso,
  crearPreapproval,
  getServiceClient,
  moduloExperimentalHabilitado,
  mpAccessToken,
  requireUsuarioExperimental,
} from "@/lib/experimental-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function noStore() {
  return {
    "Cache-Control": "no-store, max-age=0, must-revalidate",
    Pragma: "no-cache",
  };
}

function accesoDenegado() {
  return NextResponse.json({ error: "Acceso denegado" }, { status: 403, headers: noStore() });
}

function origenDe(req: NextRequest): string {
  return (
    req.headers.get("origin") ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "https://viking-web-beta.vercel.app"
  ).replace(/\/+$/, "");
}

const info = { planes: PLANES_SUSCRIPCION, currency: EXPERIMENTAL_CURRENCY };

/** GET /api/experimental/subscription → estado guardado de la prueba. */
export async function GET(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  const user = await requireUsuarioExperimental(token);
  if (!user) return accesoDenegado();

  const client = getServiceClient();
  if (!client) {
    return NextResponse.json(
      { error: "Falta SUPABASE_SERVICE_ROLE_KEY en el servidor" },
      { status: 500, headers: noStore() }
    );
  }

  const { data, error } = await client
    .from(TABLA_SUSCRIPCIONES)
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: `No se pudo leer la tabla experimental: ${error.message}` },
      { status: 500, headers: noStore() }
    );
  }

  // El vencimiento del Premium activo por esta suscripción (para mostrárselo al usuario).
  let premiumHasta: string | null = null;
  let premiumBlob: Record<string, any> = {};
  const { data: profile } = await client.from("profiles").select("avatar_url").eq("id", user.id).maybeSingle();
  if (profile?.avatar_url) {
    try {
      const parsed = JSON.parse(profile.avatar_url);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) premiumBlob = parsed;
    } catch {
      premiumBlob = {};
    }
  }
  premiumHasta = premiumBlob?.premium?.premiumExpiresAt ?? null;

  const cambioEnCurso = cambioDePlanEnCurso(data ?? null);

  return NextResponse.json(
    {
      subscription: data ?? null,
      plan: info,
      premium: premiumHasta,
      plan_id: premiumBlob?.premium?.planId ?? null,
      cambio_en_curso: cambioEnCurso,
      habilitado: moduloExperimentalHabilitado(),
      mp_configurado: !!mpAccessToken(),
    },
    { headers: noStore() }
  );
}

/** POST /api/experimental/subscription → crea el preapproval en Mercado Pago. */
export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  const user = await requireUsuarioExperimental(token);
  if (!user) return accesoDenegado();

  // El email de la cuenta de Mercado Pago con la que el cliente va a pagar.
  // Obligatorio y editable: NO puede ser solo el email de Viking (chocaría si el
  // cliente paga desde otra cuenta de MP).
  let payerEmail = "";
  let planId = "";
  try {
    const body: any = await req.json().catch(() => ({}));
    payerEmail = String(body?.payer_email ?? "").trim().toLowerCase();
    planId = String(body?.plan_id ?? "").trim().toLowerCase();
  } catch {
    payerEmail = "";
    planId = "";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payerEmail)) {
    return NextResponse.json(
      { error: "Ingresá el email de tu cuenta de Mercado Pago para continuar." },
      { status: 400, headers: noStore() }
    );
  }
  const plan = planSuscripcionPorId(planId);
  if (!plan) {
    return NextResponse.json({ error: "Seleccioná un plan válido." }, { status: 400, headers: noStore() });
  }

  const client = getServiceClient();
  if (!client) {
    return NextResponse.json(
      { error: "Falta SUPABASE_SERVICE_ROLE_KEY en el servidor" },
      { status: 500, headers: noStore() }
    );
  }

  const { data: existente } = await client
    .from(TABLA_SUSCRIPCIONES)
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  const estadoActual = String(existente?.status ?? "").trim().toLowerCase();
  const activa = estadoActual === "active" || estadoActual === "authorized";
  const planActualId = planIdDesdeRef(existente?.external_reference ?? "");
  const mismoPlan = !!planActualId && planActualId === plan.id;

  // Ya tiene una suscripción ACTIVA para ESTE plan: no creamos otra ni duplicamos el cobro.
  if (activa && mismoPlan) {
    return NextResponse.json(
      { error: `Ya estás suscrito al plan ${plan.nombre}.`, subscription: existente },
      { status: 409, headers: noStore() }
    );
  }

  // CAMBIO DE PLAN (Opción 1, programada): conserva una suscripción activa y elige
  // otro plan. El plan actual sigue hasta el próximo cobro ya pagado; el nuevo
  // plan arranca EN ESA FECHA con su precio (start_date futuro). Hoy no debita nada.
  let startDate: string | null = null;
  let cambioDePlan = false;
  if (activa && planActualId && !mismoPlan && existente?.subscription_id) {
    cambioDePlan = true;
    startDate =
      String(existente.next_payment_date ?? "") ||
      String(existente.current_period_end ?? "") ||
      null;
  }

  const creado = await crearPreapproval({
    email: payerEmail,
    userId: user.id,
    origin: origenDe(req),
    plan: { id: plan.id, nombre: plan.nombre, precioCobro: plan.precioCobro },
    startDate: cambioDePlan ? startDate : null,
  });

  if (!creado.ok) {
    return NextResponse.json({ error: creado.error }, { status: creado.status, headers: noStore() });
  }

  // Se da de baja la suscripción en curso (también la del plan viejo en un cambio)
  // para que Mercado Pago NUNCA cobre los dos planes. Va DESPUÉS de crear la nueva:
  // si MP rechaza la creación, el usuario conserva su plan actual intacto.
  if (existente?.subscription_id) {
    await actualizarEstadoPreapproval(existente.subscription_id, "cancelled").catch(() => undefined);
  }

  const ahora = new Date().toISOString();
  const row: Record<string, any> = {
    user_id: user.id,
    subscription_id: creado.id || null,
    payer_email: payerEmail,
    plan_name: plan.nombre,
    amount: plan.precioCobro,
    currency: EXPERIMENTAL_CURRENCY,
status: "pending",
    external_reference: refSuscripcion(user.id, plan.id, cambioDePlan),
    created_at: ahora,
    updated_at: ahora,
  };

  const { error: guardado } = existente
    ? await client.from(TABLA_SUSCRIPCIONES).update(row).eq("user_id", user.id)
    : await client.from(TABLA_SUSCRIPCIONES).insert(row);
  if (guardado) {
    console.error("[experimental] no se pudo guardar la suscripción:", guardado.message);
    return NextResponse.json(
      { error: "No pudimos guardar tu suscripción. Intentá de nuevo en un momento." },
      { status: 500, headers: noStore() }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      init_point: creado.init_point,
      subscription_id: creado.id,
      cambio: cambioDePlan,
      inicio: startDate,
    },
    { headers: noStore() }
  );
}