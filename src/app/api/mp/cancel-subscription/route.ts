import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import type { PremiumData } from "@/lib/data";

async function readBlob(userId: string): Promise<{ data: Record<string, any>; originalUrl: string }> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("avatar_url")
    .eq("id", userId)
    .maybeSingle();
  let data: Record<string, any> = {};
  let originalUrl = "";
  if (profile?.avatar_url) {
    try {
      data = JSON.parse(profile.avatar_url);
      if (typeof data !== "object" || Array.isArray(data)) data = {};
      originalUrl = data._url ?? "";
    } catch {
      originalUrl = profile.avatar_url;
    }
  }
  return { data, originalUrl };
}

async function saveBlob(userId: string, blob: Record<string, any>, originalUrl: string) {
  if (originalUrl) blob._url = originalUrl;
  await supabase.from("profiles").update({ avatar_url: JSON.stringify(blob) }).eq("id", userId);
}

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();
    if (!userId) return NextResponse.json({ error: "Falta userId" }, { status: 400 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();
    if (profile?.role !== "coach") return NextResponse.json({ error: "Solo coaches" }, { status: 403 });

    const { data: blob, originalUrl } = await readBlob(userId);
    const premium = blob.premium as PremiumData | undefined;
    if (!premium || !premium.premiumExpiresAt || new Date(premium.premiumExpiresAt) <= new Date()) {
      return NextResponse.json({ error: "No tenés un plan premium activo" }, { status: 400 });
    }

    blob.premium = null;
    await saveBlob(userId, blob, originalUrl);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("cancel-premium error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
