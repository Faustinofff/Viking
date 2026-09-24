import { createClient } from "@supabase/supabase-js";
import { getAdminClient, ADMIN_SUPABASE_URL } from "@/lib/admin";
import { BRANDING_STORAGE_BUCKET } from "@/lib/branding";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export function isBrandingStorageUrl(url: string): boolean {
  return url.startsWith(`${ADMIN_SUPABASE_URL}/storage/v1/object/public/${BRANDING_STORAGE_BUCKET}/`);
}

export interface BrandingAuthUser {
  id: string;
  email: string;
}

function extractBlob(profile: any): { blob: Record<string, any>; originalUrl: string } {
  let blob: Record<string, any> = {};
  let originalUrl = "";
  if (profile?.avatar_url) {
    try {
      const parsed = JSON.parse(profile.avatar_url);
      if (typeof parsed === "object" && !Array.isArray(parsed)) {
        blob = parsed;
        originalUrl = blob._url ?? "";
      }
    } catch {
      originalUrl = profile.avatar_url;
    }
  }
  return { blob, originalUrl };
}

/** Server-side auth: el usuario debe estar logueado, ser coach y tener el permiso de branding. */
export async function requireBrandingCoach(token: string | null | undefined): Promise<BrandingAuthUser | null> {
  if (!token) return null;
  const anonClient = createClient(supabaseUrl, supabaseAnonKey);
  const { data: { user }, error } = await anonClient.auth.getUser(token);
  if (error || !user) return null;
  const email = user.email ?? "";
  const rol = user.user_metadata?.rol;
  if (rol !== "coach") return null;
  const admin = getAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("branding_enabled")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.branding_enabled) return null;
  return { id: user.id, email };
}

/** Lee el blob JSON de un coach usando el cliente service-role. */
export async function readCoachBlob(coachId: string): Promise<{ blob: Record<string, any>; originalUrl: string }> {
  const client = getAdminClient();
  const { data: profile } = await client
    .from("profiles")
    .select("avatar_url")
    .eq("id", coachId)
    .maybeSingle();
  return extractBlob(profile);
}

/** Escribe el blob JSON de un coach usando el cliente service-role. */
export async function writeCoachBlob(coachId: string, blob: Record<string, any>, originalUrl: string): Promise<boolean> {
  if (originalUrl) blob._url = originalUrl;
  const client = getAdminClient();
  const { error } = await client
    .from("profiles")
    .update({ avatar_url: JSON.stringify(blob) })
    .eq("id", coachId);
  return !error;
}