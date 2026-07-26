import { NextRequest, NextResponse } from "next/server";
import { getAdminClient, requireAdmin, ADMIN_EMAIL } from "@/lib/admin";

const FREE_COACH_EMAILS = ["faustinofiordalisi@gmail.com", "maxi22albaracin@gmail.com"];

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
    const token = req.headers.get("x-admin-token") ?? undefined;
    await requireAdmin(token);

    const client = getAdminClient(token);
    const { data: profiles, error } = await client
      .from("profiles")
      .select("id, email, display_name, role, avatar_url, created_at")
      .order("created_at", { ascending: false });

    if (error) throw error;

    const users = (profiles ?? []).map((p: any) => {
      const { blob } = parseBlob(p.avatar_url);
      const prem = blob.premium;
      const isPremium = prem && new Date(prem.premiumExpiresAt) > new Date();
      return {
        id: p.id,
        email: p.email,
        display_name: p.display_name,
        role: p.role,
        created_at: p.created_at,
        premium: isPremium ? prem : null,
      };
    });

    return NextResponse.json({ users });
  } catch (err: any) {
    const msg = err?.message ?? String(err);
    if (msg === "Unauthorized" || msg === "No token" || msg === "Invalid token") {
      return NextResponse.json({ error: msg }, { status: 403 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get("x-admin-token") ?? undefined;
    await requireAdmin(token);

    const { userId, action } = await req.json();
    if (!userId || !action) {
      return NextResponse.json({ error: "Missing userId or action" }, { status: 400 });
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

    if (action === "activate") {
      const now = new Date();
      const expires = new Date(now);
      expires.setDate(expires.getDate() + 365);
      blob.premium = {
        planId: "anual",
        planName: "Anual (Admin)",
        planDurationDays: 365,
        planPrice: 0,
        premiumExpiresAt: expires.toISOString(),
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

    return NextResponse.json({ success: true });
  } catch (err: any) {
    const msg = err?.message ?? String(err);
    if (msg === "Unauthorized" || msg === "No token" || msg === "Invalid token") {
      return NextResponse.json({ error: msg }, { status: 403 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
