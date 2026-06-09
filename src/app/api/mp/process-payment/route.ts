import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { PLANES_PREMIUM } from "@/lib/data";
import type { PremiumData } from "@/lib/data";

const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN ?? "";

function calcularNuevoVencimiento(actualExpiresAt: string | null, dias: number): string {
  const base = actualExpiresAt && new Date(actualExpiresAt) > new Date()
    ? new Date(actualExpiresAt)
    : new Date();
  base.setDate(base.getDate() + dias);
  return base.toISOString();
}

export async function POST(req: Request) {
  try {
    if (!MP_ACCESS_TOKEN) {
      return NextResponse.json({ error: "MP no configurado" }, { status: 500 });
    }

    const { token, payment_method_id, transaction_amount, installments, issuer_id, plan_id, email } = await req.json();
    if (!token || !transaction_amount || !plan_id || !email) {
      return NextResponse.json({ error: "Faltan datos del pago" }, { status: 400 });
    }

    const plan = PLANES_PREMIUM.find((p) => p.id === plan_id);
    if (!plan) {
      return NextResponse.json({ error: "Plan no válido" }, { status: 400 });
    }

    const body: Record<string, any> = {
      token,
      payment_method_id,
      transaction_amount,
      installments: installments ?? 1,
      issuer_id,
      description: `Plan ${plan.nombre} - FitVerse`,
      external_reference: plan_id,
      binary_mode: true,
      notification_url: process.env.NEXT_PUBLIC_WEBHOOK_URL || `${req.headers.get("origin") ?? ""}/api/mp/webhook`,
    };

    const res = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("MP payment error:", data);
      return NextResponse.json({ error: "Error al procesar el pago" }, { status: 502 });
    }

    if (data.status === "approved") {
      const { data: coach } = await supabase
        .from("profiles")
        .select("id, avatar_url")
        .eq("email", email)
        .eq("role", "coach")
        .maybeSingle();

      if (coach) {
        let blob: Record<string, any> = {};
        let originalUrl = "";
        if (coach.avatar_url) {
          try {
            blob = JSON.parse(coach.avatar_url);
            if (typeof blob !== "object" || Array.isArray(blob)) blob = {};
            originalUrl = blob._url ?? "";
          } catch {
            originalUrl = coach.avatar_url;
          }
        }

        const existingPremium = blob.premium as PremiumData | undefined;
        const newExpiresAt = calcularNuevoVencimiento(existingPremium?.premiumExpiresAt ?? null, plan.dias);

        blob.premium = {
          planId: plan.id,
          planName: plan.nombre,
          planDurationDays: plan.dias,
          planPrice: plan.precio,
          premiumExpiresAt: newExpiresAt,
          paymentStatus: "approved",
          paymentDate: new Date().toISOString(),
        } as PremiumData;

        if (originalUrl) blob._url = originalUrl;
        await supabase.from("profiles").update({ avatar_url: JSON.stringify(blob) }).eq("id", coach.id);
      }
    }

    return NextResponse.json({ status: data.status, detail: data.status_detail });
  } catch (e: any) {
    console.error("process-payment error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
