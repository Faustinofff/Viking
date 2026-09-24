// ─── Coach Branding ────────────────────────────────────────────────
// Private beta: solo el coach de prueba puede configurar branding.
// Para habilitar el resto de coaches, cambiar canManageBranding().

import { supabase } from "@/lib/supabase";

export const PRIVATE_BRANDING_TEST_EMAIL = "faustinofiordalisi@gmail.com";
export const BRANDING_STORAGE_BUCKET = "branding";
export const BRANDING_LOGO_MAX_BYTES = 2 * 1024 * 1024;
export const BRANDING_LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"];

export interface CoachBranding {
  brandName: string | null;
  brandLogoUrl: string | null;
  brandColor: string | null;
}

/** Gate: habilita la configuración de branding para un coach. */
export function canManageBranding(email?: string | null): boolean {
  if (!email) return false;
  return email.toLowerCase() === PRIVATE_BRANDING_TEST_EMAIL.toLowerCase();
}

function normalizeBrandColor(color: string | undefined | null): string | null {
  if (!color) return null;
  const c = color.trim();
  if (/^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(c)) return c.toLowerCase();
  return null;
}

/** Valida/normaliza datos de branding leídos de un blob o recibidos por API. */
export function parseCoachBranding(raw: unknown): CoachBranding | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const brandName = typeof r.brandName === "string" ? r.brandName.trim().slice(0, 60) : "";
  const brandLogoUrl = typeof r.brandLogoUrl === "string" ? r.brandLogoUrl.trim() : "";
  const brandColor = normalizeBrandColor(typeof r.brandColor === "string" ? r.brandColor : undefined);
  if (!brandName && !brandLogoUrl && !brandColor) return null;
  return {
    brandName: brandName || null,
    brandLogoUrl: brandLogoUrl || null,
    brandColor,
  };
}

/** Objeto limpio para guardar en el blob del coach. */
export function serializeCoachBranding(b: CoachBranding): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (b.brandName) out.brandName = b.brandName;
  if (b.brandLogoUrl) out.brandLogoUrl = b.brandLogoUrl;
  if (b.brandColor) out.brandColor = b.brandColor;
  if (Object.keys(out).length === 0) return { _v1: true };
  return out;
}

// ─── Lectura (cliente y servidor) ─────────────────────────────────

/** Devuelve el branding configurado por un coach, o null si no hay. */
export async function getCoachBranding(coachId: string): Promise<CoachBranding | null> {
  if (!coachId) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("avatar_url")
    .eq("id", coachId)
    .maybeSingle();
  let blob: Record<string, any> = {};
  if (profile?.avatar_url) {
    try {
      const parsed = JSON.parse(profile.avatar_url);
      if (typeof parsed === "object" && !Array.isArray(parsed)) blob = parsed;
    } catch {}
  }
  return parseCoachBranding(blob.branding);
}