import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/admin";

const COACH_GRATIS_EMAILS = ["faustinofiordalisi@gmail.com", "maxi22albaracin@gmail.com"];

function isCoachGratuito(email?: string | null): boolean {
  if (!email) return false;
  return COACH_GRATIS_EMAILS.includes(email.toLowerCase());
}

function parseBlob(raw?: string | null): { blob: Record<string, any>; originalUrl: string } {
  if (!raw) return { blob: {}, originalUrl: "" };
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === "object" && !Array.isArray(parsed)) {
      return { blob: parsed, originalUrl: parsed._url ?? "" };
    }
  } catch {}
  return { blob: {}, originalUrl: raw };
}

export async function GET(req: NextRequest) {
  try {
    const client = getAdminClient();
    const { data: profiles, error } = await client
      .from("profiles")
      .select("id, email, display_name, role, avatar_url, created_at")
      .order("created_at", { ascending: false });

    if (error) throw error;

    const users = (profiles ?? []).map((p: any) => {
      const { blob } = parseBlob(p.avatar_url);
      const prem = blob.premium;
      const isPremium = prem && new Date(prem.premiumExpiresAt) > new Date();
      const isFree = isCoachGratuito(p.email);
      return {
        id: p.id,
        email: p.email,
        display_name: p.display_name,
        role: p.role,
        created_at: p.created_at,
        premium: isPremium ? prem : null,
        isFreeCoach: isFree,
      };
    });

    return NextResponse.json({ users });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err), users: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, action, days } = await req.json();
    if (!userId || !action) {
      return NextResponse.json({ error: "Missing userId or action" }, { status: 400 });
    }

    if (action === "activate") {
      const daysNum = Number(days);
      if (!Number.isInteger(daysNum) || daysNum <= 0) {
        return NextResponse.json({ error: "Cantidad de días inválida. Ingresá un número mayor a 0." }, { status: 400 });
      }
    }

    const client = getAdminClient();
    const { data: profile, error: fetchErr } = await client
      .from("profiles")
      .select("id, email, avatar_url")
      .eq("id", userId)
      .single();

    if (fetchErr || !profile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { blob, originalUrl } = parseBlob(profile.avatar_url);

    let newExpiresAt: string | null = null;

    if (action === "activate") {
      const daysNum = Number(days);
      const existing = blob.premium;
      const now = new Date();
      const isActive = existing?.premiumExpiresAt && new Date(existing.premiumExpiresAt) > now;

      const base = isActive ? new Date(existing.premiumExpiresAt) : now;
      const expires = new Date(base);
      expires.setDate(expires.getDate() + daysNum);
      newExpiresAt = expires.toISOString();

      blob.premium = {
        planId: existing?.planId ?? "anual",
        planName: existing?.planName ?? "Admin",
        planDurationDays: daysNum,
        planPrice: 0,
        premiumExpiresAt: newExpiresAt,
        paymentStatus: "approved",
        paymentDate: now.toISOString(),
      };
    } else if (action === "deactivate") {
      delete blob.premium;
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    if (originalUrl) blob._url = originalUrl;

    const { error: updateErr } = await client
      .from("profiles")
      .update({ avatar_url: JSON.stringify(blob) })
      .eq("id", userId);

    if (updateErr) throw updateErr;

    return NextResponse.json({ success: true, expiresAt: newExpiresAt });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}
