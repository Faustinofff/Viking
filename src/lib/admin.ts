import { createClient } from "@supabase/supabase-js";

export const ADMIN_EMAIL = "viking.admin.fit@gmail.com";

export function isAdmin(email?: string | null): boolean {
  if (!email) return false;
  return email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

export function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseServiceKey) {
    console.error("[ADMIN] SUPABASE_SERVICE_ROLE_KEY missing. Env keys:", Object.keys(process.env).filter(k => k.includes("SUPABASE")));
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  }
  return createClient(supabaseUrl!, supabaseServiceKey);
}
