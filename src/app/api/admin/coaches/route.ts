import { NextRequest, NextResponse } from "next/server";
import { loadRawSnapshot, computeSnapshot } from "@/lib/admin-data";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const raw = await loadRawSnapshot();
    const computed = computeSnapshot(raw);
    return NextResponse.json({ coaches: computed.coaches });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}
