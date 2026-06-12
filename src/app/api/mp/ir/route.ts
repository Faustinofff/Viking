import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "Falta parámetro url" }, { status: 400 });
  }
  return NextResponse.redirect(url, 302);
}
