import { NextResponse } from "next/server";
import { PLANES_PREMIUM } from "@/lib/data";

const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN ?? "";

export async function POST(req: Request) {
  try {
    if (!MP_ACCESS_TOKEN) {
      return NextResponse.json({ error: "MP_ACCESS_TOKEN no configurado" }, { status: 500 });
    }

    const { planId, coachId, months } = await req.json();
    const plan = PLANES_PREMIUM.find((p) => p.id === planId);
    if (!plan) {
      return NextResponse.json({ error: "Plan no válido" }, { status: 400 });
    }

    const mesesRaw = Number.isInteger(months) ? Number(months) : 1;
    const meses = Math.min(Math.max(mesesRaw, 1), 36);
    const precioTotal = plan.precio * meses;
    const diasTotales = plan.dias * meses;

    const origin = req.headers.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://viking-web-beta.vercel.app";
    const isDev = origin.includes("localhost") || process.env.NODE_ENV === "development";

    const externalRef = coachId ? `${coachId}:${planId}` : planId;

    const successUrl = `${origin}/api/mp/confirm-payment?external_reference=${externalRef}&months=${meses}`;
    const failureUrl = `${origin}/dashboard/planes-premium?ok=false`;
    const pendingUrl = `${origin}/dashboard/planes-premium?ok=pending`;

    const body: Record<string, any> = {
      items: [{
        title: `Plan ${plan.nombre} - FitVerse`,
        description: `Acceso premium por ${meses} ${meses === 1 ? "mes" : "meses"}`,
        quantity: meses,
        currency_id: "ARS",
        unit_price: plan.precio,
      }],
      back_urls: {
        success: successUrl,
        failure: failureUrl,
        pending: pendingUrl,
      },
      auto_return: "approved",
      binary_mode: true,
      external_reference: externalRef,
      metadata: {
        plan_id: plan.id,
        plan_name: plan.nombre,
        plan_duration_days: diasTotales,
        plan_price: precioTotal,
        months: meses,
      },
    };

    const webhookUrl = `${origin}/api/mp/webhook`;
    body.notification_url = webhookUrl;

    if (isDev) {
      body.back_urls.success = "https://www.mercadopago.com.ar";
      body.back_urls.failure = "https://www.mercadopago.com.ar";
      body.back_urls.pending = "https://www.mercadopago.com.ar";
    }

    const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("MP preference error:", data);
      return NextResponse.json({ error: "Error al crear pago en Mercado Pago" }, { status: 502 });
    }

    return NextResponse.json({
      init_point: data.init_point,
      preference_id: data.id,
      public_key: process.env.MP_PUBLIC_KEY ?? "",
    });
  } catch (e: any) {
    console.error("create-preference error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
