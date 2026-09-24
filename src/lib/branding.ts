// ─── Coach Branding ────────────────────────────────────────────────
// El permiso para configurar branding lo otorga el admin por coach
// (columna profiles.branding_enabled). Sin permiso, la sección
// "Personalización" no aparece en el panel del coach.

import { supabase } from "@/lib/supabase";

export const BRANDING_STORAGE_BUCKET = "branding";
export const BRANDING_LOGO_MAX_BYTES = 2 * 1024 * 1024;
export const BRANDING_LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"];

const STORAGE_STUDENT_COACH_KEY = "viking_student_coach";

/** Persiste el coach del alumno para mostrarlo sin esperar a la red. */
export function saveStudentCoachId(coachId: string) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(STORAGE_STUDENT_COACH_KEY, coachId); } catch {}
}

/** Coach del alumno desde la caché local (null si no hay o se cerró sesión). */
export function loadStudentCoachId(): string | null {
  if (typeof window === "undefined") return null;
  try { return localStorage.getItem(STORAGE_STUDENT_COACH_KEY); } catch { return null; }
}

/** Limpia la relación alumno→coach (al cerrar sesión). */
export function clearStudentCoachId() {
  if (typeof window === "undefined") return;
  try { localStorage.removeItem(STORAGE_STUDENT_COACH_KEY); } catch {}
}

export interface CoachBranding {
  brandName: string | null;
  brandLogoUrl: string | null;
  brandColor: string | null;
  brandLogoShape: "square" | "circle";
  /** Íconos PWA generados (192/512/180) para que la app instalada use el logo del coach. */
  brandIcon192?: string | null;
  brandIcon512?: string | null;
  brandIcon180?: string | null;
}

/** Gate: habilita la configuración de branding para un coach. */
export async function getBrandingEnabled(userId: string): Promise<boolean> {
  if (!userId) return false;
  const { data, error } = await supabase
    .from("profiles")
    .select("branding_enabled")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data) return false;
  return data.branding_enabled === true;
}

function permissionCacheKey(userId: string) {
  return `viking_branding_${userId}`;
}

/** Cachea el permiso para que la sección aparezca de forma síncrona al reentrar. */
export function cacheBrandingEnabled(userId: string, enabled: boolean) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(permissionCacheKey(userId), enabled ? "1" : "0"); } catch {}
}

/** Permiso desde la caché local (null si no hay dato). */
export function loadCachedBrandingEnabled(userId: string): boolean | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(permissionCacheKey(userId));
    return v === "1" ? true : v === "0" ? false : null;
  } catch { return null; }
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
  const brandLogoShape = r.brandLogoShape === "circle" ? "circle" : "square";
  const str = (k: string) => (typeof r[k] === "string" && (r[k] as string).trim() ? (r[k] as string).trim() : null);
  if (!brandName && !brandLogoUrl && !brandColor && !str("brandIcon192")) return null;
  return {
    brandName: brandName || null,
    brandLogoUrl: brandLogoUrl || null,
    brandColor,
    brandLogoShape,
    brandIcon192: str("brandIcon192"),
    brandIcon512: str("brandIcon512"),
    brandIcon180: str("brandIcon180"),
  };
}

/** Objeto limpio para guardar en el blob del coach. */
export function serializeCoachBranding(b: CoachBranding): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (b.brandName) out.brandName = b.brandName;
  if (b.brandLogoUrl) out.brandLogoUrl = b.brandLogoUrl;
  if (b.brandColor) out.brandColor = b.brandColor;
  if (b.brandLogoShape === "circle") out.brandLogoShape = "circle";
  if (b.brandIcon192) out.brandIcon192 = b.brandIcon192;
  if (b.brandIcon512) out.brandIcon512 = b.brandIcon512;
  if (b.brandIcon180) out.brandIcon180 = b.brandIcon180;
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