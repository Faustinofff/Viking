import { createClient } from "@supabase/supabase-js";

export const ADMIN_EMAIL = "viking.admin.fit@gmail.com";

export function isAdmin(email?: string | null): boolean {
  if (!email) return false;
  return email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export function getAdminClient() {
  return createClient(supabaseUrl, supabaseServiceKey);
}
