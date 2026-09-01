import { NextRequest, NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { loadOverview } from "@/lib/admin-data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  noStore();
  try {
    const data = await loadOverview();
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
