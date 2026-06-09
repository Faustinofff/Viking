import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { PLANES_PREMIUM } from "@/lib/data";
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

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const externalRef = url.searchParams.get("external_reference") || "";
    const paymentId = url.searchParams.get("payment_id");
    const status = url.searchParams.get("status");

    let redirectUrl = `/dashboard/planes-premium?ok=true`;

    // Extract coachId and planId from external_reference (format: coachId:planId)
    const parts = externalRef.split(":");
    const coachId = parts.length >= 2 ? parts[0] : null;
    const planId = parts.length >= 2 ? parts.slice(1).join(":") : externalRef;

    const plan = PLANES_PREMIUM.find((p) => p.id === planId);

    if (coachId && plan && status === "approved") {
      const { data: blob, originalUrl } = await readBlob(coachId);
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
      await saveBlob(coachId, blob, originalUrl);
      console.log(`Confirm-payment: Premium activated for coach ${coachId}: ${plan.nombre} until ${newExpiresAt}`);
    } else if (coachId && plan && paymentId) {
      // Verify payment with MP API as fallback
      try {
        const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
          headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
        });
        if (res.ok) {
          const payment = await res.json();
          if (payment.status === "approved") {
            const { data: blob, originalUrl } = await readBlob(coachId);
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
            await saveBlob(coachId, blob, originalUrl);
            console.log(`Confirm-payment (MP verify): Premium activated for coach ${coachId}: ${plan.nombre} until ${newExpiresAt}`);
          }
        }
      } catch (e) {
        console.error("Confirm-payment verification error:", e);
      }
    }

    return Response.redirect(new URL(redirectUrl, url.origin), 302);
  } catch (e: any) {
    console.error("confirm-payment error:", e);
    return Response.redirect(new URL("/dashboard/planes-premium?ok=false", req.url), 302);
  }
}
