import { NextRequest, NextResponse } from "next/server";
import {
  TABLA_SUSCRIPCIONES,
  actualizarEstadoPreapproval,
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

/** POST /api/experimental/subscription/cancel → PUT /preapproval/{id} {status:"cancelled"}. */
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
    return NextResponse.json({ error: "No hay suscripción experimental que cancelar" }, { status: 400, headers: noStore() });
  }

  const subscriptionId = String(row.subscription_id);
  const resultado = await actualizarEstadoPreapproval(subscriptionId, "cancelled");
  if (!resultado.ok) {
    return NextResponse.json({ error: resultado.error }, { status: 502, headers: noStore() });
  }

  const mp = await fetchPreapproval(subscriptionId);
  if (mp) {
    await upsertDesdePreapproval(client, mp, { subscriptionId, userId: user.id });
  }

  const { data: fresco } = await client
    .from(TABLA_SUSCRIPCIONES)
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  let premiumHasta: string | null = null;
  const { data: profile } = await client.from("profiles").select("avatar_url").eq("id", user.id).maybeSingle();
  if (profile?.avatar_url) {
    try {
      const blob = JSON.parse(profile.avatar_url);
      premiumHasta = blob?.premium?.premiumExpiresAt ?? null;
    } catch {
      premiumHasta = null;
    }
  }

  return NextResponse.json(
    { ok: true, subscription: fresco ?? null, premium: premiumHasta },
    { headers: noStore() }
  );
}