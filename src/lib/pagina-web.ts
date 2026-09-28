// ─── Página Web del coach (pilot) ─────────────────────────────────
// Sección pública en /l/<slug> que el admin habilitará por coach en el futuro.
// Durante el pilot solo está disponible para el coach de prueba.

export const PILOTO_PAGINA_WEB_EMAIL = "faustinofiordalisi@gmail.com";

export function esPilotoPaginaWeb(email?: string | null): boolean {
  if (!email) return false;
  return email.toLowerCase() === PILOTO_PAGINA_WEB_EMAIL.toLowerCase();
}

export const PAGINA_WEB_STORAGE_BUCKET = "landing";
export const PAGINA_WEB_PORTADA_MAX_BYTES = 5 * 1024 * 1024;
export const PAGINA_WEB_PORTADA_TYPES = ["image/png", "image/jpeg", "image/webp"];
export const PAGINA_WEB_GALERIA_MAX = 6;

export interface CoachLanding {
  slug: string;
  portadaUrl: string | null;
  descripcion: string;
  sobreMi: string;
  galeria: string[];
  instagram: string;
  whatsapp: string;
  whatsappText: string;
}

/** Acepta "@usuario", "usuario", "instagram.com/usuario" o URL completa. */
export function normalizarInstagram(input: string): string {
  const raw = (input ?? "").trim().toLowerCase();
  if (!raw) return "";
  const m = raw.match(/(?:instagram\.com\/|instagram\.com\/plus\/)?@?([a-z0-9._]+)/i);
  if (!m) return "";
  return m[1].slice(0, 60);
}

export function parseCoachLanding(raw: unknown): CoachLanding | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const slug = typeof r.slug === "string" ? r.slug.trim() : "";
  if (!slug) return null;
  const str = (k: string, max: number) =>
    typeof r[k] === "string" ? (r[k] as string).trim().slice(0, max) : "";
  const galeria = Array.isArray(r.galeria)
    ? r.galeria
        .filter((x): x is string => typeof x === "string")
        .map((x) => x.trim().slice(0, 500))
        .filter(Boolean)
        .slice(0, PAGINA_WEB_GALERIA_MAX)
    : [];
  return {
    slug: slug.slice(0, 80),
    portadaUrl: str("portadaUrl", 500) || null,
    descripcion: str("descripcion", 400),
    sobreMi: str("sobreMi", 1000),
    galeria,
    instagram: normalizarInstagram(str("instagram", 80)),
    whatsapp: str("whatsapp", 20).replace(/[^0-9]/g, ""),
    whatsappText: str("whatsappText", 120),
  };
}

export function serializeCoachLanding(l: CoachLanding): Record<string, unknown> {
  const out: Record<string, unknown> = { slug: l.slug };
  if (l.portadaUrl) out.portadaUrl = l.portadaUrl;
  if (l.descripcion) out.descripcion = l.descripcion;
  if (l.sobreMi) out.sobreMi = l.sobreMi;
  if (l.galeria.length) out.galeria = l.galeria;
  if (l.instagram) out.instagram = l.instagram;
  if (l.whatsapp) out.whatsapp = l.whatsapp;
  if (l.whatsappText) out.whatsappText = l.whatsappText;
  return out;
}

/** "Faustino Fiordalisi" → "faustino-fiordalisi" */
export function normalizarSlug(input: string): string {
  const normalized = (input ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return normalized || "";
}