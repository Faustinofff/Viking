import { createClient } from "@supabase/supabase-js";
import { getAdminClient, ADMIN_SUPABASE_URL } from "@/lib/admin";
import {
  PAGINA_WEB_STORAGE_BUCKET,
  esPilotoPaginaWeb,
  parseCoachLanding,
  serializeCoachLanding,
  type CoachLanding,
} from "@/lib/pagina-web";
import { readCoachBlob, writeCoachBlob } from "@/lib/branding-server";
import { parseCoachBranding, type CoachBranding } from "@/lib/branding";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export function isLandingStorageUrl(url: string): boolean {
  return url.startsWith(`${ADMIN_SUPABASE_URL}/storage/v1/object/public/${PAGINA_WEB_STORAGE_BUCKET}/`);
}

function landingPathFromUrl(url: string): string | null {
  if (!isLandingStorageUrl(url)) return null;
  const prefix = `${ADMIN_SUPABASE_URL}/storage/v1/object/public/${PAGINA_WEB_STORAGE_BUCKET}/`;
  return url.slice(prefix.length);
}

/** Borra del storage las fotos del coach que ya no están en uso (huérfanas al quitar/admitir). */
export async function pruneLandingFiles(coachId: string, activeUrls: string[]): Promise<void> {
  const active = new Set(
    activeUrls
      .filter(Boolean)
      .map((u) => landingPathFromUrl(u))
      .filter((p): p is string => p !== null)
  );
  const client = getAdminClient();
  const { data: files } = await client.storage.from(PAGINA_WEB_STORAGE_BUCKET).list(coachId);
  const orphans = (files ?? [])
    .map((f: any) => f.name)
    .filter((name: string) => !active.has(`${coachId}/${name}`))
    .map((name: string) => `${coachId}/${name}`);
  if (orphans.length) {
    await client.storage.from(PAGINA_WEB_STORAGE_BUCKET).remove(orphans);
  }
}

export interface LandingAuthUser {
  id: string;
  email: string;
}

/** Server-side auth: logueado + coach + piloto de página web (luego será flag de admin). */
export async function requireLandingCoach(token: string | null | undefined): Promise<LandingAuthUser | null> {
  if (!token) return null;
  const anonClient = createClient(supabaseUrl, supabaseAnonKey);
  const { data: { user }, error } = await anonClient.auth.getUser(token);
  if (error || !user) return null;
  const email = user.email ?? "";
  if (!esPilotoPaginaWeb(email)) return null;
  const rol = user.user_metadata?.rol;
  if (rol !== "coach") return null;
  return { id: user.id, email };
}

function blobFromProfile(profile: any): { blob: Record<string, any>; nombre: string } {
  let blob: Record<string, any> = {};
  if (profile?.avatar_url) {
    try {
      const parsed = JSON.parse(profile.avatar_url);
      if (typeof parsed === "object" && !Array.isArray(parsed)) blob = parsed;
    } catch {}
  }
  return { blob, nombre: profile?.display_name ?? "Coach" };
}

export interface LandingPageData {
  landing: CoachLanding;
  nombre: string;
  branding: CoachBranding | null;
}

/** Resuelve la landing pública por slug (busca en el blob de cada perfil). */
export async function getLandingPageData(slug: string): Promise<LandingPageData | null> {
  if (!slug) return null;
  const client = getAdminClient();
  const { data: profiles } = await client
    .from("profiles")
    .select("id, display_name, avatar_url");
  for (const p of profiles ?? []) {
    const { blob, nombre } = blobFromProfile(p);
    const landing = parseCoachLanding(blob.landing);
    if (landing && landing.slug === slug) {
      return { landing, nombre, branding: parseCoachBranding(blob.branding) };
    }
  }
  return null;
}

export async function landingSlugOcupado(slug: string, coachId: string): Promise<boolean> {
  const client = getAdminClient();
  const { data: profiles } = await client
    .from("profiles")
    .select("id, avatar_url");
  for (const p of profiles ?? []) {
    if (p.id === coachId) continue;
    const { blob } = blobFromProfile(p);
    const landing = parseCoachLanding(blob.landing);
    if (landing && landing.slug === slug) return true;
  }
  return false;
}

export async function saveCoachLanding(coachId: string, landing: CoachLanding): Promise<boolean> {
  const { blob, originalUrl } = await readCoachBlob(coachId);
  blob.landing = serializeCoachLanding(landing);
  return writeCoachBlob(coachId, blob, originalUrl);
}

export async function clearCoachLanding(coachId: string): Promise<boolean> {
  const { blob, originalUrl } = await readCoachBlob(coachId);
  delete blob.landing;
  return writeCoachBlob(coachId, blob, originalUrl);
}

export function getSiteBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim().replace(/\/$/, "");
}