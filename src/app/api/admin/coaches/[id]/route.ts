import { NextRequest, NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { loadCoachDetail } from "@/lib/admin-data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  noStore();
  try {
    const id = params.id;
    if (!id) {
      return NextResponse.json({ error: "Falta id" }, { status: 400, headers: noStoreHeaders() });
    }
    const data = await loadCoachDetail(id);
    if (!data) {
      return NextResponse.json({ error: "Coach no encontrado" }, { status: 404, headers: noStoreHeaders() });
    }
    return NextResponse.json(data, { headers: noStoreHeaders() });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500, headers: noStoreHeaders() });
  }
}

function noStoreHeaders(): Record<string, string> {
  return {
    "Cache-Control": "no-store, max-age=0, must-revalidate",
    Pragma: "no-cache",
    Expires: "0",
  };
}
