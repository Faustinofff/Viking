import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ error: "Deprecated. Usá /api/mp/create-preference" }, { status: 410 });
}
