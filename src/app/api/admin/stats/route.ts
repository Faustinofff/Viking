import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, getProfilesClient } from "@/lib/admin";

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
    await requireAdmin(req);

    const client = getProfilesClient();
    const { data: profiles, error } = await client
      .from("profiles")
      .select("id, email, display_name, role, avatar_url, created_at");

    if (error) throw error;

    const all = profiles ?? [];
    const coaches = all.filter((p: any) => p.role === "coach");
    const students = all.filter((p: any) => p.role === "student");

    let premiumCount = 0;
    let freeCount = 0;
    for (const c of coaches) {
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
      freeCoaches: freeCount,
      totalUsers: all.length,
    });
  } catch (err: any) {
    const msg = err?.message ?? String(err);
    if (msg === "Unauthorized" || msg === "No token" || msg === "Invalid token") {
      return NextResponse.json({ error: msg }, { status: 403 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
