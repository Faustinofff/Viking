import { NextRequest, NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { getAdminClient } from "@/lib/admin";

function noStoreHeaders(): Record<string, string> {
  return {
    "Cache-Control": "no-store, max-age=0, must-revalidate",
    Pragma: "no-cache",
    Expires: "0",
  };
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Lista los coaches con su permiso de branding (quién puede personalizar la app). */
export async function GET() {
  noStore();
  try {
    const client = getAdminClient();
    const { data, error } = await client
      .from("profiles")
      .select("id, email, display_name, branding_enabled, created_at")
      .eq("role", "coach")
      .order("created_at", { ascending: false });
    if (error) throw error;
    const coaches = (data ?? []).map((p: any) => ({
      id: p.id,
      email: p.email,
      display_name: p.display_name ?? p.email ?? p.id,
      branding_enabled: p.branding_enabled === true,
      created_at: p.created_at,
    }));
    return NextResponse.json({ coaches }, { headers: noStoreHeaders() });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err), coaches: [] }, { status: 500, headers: noStoreHeaders() });
  }
}

/** Otorga o revoca el permiso de branding a un coach. */
export async function POST(req: NextRequest) {
  noStore();
  try {
    const { coachId, enabled } = await req.json();
    if (!coachId || typeof enabled !== "boolean") {
      return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400, headers: noStoreHeaders() });
    }

    const client = getAdminClient();
    const { data: profile, error: fetchErr } = await client
      .from("profiles")
      .select("id, role")
      .eq("id", coachId)
      .single();
    if (fetchErr || !profile) {
      return NextResponse.json({ error: "Coach no encontrado" }, { status: 404, headers: noStoreHeaders() });
    }
    if (profile.role !== "coach") {
      return NextResponse.json({ error: "El permiso de branding solo se asigna a coaches." }, { status: 400, headers: noStoreHeaders() });
    }

    const { error: updateErr } = await client
      .from("profiles")
      .update({ branding_enabled: enabled })
      .eq("id", coachId);
    if (updateErr) throw updateErr;

    return NextResponse.json(
      { success: true, coachId, branding_enabled: enabled },
      { headers: noStoreHeaders() }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500, headers: noStoreHeaders() });
  }
}