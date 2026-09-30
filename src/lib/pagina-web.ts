// ─── Página Web del coach ─────────────────────────────────────
// Sección pública en /l/<slug>. El permiso lo otorga el admin por coach
// (columna profiles.pagina_web_enabled), igual que el branding. Sin el
// permiso la sección no aparece en el panel del coach y no puede guardar.

import { supabase } from "@/lib/supabase";

export const PILOTO_PAGINA_WEB_EMAIL = "faustinofiordalisi@gmail.com";

export function esPilotoPaginaWeb(email?: string | null): boolean {
  if (!email) return false;
  return email.toLowerCase() === PILOTO_PAGINA_WEB_EMAIL.toLowerCase();
}

/** Gate: habilita la sección "Página web" para un coach (flag otorgado por el admin). */
export async function getPaginaWebEnabled(userId: string): Promise<boolean> {
  if (!userId) return false;
  const { data, error } = await supabase
    .from("profiles")
    .select("pagina_web_enabled")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data) return false;
  return data.pagina_web_enabled === true;
}

function paginaWebPermissionCacheKey(userId: string) {
  return `viking_pagina_web_${userId}`;
}

/** Cachea el permiso para que la sección aparezca de forma síncrona al reentrar. */
export function cachePaginaWebEnabled(userId: string, enabled: boolean) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(paginaWebPermissionCacheKey(userId), enabled ? "1" : "0"); } catch {}
}

/** Permiso desde la caché local (null si no hay dato). */
export function loadCachedPaginaWebEnabled(userId: string): boolean | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(paginaWebPermissionCacheKey(userId));
    return v === "1" ? true : v === "0" ? false : null;
  } catch { return null; }
}

/** Gate combinado del panel del coach: permiso del admin (DB/caché) o piloto vigente. */
export function esPaginaWebVisible(email: string | null | undefined, dbEnabled?: boolean): boolean {
  return dbEnabled === true || esPilotoPaginaWeb(email);
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