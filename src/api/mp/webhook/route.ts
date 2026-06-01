import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { PLANES_PREMIUM, savePremium } from "@/lib/data";
import type { PremiumData } from "@/lib/data";

const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN ?? "";

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

function calcularNuevoVencimiento(actualExpiresAt: string | null, dias: number): string {
  const base = actualExpiresAt && new Date(actualExpiresAt) > new Date()
    ? new Date(actualExpiresAt)
    : new Date();
  base.setDate(base.getDate() + dias);
  return base.toISOString();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const topic = body.topic ?? body.type;
    const resourceId = body.id ?? body.data?.id;
    if (!resourceId) return NextResponse.json({ ok: true });

    // ─── Payment approved ────────────────────────────────
    if (topic === "payment") {
      const res = await fetch(`https://api.mercadopago.com/v1/payments/${resourceId}`, {
        headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
      });
      if (!res.ok) return NextResponse.json({ ok: true });
      const payment = await res.json();
      if (payment.status !== "approved") return NextResponse.json({ ok: true });

      const planId = payment.external_reference ?? payment.metadata?.plan_id;
      const plan = PLANES_PREMIUM.find((p) => p.id === planId);
      if (!plan) return NextResponse.json({ ok: true });

      const payerEmail = payment.payer?.email;
      if (!payerEmail) return NextResponse.json({ ok: true });

      const { data: coach } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", payerEmail)
        .eq("role", "coach")
        .maybeSingle();
      if (!coach) return NextResponse.json({ ok: true });

      const { data: blob, originalUrl } = await readBlob(coach.id);
      const existingPremium = blob.premium as PremiumData | undefined;
      const newExpiresAt = calcularNuevoVencimiento(
        existingPremium?.premiumExpiresAt ?? null,
        plan.dias
      );

      const premium: PremiumData = {
        planId: plan.id,
        planName: plan.nombre,
        planDurationDays: plan.dias,
        planPrice: plan.precio,
        premiumExpiresAt: newExpiresAt,
        paymentStatus: "approved",
        paymentDate: new Date().toISOString(),
      };

      blob.premium = premium;
      await saveBlob(coach.id, blob, originalUrl);
      console.log(`Premium activated for ${payerEmail}: ${plan.nombre} until ${newExpiresAt}`);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("Webhook error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
