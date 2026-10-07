import { NextRequest, NextResponse } from "next/server";
import {
  TABLA_SUSCRIPCIONES,
  activarPremiumDesdeSuscripcion,
  cambioDePlanEnCurso,
  fetchPreapproval,
  getServiceClient,
  requireUsuarioExperimental,
  upsertDesdePreapproval,
} from "@/lib/experimental-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function noStore() {
  return { "Cache-Control": "no-store, max-age=0, must-revalidate", Pragma: "no-cache" };
}

/** POST /api/experimental/subscription/sync → compara Viking contra Mercado Pago. */
export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  const user = await requireUsuarioExperimental(token);
  if (!user) return NextResponse.json({ error: "Acceso denegado" }, { status: 403, headers: noStore() });

  const client = getServiceClient();
  if (!client) {
    return NextResponse.json({ error: "Falta SUPABASE_SERVICE_ROLE_KEY" }, { status: 500, headers: noStore() });
  }

  const { data: row, error } = await client
    .from(TABLA_SUSCRIPCIONES)
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: noStore() });
  }
  if (!row?.subscription_id) {
    return NextResponse.json({ error: "Todavía no hay suscripción experimental" }, { status: 400, headers: noStore() });
  }

  const mp = await fetchPreapproval(String(row.subscription_id));
  if (!mp) {
    return NextResponse.json(
      { error: "Mercado Pago no devolvió la suscripción", subscription: row },
      { status: 502, headers: noStore() }
    );
  }

  const aplicado = await upsertDesdePreapproval(client, mp, {
    subscriptionId: String(row.subscription_id),
    userId: user.id,
  });
  if (!aplicado.ok) {
    return NextResponse.json({ error: aplicado.motivo }, { status: 500, headers: noStore() });
  }

  // Puente: si MP ya autorizó/cobró, activa o extiende el Premium.
  const premium = await activarPremiumDesdeSuscripcion(client, user.id, mp);

  const { data: fresco } = await client
    .from(TABLA_SUSCRIPCIONES)
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  // Indica si esta suscripción es un cambio de plan programado (external_reference
  // con sufijo :prog y sin período pagado todavía) para la vista correcta en la página.
  const cambioEnCurso = cambioDePlanEnCurso(fresco ?? null);

  return NextResponse.json(
    {
      ok: true,
      subscription: fresco ?? null,
      mp_status: mp.status,
      cambio_en_curso: cambioEnCurso,
      premium: premium.ok ? premium.premiumExpiresAt : premium.motivo,
    },
    { headers: noStore() }
  );
}