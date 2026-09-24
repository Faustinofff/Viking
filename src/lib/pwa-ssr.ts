import { cookies } from "next/headers";
import { getAdminClient } from "@/lib/admin";

export const UID_COOKIE = "viking_uid";

export interface PwaBrand {
  /** Nombre de la app para el home screen (nombre de la marca del coach o Viking). */
  name: string;
  color: string;
  /** Ícono apple-touch-icon (180) de la marca, o el fallback Viking. */
  icon: string;
}

const FALLBACK: PwaBrand = { name: "Viking", color: "#0a0a0a", icon: "/app-icon.png" };

function parseBrand(raw: unknown): { name: string | null; color: string | null; icon: string | null } {
  if (!raw || typeof raw !== "object") return { name: null, color: null, icon: null };
  const r = raw as Record<string, unknown>;
  const name = typeof r.brandName === "string" ? r.brandName.trim() : "";
  let color: string | null = null;
  if (typeof r.brandColor === "string" && /^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(r.brandColor.trim())) {
    color = r.brandColor.trim().toLowerCase();
  }
  const icon =
    (typeof r.brandIcon180 === "string" && r.brandIcon180.trim() ? r.brandIcon180.trim() : null) ??
    (typeof r.brandLogoUrl === "string" && r.brandLogoUrl.trim() ? r.brandLogoUrl.trim() : null);
  return { name: name || null, color, icon };
}

async function readBrandingBlob(coachId: string): Promise<{ name: string | null; color: string | null; icon: string | null } | null> {
  const client = getAdminClient();
  const { data } = await client.from("profiles").select("avatar_url").eq("id", coachId).maybeSingle();
  if (!data?.avatar_url) return null;
  try {
    const parsed = JSON.parse(data.avatar_url);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed) && parsed.branding) {
      const b = parseBrand(parsed.branding);
      if (b.name || b.icon) return b;
    }
  } catch {}
  return null;
}

/** Resuelve el branding PWA del usuario dado (coach → su propia marca; alumno → la de su coach). */
export async function resolvePwaBrand(uid: string | null | undefined): Promise<PwaBrand> {
  if (!uid) return FALLBACK;
  try {
    const client = getAdminClient();
    const { data: profile } = await client
      .from("profiles")
      .select("role")
      .eq("id", uid)
      .maybeSingle();
    if (!profile) return FALLBACK;

    let owner: string | null = null;
    if (profile.role === "coach") {
      owner = uid;
    } else if (profile.role === "student") {
      const { data: rel } = await client
        .from("coach_students")
        .select("coach_id")
        .eq("student_id", uid)
        .eq("status", "active")
        .maybeSingle();
      owner = rel?.coach_id ?? null;
    }
    if (!owner) return FALLBACK;

    const b = await readBrandingBlob(owner);
    if (!b) return FALLBACK;
    return {
      name: b.name || FALLBACK.name,
      color: b.color || FALLBACK.color,
      icon: b.icon || FALLBACK.icon,
    };
  } catch {
    return FALLBACK;
  }
}

/** Branding del usuario actual según la cookie (server-side). */
export async function resolveCurrentPwaBrand(): Promise<PwaBrand> {
  try {
    const uid = cookies().get(UID_COOKIE)?.value ?? null;
    return await resolvePwaBrand(uid);
  } catch {
    return FALLBACK;
  }
}