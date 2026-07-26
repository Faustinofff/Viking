import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/admin";

const COACH_GRATIS_EMAILS = ["faustinofiordalisi@gmail.com", "maxi22albaracin@gmail.com"];

function parseBlob(raw?: string | null): Record<string, any> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
  } catch {}
  return {};
}

export async function GET(req: NextRequest) {
  try {
    const client = getAdminClient();
    const { data: profiles, error } = await client
      .from("profiles")
      .select("id, email, display_name, role, avatar_url, created_at");

    if (error) throw error;

    const all = profiles ?? [];
    const coaches = all.filter((p: any) => p.role === "coach");
    const students = all.filter((p: any) => p.role === "student");

    let premiumCount = 0;
    let freeCount = 0;
    let gratuitoCount = 0;
    for (const c of coaches) {
      const email = (c as any).email?.toLowerCase();
      const isGratuito = COACH_GRATIS_EMAILS.includes(email);
      if (isGratuito) {
        gratuitoCount++;
        continue;
      }
      try {
        const blob = parseBlob((c as any).avatar_url);
        const prem = blob.premium;
        if (prem && new Date(prem.premiumExpiresAt) > new Date()) {
          premiumCount++;
        } else {
          freeCount++;
        }
      } catch {
        freeCount++;
      }
    }

    return NextResponse.json({
      totalCoaches: coaches.length,
      totalStudents: students.length,
      premiumCoaches: premiumCount,
      gratuitoCoaches: gratuitoCount,
      freeCoaches: freeCount,
      totalUsers: all.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}
