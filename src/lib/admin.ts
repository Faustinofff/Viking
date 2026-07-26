import { createClient } from "@supabase/supabase-js";

export const ADMIN_EMAIL = "viking.admin.fit@gmail.com";

export function isAdmin(email?: string | null): boolean {
  if (!email) return false;
  return email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export function getAdminClient(accessToken?: string) {
  if (supabaseServiceKey && !accessToken) {
    return createClient(supabaseUrl, supabaseServiceKey);
  }
  if (accessToken) {
    return createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });
  }
  return createClient(supabaseUrl, supabaseAnonKey);
}

export async function requireAdmin(accessToken?: string): Promise<{ id: string; email: string }> {
  if (!accessToken) throw new Error("No token");
  const client = getAdminClient();
  const { data: { user }, error } = await client.auth.getUser(accessToken);
  if (error || !user) throw new Error("Invalid token");
  if (user.email !== ADMIN_EMAIL) throw new Error("Unauthorized");
  return { id: user.id, email: user.email };
}
