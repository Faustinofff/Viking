import { NextRequest, NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { getAdminClient } from "@/lib/admin";
import { parseBlob, parsePremium } from "@/lib/admin-data";

const DAY_MS = 24 * 60 * 60 * 1000;

function noStoreHeaders(): Record<string, string> {
  return {
    "Cache-Control": "no-store, max-age=0, must-revalidate",
    Pragma: "no-cache",
    Expires: "0",
  };
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  noStore();
  try {
    const client = getAdminClient();
    const { data: profiles, error } = await client
      .from("profiles")
      .select("id, email, display_name, role, avatar_url, created_at")
      .order("created_at", { ascending: false });

    if (error) throw error;

    const COACH_GRATIS_EMAILS = ["faustinofiordalisi@gmail.com", "maxi22albaracin@gmail.com"];
    const users = (profiles ?? []).map((p: any) => {
      const blob = parseBlob(p.avatar_url);
      const prem = parsePremium(blob);
      const isActive = prem && new Date(prem.premiumExpiresAt) > new Date();
      const isFree = COACH_GRATIS_EMAILS.includes((p.email ?? "").toLowerCase());
      return {
        id: p.id,
        email: p.email,
        display_name: p.display_name,
        role: p.role,
        created_at: p.created_at,
        premium: isActive ? prem : null,
        isFreeCoach: isFree,
      };
    });

    return NextResponse.json({ users }, { headers: noStoreHeaders() });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err), users: [] }, { status: 500, headers: noStoreHeaders() });
  }
}

function buildCoachFromProfile(p: any) {
  const blob = parseBlob(p.avatar_url);
  const premium = parsePremium(blob);
  const now = Date.now();
  const isActive = !!premium && new Date(premium.premiumExpiresAt).getTime() > now;
  const daysLeft = premium && !isNaN(new Date(premium.premiumExpiresAt).getTime())
    ? Math.floor((new Date(premium.premiumExpiresAt).getTime() - now) / DAY_MS)
    : null;
  return {
    id: p.id,
    email: p.email,
    name: p.display_name ?? p.email ?? p.id,
    premium,
    isPremiumActive: isActive,
    premiumExpiresAt: premium?.premiumExpiresAt ?? null,
    premiumDaysLeft: daysLeft,
  };
}

export async function POST(req: NextRequest) {
  noStore();
  try {
    const { userId, action, days } = await req.json();
    if (!userId || !action) {
      return NextResponse.json({ error: "Missing userId or action" }, { status: 400, headers: noStoreHeaders() });
    }

    if (action === "activate") {
      const daysNum = Number(days);
      if (!Number.isInteger(daysNum) || daysNum <= 0) {
        return NextResponse.json({ error: "Cantidad de días inválida. Ingresá un número mayor a 0." }, { status: 400, headers: noStoreHeaders() });
      }
    }

    const client = getAdminClient();
    const { data: profile, error: fetchErr } = await client
      .from("profiles")
      .select("id, email, avatar_url")
      .eq("id", userId)
      .single();

    if (fetchErr || !profile) {
      return NextResponse.json({ error: "User not found" }, { status: 404, headers: noStoreHeaders() });
    }

    const blob = parseBlob(profile.avatar_url);
    const originalUrl = (typeof profile.avatar_url === "string" && !profile.avatar_url.startsWith("{")) ? profile.avatar_url : "";

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

    const { data: freshProfile } = await client
      .from("profiles")
      .select("id, email, display_name, avatar_url")
      .eq("id", userId)
      .single();

    const coach = freshProfile ? buildCoachFromProfile(freshProfile) : null;

    return NextResponse.json({ success: true, expiresAt: newExpiresAt, coach }, { headers: noStoreHeaders() });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500, headers: noStoreHeaders() });
  }
}
