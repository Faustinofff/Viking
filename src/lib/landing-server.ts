import { createClient } from "@supabase/supabase-js";
import { getAdminClient, ADMIN_SUPABASE_URL } from "@/lib/admin";
import {
  PAGINA_WEB_STORAGE_BUCKET,
  esPilotoPaginaWeb,
  parseCoachLanding,
  type CoachLanding,
} from "@/lib/pagina-web";
import { parseCoachBranding, type CoachBranding } from "@/lib/branding";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// La landing NO vive en el blob avatar_url (que comparten agenda/premium/pagos etc.
// con lecturas+escrituras concurrentes que lo pisaban). Vive en su propio archivo
// de storage, aislado de cualquier otra feature.
const LANDING_DATA_BUCKET = "landing-data";
const LANDING_DATA_PATH = "page.json";

export function isLandingStorageUrl(url: string): boolean {
  return url.startsWith(`${ADMIN_SUPABASE_URL}/storage/v1/object/public/${PAGINA_WEB_STORAGE_BUCKET}/`);
}

function landingPathFromUrl(url: string): string | null {
  if (!isLandingStorageUrl(url)) return null;
  const prefix = `${ADMIN_SUPABASE_URL}/storage/v1/object/public/${PAGINA_WEB_STORAGE_BUCKET}/`;
  return url.slice(prefix.length);
}

async function ensureLandingDataBucket(client: any) {
  const { data: existing } = await client.storage.getBucket(LANDING_DATA_BUCKET);
  if (!existing) {
    const { error } = await client.storage.createBucket(LANDING_DATA_BUCKET, { public: false });
    if (error && !String(error?.message ?? "").toLowerCase().includes("already")) throw error;
  }
}

/** Lee la landing del coach desde su archivo aislado (null si no hay). */
export async function readLandingFile(coachId: string): Promise<CoachLanding | null> {
  if (!coachId) return null;
  const client = getAdminClient();
  const { data, error } = await client.storage
    .from(LANDING_DATA_BUCKET)
    .download(`${coachId}/${LANDING_DATA_PATH}`);
  if (error || !data) return null;
  try {
    const text = await data.text();
    return parseCoachLanding(JSON.parse(text));
  } catch {
    return null;
  }
}

export async function writeLandingFile(coachId: string, landing: CoachLanding): Promise<boolean> {
  const client = getAdminClient();
  try {
    await ensureLandingDataBucket(client);
    const { error } = await client.storage
      .from(LANDING_DATA_BUCKET)
      .upload(`${coachId}/${LANDING_DATA_PATH}`, Buffer.from(JSON.stringify(landing), "utf-8"), {
        contentType: "application/json",
        upsert: true,
        cacheControl: "0",
      });
    return !error;
  } catch {
    return false;
  }
}

export async function clearLandingFile(coachId: string): Promise<boolean> {
  const client = getAdminClient();
  const { error } = await client.storage.from(LANDING_DATA_BUCKET).remove([`${coachId}/${LANDING_DATA_PATH}`]);
  return !error;
}

/** Ids de coaches con landing (carpetas del bucket de datos). */
async function listCoachesWithLanding(client: any): Promise<string[]> {
  const { data, error } = await client.storage.from(LANDING_DATA_BUCKET).list("");
  if (error) return [];
  return (data ?? [])
    .filter((f: any) => f.name && f.id)
    .map((f: any) => f.name);
}

export interface LandingPageData {
  landing: CoachLanding;
  nombre: string;
  branding: CoachBranding | null;
}

/** Resuelve la landing pública por slug desde los archivos aislados de cada coach. */
export async function getLandingPageData(slug: string): Promise<LandingPageData | null> {
  if (!slug) return null;
  const client = getAdminClient();
  const coachIds = await listCoachesWithLanding(client);
  for (const coachId of coachIds) {
    const landing = await readLandingFile(coachId);
    if (landing && landing.slug === slug) {
      const { data: profile } = await client
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", coachId)
        .maybeSingle();
      let branding: CoachBranding | null = null;
      let nombre = "Coach";
      if (profile) {
        nombre = profile.display_name || "Coach";
        try {
          const parsed = JSON.parse(profile.avatar_url);
          if (parsed && typeof parsed === "object") branding = parseCoachBranding(parsed.branding ?? null);
        } catch {}
      }
      return { landing, nombre, branding };
    }
  }
  return null;
}

export async function landingSlugOcupado(slug: string, coachId: string): Promise<boolean> {
  if (!slug) return false;
  const client = getAdminClient();
  const coachIds = await listCoachesWithLanding(client);
  for (const cid of coachIds) {
    if (cid === coachId) continue;
    const landing = await readLandingFile(cid);
    if (landing && landing.slug === slug) return true;
  }
  return false;
}

export async function saveCoachLanding(coachId: string, landing: CoachLanding): Promise<boolean> {
  return writeLandingFile(coachId, landing);
}

export async function clearCoachLanding(coachId: string): Promise<boolean> {
  try {
    await clearLandingFile(coachId);
    return true;
  } catch {
    return false;
  }
}

/** Borra del storage las fotos del coach que ya no están en uso (huérfanas al quitar/sacar). */
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

export function getSiteBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim().replace(/\/$/, "");
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