import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { PLANES_PREMIUM } from "@/lib/data";
import type { PremiumData } from "@/lib/data";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: "Email requerido" }, { status: 400 });

    const { data: coach } = await supabase
      .from("profiles")
      .select("id, email, avatar_url")
      .eq("email", email)
      .eq("role", "coach")
      .maybeSingle();
    if (!coach) return NextResponse.json({ error: "Coach no encontrado" }, { status: 404 });

    const plan = PLANES_PREMIUM.find((p) => p.id === "prueba");
    if (!plan) return NextResponse.json({ error: "Plan no encontrado" }, { status: 500 });

    let data: Record<string, any> = {};
    let originalUrl = "";
    if (coach.avatar_url) {
      try {
        data = JSON.parse(coach.avatar_url);
        if (typeof data !== "object" || Array.isArray(data)) data = {};
        originalUrl = data._url ?? "";
      } catch {
        originalUrl = coach.avatar_url;
      }
    }

    const existingPremium = data.premium as PremiumData | undefined;
    const base = existingPremium?.premiumExpiresAt && new Date(existingPremium.premiumExpiresAt) > new Date()
      ? new Date(existingPremium.premiumExpiresAt)
      : new Date();
    base.setDate(base.getDate() + plan.dias);

    const premium: PremiumData = {
      planId: plan.id,
      planName: plan.nombre,
      planDurationDays: plan.dias,
      planPrice: plan.precio,
      premiumExpiresAt: base.toISOString(),
      paymentStatus: "approved",
      paymentDate: new Date().toISOString(),
    };

    data.premium = premium;
    if (originalUrl) data._url = originalUrl;
    await supabase.from("profiles").update({ avatar_url: JSON.stringify(data) }).eq("id", coach.id);

    return NextResponse.json({ ok: true, email, premium });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
